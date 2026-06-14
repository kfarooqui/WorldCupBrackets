import { computeReachTallies } from "@/lib/knockout-reach";
import { deriveReality } from "@/lib/score-engine";
import { fakeTeamsById, fakeMatches, fakePlayers, FAKE_ME_ID } from "@/lib/knockout-fake";
import KnockoutReachBrowser from "@/components/KnockoutReachBrowser";

export const dynamic = "force-dynamic";

/* PREVIEW — fake data (see lib/knockout-fake.ts). Throwaway until real data. */
export default function KnockoutPreviewPage() {
  const reality = deriveReality(fakeMatches);
  const rungs = computeReachTallies(fakePlayers, fakeTeamsById, reality);
  return (
    <div>
      <div className="card mb-4 border border-[var(--accent)]/40 bg-[var(--accent)]/10">
        <p className="text-sm">
          <strong>⚙️ Preview — fake data.</strong> A sandbox for the knockout
          “everyone” view, using {fakePlayers.length} made-up players. R32→SF are
          “played” (✓ reached / ✗ out); the Final &amp; Champion are still
          “predictions only.” See the match-by-match version on the{" "}
          <a className="underline" href="/picks/knockout-results">
            Knockout Results
          </a>{" "}
          page.
        </p>
      </div>

      <h1 className="text-2xl font-bold">Bracket Picks</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        Who did everyone send to each round? Tap a team to see the believers.
      </p>

      <KnockoutReachBrowser rungs={rungs} meId={FAKE_ME_ID} totalPlayers={fakePlayers.length} />
    </div>
  );
}
