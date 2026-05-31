import { createAdminClient } from "@/lib/supabase/admin";
import type { Match, Team } from "@/lib/types";
import ResultsManager from "@/components/admin/ResultsManager";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const db = createAdminClient();
  const [{ data: matches }, { data: teams }, { count }] = await Promise.all([
    db.from("matches").select("*").order("match_no"),
    db.from("teams").select("*").order("id"),
    db.from("pending_results").select("*", { count: "exact", head: true }),
  ]);

  return (
    <ResultsManager
      matches={(matches as Match[]) ?? []}
      teams={(teams as Team[]) ?? []}
      pendingCount={count ?? 0}
    />
  );
}
