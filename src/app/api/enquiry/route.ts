import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { escapeHtml } from "@/lib/escapeHtml";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

const ENQUIRY_LIMIT = 5;
const ENQUIRY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`enquiry:${ip}`, ENQUIRY_LIMIT, ENQUIRY_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many enquiries submitted. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { name, email, phone, firmName, reason } = await req.json();

    if (!name || !email || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        firmName: firmName || null,
        reason,
        status: "pending",
      },
    });

    console.log("✅ Enquiry saved:", enquiry.id);

    // ---- email sending ----
    try {
      const to = process.env.ENQUIRY_TO_EMAIL || process.env.GMAIL_USER || "info@yourdomain.com";

      console.log(`📧 Attempting to send email to ${to}`);

      // Escape every user-submitted field before it goes into the HTML
      // email body — these values come straight from the public contact
      // form and are otherwise interpolated unescaped, which would let
      // a submitted name/reason like `<img src=x onerror=...>` execute
      // in whatever email client opens the message.
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safePhone = escapeHtml(phone || "Not provided");
      const safeFirmName = escapeHtml(firmName || "Not provided");
      const safeReason = escapeHtml(reason);

      // Subject headers don't render HTML, but strip line breaks so a
      // submitted name can't inject extra header-like lines.
      const safeSubjectName = String(name).replace(/[\r\n]+/g, " ").trim();

      const { data, error } = await sendMail({
  to,
  replyTo: email,
  subject: `New enquiry from ${safeSubjectName}`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #4c8dff; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #1a1a2e; }
          .header span { color: #4c8dff; }
          .content { background: #f9fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .label { font-weight: 600; color: #333; }
          .footer { margin-top: 30px; font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; text-align: center; }
          .button { display: inline-block; background: #4c8dff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🪴 <span>SafaHomes</span> · New Enquiry</h1>
        </div>
        <p>Hi team,</p>
        <p><strong>${safeName}</strong> has submitted a new enquiry via the website. Here are the details:</p>
        <div class="content">
          <p><span class="label">Name:</span> ${safeName}</p>
          <p><span class="label">Email:</span> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p><span class="label">Phone:</span> ${safePhone}</p>
          <p><span class="label">Firm / Company:</span> ${safeFirmName}</p>
          <p><span class="label">Reason:</span></p>
          <p style="white-space: pre-wrap; background: white; padding: 12px; border-radius: 4px; border: 1px solid #eee;">${safeReason}</p>
        </div>
        <p>You can reply directly to this email to reach <strong>${safeName}</strong> (their email is set as the <strong>Reply-To</strong> address).</p>
        <p style="margin-top: 25px;">Best regards,<br><strong>SafaHomes Team</strong></p>
        <div class="footer">
          <small>This enquiry was submitted from the SafaHomes contact form.</small>
        </div>
      </body>
    </html>
  `,
  text: `
SafaHomes - New Enquiry

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Firm: ${firmName || 'Not provided'}

Reason:
${reason}

---
You can reply directly to this email to contact ${name}.
  `,
});

      if (error) {
        console.error("❌ Resend error:", error);
        // We still return success because enquiry is saved
      } else {
        console.log("✅ Email sent successfully:", data);
      }
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
    }

    return NextResponse.json(
      { success: true, id: enquiry.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Enquiry submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}