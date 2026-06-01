import type { Match } from "@/lib/types";
import { GROUP_LETTERS, teamIdsInGroup } from "@/lib/worldcup-data";

type Pick = "HOME" | "DRAW" | "AWAY";
type MatchPickInput = { pick: Pick | null; ph: string; pa: string };

export type Stats = { pts: number; gf: number; ga: number };

/** Accumulate points/goals for every team from the user's group-match picks. */
export function computeStats(
  groupMatches: Match[],
  picks: Record<number, MatchPickInput>,
): Map<number, Stats> {
  const stat = new Map<number, Stats>();
  const ensure = (id: number) => {
    if (!stat.has(id)) stat.set(id, { pts: 0, gf: 0, ga: 0 });
    return stat.get(id)!;
  };
  for (const m of groupMatches) {
    const p = picks[m.id];
    if (!p?.pick || !m.home_team_id || !m.away_team_id) continue;
    const h = ensure(m.home_team_id);
    const a = ensure(m.away_team_id);
    const hs = p.ph !== "" ? Number(p.ph) : null;
    const as = p.pa !== "" ? Number(p.pa) : null;
    if (hs != null && as != null) {
      h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
    }
    if (p.pick === "HOME") h.pts += 3;
    else if (p.pick === "AWAY") a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  }
  return stat;
}

export function getStat(map: Map<number, Stats>, id: number): Stats {
  return map.get(id) ?? { pts: 0, gf: 0, ga: 0 };
}

/** Ranking key: points, then goal difference, then goals for. */
function rank(s: Stats): [number, number, number] {
  return [s.pts, s.gf - s.ga, s.gf];
}

/** True if `a` ranks strictly above `b` (better, not a tie) by the derived stats. */
export function strictlyAbove(a: Stats, b: Stats): boolean {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < 3; i++) if (ra[i] !== rb[i]) return ra[i] > rb[i];
  return false;
}

/**
 * Derive predicted group standings from a user's group-match picks.
 * Points from W/D/L; goal difference/goals-for use predicted scores where given.
 * Remaining ties fall back to draw order — those are just suggestions.
 */
export function standingsFromPicks(
  groupMatches: Match[],
  picks: Record<number, MatchPickInput>,
) {
  const stat = computeStats(groupMatches, picks);
  const cmp = (x: number, y: number) => {
    const sx = getStat(stat, x);
    const sy = getStat(stat, y);
    return (
      sy.pts - sx.pts ||
      (sy.gf - sy.ga) - (sx.gf - sx.ga) ||
      sy.gf - sx.gf ||
      x - y
    );
  };

  const byGroup: Record<string, number[]> = {};
  GROUP_LETTERS.forEach((l) => {
    byGroup[l] = teamIdsInGroup(l).slice().sort(cmp);
  });
  const bestThirds = GROUP_LETTERS.map((l) => byGroup[l][2])
    .slice()
    .sort(cmp)
    .slice(0, 8);

  return { byGroup, bestThirds };
}

/**
 * Is the user's chosen finishing order for a group consistent with their group
 * picks? A team may not be ranked above another team that strictly outscores it;
 * tied teams may be ordered either way. `chosen` is [1st, 2nd, 3rd, 4th] team ids.
 */
export function groupOrderConsistent(
  stat: Map<number, Stats>,
  chosen: (number | null)[],
): boolean {
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const hi = chosen[i];
      const lo = chosen[j];
      if (hi && lo && strictlyAbove(getStat(stat, lo), getStat(stat, hi))) {
        return false;
      }
    }
  }
  return true;
}
