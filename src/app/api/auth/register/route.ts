import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/prisma/db";
import { sendVerificationEmail } from "@/app/lib/verification-mail";

const registerSchema = z.object({
  name: z.string().min(3, "Center name must be at least 3 characters long"),
  email: z.string().email("Invalid email layout configuration"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  pincode: z.string().length(6, "Pincode must be exactly 6 digits long"),
  landmark: z.string().optional(),
  fullAddress: z.string().min(10, "Full physical address details are too short"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      // ✅ FIXED: Safely pull the error message from the first structural validation issue block
      const firstIssue = result.error.issues[0];
      const errorMessage = firstIssue ? firstIssue.message : "Validation error occurred.";
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { name, email, password, pincode, landmark, fullAddress } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingCenter = await db.orm.public.ProcurementCenter
      .where({ email: normalizedEmail })
      .first();

    if (existingCenter) {
      return NextResponse.json(
        { error: "A procurement center is already registered with this email address." }, 
        { status: 409 }
      );
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const currentIsoString = new Date().toISOString();

    const newCenter = await db.orm.public.ProcurementCenter.create({
      name,
      email: normalizedEmail,
      passwordHash,
      isEmailVerified: false,
      pincode,
      location: pincode, 
      landmark: landmark || null,
      fullAddress,
      
      // Default parameters to satisfy your schema's required table constraints
      openTime: "09:00",         
      closeTime: "17:00",        
      timePerFarmer: 45,         
      
      maxStorageKg: 500000, 
      currentStorageKg: 0,
      createdAt: currentIsoString,
      updatedAt: currentIsoString
    });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    await db.orm.public.AuthToken.create({
      tokenHash,
      type: "EMAIL_VERIFICATION",
      centerId: newCenter.id,
      expiresAt,
      createdAt: currentIsoString
    });

    await sendVerificationEmail(
      newCenter.email,
      `${appUrl}/auth/verify?token=${rawToken}`
    );

    return NextResponse.json(
      { success: true, message: "Procurement center successfully registered." },
      { status: 201 }
    );

  } catch (error) {
    console.error("Account registration route processing error:", error);
    return NextResponse.json(
      { error: "An unexpected database processing failure occurred during registration." }, 
      { status: 500 }
    );
  }
}
