"use client";

import { useState } from "react";
import type { RungTally, ResultsRound } from "@/lib/knockout-reach";
import KnockoutReachBrowser from "./KnockoutReachBrowser";
import KnockoutResultsBrowser from "./KnockoutResultsBrowser";

const tabCls = (active: boolean) =>
  `shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
  }`;

type View = "bracket" | "results";

export default function EveryoneTabs({
  rungs,
  rounds,
  meId,
  totalPlayers,
}: {
  rungs: RungTally[];
  rounds: ResultsRound[];
  meId: string;
  totalPlayers: number;
}) {
  const [view, setView] = useState<View>("bracket");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setView("bracket")} className={tabCls(view === "bracket")}>
          Bracket Picks
        </button>
        <button onClick={() => setView("results")} className={tabCls(view === "results")}>
          Knockout Results
        </button>
      </div>

      {view === "bracket" ? (
        <KnockoutReachBrowser rungs={rungs} meId={meId} totalPlayers={totalPlayers} />
      ) : (
        <KnockoutResultsBrowser rounds={rounds} meId={meId} />
      )}
    </div>
  );
}
