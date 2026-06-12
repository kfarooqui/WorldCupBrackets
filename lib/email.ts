import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Match, Team, Profile } from "@/lib/types";

/**
 * Canonical site URL for links inside emails. Emails go to real users, so this
 * must never be localhost — even when a send is triggered from a local dev
 * server. Prefer EMAIL_SITE_URL, then a non-localhost NEXT_PUBLIC_SITE_URL,
 * then the Vercel production domain.
 */
function emailSite(): string {
  for (const c of [process.env.EMAIL_SITE_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (c && !c.includes("localhost")) return c.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Build a Gmail (or any SMTP) transport from env. Returns null if SMTP isn't
 * configured, so callers degrade gracefully instead of throwing.
 */
function transport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
    // Fail fast — serverless functions have a short max duration, so don't let a
    // blocked/slow SMTP connection hang until the platform kills the function.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 9000,
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

  // Verify the connection once up front so a blocked/misconfigured SMTP fails
  // fast with a clear message instead of timing out per-recipient.
  try {
    await tx.verify();
  } catch (e) {
    return {
      sent: 0,
      total: recipients.length,
      error: `SMTP connection failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  let sent = 0;
  let lastError = "";
  for (const to of recipients) {
    try {
      await tx.sendMail({ from, to, subject, html });
      sent++;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  if (sent === 0 && lastError) {
    return { sent, total: recipients.length, error: `Send failed: ${lastError}` };
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
  const SITE = emailSite();
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
 * Wholly invented "expert analysis" of a result, written in the spirit of a
 * late-night monologue. It's pure guesswork off the scoreline — no real insight,
 * just jokes. Picked deterministically from the match id so re-running a digest
 * always yields the same quip for a given match.
 */
export function matchCommentary(m: Match, teams: Map<number, Team>): string {
  const h = m.home_score ?? 0;
  const a = m.away_score ?? 0;
  const home = teams.get(m.home_team_id ?? -1)?.name ?? "Someone";
  const away = teams.get(m.away_team_id ?? -1)?.name ?? "Someone";
  const winner = h >= a ? home : away;
  const loser = h >= a ? away : home;
  const hi = Math.max(h, a);
  const lo = Math.min(h, a);
  const margin = hi - lo;
  const total = h + a;

  const buckets: { when: boolean; lines: string[] }[] = [
    {
      when: h === 0 && a === 0,
      lines: [
        `0–0. Ninety minutes, zero goals, and one shared understanding between two proud nations that scoring is for show-offs. I haven't seen commitment to nothing this total since I read my own contract.`,
        `A scoreless draw — both goalkeepers can now legally list themselves as "undefeated" on dating apps. Beautiful. Useless. Beautiful.`,
      ],
    },
    {
      when: h === a,
      lines: [
        `${home} and ${away} fought to a ${h}–${a} draw, which in soccer counts as both teams winning AND both teams losing at the same time. It's the only sport that runs on the exact logic of my marriage.`,
        `A ${h}–${a} stalemate. They traded goals like two people splitting a check, each insisting the other paid last time. Nobody won, everybody's tired, I'm obsessed with it.`,
      ],
    },
    {
      when: margin >= 4 || total >= 6,
      lines: [
        `${winner} beat ${loser} ${hi}–${lo} in a result so lopsided the scoreboard pulled a hamstring trying to keep up. Somewhere a ${loser} defender is, at this very moment, apologizing to his mother.`,
        `${winner} put ${margin} past ${loser}. That was not a soccer match, that was a documented crime, and I have already alerted the proper authorities, who frankly were also watching.`,
      ],
    },
    {
      when: margin >= 2,
      lines: [
        `${winner} saw off ${loser} ${hi}–${lo} — comfortable enough that their bench spent the final ten minutes deciding where to get dinner. My sources, who are imaginary, say tapas.`,
        `A tidy ${hi}–${lo} for ${winner}. Professional, controlled, and deeply boring to everyone except the people who love them. Like a dentist, but with cleats.`,
      ],
    },
    {
      when: margin === 1,
      lines: [
        `${winner} edged ${loser} by a single goal in a nail-biter that cost viewers worldwide an estimated four million fingernails and one perfectly good bowl of nachos.`,
        `One goal separated them, and ${winner} grabbed it. ${loser} will replay this in their heads tonight at 3 a.m., forever — which, coincidentally, is also my sleep schedule.`,
      ],
    },
  ];

  const lines =
    buckets.find((b) => b.when)?.lines ?? [
      `${winner} beat ${loser}. I am contractually obligated to have an opinion about this, and my opinion is: yes, that happened, and I was there in spirit.`,
    ];
  return lines[(m.id ?? 0) % lines.length];
}

/** Claude model + hard timeout for the digest commentary call. */
const COMMENTARY_MODEL = "claude-haiku-4-5";
const COMMENTARY_TIMEOUT_MS = 9000;

/**
 * One batched Claude (Haiku) call that writes a Conan O'Brien-style quip for
 * every queued result in a single request. Returns a map of match id → quip,
 * or null if ANTHROPIC_API_KEY is unset or the call errors/times out — callers
 * fall back to the static matchCommentary() so the digest always sends.
 *
 * Server-side only (reads ANTHROPIC_API_KEY from env). Structured outputs
 * guarantee parseable JSON; a hard per-request timeout keeps a slow API from
 * blocking the email send in a short-lived serverless function.
 */
export async function aiCommentary(
  matches: Match[],
  teams: Map<number, Team>,
): Promise<Map<number, string> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || matches.length === 0) return null;

  const fixtures = matches.map((m) => {
    const home = teams.get(m.home_team_id ?? -1)?.name ?? "Someone";
    const away = teams.get(m.away_team_id ?? -1)?.name ?? "Someone";
    return `match_id ${m.id}: ${home} ${m.home_score}–${m.away_score} ${away}`;
  });

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            match_id: { type: "integer" },
            quip: { type: "string" },
          },
          required: ["match_id", "quip"],
        },
      },
    },
    required: ["items"],
  };

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    const response = await client.messages.create(
      {
        model: COMMENTARY_MODEL,
        max_tokens: 2048,
        system:
          "You are a sports comedian writing in the style of Conan O'Brien's monologues. " +
          "For each soccer result given, invent ONE funny, wholly made-up 'expert' quip based only on the " +
          "scoreline — absurd hyperbole, mock-grandiosity, self-deprecation, oddly specific fake details. " +
          "Keep it light and clean: no profanity, no real politics, nothing mean about real people. One or two " +
          "sentences, max ~45 words each. Return exactly one quip per match, keyed by the match_id you were given.",
        messages: [
          {
            role: "user",
            content: `Write a quip for each of these results:\n${fixtures.join("\n")}`,
          },
        ],
        output_config: { format: { type: "json_schema", schema } },
      },
      { timeout: COMMENTARY_TIMEOUT_MS },
    );

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const parsed = JSON.parse(block.text) as {
      items?: { match_id?: number; quip?: string }[];
    };
    const out = new Map<number, string>();
    for (const it of parsed.items ?? []) {
      if (typeof it.match_id === "number" && typeof it.quip === "string" && it.quip.trim()) {
        out.set(it.match_id, it.quip.trim());
      }
    }
    return out.size ? out : null;
  } catch {
    // Any failure (no key, timeout, rate limit, bad JSON) → static fallback.
    return null;
  }
}

