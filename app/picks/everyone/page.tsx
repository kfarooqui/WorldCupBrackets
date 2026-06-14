import { requireApproved } from "@/lib/auth";
import { getEveryoneViewData } from "@/lib/knockout-everyone";
import EveryoneTabs from "@/components/EveryoneTabs";

export const dynamic = "force-dynamic";

export default async function EveryonePage() {
  const me = await requireApproved();
  const { rungs, rounds, totalPlayers, locked } = await getEveryoneViewData();

  return (
    <div>
      <h1 className="text-2xl font-bold">Everyone</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        Who did everyone send through the bracket — and how are those picks holding up as
        results come in?
      </p>

      {!locked && (
        <div className="card mb-4 border border-[var(--accent)]/40 bg-[var(--accent)]/10">
          <p className="text-sm">
            <strong>🔒 Picks reveal after the deadline.</strong> Until predictions lock you
            can only see your own picks here. Everyone&apos;s picks appear once the deadline
            passes.
          </p>
        </div>
      )}

      <EveryoneTabs
        rungs={rungs}
        rounds={rounds}
        meId={me.id}
        totalPlayers={totalPlayers}
      />
    </div>
  );
}
