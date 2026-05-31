import type { Match } from "@/lib/types";
import { GROUP_LETTERS, teamIdsInGroup } from "@/lib/worldcup-data";

type Pick = "HOME" | "DRAW" | "AWAY";
type MatchPickInput = { pick: Pick | null; ph: string; pa: string };

/**
 * Derive predicted group standings from a user's group-match picks.
 * Points from W/D/L; goal difference/goals-for use predicted scores where the
 * user entered them, else 0. Remaining ties fall back to draw order — those are
 * just suggestions the user can re-rank.
 */
export function standingsFromPicks(
  groupMatches: Match[],
  picks: Record<number, MatchPickInput>,
) {
  const stat = new Map<number, { pts: number; gf: number; ga: number }>();
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

  const cmp = (x: number, y: number) => {
    const sx = ensure(x), sy = ensure(y);
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
