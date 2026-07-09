import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { fixtureLine } from "@/lib/format";
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
 * One batched Claude (Haiku) call that writes a Ron Burgundy-style quip for
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
          "You are a sports comedian writing in the over-confident, absurdist style of Will Ferrell's Ron " +
          "Burgundy — a self-serious anchorman who delivers ridiculous non-sequiturs with total conviction, " +
          "prone to grandiose declarations, oddly specific boasts, and cheerfully dumb tangents. " +
          "For each soccer result given, invent ONE funny, wholly made-up 'expert' quip based only on the " +
          "scoreline — absurd hyperbole, mock-grandiosity, self-deprecation, oddly specific fake details. " +
          "Keep it light and clean: no profanity, no real-world politics or news, nothing mean about real people. One or two " +
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

/* ──────────────────────────────────────────────────────────────────────────
 * Daily morning briefing — yesterday's results recapped + today's fixtures
 * "predicted", all in the same fabricated Ron Burgundy voice as the digest.
 * ────────────────────────────────────────────────────────────────────────── */

/** Today's date in US Eastern time as "YYYY-MM-DD" (the tournament's local day). */
function etToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

/** The calendar day before a "YYYY-MM-DD" string, as "YYYY-MM-DD". */
function prevDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86_400_000).toISOString().slice(0, 10);
}

/** Static, no-API fallback "prediction" for one upcoming fixture (Ron Burgundy-style). */
export function matchPrediction(m: Match, teams: Map<number, Team>): string {
  const home = teams.get(m.home_team_id ?? -1)?.name ?? "Someone";
  const away = teams.get(m.away_team_id ?? -1)?.name ?? "Someone";
  const lines = [
    `My official, legally non-binding prediction for ${home} vs ${away}: a soccer match will break out, a goal will happen or possibly won't, and somewhere a grown adult will weep into a scarf. Lock it in.`,
    `${home} vs ${away} — my sources, who are entirely imaginary, guarantee ninety minutes of running, one baffling haircut, and a final score that ruins exactly one person's bracket. Probably yours.`,
    `I consulted the data, and the data is just me guessing: ${home} and ${away} will play today, the ball will be round, and a referee will make a call that no human on Earth agrees with.`,
    `Bold forecast on ${home} vs ${away}: there will be a result. I will not be specifying which one. That, my friends, is how you stay undefeated as a pundit.`,
  ];
  return lines[(m.id ?? 0) % lines.length];
}

/**
 * One batched Claude (Haiku) call that writes a Ron Burgundy-style mock
 * "prediction" for each of today's upcoming fixtures — based only on the team
 * names, since no score exists yet. Same key/fallback/timeout contract as
 * aiCommentary(): returns match id → prediction, or null on any failure so
 * callers fall back to matchPrediction().
 */
