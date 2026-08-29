import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { escapeHtml } from "@/lib/escapeHtml";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp";

const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`resend-otp:${ip}`, RESEND_LIMIT, RESEND_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many resend requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const pending = await prisma.pendingSignup.findUnique({ where: { email } });
    if (!pending) {
      return NextResponse.json(
        { error: "No pending signup found for this email. Please sign up again." },
        { status: 404 }
      );
    }

    const code = generateOtp();
    const otpHash = await hashOtp(code);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.pendingSignup.update({
      where: { email },
      data: { otpHash, otpExpiresAt, attempts: 0 },
    });

    const safeName = escapeHtml(pending.name);
    const { error: emailError } = await sendMail({
      to: email,
      subject: `Your SafaHomes verification code: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #222; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Verify your email</h2>
            <p>Hi ${safeName},</p>
            <p>Here's your new verification code:</p>
            <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; background: #f9fafc; padding: 16px; border-radius: 8px; text-align: center;">${code}</p>
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          </body>
        </html>
      `,
      text: `Your SafaHomes verification code is ${code}. It expires in 10 minutes.`,
    });

    if (emailError) {
      console.error("Resend OTP send failed:", emailError);
      return NextResponse.json(
        { error: "We couldn't send the verification email. Please try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}