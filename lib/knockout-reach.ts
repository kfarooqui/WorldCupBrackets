import type { Team, Match, BracketPrediction, AdvancementPrediction } from "@/lib/types";
import type { Round } from "@/lib/bracket";
import { SCORING, ROUND_LABEL, reachPoints, type KnockoutRound } from "@/lib/scoring";
import { fixtureLine } from "@/lib/format";

/**
 * The "everyone" knockout view is organised by REACH rungs, not by matchup,
 * because that's exactly what scoring rewards (see lib/score-engine.ts): a pick
 * earns points when the team you placed actually *reaches* a round — the exact
 * bracket slot/matchup is not scored, and every player's bracket tree diverges.
 *
 * A rung's key is the round a team is predicted to REACH. Note the off-by-one
 * vs. bracket_predictions.round, which labels the round a team is picked to win:
 *   bracket round "r32" → reaches "r16", … , "sf" → reaches "final",
 *   "final" → champion. Reaching the R32 itself is not a bracket pick; it comes
 *   from advancement (1st/2nd) + thirds.
 */
export type ReachRung = "r32" | "r16" | "qf" | "sf" | "final" | "champion";

export const REACH_RUNGS: {
  key: ReachRung;
  label: string;
  short: string;
  points: number;
}[] = [
  { key: "r32", label: "Qualified — Round of 32", short: "R32", points: SCORING.reachR32 },
  { key: "r16", label: "Reached the Round of 16", short: "R16", points: SCORING.reachR16 },
  { key: "qf", label: "Reached the Quarterfinals", short: "QF", points: SCORING.reachQF },
  { key: "sf", label: "Reached the Semifinals", short: "SF", points: SCORING.reachSF },
  { key: "final", label: "Reached the Final", short: "Final", points: SCORING.reachFinal },
  { key: "champion", label: "Champion", short: "🏆", points: SCORING.champion },
];

/** Everything we need about one player to tally their reach picks. */
export type PlayerPredictions = {
  userId: string;
  name: string;
  advancement: AdvancementPrediction[];
  thirds: number[];
  bracket: BracketPrediction[];
};

/** The real tournament state, as produced by deriveReality() in score-engine. */
export type ReachReality = {
  reached: Record<Round, Set<number>>;
  champion: number | null;
};

/** One picker of a team, for the tap-to-expand "who picked it" list. */
export type Picker = { userId: string; name: string };

export type TeamTally = {
  team: Team;
  pickers: Picker[];
  count: number;
  /** Did the team actually achieve this rung? Only meaningful when resolved. */
  reached: boolean;
};

export type RungTally = {
  key: ReachRung;
  label: string;
  short: string;
  points: number;
  /** Has reality for this rung happened yet (→ show ✓/✗ overlay)? */
  resolved: boolean;
  /** Teams sorted by pick count desc, then name. */
  teams: TeamTally[];
};

/** The team ids one player predicted to reach a given rung. */
function picksForRung(p: PlayerPredictions, rung: ReachRung): number[] {
  if (rung === "r32") {
    const s = new Set<number>();
    for (const a of p.advancement) {
      s.add(a.first_team_id);
      s.add(a.second_team_id);
    }
    for (const t of p.thirds) s.add(t);
    return [...s];
  }
  // A team reaches `rung` by winning its match in the previous round, so filter
  // bracket picks by the round whose winners advance into `rung`.
  const winsRound: Round =
    rung === "r16" ? "r32"
    : rung === "qf" ? "r16"
    : rung === "sf" ? "qf"
    : rung === "final" ? "sf"
    : "final"; // champion = winner of the Final
  return p.bracket.filter((b) => b.round === winsRound).map((b) => b.team_id);
}

/** Teams that actually achieved a rung in reality. */
function realityForRung(rung: ReachRung, reality: ReachReality): {
  set: Set<number>;
  resolved: boolean;
} {
  if (rung === "champion") {
    return {
      set: new Set(reality.champion != null ? [reality.champion] : []),
      resolved: reality.champion != null,
    };
  }
  const set = reality.reached[rung];
  return { set, resolved: set.size > 0 };
}

/**
 * Build the per-rung tally of which teams each player predicted to reach that
 * round, with reality (✓/✗) overlaid once a round has happened. Pure — no DB.
 */
