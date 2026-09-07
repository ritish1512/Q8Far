//src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/prisma/db";

export async function GET(req: NextRequest) {
  try {
    // 1. Extract the raw token string from the incoming URL query parameters
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // Fallback error redirection or page view if token is missing
    if (!token) {
      return NextResponse.json(
        { error: "Verification token is missing from the request URL" }, 
        { status: 400 }
      );
    }

    // 2. Compute the secure hash matching your creation storage logic
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // 3. Locate the registration verification token inside the consolidated table
    const verificationToken = await db.orm.public.AuthToken
      .where({ tokenHash })
      .first();

    // 4. Run safety guards: Type checking, duplicate use prevention, and expiration checks
    if (!verificationToken || verificationToken.type !== "EMAIL_VERIFICATION") {
      return NextResponse.json(
        { error: "This verification link is invalid or improperly routed" }, 
        { status: 400 }
      );
    }

    if (verificationToken.usedAt) {
      return NextResponse.json(
        { error: "This activation link has already been used to confirm an account" }, 
        { status: 400 }
      );
    }

    const expirationDate = new Date(verificationToken.expiresAt);
    if (expirationDate <= new Date()) {
      return NextResponse.json(
        { error: "This verification link has expired. Please register again to get a new link." }, 
        { status: 400 }
      );
    }

    const currentIsoString = new Date().toISOString();

    // 5. Atomic Update Execution Steps
    // Step A: Set the procurement center account status to verified
    await db.orm.public.ProcurementCenter
      .where({ id: verificationToken.centerId })
      .update({ isEmailVerified: true });

    // Step B: Update the token record to prevent replay attacks
    await db.orm.public.AuthToken
      .where({ id: verificationToken.id })
      .update({ usedAt: currentIsoString });

    // 6. Redirect the verified user back to your frontend login page with a success flag
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/auth/login?verified=true`);

  } catch (error) {
    console.error("Magic Link Email Verification Error:", error);
    return NextResponse.json(
      { error: "An unexpected processing error occurred during account verification" }, 
      { status: 500 }
    );
  }
}
