import { db } from "./src/prisma/db";

/**
 * Q8Far - Prisma Next test seed
 *
 * Designed to populate the database with enough realistic data to test:
 *
 * - Crop listing/filtering
 * - Procurement center listing
 * - Center/crop relationships
 * - Schedule availability
 * - Full/closed/suspended schedules
 * - Booking creation
 * - Booking status workflows
 * - Aadhaar verification
 * - Gross/tare/net weighing
 * - Quality pass/fail
 * - Payment states
 * - Rejection
 * - Expiration
 * - Multiple farmers
 * - Multiple dates
 * - Auth tokens
 *
 * Run:
 *
 *   npx tsx seed.ts
 */

const crops = {
  paddy: null as any,
  wheat: null as any,
  maize: null as any,
  cotton: null as any,
};

const centers = {
  main: null as any,
  north: null as any,
  south: null as any,
  rural: null as any,
};

const schedules = {
  mainToday: null as any,
  mainTomorrow: null as any,
  mainYesterday: null as any,

  northToday: null as any,
  northTomorrow: null as any,

  southToday: null as any,

  ruralToday: null as any,
  ruralTomorrow: null as any,
};

function dateAt(daysFromToday: number, hours: number, minutes = 0) {
  const date = new Date();

  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hours, minutes, 0, 0);

  return date.toISOString();
}

