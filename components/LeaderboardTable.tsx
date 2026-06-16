"use client";

import { useState } from "react";
import type { LeaderboardRow } from "@/lib/leaderboard";

type Mode = "official" | "participation";

const tabCls = (active: boolean) =>
  `shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
  }`;

const medal = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;

/** Sort rows by a total and assign dense ranks (ties share a rank). */
function ranked(rows: LeaderboardRow[], totalOf: (r: LeaderboardRow) => number) {
  const sorted = [...rows].sort((a, b) => totalOf(b) - totalOf(a));
  let rank = 0;
  let prev = Number.NaN;
  return sorted.map((row, i) => {
    const total = totalOf(row);
    if (total !== prev) {
      rank = i + 1;
      prev = total;
    }
    return { row, rank, total };
  });
}

export default function LeaderboardTable({
  rows,
  meId,
}: {
  rows: LeaderboardRow[];
  meId: string;
}) {
  const [mode, setMode] = useState<Mode>("official");
  const participation = mode === "participation";

  // Participation = official minus the exact-scoreline bonuses.
  const totalOf = (r: LeaderboardRow) =>
    participation ? r.score.total - r.score.groupExact : r.score.total;
  const groupOf = (r: LeaderboardRow) =>
    participation ? r.score.group - r.score.groupExact : r.score.group;

  const list = ranked(rows, totalOf);

  return (
    <div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setMode("official")} className={tabCls(!participation)}>
          Official
        </button>
        <button onClick={() => setMode("participation")} className={tabCls(participation)}>
          🏅 Participation trophy
        </button>
      </div>

      {participation && (
        <div className="card mt-4 border border-[var(--accent)]/40 bg-[var(--accent)]/10">
          <p className="text-sm">
            <strong>🏅 Participation trophy — unofficial.</strong>{" "}
            Exact-score bonuses don&apos;t count here: you still earn points for calling each
            result, just not for nailing the exact scoreline. The official standings are unchanged.
          </p>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Player</th>
              <th className="py-2 pr-3 text-right">Group</th>
              <th className="py-2 pr-3 text-right">Bracket</th>
              <th className="py-2 pr-3 text-right">🏆</th>
              <th className="py-2 pr-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ row: r, rank, total }) => (
              <tr
                key={r.profile.id}
                className={`border-b border-[var(--border)]/50 ${
                  r.profile.id === meId ? "bg-[var(--primary)]/10" : ""
                }`}
              >
                <td className="py-2 pr-3 font-bold">{medal(rank)}</td>
                <td className="py-2 pr-3 font-medium">
                  {r.profile.first_name} {r.profile.last_name}
                  {r.profile.id === meId && (
                    <span className="ml-2 text-xs text-[var(--accent)]">you</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right text-[var(--muted)]">{groupOf(r)}</td>
                <td className="py-2 pr-3 text-right text-[var(--muted)]">{r.score.reach}</td>
                <td className="py-2 pr-3 text-right text-[var(--muted)]">{r.score.champion}</td>
                <td className="py-2 pr-3 text-right text-lg font-extrabold text-[var(--accent)]">
                  {total}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--muted)]">
                  No approved players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
