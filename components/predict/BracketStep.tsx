"use client";

import { useState } from "react";
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
  const [round, setRound] = useState<Round>("r32");

  const pickedCount = (r: Round) =>
    Array.from({ length: ROUND_SIZE[r] }, (_, i) => i).filter(
      (slot) => typeof picks[r]?.[slot] === "number",
    ).length;

  const roundIdx = ROUNDS.indexOf(round);

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

      {/* Round selector — keeps everything on screen with no horizontal scroll */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ROUNDS.map((r) => {
          const done = pickedCount(r);
          const total = ROUND_SIZE[r];
          return (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                round === r
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {ROUND_TITLE[r]}{" "}
              <span className={done === total ? "text-green-300" : "opacity-70"}>
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>

      <h3 className="mb-2 text-center text-base font-bold text-[var(--accent)]">
        {ROUND_TITLE[round]}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: ROUND_SIZE[round] }, (_, slot) => {
          const [top, bot] = occ[round][slot];
          const chosen = picks[round]?.[slot] ?? null;
          return (
            <div key={slot}>
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
                <p className="mt-0.5 px-1 text-[11px] font-medium leading-tight text-[var(--accent)]">
                  {r32MatchLabel(slot)}
                </p>
              )}
              {KO_SCHEDULE[round]?.[slot] && (
                <p className="px-1 text-[11px] leading-tight text-[var(--muted)]">
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

      {/* Prev / Next round */}
      <div className="mt-5 flex justify-between">
        <button
          onClick={() => setRound(ROUNDS[roundIdx - 1])}
          disabled={roundIdx === 0}
          className="btn-ghost text-xs disabled:opacity-40"
        >
          ← {roundIdx > 0 ? ROUND_TITLE[ROUNDS[roundIdx - 1]] : ""}
        </button>
        <button
          onClick={() => setRound(ROUNDS[roundIdx + 1])}
          disabled={roundIdx === ROUNDS.length - 1}
          className="btn-ghost text-xs disabled:opacity-40"
        >
          {roundIdx < ROUNDS.length - 1 ? ROUND_TITLE[ROUNDS[roundIdx + 1]] : ""} →
        </button>
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
