import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { escapeHtml } from "@/lib/escapeHtml";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp";

const PASSWORD_MIN_LENGTH = 8;
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isPasswordStrong(password: string): boolean {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasLetter && hasNumber && hasSymbol;
}

async function sendOtpEmail(email: string, name: string, code: string) {
  const safeName = escapeHtml(name);
  const { error } = await sendMail({
    to: email,
    subject: `Your SafaHomes verification code: ${code}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #222; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Verify your email</h2>
          <p>Hi ${safeName},</p>
          <p>Use this code to finish creating your SafaHomes account:</p>
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; background: #f9fafc; padding: 16px; border-radius: 8px; text-align: center;">${code}</p>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </body>
      </html>
    `,
    text: `Your SafaHomes verification code is ${code}. It expires in 10 minutes.`,
  });

  if (error) {
    console.error("Resend OTP send failed:", error);
  }
  return { error };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { name, email, password, phone, role } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isPasswordStrong(password)) {
      return NextResponse.json(
        {
          error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter, a number, and a symbol.`,
        },
        { status: 400 }
      );
    }

    // A verified account with this email already exists — nothing to do.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateOtp();
    const otpHash = await hashOtp(code);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Upsert: if they already started signing up (e.g. didn't get the
    // email, or it expired), this just issues a fresh code rather than
    // erroring — same behavior as a "resend" would give.
    await prisma.pendingSignup.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash: hashedPassword,
        phone: phone || null,
        role: role || "architect",
        otpHash,
        otpExpiresAt,
        attempts: 0,
      },
      update: {
        name,
        passwordHash: hashedPassword,
        phone: phone || null,
        role: role || "architect",
        otpHash,
        otpExpiresAt,
        attempts: 0,
      },
    });

    const { error: emailError } = await sendOtpEmail(email, name, code);
    if (emailError) {
      // The pending row is useless without a delivered code — remove it
      // rather than leaving an orphaned signup the user can't complete,
      // and tell them honestly that it failed instead of "check your inbox".
      await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        { error: "We couldn't send the verification email. Please try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { pendingVerification: true, email },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}