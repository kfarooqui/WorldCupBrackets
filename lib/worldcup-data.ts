import { GROUP_SCHEDULE, KO_SCHEDULE } from "./schedule";

// Real 2026 FIFA World Cup final draw (Washington D.C., 5 Dec 2025).
// Team ids are assigned 1..48 in group order: A=1-4, B=5-8, … L=45-48.

export type SeedTeam = { id: number; name: string; code: string; flag: string; group: string };

const GROUPS: Record<string, { name: string; code: string; flag: string }[]> = {
  A: [
    { name: "Mexico", code: "MEX", flag: "🇲🇽" },
    { name: "South Africa", code: "RSA", flag: "🇿🇦" },
    { name: "Korea Republic", code: "KOR", flag: "🇰🇷" },
    { name: "Czechia", code: "CZE", flag: "🇨🇿" },
  ],
  B: [
    { name: "Canada", code: "CAN", flag: "🇨🇦" },
    { name: "Bosnia & Herzegovina", code: "BIH", flag: "🇧🇦" },
    { name: "Qatar", code: "QAT", flag: "🇶🇦" },
    { name: "Switzerland", code: "SUI", flag: "🇨🇭" },
  ],
  C: [
    { name: "Brazil", code: "BRA", flag: "🇧🇷" },
    { name: "Morocco", code: "MAR", flag: "🇲🇦" },
    { name: "Haiti", code: "HAI", flag: "🇭🇹" },
    { name: "Scotland", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  ],
  D: [
    { name: "United States", code: "USA", flag: "🇺🇸" },
    { name: "Paraguay", code: "PAR", flag: "🇵🇾" },
    { name: "Australia", code: "AUS", flag: "🇦🇺" },
    { name: "Türkiye", code: "TUR", flag: "🇹🇷" },
  ],
  E: [
    { name: "Germany", code: "GER", flag: "🇩🇪" },
    { name: "Curaçao", code: "CUW", flag: "🇨🇼" },
    { name: "Ivory Coast", code: "CIV", flag: "🇨🇮" },
    { name: "Ecuador", code: "ECU", flag: "🇪🇨" },
  ],
  F: [
    { name: "Netherlands", code: "NED", flag: "🇳🇱" },
    { name: "Japan", code: "JPN", flag: "🇯🇵" },
    { name: "Sweden", code: "SWE", flag: "🇸🇪" },
    { name: "Tunisia", code: "TUN", flag: "🇹🇳" },
  ],
  G: [
    { name: "Belgium", code: "BEL", flag: "🇧🇪" },
    { name: "Egypt", code: "EGY", flag: "🇪🇬" },
    { name: "Iran", code: "IRN", flag: "🇮🇷" },
    { name: "New Zealand", code: "NZL", flag: "🇳🇿" },
  ],
  H: [
    { name: "Spain", code: "ESP", flag: "🇪🇸" },
    { name: "Cape Verde", code: "CPV", flag: "🇨🇻" },
    { name: "Saudi Arabia", code: "KSA", flag: "🇸🇦" },
    { name: "Uruguay", code: "URU", flag: "🇺🇾" },
  ],
  I: [
    { name: "France", code: "FRA", flag: "🇫🇷" },
    { name: "Senegal", code: "SEN", flag: "🇸🇳" },
    { name: "Iraq", code: "IRQ", flag: "🇮🇶" },
    { name: "Norway", code: "NOR", flag: "🇳🇴" },
  ],
  J: [
    { name: "Argentina", code: "ARG", flag: "🇦🇷" },
    { name: "Algeria", code: "ALG", flag: "🇩🇿" },
    { name: "Austria", code: "AUT", flag: "🇦🇹" },
    { name: "Jordan", code: "JOR", flag: "🇯🇴" },
  ],
  K: [
    { name: "Portugal", code: "POR", flag: "🇵🇹" },
    { name: "DR Congo", code: "COD", flag: "🇨🇩" },
    { name: "Uzbekistan", code: "UZB", flag: "🇺🇿" },
    { name: "Colombia", code: "COL", flag: "🇨🇴" },
  ],
  L: [
    { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Croatia", code: "CRO", flag: "🇭🇷" },
    { name: "Ghana", code: "GHA", flag: "🇬🇭" },
    { name: "Panama", code: "PAN", flag: "🇵🇦" },
  ],
};

export const GROUP_LETTERS = Object.keys(GROUPS);

export const TEAMS: SeedTeam[] = GROUP_LETTERS.flatMap((letter, gi) =>
  GROUPS[letter].map((t, pi) => ({
    id: gi * 4 + pi + 1,
    name: t.name,
    code: t.code,
    flag: t.flag,
    group: letter,
  })),
);

/** Team ids for a group, in draw order (position 1..4). */
export function teamIdsInGroup(letter: string): number[] {
  const gi = GROUP_LETTERS.indexOf(letter);
  return [1, 2, 3, 4].map((p) => gi * 4 + p);
}

/** The group letter a team id belongs to (ids are assigned in group order). */
export function groupLetterOfTeam(teamId: number): string {
  return GROUP_LETTERS[Math.floor((teamId - 1) / 4)];
}

export type SeedMatch = {
  id: number;
  stage: string;
  group_letter: string | null;
  match_no: number;
  slot_label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  match_date: string | null;
  kickoff: string | null;
  venue: string | null;
  city: string | null;
};

/**
 * Build the full 104-match seed from the real 2026 schedule: 72 group matches
 * (with real fixtures/dates/venues) + knockout slots (dates/venues set, teams
 * filled in as the tournament progresses). Knockout match ids 73.. are ordered
 * to line up with the bracket FEED map slot order.
 */
export function buildSeedMatches(): SeedMatch[] {
  const byCode = new Map(TEAMS.map((t) => [t.code, t.id]));
  const matches: SeedMatch[] = [];

  for (const f of GROUP_SCHEDULE) {
    const home = byCode.get(f.home)!;
    const away = byCode.get(f.away)!;
    matches.push({
      id: f.match,
      stage: "group",
      group_letter: groupLetterOfTeam(home),
      match_no: f.match,
      slot_label: `Group ${groupLetterOfTeam(home)}`,
      home_team_id: home,
      away_team_id: away,
      match_date: f.date,
      kickoff: f.time,
      venue: f.venue,
      city: f.city,
    });
  }

  const koOrder: [string, number][] = [
    ["r32", 16],
    ["r16", 8],
    ["qf", 4],
    ["sf", 2],
    ["final", 1],
  ];
  let id = 73;
  koOrder.forEach(([stage, count]) => {
    for (let i = 0; i < count; i++) {
      const f = KO_SCHEDULE[stage][i];
      matches.push({
        id,
        stage,
        group_letter: null,
        match_no: id,
        slot_label: `${stage.toUpperCase()} ${i + 1}`,
        home_team_id: null,
        away_team_id: null,
        match_date: f?.date ?? null,
        kickoff: f?.time ?? null,
        venue: f?.venue ?? null,
        city: f?.city ?? null,
      });
      id++;
    }
  });

  return matches;
}
