/**
 * Seeds 48 teams + 72 group matches + 31 empty knockout slots into Supabase.
 * Idempotent (upserts). Run after applying the migration:
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { TEAMS, buildSeedMatches } from "../lib/worldcup-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.local.example to .env.local and fill them in.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Seeding teams…");
  const teamRows = TEAMS.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    flag_emoji: t.flag,
    group_letter: t.group,
  }));
  const { error: teamErr } = await supabase
    .from("teams")
    .upsert(teamRows, { onConflict: "id" });
  if (teamErr) throw teamErr;
  console.log(`  ✓ ${teamRows.length} teams`);

  console.log("Seeding matches…");
  const matchRows = buildSeedMatches().map((m) => ({
    id: m.id,
    stage: m.stage,
    group_letter: m.group_letter,
    match_no: m.match_no,
    slot_label: m.slot_label,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    kickoff_at: m.kickoff_at,
    status: "scheduled",
  }));
  const { error: matchErr } = await supabase
    .from("matches")
    .upsert(matchRows, { onConflict: "id" });
  if (matchErr) throw matchErr;
  console.log(`  ✓ ${matchRows.length} matches (72 group + 31 knockout slots)`);

  console.log("Done. 🌍⚽");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
