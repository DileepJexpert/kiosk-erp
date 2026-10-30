import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOTP } from "@/lib/auth";
import { otpRateLimiter } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string" || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    // Rate Limiting: max 5 OTP requests per 10 minutes per phone number & client IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    const rateLimitKey = `${phone}:${clientIp}`;
    const rateCheck = otpRateLimiter.check(rateLimitKey);

    if (!rateCheck.allowed) {
      logger.warn("OTP rate limit exceeded", { phone, clientIp, resetInMs: rateCheck.resetInMs });
      const waitMinutes = Math.ceil(rateCheck.resetInMs / 60000);
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before trying again.`,
        },
        { status: 429 }
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

    const isMock = process.env.NODE_ENV !== "production" && process.env.MOCK_OTP_ENABLED === "true";
    return NextResponse.json({ success: true, mock: isMock });
  } catch (error) {
    logger.error("Error in send-otp API route", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
