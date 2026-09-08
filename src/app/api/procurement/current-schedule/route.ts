import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/prisma/db";
import { activeBookingStatuses, sendFarmerSms } from "@/app/lib/farmer-sms";

const requestSchema = z.object({
  action: z.enum(["lookup", "approve", "reject", "checkIn", "gross", "quality", "tare", "accept", "initiatePayment", "completePayment", "freeze", "resume", "delay"]),
  bookingId: z.string().optional(),
  token: z.string().optional(),
  verificationPhone: z.string().optional(),
  weightKg: z.coerce.number().positive().optional(),
});

const currentStatuses = ["ARRIVED", "GROSS_WEIGHED", "QUALITY_CHECKED", "TARE_WEIGHED"];
const upcomingStatuses = ["SLOT_BOOKED"];
const releasableStatuses = ["PENDING", "SLOT_BOOKED", "ARRIVED", "GROSS_WEIGHED", "QUALITY_CHECKED", "TARE_WEIGHED"];

async function getContext(centerId: string) {
  const today = new Date();
  const date = `${today.toISOString().split("T")[0]}T00:00:00.000Z`;
  const [center, schedules, bookings, crops] = await Promise.all([
    db.orm.public.ProcurementCenter.where({ id: centerId }).first(),
    db.orm.public.Schedule.where({ centerId }).all(),
    db.orm.public.Booking.where({ centerId }).all(),
    db.orm.public.Crop.all(),
  ]);
  const todayStart = new Date(date).getTime();
  const schedule = schedules.find((item) => item.date === date)
    || schedules.find((item) => Math.abs(new Date(item.date).getTime() - todayStart) < 24 * 60 * 60 * 1000);
  const sameDayScheduleIds = new Set(
    schedules
      .filter((item) => Math.abs(new Date(item.date).getTime() - todayStart) < 24 * 60 * 60 * 1000)
      .map((item) => item.id),
  );
  return { center, schedule, sameDayScheduleIds, bookings, crops };
}

function serializeBooking(booking: Awaited<ReturnType<typeof getContext>>["bookings"][number], crops: Awaited<ReturnType<typeof getContext>>["crops"]) {
  return {
    id: booking.id,
    token: booking.token,
    farmerName: booking.farmerName,
    farmerPhone: booking.farmerPhone,
    cropName: crops.find((crop) => crop.id === booking.cropId)?.name || "Unknown crop",
    quantity: booking.quantity,
    status: booking.status,
    allocatedStart: booking.allocatedStart,
    grossWeightKg: booking.grossWeightKg,
    qualityStatus: booking.qualityStatus,
    tareWeightKg: booking.tareWeightKg,
    netWeightKg: booking.netWeightKg,
      paymentStatus: booking.paymentStatus,
      finalPayout: booking.finalPayout,
      paymentRefId: booking.paymentRefId,
  };
}

async function releaseReservedCapacity(booking: Awaited<ReturnType<typeof getContext>>["bookings"][number]) {
  const schedule = await db.orm.public.Schedule.where({ id: booking.scheduleId }).first();
  if (!schedule) return;

  const reservedKg = booking.netWeightKg ?? booking.quantity * 50;
  await db.orm.public.Schedule.where({ id: schedule.id }).update({
    availableCapacity: Math.min(schedule.totalCapacity, schedule.availableCapacity + reservedKg),
  });
}

