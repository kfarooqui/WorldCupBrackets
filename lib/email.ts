import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Match, Team, Profile } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Build a Gmail (or any SMTP) transport from env. Returns null if SMTP isn't
 * configured, so callers degrade gracefully instead of throwing.
 */
function transport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user, pass },
  });
}

function fromAddress() {
  return process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Admin broadcast: send a custom subject/message to every registered user
 * (or only approved ones). Plain-text body; newlines become line breaks.
 * Returns how many of the targeted recipients were sent successfully.
 */
export async function sendCustomEmail(opts: {
  subject: string;
  body: string;
  audience: "all" | "approved";
}): Promise<{ sent: number; total: number; error?: string }> {
  const tx = transport();
  if (!tx) return { sent: 0, total: 0, error: "SMTP not configured." };

  const subject = opts.subject.trim();
  const body = opts.body.trim();
  if (!subject || !body) {
    return { sent: 0, total: 0, error: "Subject and message are required." };
  }

  const db = createAdminClient();
  let query = db.from("profiles").select("email,status");
  if (opts.audience === "approved") query = query.eq("status", "approved");
  const { data } = await query;
  const recipients = (data ?? [])
    .map((p) => (p.email ?? "").trim())
    .filter(Boolean);
  if (!recipients.length) return { sent: 0, total: 0, error: "No recipients." };

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;font-size:16px;line-height:1.6">
      ${escapeHtml(body).replace(/\n/g, "<br>")}
      <p style="color:#888;font-size:12px;margin-top:24px">World Cup 2026 Pool</p>
    </div>`;
  const from = fromAddress();

  let sent = 0;
  for (const to of recipients) {
    try {
      await tx.sendMail({ from, to, subject, html });
      sent++;
    } catch {
      // skip failed recipient, keep going
    }
  }
  return { sent, total: recipients.length };
}

/**
 * Notify a user that their account has been approved. Returns whether the
 * email was actually sent (false if SMTP isn't configured, there's no
 * address, or the send errored).
 */
export async function sendApprovalEmail(profile: Profile): Promise<boolean> {
  const tx = transport();
  if (!tx || !profile.email) return false;

  const name = profile.first_name || "there";
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h2>⚽ You're in!</h2>
      <p>Hi ${name}, your World Cup 2026 pool account has been approved.</p>
      <p><a href="${SITE}"
         style="display:inline-block;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
         Make your picks →</a></p>
      <p style="color:#888;font-size:12px">See you on the leaderboard.</p>
    </div>`;

  try {
    await tx.sendMail({
      from: fromAddress(),
      to: profile.email,
      subject: "⚽ You're approved — World Cup 2026 pool",
      html,
    });
    return true;
  } catch {
    return false;
  }
}

function resultLine(m: Match, teams: Map<number, Team>): string {
  const h = teams.get(m.home_team_id ?? -1);
  const a = teams.get(m.away_team_id ?? -1);
  return `${h?.flag_emoji ?? ""} ${h?.name ?? "?"} ${m.home_score}–${m.away_score} ${a?.name ?? "?"} ${a?.flag_emoji ?? ""}`;
}

/**
 * Send a batched match-day digest of all results queued in pending_results to
 * every approved participant, then clear the queue. Returns a summary.
 */
export async function sendMatchDayDigest(): Promise<{
  sent: number;
  results: number;
  error?: string;
}> {
  const tx = transport();
  if (!tx) return { sent: 0, results: 0, error: "SMTP not configured." };

  const db = createAdminClient();
  const { data: pending } = await db.from("pending_results").select("match_id");
  const matchIds = (pending ?? []).map((p) => p.match_id);
  if (matchIds.length === 0) return { sent: 0, results: 0, error: "No new results to announce." };

  const [{ data: matches }, { data: teams }, { data: profiles }] = await Promise.all([
    db.from("matches").select("*").in("id", matchIds).order("match_no"),
    db.from("teams").select("*"),
    db.from("profiles").select("*").eq("status", "approved"),
  ]);

  const teamMap = new Map((teams as Team[]).map((t) => [t.id, t]));
  const lines = (matches as Match[]).map((m) => `<li>${resultLine(m, teamMap)}</li>`).join("");
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h2>⚽ World Cup 2026 — latest results</h2>
      <ul style="font-size:16px;line-height:1.8">${lines}</ul>
      <p><a href="${SITE}/leaderboard"
         style="display:inline-block;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
         View the leaderboard →</a></p>
      <p style="color:#888;font-size:12px">You're receiving this because you're in the pool.</p>
    </div>`;

  const from = fromAddress();
  const recipients = (profiles as Profile[]).filter((p) => p.email);

  let sent = 0;
  for (const p of recipients) {
    try {
      await tx.sendMail({
        from,
        to: p.email,
        subject: `⚽ World Cup results — ${(matches as Match[]).length} new`,
        html,
      });
      sent++;
    } catch {
      // skip failed recipient, keep going
    }
  }

  await db.from("pending_results").delete().in("match_id", matchIds);
  return { sent, results: matchIds.length };
}
