"use client";

import type { Team } from "@/lib/types";
import { GROUP_LETTERS, teamIdsInGroup } from "@/lib/worldcup-data";
import { TeamLabel } from "./TeamLabel";

export type GroupRank = { first: number | null; second: number | null; third: number | null };

export default function AdvanceStep({
  teamsById,
  advancement,
  onChange,
  thirds,
  onToggleThird,
  readOnly,
}: {
  teamsById: Map<number, Team>;
  advancement: Record<string, GroupRank>;
  onChange: (letter: string, rank: GroupRank) => void;
  thirds: number[];
  onToggleThird: (teamId: number) => void;
  readOnly: boolean;
}) {
  // The pool of 3rd-place teams the user has named, one per group.
  const thirdPool = GROUP_LETTERS.map((l) => advancement[l]?.third).filter(
    (t): t is number => typeof t === "number",
  );

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold">Group finishing order</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Rank the top 3 of each group. The 4th-place team is eliminated and won&apos;t
          appear in your bracket.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {GROUP_LETTERS.map((letter) => {
            const ids = teamIdsInGroup(letter);
            const rank = advancement[letter] ?? { first: null, second: null, third: null };
            const teams = ids.map((id) => teamsById.get(id)!);
            const choose = (pos: keyof GroupRank, value: number | null) => {
              const next = { ...rank, [pos]: value };
              // Keep positions mutually exclusive.
              (["first", "second", "third"] as const).forEach((k) => {
                if (k !== pos && next[k] === value) next[k] = null;
              });
              onChange(letter, next);
            };
            return (
              <div key={letter} className="rounded-lg bg-[var(--surface-2)] p-3">
                <div className="mb-2 font-semibold">Group {letter}</div>
                {(["first", "second", "third"] as const).map((pos, i) => (
                  <div key={pos} className="mb-1 flex items-center gap-2">
                    <span className="w-8 text-xs text-[var(--muted)]">
                      {i + 1}
                      {i === 0 ? "st" : i === 1 ? "nd" : "rd"}
                    </span>
                    <select
                      className="input py-1"
                      value={rank[pos] ?? ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        choose(pos, e.target.value ? Number(e.target.value) : null)
                      }
                    >
                      <option value="">— choose —</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.flag_emoji} {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Best third-place teams</h3>
          <span
            className={`pill ${
              thirds.length === 8
                ? "bg-green-500/20 text-green-300"
                : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            {thirds.length}/8 chosen
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          8 of the 12 third-place teams advance to the Round of 32. Pick which 8 make it.
          (Set each group&apos;s 3rd place above first.)
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {thirdPool.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              Choose 3rd-place teams above to populate this list.
            </p>
          )}
          {thirdPool.map((teamId) => {
            const checked = thirds.includes(teamId);
            const disabled = readOnly || (!checked && thirds.length >= 8);
            return (
              <label
                key={teamId}
                className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
                  checked
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] bg-[var(--surface-2)]"
                } ${disabled ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleThird(teamId)}
                />
                <TeamLabel team={teamsById.get(teamId)} />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
