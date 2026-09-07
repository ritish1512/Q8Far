import { NextRequest, NextResponse } from "next/server";
import { db } from "@/prisma/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing verification token parameter." }, { status: 400 });
    }

    // High speed lookup targeting the exact unique index field configuration string
    const booking = await db.orm.public.Booking
      .where({ token })
      .first();

    if (!booking) {
      return NextResponse.json({ error: "No booking record found for this token ID." }, { status: 404 });
    }

    // Safety constraints evaluating terminal workflow states
    if (["REJECTED", "EXPIRED", "ACCEPTED"].includes(booking.status)) {
      return NextResponse.json({ 
        error: `Cannot proceed. This token has already been marked as ${booking.status}.` 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Token verification api error:", error);
    return NextResponse.json({ error: "Internal processing error." }, { status: 500 });
  }
}
