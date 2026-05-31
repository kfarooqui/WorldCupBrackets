"use client";

import type { Match, Team, Pick } from "@/lib/types";
import { GROUP_LETTERS } from "@/lib/worldcup-data";

export type MatchPick = {
  pick: Pick | null;
  ph: string; // predicted home score (optional)
  pa: string; // predicted away score (optional)
};

export default function GroupStep({
  matches,
  teamsById,
  picks,
  onChange,
  readOnly,
}: {
  matches: Match[];
  teamsById: Map<number, Team>;
  picks: Record<number, MatchPick>;
  onChange: (matchId: number, value: MatchPick) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      {GROUP_LETTERS.map((letter) => {
        const groupMatches = matches.filter((m) => m.group_letter === letter);
        const done = groupMatches.filter((m) => picks[m.id]?.pick).length;
        return (
          <div key={letter} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Group {letter}</h3>
              <span className="text-xs text-[var(--muted)]">
                {done}/{groupMatches.length} picked
              </span>
            </div>
            <div className="space-y-2">
              {groupMatches.map((m) => {
                const home = teamsById.get(m.home_team_id!);
                const away = teamsById.get(m.away_team_id!);
                const p = picks[m.id] ?? { pick: null, ph: "", pa: "" };
                const set = (v: Partial<MatchPick>) => onChange(m.id, { ...p, ...v });
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--surface-2)] p-2 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="grid grid-cols-3 gap-1">
                      <PickButton
                        label={`${home?.flag_emoji ?? ""} ${home?.name ?? "?"}`}
                        active={p.pick === "HOME"}
                        onClick={() => set({ pick: "HOME" })}
                        disabled={readOnly}
                        align="left"
                      />
                      <PickButton
                        label="Draw"
                        active={p.pick === "DRAW"}
                        onClick={() => set({ pick: "DRAW" })}
                        disabled={readOnly}
                        align="center"
                      />
                      <PickButton
                        label={`${away?.name ?? "?"} ${away?.flag_emoji ?? ""}`}
                        active={p.pick === "AWAY"}
                        onClick={() => set({ pick: "AWAY" })}
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
                        onChange={(e) => set({ ph: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                        disabled={readOnly}
                        aria-label="predicted home score"
                      />
                      <span>-</span>
                      <input
                        inputMode="numeric"
                        className="input w-12 px-2 py-1 text-center"
                        value={p.pa}
                        onChange={(e) => set({ pa: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                        disabled={readOnly}
                        aria-label="predicted away score"
                      />
                    </div>
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
