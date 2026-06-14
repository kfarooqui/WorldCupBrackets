import { requireApproved, predictionsLocked } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEveryonePicksData } from "@/lib/everyone-picks";
import EveryonePicksTabs from "@/components/EveryonePicksTabs";

export const dynamic = "force-dynamic";

export default async function EveryonePicksPage() {
  const me = await requireApproved();
  const locked = await predictionsLocked();

  if (!locked) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("lock_at")
      .eq("id", 1)
      .single();
    const when = data?.lock_at ? new Date(data.lock_at).toLocaleString() : "kickoff";
    return (
      <div className="card mx-auto max-w-lg text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold">Everyone&apos;s picks are hidden</h1>
        <p className="mt-2 text-[var(--muted)]">
          To keep things fair, all predictions stay private until they lock at{" "}
          <strong>{when}</strong>. Come back then to see what everyone guessed!
        </p>
      </div>
    );
  }

  const { champions, groupMatches, teams, rungs, rounds, totalPlayers } =
    await getEveryonePicksData();

  return (
    <div>
      <h1 className="text-2xl font-bold">Everyone&apos;s Picks</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        What did everyone predict — and how is it holding up as results come in?
      </p>

      <EveryonePicksTabs
        champions={champions}
        groupMatches={groupMatches}
        teams={teams}
        rungs={rungs}
        rounds={rounds}
        meId={me.id}
        totalPlayers={totalPlayers}
      />
    </div>
  );
}
