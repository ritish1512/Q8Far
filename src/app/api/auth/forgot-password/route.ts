import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/prisma/db";
import { sendPasswordResetEmail } from "@/app/lib/password-reset-mail";

const requestSchema = z.object({ email: z.email() });

export async function POST(req: NextRequest) {
  // Security Best Practice: Return a generic message even if the email doesn't exist
  const genericResponse = NextResponse.json({
    message: "If an account exists for this email, reset instructions have been sent.",
  });

  try {
    const body = await req.json().catch(() => ({}));
    const result = requestSchema.safeParse(body);
    if (!result.success) return genericResponse;

    // 1. Fetch center via the Prisma 8 namespace layer
    const center = await db.orm.public.ProcurementCenter
      .where({ email: result.data.email.toLowerCase() })
      .first();

    if (!center) return genericResponse;

    // 2. Token Generation Architecture
    const rawToken = randomBytes(32).toString("hex"); // Generates 64-char string for change-password validation
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    
    // Sets expiration timeline window for 1 hour ahead matching standard ISO Timestamptz strings
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // ✅ FIXED HANDSHAKE: Creates the entry inside AuthToken mapping the type enum configuration
    await db.orm.public.AuthToken.create({
      tokenHash,
      type: "PASSWORD_RESET",
      centerId: center.id,
      expiresAt,
    });

    // 3. Dispatch the communication mailer link via NodeMailer wrapper
    await sendPasswordResetEmail(
      center.email,
      `${appUrl}/auth/change-password?token=${rawToken}`,
    );

    return genericResponse;
  } catch (error) {
    console.error("Password reset request error logs:", error);
    return NextResponse.json({ error: "Unable to send reset instructions" }, { status: 500 });
  }
}
