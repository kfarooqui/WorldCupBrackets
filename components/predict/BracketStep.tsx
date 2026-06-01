"use client";

import type { Team } from "@/lib/types";
import {
  ROUNDS,
  ROUND_SIZE,
  computeOccupants,
  r32MatchLabel,
  type Advancement,
  type BracketPicks,
  type Round,
} from "@/lib/bracket";
import { KO_SCHEDULE } from "@/lib/schedule";
import { fixtureLine } from "@/lib/format";

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
  thirds,
  picks,
  onPick,
  readOnly,
}: {
  teamsById: Map<number, Team>;
  advancement: Advancement;
  thirds: number[];
  picks: BracketPicks;
  onPick: (round: Round, slot: number, teamId: number) => void;
  readOnly: boolean;
}) {
  const occ = computeOccupants(advancement, thirds, picks);
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

      {/* Full-bleed bracket tree. Every column is the same height (items-stretch)
          and each match is an equal flex slot, so a later-round match auto-centers
          vertically between the two matches that feed it. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto px-4 pb-4">
        <div className="mx-auto flex w-max items-stretch gap-3">
          {ROUNDS.map((round) => (
            <div key={round} className="flex w-[215px] flex-shrink-0 flex-col">
              <h4 className="mb-2 text-center text-sm font-bold text-[var(--accent)]">
                {ROUND_TITLE[round]}
              </h4>
              <div className="flex flex-1 flex-col">
                {Array.from({ length: ROUND_SIZE[round] }, (_, slot) => {
                  const [top, bot] = occ[round][slot];
                  const chosen = picks[round]?.[slot] ?? null;
                  return (
                    <div key={slot} className="flex flex-1 flex-col justify-center py-1">
                      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
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
                      {round === "r32" && (
                        <p className="mt-0.5 px-1 text-[10px] font-medium leading-tight text-[var(--accent)]">
                          {r32MatchLabel(slot)}
                        </p>
                      )}
                      {KO_SCHEDULE[round]?.[slot] && (
                        <p className="px-1 text-[10px] leading-tight text-[var(--muted)]">
                          🗓{" "}
                          {fixtureLine({
                            match_date: KO_SCHEDULE[round][slot].date,
                            kickoff: KO_SCHEDULE[round][slot].time,
                            venue: KO_SCHEDULE[round][slot].venue,
                            city: KO_SCHEDULE[round][slot].city,
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
