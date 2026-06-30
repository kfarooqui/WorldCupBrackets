"use client";

import { useState } from "react";
import type { RungTally } from "@/lib/knockout-reach";

const tabCls = (active: boolean) =>
  `shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
  }`;

export default function KnockoutReachBrowser({
  rungs,
  meId,
  totalPlayers,
}: {
  rungs: RungTally[];
  meId?: string;
  totalPlayers: number;
}) {
  const [activeKey, setActiveKey] = useState(rungs[0]?.key);
  const [openTeam, setOpenTeam] = useState<number | null>(null);

  const rung = rungs.find((r) => r.key === activeKey) ?? rungs[0];
  if (!rung) return null;

  const maxCount = Math.max(1, ...rung.teams.map((t) => t.count));

  return (
    <div>
      {/* Rung tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {rungs.map((r) => (
          <button
            key={r.key}
            onClick={() => {
              setActiveKey(r.key);
              setOpenTeam(null);
            }}
            className={tabCls(r.key === activeKey)}
          >
            {r.short}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-bold">{rung.label}</h3>
          <span className="shrink-0 text-xs text-[var(--muted)]">
            {rung.points > 0 ? `+${rung.points} pts` : "0 pts"}
          </span>
        </div>
        <p className="mb-3 text-xs text-[var(--muted)]">
          {rung.resolved
            ? "✓ reached · ✗ out · uncolored = still to play."
            : "Not played yet — predictions only."}{" "}
          Tap a team to see who picked it.
        </p>

        {rung.teams.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">No picks yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {rung.teams.map((t) => {
              const pct = Math.round((t.count / maxCount) * 100);
              const mine = meId ? t.pickers.some((p) => p.userId === meId) : false;
              const open = openTeam === t.team.id;
              // Bar color: green if it reached, red only once it's definitively out,
              // neutral while it's still alive / its deciding match hasn't been played.
              const bar = t.reached
                ? "bg-green-500/35"
                : t.out
                  ? "bg-red-500/25"
                  : "bg-[var(--muted)]/25";
              return (
                <li key={t.team.id}>
                  <button
                    onClick={() => setOpenTeam(open ? null : t.team.id)}
                    className="relative w-full overflow-hidden rounded-lg bg-[var(--surface-2)] px-3 py-2 text-left text-sm hover:bg-[var(--border)]"
                  >
                    {/* popularity bar */}
                    <span
                      className={`absolute inset-y-0 left-0 ${bar}`}
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                    <span className="relative flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {(t.reached || t.out) && (
                          <span aria-hidden>{t.reached ? "✓" : "✗"}</span>
                        )}
                        <span className={t.out ? "line-through opacity-60" : ""}>
                          {t.team.flag_emoji} {t.team.name}
                        </span>
                        {mine && (
                          <span className="pill bg-[var(--accent)]/20 text-[var(--accent)]">you</span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-[var(--muted)]">
                        {t.count}/{totalPlayers}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="mt-1 mb-2 flex flex-wrap gap-1.5 px-1">
                      {t.pickers.map((p) => (
                        <span
                          key={p.userId}
                          className={`pill ${
                            p.userId === meId
                              ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                              : "bg-[var(--surface-2)] text-[var(--muted)]"
                          }`}
                        >
                          {p.name}
                          {t.reached ? " ✓" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
