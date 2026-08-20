import { fakeSender, resendSender, type EmailSender } from "@tare/email";

/**
 * Choose the sender at boot. Two paths:
 *   RESEND_API_KEY set → real Resend delivery (EU region domain in phase 1d+).
 *   otherwise         → fakeSender that logs to console. Every dev machine
 *                       stays functional without needing a provider.
 *
 * EMAIL_FROM is required in both paths so tests catch a missing DKIM setup
 * before it hits inbox reputation.
 */
let cached: EmailSender | null = null;

export function mailer(): EmailSender {
  if (cached) return cached;
  const key = process.env["RESEND_API_KEY"];
  if (key) {
    cached = resendSender(key);
    return cached;
  }
  console.warn("[mail] RESEND_API_KEY not set — using fakeSender (messages log only)");
  cached = fakeSender();
  return cached;
}

export function fromAddress(): string {
  const from = process.env["EMAIL_FROM"];
  if (!from) throw new Error("EMAIL_FROM is not set");
  return from;
}
