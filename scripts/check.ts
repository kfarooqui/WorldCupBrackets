import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  console.log("URL:", url);
  console.log("service key:", key ? `set (${key.length} chars)` : "MISSING");
  console.log("anon key:", anon ? `set (${anon.length} chars)` : "MISSING");

  const db = createClient(url, key, { auth: { persistSession: false } });

  const tables = [
    "app_settings",
    "profiles",
    "teams",
    "matches",
    "match_predictions",
    "advancement_predictions",
    "third_place_predictions",
    "bracket_predictions",
    "prediction_submissions",
    "pending_results",
  ];

  console.log("\nTable check:");
  for (const t of tables) {
    const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t}: ${error ? "❌ " + error.message : `✓ ${count} rows`}`);
  }
}

main().catch((e) => {
  console.error("CONNECTION ERROR:", e.message);
  process.exit(1);
});
