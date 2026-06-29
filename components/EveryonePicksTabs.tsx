"use client";

import { useState } from "react";
import type { RungTally, ResultsRound } from "@/lib/knockout-reach";
import type { ChampionPick } from "@/lib/everyone-picks";
import type { Match, Team } from "@/lib/types";
import KnockoutReachBrowser from "./KnockoutReachBrowser";
import KnockoutResultsBrowser from "./KnockoutResultsBrowser";
import GroupMatchBrowser from "./GroupMatchBrowser";

const tabCls = (active: boolean) =>
  `shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
  }`;

type View = "champion" | "group" | "bracket" | "results";

const TABS: { key: View; label: string }[] = [
  { key: "champion", label: "Predicted champion" },
  { key: "group", label: "Group picks" },
  { key: "bracket", label: "Bracket picks" },
  { key: "results", label: "Knockout stage results" },
];

function ChampionList({ champions, meId }: { champions: ChampionPick[]; meId: string }) {
  if (champions.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No submitted picks yet.</p>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {champions.map((c) => {
        const me = c.userId === meId;
        return (
          <div
            key={c.userId}
            className={`flex justify-between rounded-lg px-3 py-2 text-sm ${
              me ? "bg-[var(--accent)]/15" : "bg-[var(--surface-2)]"
            }`}
          >
            <span>
              {c.name}
              {me && <span className="ml-2 text-xs text-[var(--accent)]">you</span>}
            </span>
            <span className="font-medium">
              {c.team ? `${c.team.flag_emoji} ${c.team.name}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function EveryonePicksTabs({
  champions,
  groupMatches,
  teams,
  rungs,
  rounds,
  meId,
  totalPlayers,
}: {
  champions: ChampionPick[];
  groupMatches: Match[];
  teams: Team[];
  rungs: RungTally[];
  rounds: ResultsRound[];
  meId: string;
  totalPlayers: number;
}) {
  const [view, setView] = useState<View>("results");

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)} className={tabCls(view === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {view === "champion" && <ChampionList champions={champions} meId={meId} />}
      {view === "group" && <GroupMatchBrowser matches={groupMatches} teams={teams} />}
      {view === "bracket" && (
        <KnockoutReachBrowser rungs={rungs} meId={meId} totalPlayers={totalPlayers} />
      )}
      {view === "results" && <KnockoutResultsBrowser rounds={rounds} meId={meId} />}
    </div>
  );
}