export async function aiPredictions(
  matches: Match[],
  teams: Map<number, Team>,
): Promise<Map<number, string> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || matches.length === 0) return null;

  const fixtures = matches.map((m) => {
    const home = teams.get(m.home_team_id ?? -1)?.name ?? "Someone";
    const away = teams.get(m.away_team_id ?? -1)?.name ?? "Someone";
    return `match_id ${m.id}: ${home} vs ${away}`;
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
          "You are a sports comedian writing in the over-confident, absurdist style of Will Ferrell's Ron " +
          "Burgundy — a self-serious anchorman who delivers ridiculous non-sequiturs with total conviction, " +
          "prone to grandiose declarations, oddly specific boasts, and cheerfully dumb tangents. " +
          "For each UPCOMING soccer fixture given, invent ONE funny, wholly made-up 'expert' prediction based only " +
          "on the two team names — a confident, absurd forecast played for laughs (no real scoreline exists yet). " +
          "Keep it light and clean: no profanity, no real-world politics or news, nothing mean about real people. One or two " +
          "sentences, max ~45 words each. Return exactly one prediction per match, keyed by the match_id you were given.",
        messages: [
          {
            role: "user",
            content: `Write a prediction for each of today's fixtures:\n${fixtures.join("\n")}`,
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
    return null;
  }
}

/** Static, no-API faux-insightful "what did we learn yesterday" blurb. */
export function resultsTheme(matches: Match[]): string {
  const n = matches.length;
  const goals = matches.reduce((s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
  const draws = matches.filter((m) => (m.home_score ?? 0) === (m.away_score ?? 0)).length;
  const seed = matches.reduce((s, m) => s + (m.id ?? 0), 0);
  const themes = [
    `The data from yesterday's ${n} match${n === 1 ? "" : "es"} is in, and our analysts have isolated a startling pattern: the teams that scored more goals than their opponents went on to win every single time. We're calling it "the future of the sport." ${goals} goals were produced, none of them by me, and yet I feel strangely responsible.`,
    `If yesterday's ${n} result${n === 1 ? "" : "s"} taught us anything, it's that soccer remains a game of two halves — occasionally three, if you count the part where everyone argues afterward. ${draws} ended level, which the experts agree is "a number." The deeper meaning will reveal itself in approximately never.`,
    `A theme emerged across yesterday's slate: momentum. Also gravity. Also, on no fewer than ${Math.max(1, n)} occasions, a ball. Our research department has concluded that the team you support was both underrated and robbed — a finding that holds regardless of which team you support or what actually happened.`,
    `Yesterday gave us ${goals} goals across ${n} game${n === 1 ? "" : "s"}, and if you stare at those numbers long enough, as I have, you begin to see a face. The face is disappointed in your bracket. That is the only insight that matters, and I stand by it completely.`,
  ];
  return themes[seed % themes.length];
}

/**
 * One batched Claude (Haiku) call that reads ALL of yesterday's results and
 * returns a SINGLE faux-insightful "what did we learn" blurb (3-5 sentences),
 * Ron Burgundy-style. Returns null on any failure → callers fall back to resultsTheme().
 */
export async function aiResultsTheme(
  matches: Match[],
  teams: Map<number, Team>,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || matches.length === 0) return null;

  const results = matches.map((m) => {
    const home = teams.get(m.home_team_id ?? -1)?.name ?? "Someone";
    const away = teams.get(m.away_team_id ?? -1)?.name ?? "Someone";
    return `${home} ${m.home_score}–${m.away_score} ${away}`;
  });

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { theme: { type: "string" } },
    required: ["theme"],
  };

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    const response = await client.messages.create(
      {
        model: COMMENTARY_MODEL,
        max_tokens: 512,
        system:
          "You are a sports comedian writing in the over-confident, absurdist style of Will Ferrell's Ron " +
          "Burgundy — a self-serious anchorman who delivers ridiculous non-sequiturs with total conviction, " +
          "prone to grandiose declarations, oddly specific boasts, and cheerfully dumb tangents. " +
          "You will be given ALL of yesterday's soccer results at once. Write ONE single 'what did we learn " +
          "yesterday' blurb that confidently claims to have spotted a grand, sweeping theme across the results — " +
          "analytical-sounding and utterly nonsensical, faux-insightful rather than a game-by-game recap. " +
          "It may run 3-5 sentences. Reference the actual results loosely if you like. Keep it light and clean: no " +
          "profanity, no real politics, nothing mean about real people. Return just the blurb in the 'theme' field.",
        messages: [{ role: "user", content: `Yesterday's results:\n${results.join("\n")}` }],
        output_config: { format: { type: "json_schema", schema } },
      },
      { timeout: COMMENTARY_TIMEOUT_MS },
    );

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const parsed = JSON.parse(block.text) as { theme?: string };
    return parsed.theme && parsed.theme.trim() ? parsed.theme.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Render the morning-briefing email body: a "Yesterday's results" section (bare
 * scorelines + ONE faux-insightful theme blurb — per-game recaps go out in the
 * separate results digest) and a "Today's games" section (per-game prediction
 * quips). Either section is omitted when empty. Pure — no DB or network.
 */
export function buildMorningHtml(
  yesterday: Match[],
  today: Match[],
  teamMap: Map<number, Team>,
  theme: string | null,
  predictions: Map<number, string> | null,
  siteUrl: string,
): string {
  const resultItems = yesterday
    .map((m) => `<li style="margin-bottom:4px">${resultLine(m, teamMap)}</li>`)
    .join("");
  const themeBlurb = yesterday.length ? (theme ?? resultsTheme(yesterday)) : "";

  const todayItems = today
    .map((m) => {
      const home = teamMap.get(m.home_team_id ?? -1);
      const away = teamMap.get(m.away_team_id ?? -1);
      const fixture =
        `${home?.flag_emoji ?? ""} ${home?.name ?? "?"} vs ${away?.name ?? "?"} ${away?.flag_emoji ?? ""}`;
      const meta = fixtureLine(m);
      const quip = predictions?.get(m.id) ?? matchPrediction(m, teamMap);
      return (
        `<li style="margin-bottom:14px">${fixture}` +
        (meta ? `<br><span style="color:#888;font-size:13px">${escapeHtml(meta)}</span>` : "") +
        `<br><span style="color:#555;font-style:italic;font-size:14px;line-height:1.5">` +
        `${escapeHtml(quip)}</span></li>`
      );
    })
    .join("");

  const recapSection = yesterday.length
    ? `<h3 style="margin-bottom:6px">Yesterday's results</h3>` +
      `<ul style="font-size:16px;line-height:1.6;padding-left:20px;margin-top:0;margin-bottom:8px">${resultItems}</ul>` +
      `<p style="color:#555;font-style:italic;font-size:14px;line-height:1.6;margin-top:0">` +
      `<strong style="font-style:normal;color:#333">What did we learn? </strong>${escapeHtml(themeBlurb)}</p>`
    : "";
  const todaySection = today.length
    ? `<h3 style="margin-bottom:6px">Today's games</h3>` +
      `<ul style="font-size:16px;line-height:1.8;padding-left:20px;margin-top:0">${todayItems}</ul>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h2>☕ World Cup 2026 — your morning briefing</h2>
      <p style="color:#666;font-size:14px;margin-top:-6px">Yesterday in review, today in (entirely fabricated) preview. None of this should be wagered upon.</p>
      ${recapSection}
      ${todaySection}
      <p><a href="${siteUrl}/leaderboard"
         style="display:inline-block;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
         View the leaderboard →</a></p>
      <p style="color:#888;font-size:12px">You're receiving this because you're in the pool.</p>
    </div>`;
}

/**
 * Send the daily morning briefing to every approved participant: yesterday's
 * finished matches (recapped) and today's fixtures (predicted), by ET calendar
 * day. Skips sending when there is neither. Returns a summary.
 */
export async function sendMorningBriefing(): Promise<{
  sent: number;
  recaps: number;
  fixtures: number;
  error?: string;
}> {
  const tx = transport();
  if (!tx) return { sent: 0, recaps: 0, fixtures: 0, error: "SMTP not configured." };

  const today = etToday();
  const yesterday = prevDay(today);

  const db = createAdminClient();
  const [{ data: yRows }, { data: tRows }, { data: teams }, { data: profiles }] =
    await Promise.all([
      db.from("matches").select("*").eq("match_date", yesterday).eq("status", "finished").order("match_no"),
      db.from("matches").select("*").eq("match_date", today).order("match_no"),
      db.from("teams").select("*"),
      db.from("profiles").select("*").eq("status", "approved"),
    ]);

  const yesterdayMatches = (yRows as Match[]) ?? [];
  const todayMatches = (tRows as Match[]) ?? [];
  if (yesterdayMatches.length === 0 && todayMatches.length === 0) {
    return { sent: 0, recaps: 0, fixtures: 0, error: "Nothing to brief: no results yesterday, no games today." };
  }

  const teamMap = new Map((teams as Team[]).map((t) => [t.id, t]));
  // Two batched Claude calls in parallel (theme + predictions); null → static fallbacks.
  const [theme, predictions] = await Promise.all([
    yesterdayMatches.length ? aiResultsTheme(yesterdayMatches, teamMap) : Promise.resolve(null),
    todayMatches.length ? aiPredictions(todayMatches, teamMap) : Promise.resolve(null),
  ]);

  const html = buildMorningHtml(yesterdayMatches, todayMatches, teamMap, theme, predictions, emailSite());
  const from = fromAddress();
  const recipients = (profiles as Profile[]).filter((p) => p.email);

  let sent = 0;
  for (const p of recipients) {
    try {
      await tx.sendMail({ from, to: p.email, subject: "☕ Your World Cup morning briefing", html });
      sent++;
    } catch {
      // skip failed recipient, keep going
    }
  }

  return { sent, recaps: yesterdayMatches.length, fixtures: todayMatches.length };
}
