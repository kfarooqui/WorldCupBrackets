"use client";

import type { Match, Team, Pick } from "@/lib/types";
import { GROUP_LETTERS } from "@/lib/worldcup-data";
import { fixtureLine } from "@/lib/format";

export type MatchPick = {
  pick: Pick | null;
  ph: string; // predicted home score (optional)
  pa: string; // predicted away score (optional)
};

/** Outcome implied by a complete predicted score, or null if incomplete. */
function impliedOutcome(ph: string, pa: string): Pick | null {
  if (ph === "" || pa === "") return null;
  const h = Number(ph);
  const a = Number(pa);
  return h > a ? "HOME" : h < a ? "AWAY" : "DRAW";
}

export default function GroupStep({
  matches,
  teamsById,
  picks,
  onChange,
  readOnly,
  groupScores,
}: {
  matches: Match[];
  teamsById: Map<number, Team>;
  picks: Record<number, MatchPick>;
  onChange: (matchId: number, value: MatchPick) => void;
  readOnly: boolean;
  groupScores?: Record<number, { home: number; away: number }>;
}) {
  return (
    <div className="space-y-6">
      {GROUP_LETTERS.map((letter) => {
        const groupMatches = matches.filter((m) => m.group_letter === letter);
        const done = groupMatches.filter((m) => picks[m.id]?.pick).length;
        const groupHasResults = groupMatches.some((m) => groupScores?.[m.id]);
        return (
          <div key={letter} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Group {letter}</h3>
              <span className="text-xs text-[var(--muted)]">
                {done}/{groupMatches.length} picked
              </span>
            </div>
            {groupHasResults && (
              <div className="mb-1 hidden px-2 text-xs font-medium text-[var(--muted)] sm:grid sm:grid-cols-[1fr_7rem]">
                <span />
                <span className="pl-3 text-right">Actual Results</span>
              </div>
            )}
            <div className="space-y-2">
              {groupMatches.map((m) => {
                const home = teamsById.get(m.home_team_id!);
                const away = teamsById.get(m.away_team_id!);
                const p = picks[m.id] ?? { pick: null, ph: "", pa: "" };
                // Tapping a W/D/L button: set it, and clear any score that contradicts it.
                const setPick = (outcome: Pick) => {
                  const io = impliedOutcome(p.ph, p.pa);
                  const clears = io !== null && io !== outcome;
                  onChange(m.id, {
                    pick: outcome,
                    ph: clears ? "" : p.ph,
                    pa: clears ? "" : p.pa,
                  });
                };
                // Editing a score: keep it, and sync the W/D/L pick to match once complete.
                const setScore = (field: "ph" | "pa", value: string) => {
                  const next = { ...p, [field]: value };
                  const io = impliedOutcome(next.ph, next.pa);
                  onChange(m.id, { ...next, pick: io ?? next.pick });
                };
                const res = groupScores?.[m.id];
                const actual = res
                  ? res.home > res.away
                    ? "HOME"
                    : res.home < res.away
                      ? "AWAY"
                      : "DRAW"
                  : null;
                const outcomeRight = res != null && p.pick === actual;
                const exactRight =
                  res != null &&
                  p.ph !== "" &&
                  p.pa !== "" &&
                  Number(p.ph) === res.home &&
                  Number(p.pa) === res.away;
                const pts = (outcomeRight ? 1 : 0) + (exactRight ? 1 : 0);
                return (
                  <div key={m.id} className="rounded-lg bg-[var(--surface-2)] p-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="grid grid-cols-3 gap-1">
                      <PickButton
                        label={`${home?.flag_emoji ?? ""} ${home?.name ?? "?"}`}
                        active={p.pick === "HOME"}
                        onClick={() => setPick("HOME")}
                        disabled={readOnly}
                        align="left"
                      />
                      <PickButton
                        label="Draw"
                        active={p.pick === "DRAW"}
                        onClick={() => setPick("DRAW")}
                        disabled={readOnly}
                        align="center"
                      />
                      <PickButton
                        label={`${away?.name ?? "?"} ${away?.flag_emoji ?? ""}`}
                        active={p.pick === "AWAY"}
                        onClick={() => setPick("AWAY")}
                        disabled={readOnly}
                        align="right"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1 text-sm">
                      <span className="text-xs text-[var(--muted)]">score</span>
                      <input
                        inputMode="numeric"
                        className="input w-12 px-2 py-1 text-center"
                        value={p.ph}
                        onChange={(e) => setScore("ph", e.target.value.replace(/\D/g, "").slice(0, 2))}
                        disabled={readOnly}
                        aria-label="predicted home score"
                      />
                      <span>-</span>
                      <input
                        inputMode="numeric"
                        className="input w-12 px-2 py-1 text-center"
                        value={p.pa}
                        onChange={(e) => setScore("pa", e.target.value.replace(/\D/g, "").slice(0, 2))}
                        disabled={readOnly}
                        aria-label="predicted away score"
                      />
                    </div>
                    </div>
                    {res && (
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2 sm:h-full sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                        <div className="text-sm font-semibold tabular-nums">
                          {res.home}–{res.away}
                        </div>
                        <span
                          className={`pill text-xs ${
                            outcomeRight
                              ? "bg-green-500/20 text-green-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {outcomeRight ? `✓ +${pts}` : "✗ 0"}
                          {exactRight ? " · exact" : ""}
                        </span>
                      </div>
                    )}
                    </div>
                    {fixtureLine(m) && (
                      <p className="mt-1 px-1 text-[11px] text-[var(--muted)]">
                        🗓 {fixtureLine(m)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PickButton({
  label,
  active,
  onClick,
  disabled,
  align,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  align: "left" | "center" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`truncate rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
        align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"
      } ${
        active
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]"
      }`}
    >
      {label}
    </button>
  );
}
