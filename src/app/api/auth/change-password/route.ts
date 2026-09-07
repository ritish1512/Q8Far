import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/prisma/db"; // Prisma 8 client wrapper

const changePasswordSchema = z.object({
  token: z.string().length(64),
  password: z.string().min(8),
});

async function findValidResetToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const resetToken = await db.orm.public.AuthToken
    .where({ tokenHash })
    .first();

  if (!resetToken || resetToken.type !== "PASSWORD_RESET") {
    return { error: "This token link is invalid for password modification" } as const;
  }

  if (resetToken.usedAt) {
    return { error: "This link has already been used" } as const;
  }

  if (new Date(resetToken.expiresAt) <= new Date()) {
    return { error: "This reset link has expired" } as const;
  }

  return { resetToken } as const;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Invalid or missing reset token" }, { status: 400 });
  }

  try {
    const result = await findValidResetToken(token);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Password reset token validation error:", error);
    return NextResponse.json({ error: "Unable to validate reset token" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = changePasswordSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid token or password" }, { status: 400 });
    }

    const tokenResult = await findValidResetToken(result.data.token);
    if ("error" in tokenResult) {
      return NextResponse.json({ error: tokenResult.error }, { status: 400 });
    }
    const { resetToken } = tokenResult;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(result.data.password, saltRounds);

    // ✅ FIXED: Sequential database updates executed using the correct contract namespace
    await db.orm.public.ProcurementCenter
      .where({ id: resetToken.centerId })
      .update({ passwordHash });

    await db.orm.public.AuthToken
      .where({ id: resetToken.id })
      .update({ usedAt: new Date().toISOString() });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Internal server processing failure" }, { status: 500 });
  }
}
