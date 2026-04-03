import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOTP } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || phone.length !== 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this number. Contact your owner." },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Contact your owner." },
        { status: 403 }
      );
    }

    const sent = await sendOTP(phone);
    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send OTP. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mock: process.env.MOCK_OTP_ENABLED === "true" });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
