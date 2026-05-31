import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Match, Team, Profile } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
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
  const client = resend();
  if (!client) return { sent: 0, results: 0, error: "RESEND_API_KEY not configured." };

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

  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const recipients = (profiles as Profile[]).filter((p) => p.email);

  let sent = 0;
  for (const p of recipients) {
    const { error } = await client.emails.send({
      from,
      to: p.email,
      subject: `⚽ World Cup results — ${(matches as Match[]).length} new`,
      html,
    });
    if (!error) sent++;
  }

  await db.from("pending_results").delete().in("match_id", matchIds);
  return { sent, results: matchIds.length };
}
