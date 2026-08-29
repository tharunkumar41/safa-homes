import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { verifyOtp, OTP_MAX_ATTEMPTS } from "@/lib/otp";

const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`verify-otp:${ip}`, VERIFY_LIMIT, VERIFY_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json(
        { error: "Missing email or code" },
        { status: 400 }
      );
    }

    const pending = await prisma.pendingSignup.findUnique({ where: { email } });
    if (!pending) {
      return NextResponse.json(
        { error: "No pending signup found for this email. Please sign up again." },
        { status: 404 }
      );
    }

    if (pending.otpExpiresAt.getTime() < Date.now()) {
      await prisma.pendingSignup.delete({ where: { email } });
      return NextResponse.json(
        { error: "This code has expired. Please sign up again." },
        { status: 410 }
      );
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.pendingSignup.delete({ where: { email } });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please sign up again." },
        { status: 429 }
      );
    }

    const isValid = await verifyOtp(code, pending.otpHash);
    if (!isValid) {
      await prisma.pendingSignup.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
    }

    // Verified — create the real account now, and only now.
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.passwordHash,
        phone: pending.phone,
        role: pending.role,
        emailVerified: new Date(),
      },
    });

    await prisma.pendingSignup.delete({ where: { email } });

    return NextResponse.json(
      { verified: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}