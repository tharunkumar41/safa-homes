import nodemailer from "nodemailer";

/**
 * Sends email via Gmail SMTP using an App Password (not your regular
 * Gmail password — generate one at myaccount.google.com/apppasswords,
 * requires 2-Step Verification to be enabled on the account).
 *
 * Required env vars:
 *   GMAIL_USER          e.g. yourapp@gmail.com
 *   GMAIL_APP_PASSWORD  the 16-character App Password (no spaces)
 *
 * Gmail caps sending at ~500 emails/day for regular accounts. This is
 * fine for early-stage volume but should be swapped for a dedicated
 * transactional provider (with a verified domain) before real scale.
 */
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error(
        "Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables."
      );
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

export interface SendMailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendMailResult {
  error: { message: string } | null;
  data: { id?: string } | null;
}

/**
 * Sends an email and NEVER throws — mirrors the Resend SDK's
 * `{ data, error }` shape so callers that already check `error` don't
 * need to change their control flow.
 */
export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.GMAIL_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });
    return { data: { id: info.messageId }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("Gmail SMTP send failed:", message);
    return { data: null, error: { message } };
  }
}