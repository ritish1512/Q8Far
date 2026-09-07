import { db } from "./src/prisma/db";

async function main() {
  console.log("🌱 Starting database seed...");

  // ==========================================================
  // 1. CREATE CROPS
  // ==========================================================

  console.log("Creating crops...");

  const paddy = await db.orm.public.Crop.create({
    name: "Paddy",
    ussdCode: "1",
    currentBasePrice: 25,
    maxMoisturePct: 14,
  });

  const wheat = await db.orm.public.Crop.create({
    name: "Wheat",
    ussdCode: "2",
    currentBasePrice: 30,
    maxMoisturePct: 14,
  });

  const maize = await db.orm.public.Crop.create({
    name: "Maize",
    ussdCode: "3",
    currentBasePrice: 22,
    maxMoisturePct: 14,
  });

  console.log("✅ Crops created");

  // ==========================================================
  // 2. CREATE PROCUREMENT CENTERS
  // ==========================================================

  console.log("Creating procurement centers...");

  const center1 =
    await db.orm.public.ProcurementCenter.create({
      name: "Q8Far Main Procurement Center",

      email: "main@q8far.test",

      passwordHash:
        "SEED_PASSWORD_HASH_REPLACE_LATER",

      isEmailVerified: true,

      pincode: "600001",

      location: "Chennai",

      landmark: "Central Market",

      fullAddress:
        "Q8Far Main Procurement Center, Central Market, Chennai, Tamil Nadu",

      openTime: "09:00",

      closeTime: "17:00",

      timePerFarmer: 45,

      minBags: 1,

      currentStorageKg: 10000,

      maxStorageKg: 50000,
    });

  const center2 =
    await db.orm.public.ProcurementCenter.create({
      name: "Q8Far North Procurement Center",

      email: "north@q8far.test",

      passwordHash:
        "SEED_PASSWORD_HASH_REPLACE_LATER",

      isEmailVerified: true,

      pincode: "600010",

      location: "Chennai",

      landmark: "North Market",

      fullAddress:
        "Q8Far North Procurement Center, North Market, Chennai, Tamil Nadu",

      openTime: "09:00",

      closeTime: "17:00",

      timePerFarmer: 30,

      minBags: 1,

      currentStorageKg: 5000,

      maxStorageKg: 30000,
    });

  console.log("✅ Procurement centers created");

  // ==========================================================
  // 3. CONNECT CENTERS TO CROPS
  // ==========================================================

  console.log("Connecting centers to crops...");

  // Main center accepts Paddy + Wheat
  await db.orm.public.CenterOnCrops.create({
    centerId: center1.id,
    cropId: paddy.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: center1.id,
    cropId: wheat.id,
  });

  // North center accepts Paddy + Maize
  await db.orm.public.CenterOnCrops.create({
    centerId: center2.id,
    cropId: paddy.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: center2.id,
    cropId: maize.id,
  });

  console.log("✅ Center crop relationships created");

  // ==========================================================
  // 4. CREATE TODAY'S SCHEDULES
  // ==========================================================

  console.log("Creating today's schedules...");

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  await db.orm.public.Schedule.create({
    centerId: center1.id,

    date: today.toISOString(),

    totalCapacity: center1.maxStorageKg,

    availableCapacity:
      center1.maxStorageKg,

    status: "AVAILABLE",

    isSuspended: false,

    delayMinutes: 0,
  });

  await db.orm.public.Schedule.create({
    centerId: center2.id,

    date: today.toISOString(),

    totalCapacity: center2.maxStorageKg,

    availableCapacity:
      center2.maxStorageKg,

    status: "AVAILABLE",

    isSuspended: false,

    delayMinutes: 0,
  });

  console.log("✅ Today's schedules created");

  // ==========================================================
  // 5. SUMMARY
  // ==========================================================

  console.log("");
  console.log("======================================");
  console.log("🌱 DATABASE SEED COMPLETE");
  console.log("======================================");

  console.log("");
  console.log("CROPS");
  console.log("1 → Paddy");
  console.log("2 → Wheat");
  console.log("3 → Maize");

  console.log("");
  console.log("CENTERS");
  console.log("600001 → Q8Far Main Procurement Center");
  console.log("600010 → Q8Far North Procurement Center");

  console.log("");
  console.log("CENTER 1 CROPS");
  console.log("Paddy");
  console.log("Wheat");

  console.log("");
  console.log("CENTER 2 CROPS");
  console.log("Paddy");
  console.log("Maize");

  console.log("");
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);

    process.exit(1);
  });