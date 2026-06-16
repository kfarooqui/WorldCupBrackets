/**
 * Preview the daily morning-briefing email — yesterday's results recapped and
 * today's fixtures "predicted" — WITHOUT touching the database or sending mail.
 *
 *   npm run preview-morning         # writes morning-preview.html
 *
 * If ANTHROPIC_API_KEY is set (in .env.local), this makes TWO real Haiku calls
 * (recaps + predictions) and shows the live AI quips; otherwise it shows the
 * static fallbacks. Either way it writes morning-preview.html and prints each
 * quip so you can eyeball the tone before a single real email goes out.
 *
 * Safe to delete — it's a dev-only preview, not part of the app.
 */
import fs from "node:fs";
import {
  aiResultsTheme,
  aiPredictions,
  buildMorningHtml,
  resultsTheme,
  matchPrediction,
} from "../lib/email";
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

// Yesterday — finished results (one per commentary bucket).
const yesterday: Match[] = [
  [201, 1, 2, 5, 0], // Brazil 5–0 Canada
  [202, 3, 4, 1, 0], // Japan 1–0 Germany
  [203, 5, 6, 0, 0], // Mexico 0–0 Croatia
].map(([id, home, away, hs, as]) => ({
  id, stage: "group", group_letter: "A", match_no: id, slot_label: null,
  home_team_id: home, away_team_id: away, kickoff_at: null,
  match_date: "2026-06-14", kickoff: "3:00 PM ET", venue: "MetLife Stadium", city: "New York",
  home_score: hs, away_score: as, status: "finished",
}));

// Today — upcoming fixtures (no scores yet).
const today: Match[] = [
  [204, 7, 8], // Nigeria vs Norway
  [205, 4, 5], // Germany vs Mexico
].map(([id, home, away]) => ({
  id, stage: "group", group_letter: "B", match_no: id, slot_label: null,
  home_team_id: home, away_team_id: away, kickoff_at: null,
  match_date: "2026-06-15", kickoff: "6:00 PM ET", venue: "SoFi Stadium", city: "Los Angeles",
  home_score: null, away_score: null, status: "scheduled",
}));

async function main() {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  console.log(
    process.env.ANTHROPIC_API_KEY
      ? "ANTHROPIC_API_KEY found — making two real Haiku calls…"
      : "No ANTHROPIC_API_KEY — showing static fallback quips.",
  );

  const [theme, predictions] = await Promise.all([
    aiResultsTheme(yesterday, teamMap),
    aiPredictions(today, teamMap),
  ]);
  console.log(theme ? "✓ AI theme returned." : "→ Static theme fallback.");
  console.log(predictions ? "✓ AI predictions returned.\n" : "→ Static prediction fallback.\n");

  console.log("— Yesterday —");
  for (const m of yesterday) {
    const h = teamMap.get(m.home_team_id ?? -1)?.name;
    const a = teamMap.get(m.away_team_id ?? -1)?.name;
    console.log(`${h} ${m.home_score}–${m.away_score} ${a}`);
  }
  console.log(`\nWhat did we learn? ${theme ?? resultsTheme(yesterday)}\n`);

  console.log("— Today —");
  for (const m of today) {
    const h = teamMap.get(m.home_team_id ?? -1)?.name;
    const a = teamMap.get(m.away_team_id ?? -1)?.name;
    const quip = predictions?.get(m.id) ?? matchPrediction(m, teamMap);
    console.log(`${h} vs ${a}\n  ${quip}\n`);
  }

  const html = buildMorningHtml(yesterday, today, teamMap, theme, predictions, "https://example.com");
  const out = "morning-preview.html";
  fs.writeFileSync(out, html);
  console.log(`Wrote ${out} — open it in a browser to see the full email.`);
}

main().catch((err) => {
  console.error("✗ Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
