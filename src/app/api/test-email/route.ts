import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { sendMail } from "@/lib/mailer";
import { authOptions } from "../auth/[...nextauth]/route";

// Diagnostic-only route for confirming email delivery is wired up
// correctly. Not part of the product — locked down so it can't be used
// as a public, unauthenticated way to drain your email quota.
function isAllowed(session: Session | null) {
  // Always available in local/dev.
  if (process.env.NODE_ENV !== "production") return true;

  // In production, only signed-in admins (comma-separated allowlist).
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = session?.user?.email?.toLowerCase();
  return !!email && adminEmails.includes(email);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!isAllowed(session)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { data, error } = await sendMail({
      to: process.env.ENQUIRY_TO_EMAIL || process.env.GMAIL_USER || "info@yourdomain.com",
      subject: "Test Email from SafaHomes",
      html: "<p>This is a test email using Gmail SMTP.</p>",
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}