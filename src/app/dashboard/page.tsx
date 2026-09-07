import { db } from "@/prisma/db";
import { auth } from "@/auth"; // Your NextAuth / Auth.js configuration session helper
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import CurrentSchedule from "@/app/components/currentSchedule";

const scheduleFormSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid schedule date"),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid opening time"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid closing time"),
  timePerFarmer: z.coerce.number().int().min(45, "Time per farmer must be at least 45 minutes"),
  totalCapacityKg: z.coerce.number().int().positive("Capacity must be greater than zero"),
});

async function setupSchedule(formData: FormData) {
  "use server";

  const session = await auth();
  const centerId = session?.user?.id;
  if (!centerId) redirect("/auth/login");

  const selectedCropIds = formData.getAll("selectedCrops").filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const parsed = scheduleFormSchema.safeParse({
    startDate: formData.get("startDate"),
    openTime: formData.get("openTime"),
    closeTime: formData.get("closeTime"),
    timePerFarmer: formData.get("timePerFarmer"),
    totalCapacityKg: formData.get("totalCapacityKg"),
  });

  if (!parsed.success || selectedCropIds.length === 0) {
    throw new Error(parsed.success ? "Select at least one crop type." : parsed.error.issues[0]?.message);
  }

  const { startDate, openTime, closeTime, timePerFarmer, totalCapacityKg } = parsed.data;
  const date = `${startDate}T00:00:00.000Z`;
  const [existingSchedule, crops, currentCropLinks] = await Promise.all([
    db.orm.public.Schedule.where({ centerId, date }).first(),
    db.orm.public.Crop.all(),
    db.orm.public.CenterOnCrops.where({ centerId }).all(),
  ]);

  if (existingSchedule) {
    redirect("/dashboard");
  }

  const validCropIds = new Set(crops.map((crop) => crop.id));
  const invalidCropSelected = selectedCropIds.some((cropId) => !validCropIds.has(cropId));
  if (invalidCropSelected) {
    throw new Error("One or more selected crops are no longer available.");
  }

  const currentCropIds = new Set(currentCropLinks.map((link) => link.cropId));
  const currentIsoString = new Date().toISOString();

  await db.orm.public.ProcurementCenter
    .where({ id: centerId })
    .update({ openTime, closeTime, timePerFarmer, updatedAt: currentIsoString });

  await Promise.all(
    selectedCropIds
      .filter((cropId) => !currentCropIds.has(cropId))
      .map((cropId) => db.orm.public.CenterOnCrops.create({ centerId, cropId })),
  );

  await db.orm.public.Schedule.create({
    centerId,
    date,
    totalCapacity: totalCapacityKg,
    availableCapacity: totalCapacityKg,
    status: "AVAILABLE",
    isSuspended: false,
    delayMinutes: 0,
    createdAt: currentIsoString,
    updatedAt: currentIsoString,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export default async function DashboardPage() {
  const session = await auth();
  const centerId = session?.user?.id;
  if (!centerId) redirect("/auth/login");

  const today = new Date();
  const todayIso = `${today.toISOString().split("T")[0]}T00:00:00.000Z`;
  const [center, schedules, crops, cropLinks] = await Promise.all([
    db.orm.public.ProcurementCenter.where({ id: centerId }).first(),
    db.orm.public.Schedule.where({ centerId }).all(),
    db.orm.public.Crop.all(),
    db.orm.public.CenterOnCrops.where({ centerId }).all(),
  ]);

  if (!center) redirect("/auth/login");

  const todayStart = new Date(todayIso).getTime();
  const schedule = schedules.find((item) => item.date === todayIso)
    || schedules.find((item) => Math.abs(new Date(item.date).getTime() - todayStart) < 24 * 60 * 60 * 1000);
  const linkedCropIds = new Set(cropLinks.map((link) => link.cropId));

  if (schedule) {
    return <CurrentSchedule />;
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-agri-bgLight to-[#E2EAE4] p-6 font-body text-agri-neutral flex items-center justify-center">
      <section className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-md p-8 space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <span className="font-label text-xs tracking-widest text-agri-secondary uppercase font-semibold">Operations Dashboard</span>
          <h1 className="font-headline text-3xl font-bold tracking-tight mt-1">Set Today&apos;s Schedule</h1>
          <p className="text-sm text-slate-500 mt-2">Configure the operating window and capacity before accepting farmer bookings.</p>
        </div>

        <form action={setupSchedule} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Date
              <input name="startDate" type="date" defaultValue={today.toISOString().split("T")[0]} required className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-normal" />
            </label>
            <label className="text-sm font-semibold">Minutes per farmer
              <input name="timePerFarmer" type="number" min="45" defaultValue={center.timePerFarmer} required className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-normal" />
            </label>
            <label className="text-sm font-semibold">Opening time
              <input name="openTime" type="time" defaultValue={center.openTime} required className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-normal" />
            </label>
            <label className="text-sm font-semibold">Closing time
              <input name="closeTime" type="time" defaultValue={center.closeTime} required className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-normal" />
            </label>
          </div>

          <label className="block text-sm font-semibold">Total capacity (kg)
            <input name="totalCapacityKg" type="number" min="1" defaultValue={center.maxStorageKg} required className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-sm font-normal" />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Accepted crops</legend>
            {crops.length === 0 ? (
              <p className="text-sm text-slate-500">No crops are available in the database.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {crops.map((crop) => (
                  <label key={crop.id} className="flex items-center gap-2 border border-slate-200 rounded-sm px-3 py-2 text-sm">
                    <input type="checkbox" name="selectedCrops" value={crop.id} defaultChecked={linkedCropIds.has(crop.id)} />
                    {crop.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <button type="submit" disabled={crops.length === 0} className="w-full bg-agri-primary text-white font-semibold py-3 rounded-sm hover:bg-[#0d3624] transition-colors disabled:bg-slate-300">
            Save Schedule
          </button>
        </form>
      </section>
    </main>
  );
}
