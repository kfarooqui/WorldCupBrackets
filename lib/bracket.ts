import { GROUP_LETTERS, groupLetterOfTeam } from "./worldcup-data";

/**
 * The official 2026 FIFA World Cup knockout bracket.
 *
 *  Round of 32 = matches 73–88 (16), R16 = 89–96 (8), QF = 97–100 (4),
 *  SF = 101–102 (2), Final = 104.
 *
 * Group winners are seeded; 8 of them face one of the best third-place teams,
 * the other 4 winners and the runners-up pair off. The bracket is built so two
 * teams from the same group cannot meet before the quarterfinals. Rounds do NOT
 * feed in simple adjacent pairs — see FEED below.
 */

export const ROUNDS = ["r32", "r16", "qf", "sf", "final"] as const;
export type Round = (typeof ROUNDS)[number];

export const ROUND_SIZE: Record<Round, number> = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  final: 1,
};

type R32Source = { pos: "1" | "2"; group: string } | { thirdSlot: number };

/** The 16 Round-of-32 matches (73–88), each [top, bottom] source. */
export const R32_MATCHES: [R32Source, R32Source][] = [
  [{ pos: "2", group: "A" }, { pos: "2", group: "B" }], // 73
  [{ pos: "1", group: "E" }, { thirdSlot: 0 }], //          74
  [{ pos: "1", group: "F" }, { pos: "2", group: "C" }], // 75
  [{ pos: "1", group: "C" }, { pos: "2", group: "F" }], // 76
  [{ pos: "1", group: "I" }, { thirdSlot: 1 }], //          77
  [{ pos: "2", group: "E" }, { pos: "2", group: "I" }], // 78
  [{ pos: "1", group: "A" }, { thirdSlot: 2 }], //          79
  [{ pos: "1", group: "L" }, { thirdSlot: 3 }], //          80
  [{ pos: "1", group: "D" }, { thirdSlot: 4 }], //          81
  [{ pos: "1", group: "G" }, { thirdSlot: 5 }], //          82
  [{ pos: "2", group: "K" }, { pos: "2", group: "L" }], // 83
  [{ pos: "1", group: "H" }, { pos: "2", group: "J" }], // 84
  [{ pos: "1", group: "B" }, { thirdSlot: 6 }], //          85
  [{ pos: "1", group: "J" }, { pos: "2", group: "H" }], // 86
  [{ pos: "1", group: "K" }, { thirdSlot: 7 }], //          87
  [{ pos: "2", group: "D" }, { pos: "2", group: "G" }], // 88
];

/** Groups eligible to supply the third-place team for each R32 third slot. */
export const THIRD_SLOT_GROUPS: string[][] = [
  ["A", "B", "C", "D", "F"], // slot 0 → M74
  ["C", "D", "F", "G", "H"], // slot 1 → M77
  ["C", "E", "F", "H", "I"], // slot 2 → M79
  ["E", "H", "I", "J", "K"], // slot 3 → M80
  ["B", "E", "F", "I", "J"], // slot 4 → M81
  ["A", "E", "H", "I", "J"], // slot 5 → M82
  ["E", "F", "G", "I", "J"], // slot 6 → M85
  ["D", "E", "I", "J", "L"], // slot 7 → M87
];

/**
 * Which two previous-round match slots feed each match. Indices are 0-based
 * within the previous round. (Derived from the official match numbering.)
 */
export const FEED: Record<Exclude<Round, "r32">, [number, number][]> = {
  // R16 (89–96) ← R32 winners
  r16: [[0, 2], [1, 4], [3, 5], [6, 7], [10, 11], [8, 9], [13, 15], [12, 14]],
  // QF (97–100) ← R16 winners
  qf: [[0, 1], [4, 5], [2, 3], [6, 7]],
  // SF (101–102) ← QF winners
  sf: [[0, 1], [2, 3]],
  // Final (104) ← SF winners
  final: [[0, 1]],
};

export type Advancement = {
  [letter: string]: { first: number | null; second: number | null };
};

