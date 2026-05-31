/**
 * All point values for the pool live here. Tweak freely — scores recompute
 * whenever the admin enters/updates a result.
 */
export const SCORING = {
  /** Correct group-match outcome (Home win / Draw / Away win). */
  groupOutcome: 1,
  /** Bonus when a predicted scoreline exactly matches the real result. */
  groupExactScore: 2,
  /** Each team correctly predicted to reach the Round of 32 (i.e. to qualify). */
  reachR32: 1,
  /** Each team correctly predicted to reach the given knockout round. */
  reachR16: 2,
  reachQF: 4,
  reachSF: 8,
  reachFinal: 12,
  /** Bonus for correctly predicting the champion. */
  champion: 8,
} as const;

export type KnockoutRound = "r32" | "r16" | "qf" | "sf" | "final";

/** Display labels for stages/rounds. */
export const ROUND_LABEL: Record<string, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinal",
  sf: "Semifinal",
  final: "Final",
};

/** Points awarded for correctly placing a team into a given round. */
export function reachPoints(round: KnockoutRound): number {
  switch (round) {
    case "r32":
      return SCORING.reachR32;
    case "r16":
      return SCORING.reachR16;
    case "qf":
      return SCORING.reachQF;
    case "sf":
      return SCORING.reachSF;
    case "final":
      return SCORING.reachFinal;
  }
}

/** Points earned for a single group-match prediction given the real result. */
export function scoreGroupPrediction(
  pick: "HOME" | "DRAW" | "AWAY",
  predHome: number | null,
  predAway: number | null,
  realHome: number,
  realAway: number,
): number {
  const realOutcome =
    realHome > realAway ? "HOME" : realHome < realAway ? "AWAY" : "DRAW";
  let pts = 0;
  if (pick === realOutcome) pts += SCORING.groupOutcome;
  if (
    predHome !== null &&
    predAway !== null &&
    predHome === realHome &&
    predAway === realAway
  ) {
    pts += SCORING.groupExactScore;
  }
  return pts;
}