function dayStart(daysFromToday: number) {
  const date = new Date();

  date.setDate(date.getDate() + daysFromToday);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

async function cleanDatabase() {
  console.log("🧹 Cleaning existing database...");

  /**
   * Delete children first because the schema has foreign-key relationships.
   *
   * Booking
   * AuthToken
   * CenterOnCrops
   *
   * then:
   * Schedule
   * Crop
   * ProcurementCenter
   */

  await (db.orm.public.Booking as any).deleteAll();

  console.log("   ✓ Bookings deleted");

  await (db.orm.public.AuthToken as any).deleteAll();

  console.log("   ✓ Auth tokens deleted");

  await (db.orm.public.CenterOnCrops as any).deleteAll();

  console.log("   ✓ Center/crop relationships deleted");

  await (db.orm.public.Schedule as any).deleteAll();

  console.log("   ✓ Schedules deleted");

  await (db.orm.public.Crop as any).deleteAll();

  console.log("   ✓ Crops deleted");

  await (db.orm.public.ProcurementCenter as any).deleteAll();

  console.log("   ✓ Procurement centers deleted");

  console.log("✅ Database cleaned");
}

async function createCrops() {
  console.log("");
  console.log("🌾 Creating crops...");

  crops.paddy = await db.orm.public.Crop.create({
    name: "Paddy",
    ussdCode: "1",
    currentBasePrice: 25,
    maxMoisturePct: 14,
  });

  crops.wheat = await db.orm.public.Crop.create({
    name: "Wheat",
    ussdCode: "2",
    currentBasePrice: 30,
    maxMoisturePct: 14,
  });

  crops.maize = await db.orm.public.Crop.create({
    name: "Maize",
    ussdCode: "3",
    currentBasePrice: 22,
    maxMoisturePct: 14,
  });

  /**
   * Extra crop intentionally included so the UI can be tested
   * with a crop that is not accepted by every center.
   */
  crops.cotton = await db.orm.public.Crop.create({
    name: "Cotton",
    ussdCode: "4",
    currentBasePrice: 65,
    maxMoisturePct: 12,
  });

  console.log("✅ Crops created");
}

async function createCenters() {
  console.log("");
  console.log("🏢 Creating procurement centers...");

  centers.main =
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

  centers.north =
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

  centers.south =
    await db.orm.public.ProcurementCenter.create({
      name: "Q8Far South Procurement Center",

      email: "south@q8far.test",

      passwordHash:
        "SEED_PASSWORD_HASH_REPLACE_LATER",

      isEmailVerified: true,

      pincode: "600028",

      location: "Chennai",

      landmark: "South Agricultural Market",

      fullAddress:
        "Q8Far South Procurement Center, South Market, Chennai, Tamil Nadu",

      openTime: "08:30",

      closeTime: "18:00",

      timePerFarmer: 60,

      minBags: 2,

      currentStorageKg: 35000,

      maxStorageKg: 40000,
    });

  /**
   * This center intentionally has high inventory.
   * Useful for testing "low available storage" UI.
   */
  centers.rural =
    await db.orm.public.ProcurementCenter.create({
      name: "Q8Far Rural Procurement Center",

      email: "rural@q8far.test",

      passwordHash:
        "SEED_PASSWORD_HASH_REPLACE_LATER",

      isEmailVerified: true,

      pincode: "603001",

      location: "Chengalpattu",

      landmark: "Farmers Cooperative",

      fullAddress:
        "Q8Far Rural Procurement Center, Farmers Cooperative, Chengalpattu, Tamil Nadu",

      openTime: "07:00",

      closeTime: "15:00",

      timePerFarmer: 20,

      minBags: 1,

      currentStorageKg: 9500,

      maxStorageKg: 10000,
    });

  console.log("✅ Procurement centers created");
}

async function connectCentersToCrops() {
  console.log("");
  console.log("🔗 Connecting centers to crops...");

  // MAIN → Paddy, Wheat, Maize
  await db.orm.public.CenterOnCrops.create({
    centerId: centers.main.id,
    cropId: crops.paddy.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: centers.main.id,
    cropId: crops.wheat.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: centers.main.id,
    cropId: crops.maize.id,
  });

  // NORTH → Paddy, Maize
  await db.orm.public.CenterOnCrops.create({
    centerId: centers.north.id,
    cropId: crops.paddy.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: centers.north.id,
    cropId: crops.maize.id,
  });

  // SOUTH → Wheat, Cotton
  await db.orm.public.CenterOnCrops.create({
    centerId: centers.south.id,
    cropId: crops.wheat.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: centers.south.id,
    cropId: crops.cotton.id,
  });

  // RURAL → Paddy, Wheat
  await db.orm.public.CenterOnCrops.create({
    centerId: centers.rural.id,
    cropId: crops.paddy.id,
  });

  await db.orm.public.CenterOnCrops.create({
    centerId: centers.rural.id,
    cropId: crops.wheat.id,
  });

  console.log("✅ Center/crop relationships created");
}

async function createSchedules() {
  console.log("");
  console.log("📅 Creating schedules...");

  // ============================================================
  // MAIN CENTER
  // ============================================================

  schedules.mainToday =
    await db.orm.public.Schedule.create({
      centerId: centers.main.id,

      date: dayStart(0),

      totalCapacity: 50000,

      availableCapacity: 40000,

      status: "AVAILABLE",

      isSuspended: false,

      delayMinutes: 0,
    });

  schedules.mainTomorrow =
    await db.orm.public.Schedule.create({
      centerId: centers.main.id,

      date: dayStart(1),

      totalCapacity: 50000,

      availableCapacity: 50000,

      status: "AVAILABLE",

      isSuspended: false,

      delayMinutes: 0,
    });

  schedules.mainYesterday =
    await db.orm.public.Schedule.create({
      centerId: centers.main.id,

      date: dayStart(-1),

      totalCapacity: 50000,

      availableCapacity: 0,

      status: "FULL",

      isSuspended: false,

      delayMinutes: 0,
    });

  // ============================================================
  // NORTH CENTER
  // ============================================================

  schedules.northToday =
    await db.orm.public.Schedule.create({
      centerId: centers.north.id,

      date: dayStart(0),

      totalCapacity: 30000,

      availableCapacity: 15000,

      status: "AVAILABLE",

      isSuspended: false,

      delayMinutes: 15,
    });

  schedules.northTomorrow =
    await db.orm.public.Schedule.create({
      centerId: centers.north.id,

      date: dayStart(1),

      totalCapacity: 30000,

      availableCapacity: 0,

      status: "FULL",

      isSuspended: false,

      delayMinutes: 0,
    });

  // ============================================================
  // SOUTH CENTER
  // ============================================================

  schedules.southToday =
    await db.orm.public.Schedule.create({
      centerId: centers.south.id,

      date: dayStart(0),

      totalCapacity: 40000,

      availableCapacity: 5000,

      status: "AVAILABLE",

      isSuspended: true,

      delayMinutes: 60,
    });

  // ============================================================
  // RURAL CENTER
  // ============================================================

  schedules.ruralToday =
    await db.orm.public.Schedule.create({
      centerId: centers.rural.id,

      date: dayStart(0),

      totalCapacity: 10000,

      availableCapacity: 500,

      status: "AVAILABLE",

      isSuspended: false,

      delayMinutes: 5,
    });

  schedules.ruralTomorrow =
    await db.orm.public.Schedule.create({
      centerId: centers.rural.id,

      date: dayStart(1),

      totalCapacity: 10000,

      availableCapacity: 0,

      status: "CLOSED",

      isSuspended: false,

      delayMinutes: 0,
    });

  console.log("✅ Schedules created");
}

async function createAuthTokens() {
  console.log("");
  console.log("🔐 Creating authentication tokens...");

  await db.orm.public.AuthToken.create({
    centerId: centers.main.id,

    tokenHash:
      "seed-email-verification-main-token-hash",

    type: "EMAIL_VERIFICATION",

    expiresAt: dateAt(7, 23, 59),

    usedAt: null,
  });

  await db.orm.public.AuthToken.create({
    centerId: centers.north.id,

    tokenHash:
      "seed-password-reset-north-token-hash",

    type: "PASSWORD_RESET",

    expiresAt: dateAt(1, 23, 59),

    usedAt: null,
  });

  await db.orm.public.AuthToken.create({
    centerId: centers.south.id,

    tokenHash:
      "seed-expired-verification-token-hash",

    type: "EMAIL_VERIFICATION",

    expiresAt: dateAt(-2, 23, 59),

    usedAt: null,
  });

  await db.orm.public.AuthToken.create({
    centerId: centers.rural.id,

    tokenHash:
      "seed-used-reset-token-hash",

    type: "PASSWORD_RESET",

    expiresAt: dateAt(5, 23, 59),

    usedAt: dateAt(-1, 12, 0),
  });

  console.log("✅ Auth tokens created");
}

async function createBookings() {
  console.log("");
  console.log("👨‍🌾 Creating test bookings...");

  // ============================================================
  // 1. PENDING
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-PENDING-001",

    farmerPhone: "9000000001",

    farmerName: "Arun Kumar",

    bankAccount: "XXXXXX1001",

    cropId: crops.paddy.id,

    quantity: 20,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "PENDING",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: null,

    allocatedEnd: null,

    aadhaarChecked: false,

    verifiedAt: null,

    grossWeightKg: null,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: null,

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  // ============================================================
  // 2. SLOT BOOKED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-SLOT-BOOKED-001",

    farmerPhone: "9000000002",

    farmerName: "Priya Devi",

    bankAccount: "XXXXXX1002",

    cropId: crops.wheat.id,

    quantity: 30,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "SLOT_BOOKED",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 10, 0),

    allocatedEnd: dateAt(0, 10, 45),

    aadhaarChecked: false,

    verifiedAt: null,

    grossWeightKg: null,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: null,

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  // ============================================================
  // 3. ARRIVED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-ARRIVED-001",

    farmerPhone: "9000000003",

    farmerName: "Suresh Babu",

    bankAccount: "XXXXXX1003",

    cropId: crops.paddy.id,

    quantity: 40,

    centerId: centers.north.id,

    scheduleId: schedules.northToday.id,

    status: "ARRIVED",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 9, 30),

    allocatedEnd: dateAt(0, 10, 0),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 9, 35),

    grossWeightKg: null,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: null,

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  // ============================================================
  // 4. GROSS WEIGHED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-GROSS-001",

    farmerPhone: "9000000004",

    farmerName: "Meena Lakshmi",

    bankAccount: "XXXXXX1004",

    cropId: crops.maize.id,

    quantity: 50,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "GROSS_WEIGHED",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 11, 0),

    allocatedEnd: dateAt(0, 11, 45),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 10, 55),

    grossWeightKg: 5280,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: dateAt(0, 11, 10),

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  // ============================================================
  // 5. QUALITY CHECKED - PASSED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-QUALITY-PASS-001",

    farmerPhone: "9000000005",

    farmerName: "Ravi Chandran",

    bankAccount: "XXXXXX1005",

    cropId: crops.paddy.id,

    quantity: 60,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "QUALITY_CHECKED",

    qualityStatus: "PASSED",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 12, 0),

    allocatedEnd: dateAt(0, 12, 45),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 11, 55),

    grossWeightKg: 6250,

    tareWeightKg: 2250,

    netWeightKg: 4000,

    weighedAt: dateAt(0, 12, 15),

    moisturePct: 12.5,

    foreignMatterPct: 1.2,

    qualityCheckedAt: dateAt(0, 12, 25),

    basePricePerKg: 25,

    totalDeductions: 0,

    finalPayout: 100000,

    paymentRefId: null,
  });

  // ============================================================
  // 6. QUALITY CHECKED - FAILED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-QUALITY-FAIL-001",

    farmerPhone: "9000000006",

    farmerName: "Kannan Raj",

    bankAccount: "XXXXXX1006",

    cropId: crops.paddy.id,

    quantity: 40,

    centerId: centers.north.id,

    scheduleId: schedules.northToday.id,

    status: "QUALITY_CHECKED",

    qualityStatus: "FAILED",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 13, 0),

    allocatedEnd: dateAt(0, 13, 30),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 12, 50),

    grossWeightKg: 4250,

    tareWeightKg: 2250,

    netWeightKg: 2000,

    weighedAt: dateAt(0, 13, 10),

    moisturePct: 18.5,

    foreignMatterPct: 4.8,

    qualityCheckedAt: dateAt(0, 13, 20),

    basePricePerKg: 25,

    totalDeductions: 0,

    finalPayout: 0,

    paymentRefId: null,
  });

  // ============================================================
  // 7. TARE WEIGHED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-TARE-001",

    farmerPhone: "9000000007",

    farmerName: "Lakshmi Narayanan",

    bankAccount: "XXXXXX1007",

    cropId: crops.wheat.id,

    quantity: 50,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "TARE_WEIGHED",

    qualityStatus: "PASSED",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 13, 30),

    allocatedEnd: dateAt(0, 14, 15),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 13, 25),

    grossWeightKg: 6250,

    tareWeightKg: 2250,

    netWeightKg: 4000,

    weighedAt: dateAt(0, 14, 0),

    moisturePct: 11.5,

    foreignMatterPct: 0.8,

    qualityCheckedAt: dateAt(0, 13, 50),

    basePricePerKg: 30,

    totalDeductions: 1200,

    finalPayout: 118800,

    paymentRefId: null,
  });

  // ============================================================
  // 8. ACCEPTED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-ACCEPTED-001",

    farmerPhone: "9000000008",

    farmerName: "Vijay Kumar",

    bankAccount: "XXXXXX1008",

    cropId: crops.maize.id,

    quantity: 70,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "ACCEPTED",

    qualityStatus: "PASSED",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 14, 0),

    allocatedEnd: dateAt(0, 14, 45),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 13, 55),

    grossWeightKg: 7350,

    tareWeightKg: 2350,

    netWeightKg: 5000,

    weighedAt: dateAt(0, 14, 25),

    moisturePct: 12,

    foreignMatterPct: 1,

    qualityCheckedAt: dateAt(0, 14, 15),

    basePricePerKg: 22,

    totalDeductions: 500,

    finalPayout: 109500,

    paymentRefId: null,
  });

  // ============================================================
  // 9. PAYMENT INITIATED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-PAYMENT-INITIATED-001",

    farmerPhone: "9000000009",

    farmerName: "Anitha Devi",

    bankAccount: "XXXXXX1009",

    cropId: crops.paddy.id,

    quantity: 80,

    centerId: centers.main.id,

    scheduleId: schedules.mainToday.id,

    status: "PAYMENT_INITIATED",

    qualityStatus: "PASSED",

    paymentStatus: "INITIATED",

    allocatedStart: dateAt(0, 14, 30),

    allocatedEnd: dateAt(0, 15, 15),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 14, 25),

    grossWeightKg: 8400,

    tareWeightKg: 2400,

    netWeightKg: 6000,

    weighedAt: dateAt(0, 15, 0),

    moisturePct: 13,

    foreignMatterPct: 1.1,

    qualityCheckedAt: dateAt(0, 14, 50),

    basePricePerKg: 25,

    totalDeductions: 750,

    finalPayout: 149250,

    paymentRefId: "PAY-SEED-INIT-001",
  });

  // ============================================================
  // 10. MONEY TRANSFERRED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-MONEY-TRANSFERRED-001",

    farmerPhone: "9000000010",

    farmerName: "Bala Murugan",

    bankAccount: "XXXXXX1010",

    cropId: crops.wheat.id,

    quantity: 100,

    centerId: centers.south.id,

    scheduleId: schedules.southToday.id,

    status: "MONEY_TRANSFERRED",

    qualityStatus: "PASSED",

    paymentStatus: "CREDITED",

    allocatedStart: dateAt(0, 9, 0),

    allocatedEnd: dateAt(0, 10, 0),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 8, 55),

    grossWeightKg: 10500,

    tareWeightKg: 2500,

    netWeightKg: 8000,

    weighedAt: dateAt(0, 9, 45),

    moisturePct: 10.5,

    foreignMatterPct: 0.5,

    qualityCheckedAt: dateAt(0, 9, 30),

    basePricePerKg: 30,

    totalDeductions: 1000,

    finalPayout: 239000,

    paymentRefId: "PAY-SEED-CREDIT-001",
  });

  // ============================================================
  // 11. REJECTED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-REJECTED-001",

    farmerPhone: "9000000011",

    farmerName: "Selvam R",

    bankAccount: "XXXXXX1011",

    cropId: crops.cotton.id,

    quantity: 30,

    centerId: centers.south.id,

    scheduleId: schedules.southToday.id,

    status: "REJECTED",

    qualityStatus: "FAILED",

    paymentStatus: "FAILED",

    allocatedStart: dateAt(0, 10, 0),

    allocatedEnd: dateAt(0, 11, 0),

    aadhaarChecked: true,

    verifiedAt: dateAt(0, 9, 55),

    grossWeightKg: 3300,

    tareWeightKg: 1300,

    netWeightKg: 2000,

    weighedAt: dateAt(0, 10, 30),

    moisturePct: 21,

    foreignMatterPct: 7,

    qualityCheckedAt: dateAt(0, 10, 40),

    basePricePerKg: 65,

    totalDeductions: 0,

    finalPayout: 0,

    paymentRefId: "PAY-SEED-FAILED-001",
  });

  // ============================================================
  // 12. EXPIRED
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-EXPIRED-001",

    farmerPhone: "9000000012",

    farmerName: "Mohan Das",

    bankAccount: "XXXXXX1012",

    cropId: crops.paddy.id,

    quantity: 25,

    centerId: centers.rural.id,

    scheduleId: schedules.ruralToday.id,

    status: "EXPIRED",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(-1, 10, 0),

    allocatedEnd: dateAt(-1, 10, 20),

    aadhaarChecked: false,

    verifiedAt: null,

    grossWeightKg: null,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: null,

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  // ============================================================
  // ADDITIONAL BOOKING DATA
  // ============================================================

  await db.orm.public.Booking.create({
    token: "SEED-TODAY-PADDY-001",

    farmerPhone: "9000000013",

    farmerName: "Gopalakrishnan",

    bankAccount: "XXXXXX1013",

    cropId: crops.paddy.id,

    quantity: 35,

    centerId: centers.rural.id,

    scheduleId: schedules.ruralToday.id,

    status: "SLOT_BOOKED",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(0, 11, 0),

    allocatedEnd: dateAt(0, 11, 20),

    aadhaarChecked: false,

    verifiedAt: null,

    grossWeightKg: null,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: null,

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  await db.orm.public.Booking.create({
    token: "SEED-TOMORROW-WHEAT-001",

    farmerPhone: "9000000014",

    farmerName: "Saravanan",

    bankAccount: "XXXXXX1014",

    cropId: crops.wheat.id,

    quantity: 45,

    centerId: centers.main.id,

    scheduleId: schedules.mainTomorrow.id,

    status: "SLOT_BOOKED",

    qualityStatus: "PENDING",

    paymentStatus: "NOT_STARTED",

    allocatedStart: dateAt(1, 9, 0),

    allocatedEnd: dateAt(1, 9, 45),

    aadhaarChecked: false,

    verifiedAt: null,

    grossWeightKg: null,

    tareWeightKg: null,

    netWeightKg: null,

    weighedAt: null,

    moisturePct: null,

    foreignMatterPct: null,

    qualityCheckedAt: null,

    basePricePerKg: null,

    totalDeductions: null,

    finalPayout: null,

    paymentRefId: null,
  });

  console.log("✅ Test bookings created");
}

async function printSummary() {
  console.log("");
  console.log("==================================================");
  console.log("🌱 Q8Far DATABASE SEED COMPLETE");
  console.log("==================================================");

  console.log("");
  console.log("🌾 CROPS");
  console.log("------------------------------------------");

  console.log("1 → Paddy");
  console.log("2 → Wheat");
  console.log("3 → Maize");
  console.log("4 → Cotton");

  console.log("");
  console.log("🏢 PROCUREMENT CENTERS");
  console.log("------------------------------------------");

  console.log("600001 → Main");
  console.log("600010 → North");
  console.log("600028 → South");
  console.log("603001 → Rural / Chengalpattu");

  console.log("");
  console.log("🔗 CENTER/CROP MATRIX");
  console.log("------------------------------------------");

  console.log("Main  → Paddy, Wheat, Maize");
  console.log("North → Paddy, Maize");
  console.log("South → Wheat, Cotton");
  console.log("Rural → Paddy, Wheat");

  console.log("");
  console.log("📅 SCHEDULE TEST CASES");
  console.log("------------------------------------------");

  console.log("Main Today      → AVAILABLE");
  console.log("Main Tomorrow   → AVAILABLE");
  console.log("Main Yesterday  → FULL");

  console.log("North Today     → AVAILABLE + 15 min delay");
  console.log("North Tomorrow  → FULL");

  console.log("South Today     → AVAILABLE + SUSPENDED + 60 min delay");

  console.log("Rural Today     → AVAILABLE + low capacity");
  console.log("Rural Tomorrow  → CLOSED");

  console.log("");
  console.log("📦 BOOKING STATUS COVERAGE");
  console.log("------------------------------------------");

  console.log("PENDING");
  console.log("SLOT_BOOKED");
  console.log("ARRIVED");
  console.log("GROSS_WEIGHED");
  console.log("QUALITY_CHECKED");
  console.log("TARE_WEIGHED");
  console.log("ACCEPTED");
  console.log("PAYMENT_INITIATED");
  console.log("MONEY_TRANSFERRED");
  console.log("REJECTED");
  console.log("EXPIRED");

  console.log("");
  console.log("🧪 QUALITY COVERAGE");
  console.log("------------------------------------------");

  console.log("PENDING");
  console.log("PASSED");
  console.log("FAILED");

  console.log("");
  console.log("💰 PAYMENT COVERAGE");
  console.log("------------------------------------------");

  console.log("NOT_STARTED");
  console.log("INITIATED");
  console.log("CREDITED");
  console.log("FAILED");

  console.log("");
  console.log("🔐 AUTH TOKEN COVERAGE");
  console.log("------------------------------------------");

  console.log("EMAIL_VERIFICATION");
  console.log("PASSWORD_RESET");
  console.log("Expired token");
  console.log("Used token");

  console.log("");
  console.log("👨‍🌾 TEST FARMERS");
  console.log("------------------------------------------");

  console.log("9000000001 → Pending");
  console.log("9000000002 → Slot booked");
  console.log("9000000003 → Arrived");
  console.log("9000000004 → Gross weighed");
  console.log("9000000005 → Quality passed");
  console.log("9000000006 → Quality failed");
  console.log("9000000007 → Tare weighed");
  console.log("9000000008 → Accepted");
  console.log("9000000009 → Payment initiated");
  console.log("9000000010 → Money transferred");
  console.log("9000000011 → Rejected");
  console.log("9000000012 → Expired");

  console.log("");
  console.log("==================================================");
  console.log("🚀 Ready for web/API testing");
  console.log("==================================================");
}

async function main() {
  console.log("🌱 Starting Q8Far database seed...");
  console.log("");

  try {
    await cleanDatabase();

    await createCrops();

    await createCenters();

    await connectCentersToCrops();

    await createSchedules();

    await createAuthTokens();

    await createBookings();

    await printSummary();

  } catch (error) {
    console.error("");
    console.error("❌ Seed failed:");
    console.error(error);

    process.exitCode = 1;

  } finally {
    try {
      await db.close();
    } catch {
      // Ignore connection close errors.
    }
  }
}

main();