/**
 * Render the results-digest email body. Each result gets its AI quip when
 * present (keyed by match id), otherwise the static matchCommentary() fallback.
 * Pure — no DB or network — so it's safe to call from a preview script.
 */
export function buildDigestHtml(
  matches: Match[],
  teamMap: Map<number, Team>,
  ai: Map<number, string> | null,
  siteUrl: string,
): string {
  const lines = matches
    .map((m) => {
      const quip = ai?.get(m.id) ?? matchCommentary(m, teamMap);
      return (
        `<li style="margin-bottom:14px">${resultLine(m, teamMap)}` +
        `<br><span style="color:#555;font-style:italic;font-size:14px;line-height:1.5">` +
        `${escapeHtml(quip)}</span></li>`
      );
    })
    .join("");
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h2>⚽ World Cup 2026 — latest results</h2>
      <p style="color:#666;font-size:14px;margin-top:-6px">With expert commentary that is 100% fabricated and should not be wagered upon.</p>
      <ul style="font-size:16px;line-height:1.8;padding-left:20px">${lines}</ul>
      <p><a href="${siteUrl}/leaderboard"
         style="display:inline-block;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
         View the leaderboard →</a></p>
      <p style="color:#888;font-size:12px">You're receiving this because you're in the pool.</p>
    </div>`;
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
  // One batched Claude call for all results; null map → static fallback per match.
  const ai = await aiCommentary(matches as Match[], teamMap);
  const html = buildDigestHtml(matches as Match[], teamMap, ai, emailSite());

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
