import type {
  Match,
  MatchPrediction,
  AdvancementPrediction,
  BracketPrediction,
} from "@/lib/types";
import { SCORING, scoreGroupPrediction, reachPoints } from "@/lib/scoring";
import type { Round } from "@/lib/bracket";

export type ScoreBreakdown = {
  group: number;
  groupExact: number; // portion of `group` that came from exact-scoreline bonuses
  reach: number; // all "reached the round" points (R32→Final)
  champion: number;
  total: number;
};

export type UserPredictions = {
  matches: MatchPrediction[];
  advancement: AdvancementPrediction[];
  thirds: number[];
  bracket: BracketPrediction[];
};

/** The real tournament state derived purely from match rows + results. */
export function deriveReality(matches: Match[]) {
  const byStage = (stage: string) => matches.filter((m) => m.stage === stage);
  const teamsInStage = (stage: string): Set<number> => {
    const s = new Set<number>();
    byStage(stage).forEach((m) => {
      if (m.home_team_id) s.add(m.home_team_id);
      if (m.away_team_id) s.add(m.away_team_id);
    });
    return s;
  };

  const reached: Record<Round, Set<number>> = {
    r32: teamsInStage("r32"),
    r16: teamsInStage("r16"),
    qf: teamsInStage("qf"),
    sf: teamsInStage("sf"),
    final: teamsInStage("final"),
  };

  // Champion = winner of the finished Final.
  let champion: number | null = null;
  const finalMatch = byStage("final").find(
    (m) => m.status === "finished" && m.home_score != null && m.away_score != null,
  );
  if (finalMatch) {
    champion =
      finalMatch.home_score! >= finalMatch.away_score!
        ? finalMatch.home_team_id
        : finalMatch.away_team_id;
  }

  const finishedGroup = new Map<number, Match>();
  byStage("group").forEach((m) => {
    if (m.status === "finished" && m.home_score != null && m.away_score != null) {
      finishedGroup.set(m.id, m);
    }
  });

  return { reached, champion, finishedGroup };
}

type Reality = ReturnType<typeof deriveReality>;

/** Score one user's predictions against reality. */
export function scoreUser(pred: UserPredictions, reality: Reality): ScoreBreakdown {
  // ── Group stage ──
  let group = 0;
  let groupExact = 0; // the exact-scoreline bonus portion (excluded by the "participation" view)
  for (const mp of pred.matches) {
    const real = reality.finishedGroup.get(mp.match_id);
    if (!real) continue;
    group += scoreGroupPrediction(
      mp.pick,
      mp.pred_home_score,
      mp.pred_away_score,
      real.home_score!,
      real.away_score!,
    );
    if (
      mp.pred_home_score !== null &&
      mp.pred_away_score !== null &&
      mp.pred_home_score === real.home_score &&
      mp.pred_away_score === real.away_score
    ) {
      groupExact += SCORING.groupExactScore;
    }
  }

  // ── Reach-the-round ──
  // Teams the user predicted to QUALIFY (reach R32): 1st + 2nd of each group + their thirds.
  const predictedR32 = new Set<number>();
  pred.advancement.forEach((a) => {
    predictedR32.add(a.first_team_id);
    predictedR32.add(a.second_team_id);
  });
  pred.thirds.forEach((t) => predictedR32.add(t));

  // Teams the user advanced OUT of each round (their bracket picks).
  const advancedTo: Record<Round, Set<number>> = {
    r32: new Set(), // (qualifiers handled above)
    r16: new Set(),
    qf: new Set(),
    sf: new Set(),
    final: new Set(),
  };
  pred.bracket.forEach((b) => {
    // round 'r32' pick = team sent to R16, etc. round 'final' pick = champion.
    const target: Round | "champion" =
      b.round === "r32"
        ? "r16"
        : b.round === "r16"
          ? "qf"
          : b.round === "qf"
            ? "sf"
            : b.round === "sf"
              ? "final"
              : "champion";
    if (target !== "champion") advancedTo[target].add(b.team_id);
  });

  let reach = 0;
  // Qualify (reach R32)
  predictedR32.forEach((t) => {
    if (reality.reached.r32.has(t)) reach += SCORING.reachR32;
  });
  (["r16", "qf", "sf", "final"] as Round[]).forEach((round) => {
    advancedTo[round].forEach((t) => {
      if (reality.reached[round].has(t)) reach += reachPoints(round);
    });
  });

  // ── Champion bonus ──
  let championPts = 0;
  const championPick = pred.bracket.find((b) => b.round === "final")?.team_id ?? null;
  if (championPick && reality.champion && championPick === reality.champion) {
    championPts = SCORING.champion;
  }

  return { group, groupExact, reach, champion: championPts, total: group + reach + championPts };
}

/**
 * Serializable view of reality for client components (no Sets/Maps): finished
 * group scores by match id, the teams that reached each round, and the champion.
 */
export type PickResults = {
  groupScores: Record<number, { home: number; away: number }>;
  reached: Record<Round, number[]>;
  champion: number | null;
  eliminated: number[];
};

/**
 * Teams that are definitively knocked out: the loser of any finished knockout
 * match, plus — once the R32 field is populated — any team that didn't qualify
 * from its group. Used to color a pick red only when its fate is actually
 * decided (vs. still alive with a match yet to play).
 */
export function eliminatedTeams(matches: Match[]): Set<number> {
  const reality = deriveReality(matches);
  const out = new Set<number>();
  for (const m of matches) {
    if (m.stage === "group") continue;
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) continue;
    if (m.home_team_id == null || m.away_team_id == null) continue;
    out.add(m.home_score >= m.away_score ? m.away_team_id : m.home_team_id);
  }
  if (reality.reached.r32.size > 0) {
    const groupTeams = new Set<number>();
    for (const m of matches) {
      if (m.stage !== "group") continue;
      if (m.home_team_id != null) groupTeams.add(m.home_team_id);
      if (m.away_team_id != null) groupTeams.add(m.away_team_id);
    }
    for (const id of groupTeams) if (!reality.reached.r32.has(id)) out.add(id);
  }
  return out;
}

export function serializeReality(matches: Match[]): PickResults {
  const r = deriveReality(matches);
  const groupScores: Record<number, { home: number; away: number }> = {};
  r.finishedGroup.forEach((m, id) => {
    groupScores[id] = { home: m.home_score!, away: m.away_score! };
  });
  return {
    groupScores,
    reached: {
      r32: [...r.reached.r32],
      r16: [...r.reached.r16],
      qf: [...r.reached.qf],
      sf: [...r.reached.sf],
      final: [...r.reached.final],
    },
    champion: r.champion,
    eliminated: [...eliminatedTeams(matches)],
  };
}