export function computeReachTallies(
  players: PlayerPredictions[],
  teamsById: Map<number, Team>,
  reality: ReachReality,
): RungTally[] {
  return REACH_RUNGS.map(({ key, label, short, points }) => {
    const { set: realitySet, resolved } = realityForRung(key, reality);

    // team id → pickers
    const byTeam = new Map<number, Picker[]>();
    for (const p of players) {
      for (const teamId of picksForRung(p, key)) {
        const list = byTeam.get(teamId) ?? [];
        list.push({ userId: p.userId, name: p.name });
        byTeam.set(teamId, list);
      }
    }

    const teams: TeamTally[] = [...byTeam.entries()]
      .map(([teamId, pickers]) => {
        const team = teamsById.get(teamId);
        return team
          ? { team, pickers, count: pickers.length, reached: realitySet.has(teamId) }
          : null;
      })
      .filter((t): t is TeamTally => t !== null)
      .sort((a, b) => b.count - a.count || a.team.name.localeCompare(b.team.name));

    return { key, label, short, points, resolved, teams };
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Match-by-match results — complementary to the reach tally above. For each
 * knockout fixture, show who predicted the WINNER to advance (they score) and
 * who predicted the loser (now eliminated, 0 from this pick).
 * ────────────────────────────────────────────────────────────────────────── */

const KO_STAGES: KnockoutRound[] = ["r32", "r16", "qf", "sf", "final"];

/** The round a winner of `stage` reaches next (null = champion, no further round). */
const NEXT_ROUND: Record<KnockoutRound, KnockoutRound | null> = {
  r32: "r16",
  r16: "qf",
  qf: "sf",
  sf: "final",
  final: null,
};

export type SideOutcome = {
  team: Team | null;
  /** Players who predicted this team to win this round (reach the next one). */
  believers: Picker[];
};

export type MatchOutcome = {
  matchId: number;
  matchNo: number;
  finished: boolean;
  score: string | null;
  /** "Jun 11 · 3:00 PM ET · Stadium, City" — empty until the fixture is set. */
  fixture: string;
  /** What a correct pick here earns, and what advancing means. */
  points: number;
  reachedLabel: string; // "Round of 16", … or "Champion" for the Final
  winner: SideOutcome | null; // null until the match is finished
  loser: SideOutcome | null;
  /** Both sides before the match is played (so we can still show the fixture). */
  home: SideOutcome;
  away: SideOutcome;
};

export type ResultsRound = {
  key: KnockoutRound;
  label: string;
  matches: MatchOutcome[];
};

/** Players who predicted `teamId` to win `round` (i.e. reach the next round). */
function believersFor(
  players: PlayerPredictions[],
  round: KnockoutRound,
  teamId: number | null,
): Picker[] {
  if (teamId == null) return [];
  const out: Picker[] = [];
  for (const p of players) {
    if (p.bracket.some((b) => b.round === round && b.team_id === teamId)) {
      out.push({ userId: p.userId, name: p.name });
    }
  }
  return out;
}

/**
 * Build the per-round, per-match results view. Pure — no DB. `matches` is the
 * full match list; only knockout stages are used.
 */
export function computeKnockoutResults(
  matches: Match[],
  players: PlayerPredictions[],
  teamsById: Map<number, Team>,
): ResultsRound[] {
  return KO_STAGES.map((stage) => {
    const next = NEXT_ROUND[stage];
    const points = next ? reachPoints(next) : SCORING.champion;
    const reachedLabel = next ? ROUND_LABEL[next] : "Champion";

    const ms = matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => a.match_no - b.match_no)
      .map((m): MatchOutcome => {
        const home = m.home_team_id != null ? teamsById.get(m.home_team_id) ?? null : null;
        const away = m.away_team_id != null ? teamsById.get(m.away_team_id) ?? null : null;
        const finished =
          m.status === "finished" && m.home_score != null && m.away_score != null;

        const homeSide: SideOutcome = {
          team: home,
          believers: believersFor(players, stage, m.home_team_id),
        };
        const awaySide: SideOutcome = {
          team: away,
          believers: believersFor(players, stage, m.away_team_id),
        };

        let winner: SideOutcome | null = null;
        let loser: SideOutcome | null = null;
        if (finished) {
          const homeWon = m.home_score! >= m.away_score!;
          winner = homeWon ? homeSide : awaySide;
          loser = homeWon ? awaySide : homeSide;
        }

        return {
          matchId: m.id,
          matchNo: m.match_no,
          finished,
          score: finished ? `${m.home_score}–${m.away_score}` : null,
          fixture: fixtureLine(m),
          points,
          reachedLabel,
          winner,
          loser,
          home: homeSide,
          away: awaySide,
        };
      });

    return { key: stage, label: ROUND_LABEL[stage], matches: ms };
  });
}