export async function GET() {
  const session = await auth();
  const centerId = session?.user?.id;
  if (!centerId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { center, schedule, sameDayScheduleIds, bookings, crops } = await getContext(centerId);
  if (!center || !schedule) return NextResponse.json({ error: "No schedule exists for today." }, { status: 404 });

  const todayBookings = bookings
    .filter((booking) => sameDayScheduleIds.has(booking.scheduleId));
  const currentBookings = todayBookings
    .filter((booking) => currentStatuses.includes(booking.status))
    .sort((a, b) => new Date(a.allocatedStart || a.createdAt).getTime() - new Date(b.allocatedStart || b.createdAt).getTime());
  const upcomingBookings = todayBookings
    .filter((booking) => upcomingStatuses.includes(booking.status))
    .sort((a, b) => new Date(a.allocatedStart || a.createdAt).getTime() - new Date(b.allocatedStart || b.createdAt).getTime());
  const pendingBookings = todayBookings
    .filter((booking) => booking.status === "PENDING")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const paymentBookings = todayBookings
    .filter((booking) => ["ACCEPTED", "PAYMENT_INITIATED", "MONEY_TRANSFERRED"].includes(booking.status))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  return NextResponse.json({
    schedule: {
      id: schedule.id,
      totalCapacity: schedule.totalCapacity,
      availableCapacity: schedule.availableCapacity,
      isSuspended: schedule.isSuspended,
      delayMinutes: schedule.delayMinutes,
    },
    center: { currentStorageKg: center.currentStorageKg, maxStorageKg: center.maxStorageKg },
    current: currentBookings[0] ? serializeBooking(currentBookings[0], crops) : null,
    upcoming: upcomingBookings.map((booking) => serializeBooking(booking, crops)),
    pending: pendingBookings.map((booking) => serializeBooking(booking, crops)),
    payments: paymentBookings.map((booking) => serializeBooking(booking, crops)),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const centerId = session?.user?.id;
  if (!centerId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid schedule action." }, { status: 400 });

  const { action, bookingId, token, verificationPhone, weightKg } = parsed.data;
  const context = await getContext(centerId);
  if (!context.center || !context.schedule) return NextResponse.json({ error: "No schedule exists for today." }, { status: 404 });

  if (action === "resume") {
    if (!context.schedule.isSuspended) return NextResponse.json({ error: "The queue is already active." }, { status: 409 });

    await db.orm.public.Schedule.where({ id: context.schedule.id }).update({ isSuspended: false });

    const affectedBookings = await db.orm.public.Booking
      .where({ centerId, scheduleId: context.schedule.id })
      .where((booking) => booking.status.in(activeBookingStatuses))
      .all();

    await Promise.all(
      affectedBookings.map((booking) => sendFarmerSms(
        booking.farmerPhone,
        "Your procurement center has resumed work after the SOS pause. Please follow your booking schedule.",
      )),
    );

    return NextResponse.json({ message: "Queue resumed. Procurement work can continue." });
  }

  if (action === "freeze" || action === "delay") {
    if (context.schedule.isSuspended) return NextResponse.json({ error: "The queue is already frozen. Resume it before changing the delay." }, { status: 409 });
    const scheduleUpdate = action === "freeze"
      ? { isSuspended: true }
      : { delayMinutes: context.schedule.delayMinutes + 15 };

    await db.orm.public.Schedule.where({ id: context.schedule.id }).update(
      scheduleUpdate,
    );

    const affectedBookings = await db.orm.public.Booking
      .where({ centerId, scheduleId: context.schedule.id })
      .where((booking) => booking.status.in(activeBookingStatuses))
      .all();

    const message = action === "freeze"
      ? "SOS alert: procurement at your booked center is temporarily paused. Please wait for further updates."
      : `Your procurement center has delayed today's queue by 15 minutes. Your updated arrival time is ${context.schedule.delayMinutes + 15} minutes later than scheduled.`;

    await Promise.all(
      affectedBookings.map((booking) => sendFarmerSms(booking.farmerPhone, message)),
    );

    return NextResponse.json({ message: action === "freeze" ? "Queue frozen." : "All upcoming times delayed by 15 minutes." });
  }

  if (action === "lookup") {
    const booking = context.bookings.find((item) => item.token === token && item.centerId === centerId);
    if (!booking) return NextResponse.json({ error: "Booking token not found at this center." }, { status: 404 });
    if (releasableStatuses.includes(booking.status) && booking.allocatedStart) {
      const expiryTime = new Date(booking.allocatedStart).getTime() + 60 * 60 * 1000;
      if (Date.now() > expiryTime) {
        await db.orm.public.Booking.where({ id: booking.id }).update({ status: "EXPIRED" });
        await releaseReservedCapacity(booking);
        return NextResponse.json({
          booking: serializeBooking({ ...booking, status: "EXPIRED" }, context.crops),
          message: "This booking expired one hour after its scheduled time. Reserved capacity was restored.",
        });
      }
    }
    if (booking.status === "SLOT_BOOKED") {
      const now = new Date().toISOString();
      await db.orm.public.Booking.where({ id: booking.id }).update({
        status: "ARRIVED",
        aadhaarChecked: true,
        verifiedAt: now,
      });
      return NextResponse.json({
        booking: serializeBooking({ ...booking, status: "ARRIVED", aadhaarChecked: true, verifiedAt: now }, context.crops),
        message: "Token verified. Farmer marked as arrived.",
      });
    }
    return NextResponse.json({ booking: serializeBooking(booking, context.crops) });
  }

  if (!bookingId) return NextResponse.json({ error: "Booking is required." }, { status: 400 });
  const booking = context.bookings.find((item) => item.id === bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  if (action === "approve") {
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: `Only pending bookings can be approved. This booking is ${booking.status}.` }, { status: 409 });
    }
    if (!verificationPhone || verificationPhone.trim() !== booking.farmerPhone.trim()) {
      return NextResponse.json({ error: "The phone number does not match this farmer booking." }, { status: 400 });
    }

    await db.orm.public.Booking.where({ id: booking.id }).update({ status: "SLOT_BOOKED" });
    await sendFarmerSms(
      booking.farmerPhone,
      `Your Q8Far booking ${booking.token} has been approved. Please arrive at your scheduled procurement center at the assigned time.`,
    );
    return NextResponse.json({ message: "Farmer verified. Booking added to the next farmers queue." });
  }

  if (action === "reject") {
    if (!releasableStatuses.includes(booking.status)) {
      return NextResponse.json({ error: `This booking is ${booking.status} and cannot be rejected.` }, { status: 409 });
    }
    await db.orm.public.Booking.where({ id: booking.id }).update({ status: "REJECTED" });
    await releaseReservedCapacity(booking);
    return NextResponse.json({ message: "Booking rejected and reserved capacity restored." });
  }

  if (action === "initiatePayment") {
    if (booking.status !== "ACCEPTED") {
      return NextResponse.json({ error: `Payment can only be initiated for an accepted booking. This booking is ${booking.status}.` }, { status: 409 });
    }
    const payout = booking.finalPayout ?? ((booking.netWeightKg ?? booking.quantity * 50) * 1);
    await db.orm.public.Booking.where({ id: booking.id }).update({
      status: "PAYMENT_INITIATED",
      paymentStatus: "INITIATED",
      finalPayout: payout,
    });
    return NextResponse.json({ message: "Payment initiated." });
  }

  if (action === "completePayment") {
    if (booking.status !== "PAYMENT_INITIATED") {
      return NextResponse.json({ error: `Payment must be initiated first. This booking is ${booking.status}.` }, { status: 409 });
    }
    await db.orm.public.Booking.where({ id: booking.id }).update({
      status: "MONEY_TRANSFERRED",
      paymentStatus: "CREDITED",
      paymentRefId: `PAY-${Date.now()}-${booking.token}`,
    });
    return NextResponse.json({ message: "Payment completed and marked as transferred." });
  }

  const now = new Date().toISOString();
  if ((action === "gross" || action === "tare") && !weightKg) {
    return NextResponse.json({ error: `Enter the ${action === "gross" ? "gross" : "tare"} weight in kilograms.` }, { status: 400 });
  }
  if (action === "tare" && booking.grossWeightKg != null && weightKg != null && weightKg >= booking.grossWeightKg) {
    return NextResponse.json({ error: "Tare weight must be less than gross weight." }, { status: 400 });
  }
  const transitions = {
    checkIn: { from: "SLOT_BOOKED", update: { status: "ARRIVED" as const, aadhaarChecked: true, verifiedAt: now } },
    gross: { from: "ARRIVED", update: { status: "GROSS_WEIGHED" as const, grossWeightKg: weightKg, weighedAt: now } },
    quality: { from: "GROSS_WEIGHED", update: { status: "QUALITY_CHECKED" as const, qualityStatus: "PASSED" as const, qualityCheckedAt: now } },
    tare: { from: "QUALITY_CHECKED", update: { status: "TARE_WEIGHED" as const, tareWeightKg: weightKg, netWeightKg: booking.grossWeightKg != null && weightKg != null ? booking.grossWeightKg - weightKg : null, weighedAt: now } },
    accept: { from: "TARE_WEIGHED", update: { status: "ACCEPTED" as const, updatedAt: now } },
  } as const;
  const transition = transitions[action as keyof typeof transitions];
  if (!transition || booking.status !== transition.from) {
    return NextResponse.json({ error: `This booking is ${booking.status} and cannot perform that action.` }, { status: 409 });
  }

  await db.orm.public.Booking.where({ id: booking.id }).update(transition.update);

  if (action === "tare" && booking.grossWeightKg != null && weightKg != null) {
    const netWeightKg = booking.grossWeightKg - weightKg;
    const schedule = await db.orm.public.Schedule.where({ id: booking.scheduleId }).first();
    if (schedule) {
      await db.orm.public.Schedule.where({ id: schedule.id }).update({
        availableCapacity: Math.min(
          schedule.totalCapacity,
          Math.max(0, schedule.availableCapacity + (booking.quantity * 50 - netWeightKg)),
        ),
      });
    }
  }
  return NextResponse.json({ message: action === "accept" ? "Crop load accepted and moved to payment." : "Booking workflow updated." });
}