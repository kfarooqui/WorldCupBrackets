"use client";

import { useState } from "react";
import type { ResultsRound, MatchOutcome, SideOutcome, Picker } from "@/lib/knockout-reach";

const tabCls = (active: boolean) =>
  `shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
  }`;

const SHORT: Record<string, string> = {
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  final: "Final",
};

function PickerPills({ pickers, meId, tone }: { pickers: Picker[]; meId?: string; tone: "win" | "out" }) {
  if (pickers.length === 0) {
    return <span className="text-xs text-[var(--muted)]">nobody</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {pickers.map((p) => {
        const me = p.userId === meId;
        const base = me
          ? "bg-[var(--accent)]/20 text-[var(--accent)]"
          : tone === "win"
            ? "bg-green-500/15 text-green-300"
            : "bg-[var(--surface-2)] text-[var(--muted)]";
        return (
          <span key={p.userId} className={`pill ${base}`}>
            {p.name}
          </span>
        );
      })}
    </div>
  );
}

function teamLabel(side: SideOutcome) {
  return side.team ? `${side.team.flag_emoji} ${side.team.name}` : "TBD";
}

function MatchCard({ m, meId }: { m: MatchOutcome; meId?: string }) {
  return (
    <div className="card">
      {/* Fixture line */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {m.finished && m.winner && m.loser ? (
            <>
              <span>{teamLabel(m.winner)}</span>
              <span className="mx-1.5 text-[var(--muted)]">{m.score}</span>
              <span className="text-[var(--muted)] line-through opacity-70">
                {teamLabel(m.loser)}
              </span>
            </>
          ) : (
            <>
              {teamLabel(m.home)} <span className="text-[var(--muted)]">v</span> {teamLabel(m.away)}
            </>
          )}
        </span>
        <span className="shrink-0 text-xs text-[var(--muted)]">{m.reachedLabel}</span>
      </div>

      {m.fixture && <div className="mb-2 text-xs text-[var(--muted)]">🗓 {m.fixture}</div>}

      {m.finished && m.winner && m.loser ? (
        <div className="space-y-2">
          <div>
            <div className="mb-1 text-xs font-medium text-green-300">
              ✓ Through to the {m.reachedLabel}{" "}
              <span className="text-[var(--muted)]">
                · +{m.points} pt{m.points === 1 ? "" : "s"} each
              </span>
            </div>
            <PickerPills pickers={m.winner.believers} meId={meId} tone="win" />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-red-300">
              ✗ Eliminated <span className="text-[var(--muted)]">· 0 pts</span>
            </div>
            <PickerPills pickers={m.loser.believers} meId={meId} tone="out" />
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Not played yet — {m.home.believers.length + m.away.believers.length} pick
          {m.home.believers.length + m.away.believers.length === 1 ? "" : "s"} riding on this match.
        </p>
      )}
    </div>
  );
}

export default function KnockoutResultsBrowser({
  rounds,
  meId,
}: {
  rounds: ResultsRound[];
  meId?: string;
}) {
  const [activeKey, setActiveKey] = useState(rounds[0]?.key);
  const round = rounds.find((r) => r.key === activeKey) ?? rounds[0];
  if (!round) return null;

  const playedCount = round.matches.filter((m) => m.finished).length;

  return (
    <div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {rounds.map((r) => (
          <button key={r.key} onClick={() => setActiveKey(r.key)} className={tabCls(r.key === activeKey)}>
            {SHORT[r.key] ?? r.label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-sm text-[var(--muted)]">
        {round.label} — {playedCount} of {round.matches.length} played. As each match
        finishes, the winner&apos;s believers score and the loser&apos;s are knocked out.
      </p>

      <div className="space-y-3">
        {round.matches.map((m) => (
          <MatchCard key={m.matchId} m={m} meId={meId} />
        ))}
      </div>
    </div>
  );
}
