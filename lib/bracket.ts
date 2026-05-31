import { GROUP_LETTERS } from "./worldcup-data";

/**
 * The knockout bracket as a fixed binary tree.
 *
 *  R32 (16 matches) → R16 (8) → QF (4) → SF (2) → Final (1)
 *
 * Each R32 match draws its two occupants from "source slots":
 *   "1X" = group X winner, "2X" = group X runner-up, "3-i" = the user's i-th
 *   best third-place team (the 8 chosen thirds sorted by group order).
 *
 * Downstream rounds merge adjacent matches: R16 match j is fed by R32 matches
 * 2j and 2j+1, and so on up to the Final. Because each node only ever offers
 * the two teams advanced into it, a user can never pick a team they eliminated.
 */

export type Source = string; // "1A" | "2A" | "3-0" .. "3-7"

/** 16 R32 matches, each [topSource, bottomSource]. Covers all 32 qualifiers once. */
export const R32_SOURCES: [Source, Source][] = [
  ["1A", "2B"],
  ["1C", "3-0"],
  ["1E", "2F"],
  ["1G", "3-1"],
  ["1I", "2J"],
  ["1K", "3-2"],
  ["2A", "3-3"],
  ["1B", "2C"],
  ["1D", "3-4"],
  ["1F", "2G"],
  ["1H", "3-5"],
  ["1J", "2K"],
  ["1L", "3-6"],
  ["2D", "2E"],
  ["2H", "2I"],
  ["2L", "3-7"],
];

export const ROUNDS = ["r32", "r16", "qf", "sf", "final"] as const;
export type Round = (typeof ROUNDS)[number];

/** Number of matches in each round. */
export const ROUND_SIZE: Record<Round, number> = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  final: 1,
};

export type Advancement = {
  // group letter -> { first, second } team ids
  [letter: string]: { first: number | null; second: number | null };
};

/** Resolve a source slot to a team id given the user's advancement + thirds. */
export function resolveSource(
  src: Source,
  adv: Advancement,
  sortedThirds: number[],
): number | null {
  if (src.startsWith("3-")) {
    const i = parseInt(src.slice(2), 10);
    return sortedThirds[i] ?? null;
  }
  const pos = src[0]; // "1" | "2"
  const letter = src[1];
  const group = adv[letter];
  if (!group) return null;
  return pos === "1" ? group.first : group.second;
}

/** The user's chosen thirds, sorted by group order, capped at 8. */
export function sortThirds(thirdTeamIds: number[]): number[] {
  return [...thirdTeamIds].sort((a, b) => a - b).slice(0, 8);
}

export type BracketPicks = {
  // round -> slot -> team id chosen to advance OUT of that match
  [round in Round]?: Record<number, number | null>;
};

/**
 * Compute, for every round and match slot, the two candidate team ids
 * (the occupants the user must choose between). Returns null for slots whose
 * inputs aren't decided yet.
 */
export function computeOccupants(
  adv: Advancement,
  sortedThirds: number[],
  picks: BracketPicks,
): Record<Round, [number | null, number | null][]> {
  const result = {} as Record<Round, [number | null, number | null][]>;

  // R32 occupants come straight from advancement + thirds.
  result.r32 = R32_SOURCES.map(([top, bot]) => [
    resolveSource(top, adv, sortedThirds),
    resolveSource(bot, adv, sortedThirds),
  ]);

  // Each later round merges adjacent matches of the previous round.
  let prev: Round = "r32";
  for (const round of ["r16", "qf", "sf", "final"] as Round[]) {
    const prevPicks = picks[prev] ?? {};
    result[round] = Array.from({ length: ROUND_SIZE[round] }, (_, j) => {
      const top = prevPicks[2 * j] ?? null;
      const bot = prevPicks[2 * j + 1] ?? null;
      return [top, bot] as [number | null, number | null];
    });
    prev = round;
  }
  return result;
}

/**
 * Validate + clean a set of bracket picks: any pick that isn't one of its
 * match's two current occupants is dropped (cascade-clear on upstream change).
 * Returns a sanitized copy.
 */
export function sanitizePicks(
  adv: Advancement,
  sortedThirds: number[],
  picks: BracketPicks,
): BracketPicks {
  const clean: BracketPicks = {};
  let working: BracketPicks = { ...picks };

  for (const round of ROUNDS) {
    const occ = computeOccupants(adv, sortedThirds, working)[round];
    const roundPicks: Record<number, number | null> = {};
    occ.forEach(([top, bot], slot) => {
      const chosen = working[round]?.[slot] ?? null;
      roundPicks[slot] = chosen === top || chosen === bot ? chosen : null;
    });
    clean[round] = roundPicks;
    working = { ...working, [round]: roundPicks };
  }
  return clean;
}

/** True when every match in every round has a winner chosen. */
export function isBracketComplete(picks: BracketPicks): boolean {
  return ROUNDS.every((round) =>
    Array.from({ length: ROUND_SIZE[round] }, (_, i) => i).every(
      (slot) => typeof picks[round]?.[slot] === "number",
    ),
  );
}

/** All group letters with both 1st & 2nd chosen. */
export function advancementComplete(adv: Advancement): boolean {
  return GROUP_LETTERS.every((l) => adv[l]?.first && adv[l]?.second);
}
