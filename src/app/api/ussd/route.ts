import { NextRequest } from "next/server";
import { db } from "@/prisma/db";
import { randomInt } from "node:crypto";

// ============================================================
// CONFIGURATION
// ============================================================

// Used only for CAPACITY ESTIMATION during booking.
//
// IMPORTANT:
// Actual storage capacity is reduced later using:
// NET WEIGHT = GROSS WEIGHT - TARE WEIGHT
//
// Do NOT use this value for final inventory deduction.
const ESTIMATED_BAG_WEIGHT_KG = 50;

// How many previous characters of the pincode should be used
// when looking for nearby procurement centers.
const PINCODE_PREFIX_LENGTH = 3;

function getTodayIso() {
  return `${new Date().toISOString().split("T")[0]}T00:00:00.000Z`;
}

// ============================================================
// HELPERS
// ============================================================

function getCropType(code: string) {
  switch (code) {
    case "1":
      return "PADDY";

    case "2":
      return "WHEAT";

    case "3":
      return "MAIZE";

    default:
      return "OTHER";
  }
}

function getToday() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

function getEstimatedWeightKg(bags: number) {
  return bags * ESTIMATED_BAG_WEIGHT_KG;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ============================================================
// TOKEN GENERATOR
// ============================================================

async function createBookingToken() {
  for (;;) {
    const token = String(randomInt(100000, 1000000));

    const existingBooking = await db.orm.public.Booking
      .where({ token })
      .first();

    if (!existingBooking) {
      return token;
    }
  }
}

// ============================================================
// FIND ELIGIBLE CENTERS
// ============================================================

async function findEligibleCenters(
  crop: string,
  pincode: string
) {
  const selectedCrop = await db.orm.public.Crop
    .where((cropRecord) => cropRecord.name.ilike(crop))
    .first();

  if (!selectedCrop) {
    return [];
  }

  const cropCenters = db.orm.public.ProcurementCenter.where(
    (center) => center.acceptedCrops.some(
      (centerCrop) => centerCrop.cropId.eq(selectedCrop.id)
    )
  );

  const exactMatches = await cropCenters
    .where((center) => center.pincode.eq(pincode))
    .all();

  const partialMatches = await cropCenters
    .where((center) => center.pincode.like(
      `${pincode.substring(0, PINCODE_PREFIX_LENGTH)}%`
    ))
    .where((center) => center.pincode.neq(pincode))
    .all();

  return [...exactMatches, ...partialMatches];
}

// ============================================================
// FIND OR CREATE A SCHEDULE
// ============================================================

async function getScheduleForDate(center: any, date: Date) {
  const dateIso = date.toISOString();

  let schedule = await db.orm.public.Schedule
    .where({
      centerId: center.id,
      date: dateIso,
    })
    .first();

  if (!schedule) {
    schedule = await db.orm.public.Schedule.create({
      centerId: center.id,

      date: dateIso,

      totalCapacity: center.maxStorageKg,

      availableCapacity: center.maxStorageKg,

      status: "AVAILABLE",

      isSuspended: false,

      delayMinutes: 0,
    });
  }

  return schedule;
}

async function getTodaySchedule(center: any) {
  return getScheduleForDate(center, getToday());
}

function getTomorrow() {
  const tomorrow = getToday();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow;
}

// ============================================================
// FIND NEXT AVAILABLE TIME
// ============================================================

async function findNextAvailableSlot(
  center: any,
  schedule: any,
  earliestStart = new Date()
) {
  const centerBookings = await db.orm.public.Booking
    .where({
      centerId: center.id,
      scheduleId: schedule.id,
    })
    .where((booking) => booking.status.in([
      "PENDING",
      "SLOT_BOOKED",
      "ARRIVED",
      "GROSS_WEIGHED",
      "QUALITY_CHECKED",
      "TARE_WEIGHED",
    ]))
    .where((booking) => booking.allocatedStart.isNotNull())
    .where((booking) => booking.allocatedEnd.isNotNull())
    .orderBy((booking) => booking.allocatedStart.asc())
    .all();

  const [openHour, openMinute] = center.openTime
    .split(":")
    .map(Number);

  const [closeHour, closeMinute] = center.closeTime
    .split(":")
    .map(Number);

  const start = new Date(schedule.date);

  start.setHours(openHour, openMinute, 0, 0);

  const close = new Date(schedule.date);

  close.setHours(closeHour, closeMinute, 0, 0);

  // Start searching from opening time.
  let candidateStart = new Date(start);

  // Apply current emergency delay.
  candidateStart.setMinutes(
    candidateStart.getMinutes() + schedule.delayMinutes
  );

  if (candidateStart < earliestStart) {
    candidateStart = new Date(earliestStart);
  }

  const durationMinutes = center.timePerFarmer;

  for (const booking of centerBookings) {
  const bookingStart = new Date(
    booking.allocatedStart!
  );

  const bookingEnd = new Date(
    booking.allocatedEnd!
  );

  const candidateEnd = new Date(candidateStart);

  candidateEnd.setMinutes(
    candidateEnd.getMinutes() + durationMinutes
  );

  if (candidateEnd <= bookingStart) {
    return {
      start: candidateStart,
      end: candidateEnd,
    };
  }

  if (bookingEnd > candidateStart) {
    candidateStart = new Date(bookingEnd);
  }
}

  // Check final available slot.
  const candidateEnd = new Date(candidateStart);

  candidateEnd.setMinutes(
    candidateEnd.getMinutes() + durationMinutes
  );

  if (candidateEnd <= close) {
    return {
      start: candidateStart,
      end: candidateEnd,
    };
  }

  return null;
}

// ============================================================
// POST - AFRICA'S TALKING USSD CALLBACK
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // ========================================================
    // 1. READ AFRICA'S TALKING REQUEST
    // ========================================================

    const rawBody = await req.text();

    const data = new URLSearchParams(rawBody);

    const sessionId =
      data.get("sessionId") || "";

    const phoneNumber =
      data.get("phoneNumber") || "";

    const text =
      data.get("text") || "";

    console.log("USSD request:", {
      sessionId,
      phoneNumber,
      text,
    });

    // ========================================================
    // 2. FIND FARMER'S MOST RECENT ACTIVE BOOKING
    // ========================================================

    const activeBooking =
      await db.orm.public.Booking
        .where({
          farmerPhone: phoneNumber,
        })
        .orderBy((b) => b.createdAt.desc())
        .first();

    // ========================================================
    // TERMINAL BOOKING STATUSES
    // ========================================================

    const terminalStatuses = [
      "REJECTED",
      "EXPIRED",
      "ACCEPTED",
      "MONEY_TRANSFERRED",
    ];

    const canMakeNewBooking =
      !activeBooking ||
      terminalStatuses.includes(activeBooking.status);

    // ========================================================
    // NEW BOOKING FLOW
    // ========================================================

    if (canMakeNewBooking) {
      const inputs = text
        .split("*")
        .filter((value) => value !== "");

      const level = inputs.length;

      // ======================================================
      // STEP 1 - CROP
      // ======================================================

      if (level === 0) {
        return new Response(
          `CON Welcome to Q8Far.
Enter Crop Code:
1. Paddy
2. Wheat
3. Maize`,
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }

      // ======================================================
      // STEP 2 - PINCODE
      // ======================================================

      if (level === 1) {
        const cropCode = inputs[0];

        const crop = getCropType(cropCode);

        if (crop === "OTHER") {
          return new Response(
            "END Invalid crop selection.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        return new Response(
          `CON Enter your full 6-digit Pincode:`,
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }

      // ======================================================
      // STEP 3 - CENTER SELECTION
      // ======================================================

      if (level === 2) {
        const cropCode = inputs[0];

        const pincode = inputs[1];

        if (!/^\d{6}$/.test(pincode)) {
          return new Response(
            "CON Enter a 6-digit pincode:",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        const crop = getCropType(cropCode);

        const centers =
          await findEligibleCenters(
            crop,
            pincode
          );

        if (centers.length === 0) {
          return new Response(
            `END No procurement centers found near ${pincode} accepting ${crop}.`,
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        const centerSchedules = await Promise.all(
          centers.map((center) => db.orm.public.Schedule
            .where({ centerId: center.id, date: getTodayIso() })
            .first()),
        );
        let responseText = `CON Select Procurement Center:\n`;

        centers.forEach((center, index) => {
          const schedule = centerSchedules[index];
          const maxBags = schedule
            ? Math.floor(schedule.availableCapacity / ESTIMATED_BAG_WEIGHT_KG)
            : 0;
          responseText += `${index + 1}. ${center.landmark || center.name}\n`;
          responseText += `   Max for one farmer: ${maxBags} bags\n`;
        });

        return new Response(
          responseText,
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }

      // ======================================================
      // STEP 4 - QUANTITY
      // ======================================================

      if (level === 3) {
        const centerSelection =
          parseInt(inputs[2]);

        if (
          Number.isNaN(centerSelection) ||
          centerSelection <= 0
        ) {
          return new Response(
            "END Invalid center selection.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        const crop = getCropType(inputs[0]);
        const centers = await findEligibleCenters(
          crop,
          inputs[1]
        );
        const selectedCenter = centers[centerSelection - 1];

        if (!selectedCenter) {
          return new Response(
            "END Invalid procurement center selection.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        return new Response(
          `CON Enter quantity you want to sell (bags):
Minimum quantity: ${selectedCenter.minBags} bags`,
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }

      // ======================================================
      // STEP 5 - CREATE BOOKING
      // ======================================================

      if (level === 4) {
        const cropCode = inputs[0];

        const pincode = inputs[1];

        const centerSelectionIdx =
          parseInt(inputs[2]) - 1;

        const quantity =
          parseInt(inputs[3]);

        // ----------------------------------------------------
        // VALIDATE INPUT
        // ----------------------------------------------------

        if (
          Number.isNaN(centerSelectionIdx) ||
          Number.isNaN(quantity) ||
          quantity <= 0
        ) {
          return new Response(
            Number.isNaN(quantity) || quantity <= 0
              ? "CON Enter quantity in bags:"
              : "END Invalid procurement center selection.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        const crop = getCropType(cropCode);

        const centers =
          await findEligibleCenters(
            crop,
            pincode
          );

        const selectedCrop = await db.orm.public.Crop
          .where((cropRecord) => cropRecord.name.ilike(crop))
          .first();

        const selectedCenter =
          centers[centerSelectionIdx];

        if (!selectedCenter || !selectedCrop) {
          return new Response(
            "END Invalid procurement center selection.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        if (quantity < selectedCenter.minBags) {
          return new Response(
            `CON Enter at least ${selectedCenter.minBags} bags:`,
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        // ----------------------------------------------------
        // ESTIMATE REQUESTED CAPACITY
        // ----------------------------------------------------

        const estimatedWeightKg =
          getEstimatedWeightKg(quantity);

        // ----------------------------------------------------
        // GET TODAY'S SCHEDULE
        // ----------------------------------------------------

        let schedule =
          await getTodaySchedule(
            selectedCenter
          );

        // ----------------------------------------------------
        // EMERGENCY / SOS CHECK
        // ----------------------------------------------------

        if (
          schedule.isSuspended ||
          schedule.status === "CLOSED"
        ) {
          return new Response(
            "END This procurement center is temporarily unavailable. Please try again later.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        // ----------------------------------------------------
        // CAPACITY WATCHGUARD
        // ----------------------------------------------------
        //
        // This checks whether the farmer's DECLARED load
        // can reasonably fit into today's remaining capacity.
        //
        // Reserve the declared load when the booking is created. The
        // reservation is restored if the booking is rejected or expires.
        // ----------------------------------------------------

        if (
          estimatedWeightKg >
          schedule.availableCapacity
        ) {
          return new Response(
            `END Not enough capacity today.
Estimated load: ${estimatedWeightKg}kg
Available capacity: ${schedule.availableCapacity}kg
Please select another center or day.`,
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        // ----------------------------------------------------
        // FIND AVAILABLE TIME
        // ----------------------------------------------------

        const earliestToday = new Date(
          Date.now() + 2 * 60 * 60 * 1000
        );

        let slot =
          await findNextAvailableSlot(
            selectedCenter,
            schedule,
            earliestToday
          );

        if (!slot) {
          const tomorrowSchedule =
            await getScheduleForDate(
              selectedCenter,
              getTomorrow()
            );

          if (
            tomorrowSchedule.isSuspended ||
            tomorrowSchedule.status === "CLOSED"
          ) {
            return new Response(
              "END No appointment slot is available today, and tomorrow's procurement center is unavailable.",
              {
                status: 200,
                headers: {
                  "Content-Type": "text/plain",
                },
              }
            );
          }

          if (
            estimatedWeightKg >
            tomorrowSchedule.availableCapacity
          ) {
            return new Response(
              `END No capacity remains today, and tomorrow has insufficient capacity.
Estimated load: ${estimatedWeightKg}kg
Available tomorrow: ${tomorrowSchedule.availableCapacity}kg`,
              {
                status: 200,
                headers: {
                  "Content-Type": "text/plain",
                },
              }
            );
          }

          schedule = tomorrowSchedule;
          slot = await findNextAvailableSlot(
            selectedCenter,
            schedule,
            new Date(schedule.date)
          );
        }

        if (!slot) {
          return new Response(
            "END No appointment slot is available today or tomorrow. Please try another center or day.",
            {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        }

        // ----------------------------------------------------
        // CREATE TOKEN
        // ----------------------------------------------------

        const bookingToken =
          await createBookingToken();

        const reservedCapacity = schedule.availableCapacity - estimatedWeightKg;
        await db.orm.public.Schedule
          .where({ id: schedule.id })
          .update({ availableCapacity: reservedCapacity });

        // ----------------------------------------------------
        // CREATE BOOKING
        // ----------------------------------------------------

        await db.orm.public.Booking.create({
          token: bookingToken,

          farmerPhone: phoneNumber,

          cropId: selectedCrop.id,

          quantity: quantity,

          centerId: selectedCenter.id,

          scheduleId: schedule.id,

          status: "PENDING",

          qualityStatus: "PENDING",

          paymentStatus: "NOT_STARTED",

          aadhaarChecked: false,

          allocatedStart:
            slot.start.toISOString(),

          allocatedEnd:
            slot.end.toISOString(),
        });

        // ----------------------------------------------------
        // FARMER RESPONSE+
        // ----------------------------------------------------

        return new Response(
          `END Booking request received!
Token: ${bookingToken}
Center: ${
            selectedCenter.landmark ||
            selectedCenter.name
          }
Date: ${slot.start.toLocaleDateString(
            "en-IN"
          )}
Time: ${formatTime(
            slot.start
          )} - ${formatTime(
            slot.end
          )}
Declared quantity: ${quantity} bags
Estimated weight: ${estimatedWeightKg}kg
Status: Pending center phone verification.
Bring:
1. Aadhaar Card
2. Vehicle
3. Your booking Token
Show Token at center.`,
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }
    }

    // ========================================================
    // ACTIVE BOOKING FLOW
    // ========================================================

    if (!activeBooking) {
      return new Response(
        "END No active booking found.",
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    }

    // ========================================================
    // FARMER TRACKING
    // ========================================================

    const cleanText = text.trim();

    // --------------------------------------------------------
    // PAYMENT / FINAL STAGE
    // --------------------------------------------------------

    const isFinishingPayment = [
      "TARE_WEIGHED",
      "ACCEPTED",
      "PAYMENT_INITIATED",
      "MONEY_TRANSFERRED",
    ].includes(activeBooking.status);

    // --------------------------------------------------------
    // MAIN ACTIVE BOOKING MENU
    // --------------------------------------------------------

    if (cleanText === "") {
      return new Response(
        isFinishingPayment
          ? `CON 1. View Payout & Payment Status`
          : `CON 1. Track Booking Status`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    }

    // ========================================================
    // TRACKING
    // ========================================================

    if (cleanText === "1") {
      // ------------------------------------------------------
      // PAYMENT STATUS
      // ------------------------------------------------------

      if (isFinishingPayment) {
        const payoutAmount =
          activeBooking.finalPayout != null
            ? `${activeBooking.finalPayout} INR`
            : "Calculating...";

        return new Response(
          `END Payment Status:

Booking: ${activeBooking.status}

Payment: ${
            activeBooking.paymentStatus
          }

Net Weight: ${
            activeBooking.netWeightKg != null
              ? `${activeBooking.netWeightKg} kg`
              : "Not available"
          }

Final Payout: ${payoutAmount}

Transaction: ${
            activeBooking.paymentRefId ||
            "Not available"
          }`,
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }

      // ------------------------------------------------------
      // FETCH SCHEDULE
      // ------------------------------------------------------

      const relatedSchedule =
        await db.orm.public.Schedule
          .where({
            id: activeBooking.scheduleId,
          })
          .first();

      let extraInfo = "";

      // ------------------------------------------------------
      // SLOT BOOKED
      // ------------------------------------------------------

      if (
        activeBooking.status === "SLOT_BOOKED" &&
        activeBooking.allocatedStart
      ) {
        const finalTime =
          new Date(
            activeBooking.allocatedStart
          );

        const delay =
          relatedSchedule?.delayMinutes || 0;

        if (delay > 0) {
          finalTime.setMinutes(
            finalTime.getMinutes() + delay
          );

          extraInfo =
            `\nCenter delay: ${delay} minutes` +
            `\nNew arrival time: ${formatTime(
              finalTime
            )}`;
        } else {
          extraInfo =
            `\nArrival time: ${formatTime(
              finalTime
            )}`;
        }
      }

      // ------------------------------------------------------
      // ARRIVED
      // ------------------------------------------------------

      else if (
        activeBooking.status === "ARRIVED"
      ) {
        extraInfo =
          `\nAadhaar verification completed.` +
          `\nProceed to weighbridge.`;
      }

      // ------------------------------------------------------
      // GROSS WEIGHED
      // ------------------------------------------------------

      else if (
        activeBooking.status === "GROSS_WEIGHED"
      ) {
        extraInfo =
          `\nGross Weight: ${
            activeBooking.grossWeightKg || 0
          } kg` +
          `\nQuality check is pending.`;
      }

      // ------------------------------------------------------
      // QUALITY CHECKED
      // ------------------------------------------------------

      else if (
        activeBooking.status ===
        "QUALITY_CHECKED"
      ) {
        extraInfo =
          `\nQuality: ${
            activeBooking.qualityStatus
          }` +
          `\nWaiting for tare weighing.`;
      }

      // ------------------------------------------------------
      // TARE WEIGHED
      // ------------------------------------------------------

      else if (
        activeBooking.status ===
        "TARE_WEIGHED"
      ) {
        extraInfo =
          `\nGross: ${
            activeBooking.grossWeightKg || 0
          } kg` +
          `\nTare: ${
            activeBooking.tareWeightKg || 0
          } kg` +
          `\nNet: ${
            activeBooking.netWeightKg || 0
          } kg`;
      }

      // ------------------------------------------------------
      // ACCEPTED
      // ------------------------------------------------------

      else if (
        activeBooking.status === "ACCEPTED"
      ) {
        extraInfo =
          `\nCrop accepted by procurement center.` +
          `\nNet Weight: ${
            activeBooking.netWeightKg || 0
          } kg`;
      }

      // ------------------------------------------------------
      // PAYMENT INITIATED
      // ------------------------------------------------------

      else if (
        activeBooking.status ===
        "PAYMENT_INITIATED"
      ) {
        extraInfo =
          `\nPayment has been initiated.` +
          `\nPayout: ${
            activeBooking.finalPayout || 0
          } INR`;
      }

      // ------------------------------------------------------
      // MONEY TRANSFERRED
      // ------------------------------------------------------

      else if (
        activeBooking.status ===
        "MONEY_TRANSFERRED"
      ) {
        extraInfo =
          `\nPayment transferred successfully.` +
          `\nAmount: ${
            activeBooking.finalPayout || 0
          } INR`;
      }

      // ------------------------------------------------------
      // REJECTED
      // ------------------------------------------------------

      else if (
        activeBooking.status === "REJECTED"
      ) {
        extraInfo =
          `\nYour procurement request was rejected.`;
      }

      // ------------------------------------------------------
      // EXPIRED
      // ------------------------------------------------------

      else if (
        activeBooking.status === "EXPIRED"
      ) {
        extraInfo =
          `\nYour booking has expired.` +
          `\nPlease create a new booking.`;
      }

      return new Response(
        `END Booking Status: ${
          activeBooking.status
        }.${extraInfo}`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    }

    // ========================================================
    // INVALID OPTION
    // ========================================================

    return new Response(
      "END Invalid entry.",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );

  } catch (error) {
    console.error(
      "Q8Far USSD Error:",
      error
    );

    return new Response(
      "END System error. Please try again later.",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }
}