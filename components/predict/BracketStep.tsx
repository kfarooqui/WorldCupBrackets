"use client";

import type { Team } from "@/lib/types";
import {
  ROUNDS,
  DISPLAY_ORDER,
  computeOccupants,
  r32MatchLabel,
  type Advancement,
  type BracketPicks,
  type Round,
} from "@/lib/bracket";
import { KO_SCHEDULE } from "@/lib/schedule";
import { fixtureLine } from "@/lib/format";
import { SCORING, reachPoints } from "@/lib/scoring";

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
  reached,
  champion,
}: {
  teamsById: Map<number, Team>;
  advancement: Advancement;
  thirds: number[];
  picks: BracketPicks;
  onPick: (round: Round, slot: number, teamId: number) => void;
  readOnly: boolean;
  reached?: Record<Round, Set<number>>;
  champion?: number | null;
}) {
  const occ = computeOccupants(advancement, thirds, picks);
  const championPick = picks.final?.[0] ?? null;

  // Map a bracket pick to the round its winner reaches, to grade it against reality.
  const NEXT: Record<Round, Round | "champion"> = {
    r32: "r16",
    r16: "qf",
    qf: "sf",
    sf: "final",
    final: "champion",
  };
  const evalPick = (
    round: Round,
    team: number | null,
  ): { ok: boolean; pts: number } | null => {
    if (team == null) return null;
    const target = NEXT[round];
    if (target === "champion") {
      if (champion == null) return null;
      return { ok: champion === team, pts: SCORING.champion };
    }
    const set = reached?.[target];
    if (!set || set.size === 0) return null;
    return { ok: set.has(team), pts: reachPoints(target) };
  };
  const champEval = evalPick("final", championPick);

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Tap a team to send them through. Each match only offers the teams you advanced —
        so you can never pick a team you&apos;ve eliminated. Change an earlier pick and the
        later rounds update automatically.
      </p>

      {championPick && (
        <div className="mb-4 card border-[var(--accent)] text-center">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Your champion 🏆
          </div>
          <div className="mt-1 text-xl font-extrabold text-[var(--accent)]">
            {teamsById.get(championPick)?.flag_emoji} {teamsById.get(championPick)?.name}
          </div>
          {champEval && (
            <div
              className={`mt-1 text-sm font-bold ${
                champEval.ok ? "text-green-300" : "text-red-300"
              }`}
            >
              {champEval.ok ? `✓ Champion · +${champEval.pts}` : "✗ Didn't win it"}
            </div>
          )}
        </div>
      )}

      {/* Full-bleed bracket tree. Every column is the same height (items-stretch)
          and each match is an equal flex slot, so a later-round match auto-centers
          vertically between the two matches that feed it. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto px-4 pb-4">
        <div className="mx-auto flex w-max items-stretch gap-8">
          {ROUNDS.map((round) => (
            <div key={round} className="flex w-[200px] flex-shrink-0 flex-col">
              <h4 className="mb-2 text-center text-sm font-bold text-[var(--accent)]">
                {ROUND_TITLE[round]}
              </h4>
              <div className="flex flex-1 flex-col">
                {DISPLAY_ORDER[round].map((slot, i) => {
                  const [top, bot] = occ[round][slot];
                  const chosen = picks[round]?.[slot] ?? null;
                  const chosenEval = evalPick(round, chosen);
                  return (
                    <div
                      key={slot}
                      className="relative flex min-h-[132px] flex-1 flex-col justify-center py-1"
                    >
                      {/* Connector to the next round (lives in the gap to the right) */}
                      {round !== "final" && (
                        <>
                          <div className="absolute right-0 top-1/2 h-px w-4 -translate-y-1/2 translate-x-full bg-[var(--border)]" />
                          <div
                            className={`absolute right-0 h-1/2 w-px translate-x-4 bg-[var(--border)] ${
                              i % 2 === 0 ? "top-1/2" : "bottom-1/2"
                            }`}
                          />
                        </>
                      )}
                      {/* Connector coming in from the previous round */}
                      {round !== "r32" && (
                        <div className="absolute left-0 top-1/2 h-px w-4 -translate-x-full -translate-y-1/2 bg-[var(--border)]" />
                      )}
                      {/* Card is the only centered element, so connectors meet its
                          vertical middle. Labels hang below without shifting it. */}
                      <div className="relative">
                        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                          <TeamSlot
                            teamId={top}
                            team={top ? teamsById.get(top) : undefined}
                            chosen={chosen === top}
                            onClick={() => top && onPick(round, slot, top)}
                            readOnly={readOnly}
                            result={chosen === top ? chosenEval : null}
                          />
                          <div className="h-px bg-[var(--border)]" />
                          <TeamSlot
                            teamId={bot}
                            team={bot ? teamsById.get(bot) : undefined}
                            chosen={chosen === bot}
                            onClick={() => bot && onPick(round, slot, bot)}
                            readOnly={readOnly}
                            result={chosen === bot ? chosenEval : null}
                          />
                        </div>
                        <div className="absolute left-0 right-0 top-full pt-0.5">
                          {round === "r32" && (
                            <p className="px-1 text-[10px] font-medium leading-tight text-[var(--accent)]">
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
                      </div>
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
  result,
}: {
  teamId: number | null;
  team: Team | undefined;
  chosen: boolean;
  onClick: () => void;
  readOnly: boolean;
  result?: { ok: boolean; pts: number } | null;
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
      {result && (
        <span
          className={`ml-auto shrink-0 rounded px-1 text-[10px] font-bold ${
            result.ok ? "bg-green-500/30 text-green-100" : "bg-red-500/30 text-red-100"
          }`}
        >
          {result.ok ? `✓ +${result.pts}` : "✗"}
        </span>
      )}
    </button>
  );
}
