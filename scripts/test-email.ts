/**
 * Throwaway: verify Gmail SMTP credentials send a real email.
 *
 *   npm run test-email                  # sends to SMTP_USER (yourself)
 *   npm run test-email -- you@other.com # sends to a specific address
 *
 * Requires SMTP_USER + SMTP_PASS (Gmail App Password) in .env.local.
 * Safe to delete once email is confirmed working.
 */
import nodemailer from "nodemailer";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const to = process.argv[2] ?? user;

if (!user || !pass) {
  console.error("Missing SMTP_USER or SMTP_PASS in .env.local.");
  process.exit(1);
}

const port = Number(process.env.SMTP_PORT ?? 465);
const tx = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port,
  secure: port === 465,
  auth: { user, pass },
});

async function main() {
  console.log(`Verifying SMTP connection as ${user}…`);
  await tx.verify();
  console.log("✓ SMTP auth OK. Sending test email…");

  const info = await tx.sendMail({
    from: process.env.EMAIL_FROM ?? user,
    to,
    subject: "✅ World Cup Pool — SMTP test",
    html: `<p>If you're reading this, your Gmail App Password works and the app can send emails.</p>`,
  });

  console.log(`✓ Sent to ${to} (messageId: ${info.messageId})`);
}

main().catch((err) => {
  console.error("✗ Failed:", err.message);
  process.exit(1);
});
