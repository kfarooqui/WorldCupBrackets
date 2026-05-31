/* End-to-end smoke test against the live Supabase project. Cleans up after itself. */
import { createClient } from "@supabase/supabase-js";
import { getLeaderboard } from "../lib/leaderboard";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "kfarooqui@gmail.com";

async function ensureUser(email: string, meta: Record<string, string>) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error && !/registered|exists/i.test(error.message)) throw error;
  if (data?.user) return data.user.id;
  // Already exists — find it.
  const { data: list } = await db.auth.admin.listUsers();
  return list.users.find((u) => u.email === email)!.id;
}

async function main() {
  console.log("1) Ensure admin account (so you can log in immediately)…");
  const adminId = await ensureUser(ADMIN_EMAIL, { first_name: "Admin", last_name: "" });
  const { data: adminProfile } = await db.from("profiles").select("role,status").eq("id", adminId).single();
  console.log(`   admin profile → role=${adminProfile?.role}, status=${adminProfile?.status}`);

  console.log("2) Create + approve two test players…");
  const aliceId = await ensureUser("alice@smoketest.local", { first_name: "Alice", last_name: "Test", phone: "111" });
  const bobId = await ensureUser("bob@smoketest.local", { first_name: "Bob", last_name: "Test", phone: "222" });
  await db.from("profiles").update({ status: "approved" }).in("id", [aliceId, bobId]);
  console.log("   approved Alice + Bob");

  console.log("3) Predictions on group match #1 (Alice HOME 2-1, Bob DRAW 1-1)…");
  await db.from("match_predictions").delete().in("user_id", [aliceId, bobId]);
  await db.from("match_predictions").insert([
    { user_id: aliceId, match_id: 1, pick: "HOME", pred_home_score: 2, pred_away_score: 1 },
    { user_id: bobId, match_id: 1, pick: "DRAW", pred_home_score: 1, pred_away_score: 1 },
  ]);

  console.log("4) Champion pick for Alice (team #1) + finished Final…");
  await db.from("bracket_predictions").delete().eq("user_id", aliceId);
  await db.from("bracket_predictions").insert({ user_id: aliceId, round: "final", slot: 0, team_id: 1 });

  console.log("5) Enter results: group #1 = 2-1 (HOME), Final = team1 1-0 team2…");
  await db.from("matches").update({ home_score: 2, away_score: 1, status: "finished" }).eq("id", 1);
  const { data: finalMatch } = await db.from("matches").select("id").eq("stage", "final").single();
  await db.from("matches").update({
    home_team_id: 1, away_team_id: 2, home_score: 1, away_score: 0, status: "finished",
  }).eq("id", finalMatch!.id);

  console.log("6) Compute leaderboard…");
  const { rows } = await getLeaderboard();
  console.log(`   leaderboard has ${rows.length} row(s):`);
  for (const r of rows) {
    console.log(
      `   - ${r.profile.first_name} ${r.profile.last_name} (${r.profile.email}): group=${r.score.group} reach=${r.score.reach} champ=${r.score.champion} total=${r.score.total}`,
    );
  }
  console.log("   EXPECT → Alice: group=3 champ=8 total=11 · Bob: group=0 total=0");

  console.log("7) Cleanup (reset matches, delete test players)…");
  await db.from("matches").update({ home_score: null, away_score: null, status: "scheduled" }).eq("id", 1);
  await db.from("matches").update({
    home_team_id: null, away_team_id: null, home_score: null, away_score: null, status: "scheduled",
  }).eq("id", finalMatch!.id);
  await db.auth.admin.deleteUser(aliceId);
  await db.auth.admin.deleteUser(bobId);
  console.log("   ✓ test players removed; admin account kept");
  console.log("\nDONE ✅");
}

main().catch((e) => {
  console.error("SMOKE FAILED:", e);
  process.exit(1);
});
