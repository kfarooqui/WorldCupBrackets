import type { Match, Team } from "@/lib/types";
import { GROUP_LETTERS } from "@/lib/worldcup-data";

export type TeamStanding = {
  teamId: number;
  played: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
};

/** Sort key: points → goal difference → goals for. (Head-to-head left to admin.) */
function compare(a: TeamStanding, b: TeamStanding) {
  return b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamId - b.teamId;
}

/** Compute standings per group from finished group matches. */
export function computeStandings(matches: Match[], teams: Team[]) {
  const table = new Map<number, TeamStanding>();
  teams.forEach((t) =>
    table.set(t.id, { teamId: t.id, played: 0, points: 0, gf: 0, ga: 0, gd: 0 }),
  );

  matches
    .filter(
      (m) =>
        m.stage === "group" &&
        m.status === "finished" &&
        m.home_score != null &&
        m.away_score != null &&
        m.home_team_id &&
        m.away_team_id,
    )
    .forEach((m) => {
      const h = table.get(m.home_team_id!)!;
      const a = table.get(m.away_team_id!)!;
      h.played++; a.played++;
      h.gf += m.home_score!; h.ga += m.away_score!;
      a.gf += m.away_score!; a.ga += m.home_score!;
      h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
      if (m.home_score! > m.away_score!) h.points += 3;
      else if (m.home_score! < m.away_score!) a.points += 3;
      else { h.points += 1; a.points += 1; }
    });

  // Per-group sorted standings.
  const byGroup: Record<string, TeamStanding[]> = {};
  GROUP_LETTERS.forEach((letter) => {
    const ids = teams.filter((t) => t.group_letter === letter).map((t) => t.id);
    byGroup[letter] = ids.map((id) => table.get(id)!).sort(compare);
  });

  // 8 best third-place teams across all groups.
  const thirds = GROUP_LETTERS.map((l) => byGroup[l][2]).filter(Boolean);
  const bestThirds = [...thirds].sort(compare).slice(0, 8).map((s) => s.teamId);

  return { byGroup, bestThirds };
}
