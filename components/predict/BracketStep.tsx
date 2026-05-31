"use client";

import type { Team } from "@/lib/types";
import {
  ROUNDS,
  ROUND_SIZE,
  computeOccupants,
  type Advancement,
  type BracketPicks,
  type Round,
} from "@/lib/bracket";

const ROUND_TITLE: Record<Round, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinals",
  sf: "Semifinals",
  final: "Final",
};

export default function BracketStep({
  teamsById,
  advancement,
  sortedThirds,
  picks,
  onPick,
  readOnly,
}: {
  teamsById: Map<number, Team>;
  advancement: Advancement;
  sortedThirds: number[];
  picks: BracketPicks;
  onPick: (round: Round, slot: number, teamId: number) => void;
  readOnly: boolean;
}) {
  const occ = computeOccupants(advancement, sortedThirds, picks);
  const champion = picks.final?.[0] ?? null;

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Tap a team to send them through. Each match only offers the teams you advanced —
        so you can never pick a team you&apos;ve eliminated. Change an earlier pick and the
        later rounds update automatically.
      </p>

      {champion && (
        <div className="mb-4 card border-[var(--accent)] text-center">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Your champion 🏆
          </div>
          <div className="mt-1 text-xl font-extrabold text-[var(--accent)]">
            {teamsById.get(champion)?.flag_emoji} {teamsById.get(champion)?.name}
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ROUNDS.map((round) => (
          <div key={round} className="min-w-[210px] flex-shrink-0">
            <h4 className="mb-2 text-center text-sm font-bold text-[var(--accent)]">
              {ROUND_TITLE[round]}
            </h4>
            <div className="space-y-2">
              {Array.from({ length: ROUND_SIZE[round] }, (_, slot) => {
                const [top, bot] = occ[round][slot];
                const chosen = picks[round]?.[slot] ?? null;
                return (
                  <div
                    key={slot}
                    className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
                  >
                    <TeamSlot
                      teamId={top}
                      team={top ? teamsById.get(top) : undefined}
                      chosen={chosen === top}
                      onClick={() => top && onPick(round, slot, top)}
                      readOnly={readOnly}
                    />
                    <div className="h-px bg-[var(--border)]" />
                    <TeamSlot
                      teamId={bot}
                      team={bot ? teamsById.get(bot) : undefined}
                      chosen={chosen === bot}
                      onClick={() => bot && onPick(round, slot, bot)}
                      readOnly={readOnly}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSlot({
  teamId,
  team,
  chosen,
  onClick,
  readOnly,
}: {
  teamId: number | null;
  team: Team | undefined;
  chosen: boolean;
  onClick: () => void;
  readOnly: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={readOnly || !teamId}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
        chosen
          ? "bg-[var(--primary)] font-semibold text-white"
          : teamId
            ? "hover:bg-[var(--border)]"
            : "text-[var(--muted)]"
      }`}
    >
      {team ? (
        <>
          <span aria-hidden>{team.flag_emoji}</span>
          <span className="truncate">{team.name}</span>
        </>
      ) : (
        <span className="italic">TBD</span>
      )}
    </button>
  );
}
