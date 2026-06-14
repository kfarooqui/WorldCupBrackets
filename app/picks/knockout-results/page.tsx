import { computeKnockoutResults } from "@/lib/knockout-reach";
import { fakeTeamsById, fakeMatches, fakePlayers, FAKE_ME_ID } from "@/lib/knockout-fake";
import KnockoutResultsBrowser from "@/components/KnockoutResultsBrowser";

export const dynamic = "force-dynamic";

/* PREVIEW — fake data (see lib/knockout-fake.ts). Throwaway until real data. */
export default function KnockoutResultsPage() {
  const rounds = computeKnockoutResults(fakeMatches, fakePlayers, fakeTeamsById);
  return (
    <div>
      <div className="card mb-4 border border-[var(--accent)]/40 bg-[var(--accent)]/10">
        <p className="text-sm">
          <strong>⚙️ Preview — fake data.</strong> A sandbox for the knockout
          results view, using {fakePlayers.length} made-up players. R32→QF are
          “played”; the Semifinals onward aren&apos;t. See the round-by-round
          version on the{" "}
          <a className="underline" href="/picks/knockout-preview">
            Bracket Picks
          </a>{" "}
          page.
        </p>
      </div>

      <h1 className="text-2xl font-bold">Knockout Results</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        As each match is decided, whoever picked the winner to advance scores —
        whoever picked the loser is knocked out.
      </p>

      <KnockoutResultsBrowser rounds={rounds} meId={FAKE_ME_ID} />
    </div>
  );
}
