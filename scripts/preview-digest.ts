/**
 * Preview the results-digest email — including the Bill Burr-style commentary —
 * WITHOUT touching the database or sending any email.
 *
 *   npm run preview-digest          # writes digest-preview.html, opens nothing
 *
 * If ANTHROPIC_API_KEY is set (in .env.local), this makes ONE real Haiku call
 * and shows the live AI quips; otherwise it shows the static fallback quips.
 * Either way it writes a digest-preview.html you can open in a browser, and
 * prints each quip to the console so you can eyeball the tone before a single
 * real email goes out.
 *
 * Safe to delete — it's a dev-only preview, not part of the app.
 */
import fs from "node:fs";
import { aiCommentary, buildDigestHtml, matchCommentary } from "../lib/email";
import type { Match, Team } from "../lib/types";

const team = (id: number, name: string, flag: string): Team => ({
  id,
  name,
  code: name.slice(0, 3).toUpperCase(),
  flag_emoji: flag,
  group_letter: "A",
});

const teams: Team[] = [
  team(1, "Brazil", "🇧🇷"),
  team(2, "Canada", "🇨🇦"),
  team(3, "Japan", "🇯🇵"),
  team(4, "Germany", "🇩🇪"),
  team(5, "Mexico", "🇲🇽"),
  team(6, "Croatia", "🇭🇷"),
  team(7, "Nigeria", "🇳🇬"),
  team(8, "Norway", "🇳🇴"),
];

// One fixture per commentary bucket: blowout, 1-goal, goalless draw,
// score draw, comfortable 2-goal win.
const fixtures: Array<[number, number, number, number]> = [
  // [matchId, homeId, awayId, ...scores below]
  [101, 1, 2, 5], // Brazil 5–0 Canada (blowout)
  [102, 3, 4, 1], // Japan 1–0 Germany (one-goal thriller)
  [103, 5, 6, 0], // Mexico 0–0 Croatia (goalless draw)
  [104, 7, 8, 2], // Nigeria 2–2 Norway (score draw)
  [105, 4, 5, 3], // Germany 3–1 Mexico (comfortable)
];
const awayScores: Record<number, number> = { 101: 0, 102: 0, 103: 0, 104: 2, 105: 1 };

const matches: Match[] = fixtures.map(([id, home, away, hs]) => ({
  id,
  stage: "group",
  group_letter: "A",
  match_no: id,
  slot_label: null,
  home_team_id: home,
  away_team_id: away,
  kickoff_at: null,
  match_date: null,
  kickoff: null,
  venue: null,
  city: null,
  home_score: hs,
  away_score: awayScores[id],
  status: "finished",
}));

async function main() {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  console.log(
    process.env.ANTHROPIC_API_KEY
      ? "ANTHROPIC_API_KEY found — making one real Haiku call…"
      : "No ANTHROPIC_API_KEY — showing static fallback quips.",
  );

  const ai = await aiCommentary(matches, teamMap);
  console.log(ai ? "✓ AI quips returned.\n" : "→ Using static fallback.\n");

  for (const m of matches) {
    const h = teamMap.get(m.home_team_id ?? -1)?.name;
    const a = teamMap.get(m.away_team_id ?? -1)?.name;
    const source = ai?.get(m.id) ? "AI " : "static";
    const quip = ai?.get(m.id) ?? matchCommentary(m, teamMap);
    console.log(`[${source}] ${h} ${m.home_score}–${m.away_score} ${a}`);
    console.log(`         ${quip}\n`);
  }

  const html = buildDigestHtml(matches, teamMap, ai, "https://example.com");
  const out = "digest-preview.html";
  fs.writeFileSync(out, html);
  console.log(`Wrote ${out} — open it in a browser to see the full email.`);
}

main().catch((err) => {
  console.error("✗ Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