export type BracketPicks = {
  [round in Round]?: Record<number, number | null>;
};

/**
 * Assign the user's chosen third-place teams to the 8 third slots, respecting
 * each slot's group eligibility (bipartite matching — mirrors FIFA's allocation
 * table). Returns a map of slotIndex → teamId. A perfect matching exists for any
 * valid set of 8 distinct group-thirds.
 */
export function assignThirds(thirds: number[]): Map<number, number> {
  const teams = thirds.slice(0, 8);
  const slotToTeam: (number | null)[] = Array(8).fill(null); // slot → team index
  const eligible = (ti: number, slot: number) =>
    THIRD_SLOT_GROUPS[slot].includes(groupLetterOfTeam(teams[ti]));

  const augment = (ti: number, seen: boolean[]): boolean => {
    for (let slot = 0; slot < 8; slot++) {
      if (eligible(ti, slot) && !seen[slot]) {
        seen[slot] = true;
        if (slotToTeam[slot] === null || augment(slotToTeam[slot]!, seen)) {
          slotToTeam[slot] = ti;
          return true;
        }
      }
    }
    return false;
  };
  for (let ti = 0; ti < teams.length; ti++) augment(ti, Array(8).fill(false));

  const map = new Map<number, number>();
  slotToTeam.forEach((ti, slot) => {
    if (ti !== null) map.set(slot, teams[ti]);
  });
  return map;
}

/** Resolve the 16 R32 matches to [topTeamId, bottomTeamId] for a user. */
export function resolveR32Occupants(
  adv: Advancement,
  thirds: number[],
): [number | null, number | null][] {
  const thirdMap = assignThirds(thirds);
  const resolve = (s: R32Source): number | null => {
    if ("thirdSlot" in s) return thirdMap.get(s.thirdSlot) ?? null;
    const g = adv[s.group];
    if (!g) return null;
    return s.pos === "1" ? g.first : g.second;
  };
  return R32_MATCHES.map(([t, b]) => [resolve(t), resolve(b)]);
}

/**
 * Two candidate team ids per match per round. R32 from advancement + thirds;
 * later rounds from the FEED map applied to the previous round's picks.
 */
export function computeOccupants(
  adv: Advancement,
  thirds: number[],
  picks: BracketPicks,
): Record<Round, [number | null, number | null][]> {
  const result = {} as Record<Round, [number | null, number | null][]>;
  result.r32 = resolveR32Occupants(adv, thirds);

  let prev: Round = "r32";
  for (const round of ["r16", "qf", "sf", "final"] as Round[]) {
    const prevPicks = picks[prev] ?? {};
    result[round] = FEED[round as Exclude<Round, "r32">].map(([a, b]) => [
      prevPicks[a] ?? null,
      prevPicks[b] ?? null,
    ]);
    prev = round;
  }
  return result;
}

/**
 * Drop any pick that isn't one of its match's two current occupants
 * (cascade-clear when an upstream pick changes). Returns a sanitized copy.
 */
export function sanitizePicks(
  adv: Advancement,
  thirds: number[],
  picks: BracketPicks,
): BracketPicks {
  const clean: BracketPicks = {};
  let working: BracketPicks = { ...picks };

  for (const round of ROUNDS) {
    const occ = computeOccupants(adv, thirds, working)[round];
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

/** Where the winner of (stage, slotIdx) goes next: which match slot + side. */
export function nextSlotFor(
  stage: Round,
  idx: number,
): { nextStage: Round; slot: number; position: 0 | 1 } | null {
  const si = ROUNDS.indexOf(stage);
  const nextStage = ROUNDS[si + 1];
  if (!nextStage) return null;
  const feeders = FEED[nextStage as Exclude<Round, "r32">];
  for (let slot = 0; slot < feeders.length; slot++) {
    if (feeders[slot][0] === idx) return { nextStage, slot, position: 0 };
    if (feeders[slot][1] === idx) return { nextStage, slot, position: 1 };
  }
  return null;
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
