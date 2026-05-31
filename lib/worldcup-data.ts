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

/**
 * The six round-robin pairings within a 4-team group, as 1-based positions.
 * Generates 72 matches total (6 × 12 groups).
 */
const GROUP_PAIRINGS: [number, number][] = [
  [1, 2],
  [3, 4],
  [1, 3],
  [2, 4],
  [4, 1],
  [2, 3],
];

export type SeedMatch = {
  id: number;
  stage: string;
  group_letter: string | null;
  match_no: number;
  slot_label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff_at: string | null;
};

/** Generate the 72 group matches + 31 empty knockout slots (ids 73..103). */
export function buildSeedMatches(): SeedMatch[] {
  const matches: SeedMatch[] = [];
  let id = 1;

  // Group stage spread across 11–27 June 2026 (best-effort; admin can edit).
  let day = 0;
  GROUP_LETTERS.forEach((letter) => {
    const ids = teamIdsInGroup(letter);
    GROUP_PAIRINGS.forEach(([a, b], pairIdx) => {
      const date = new Date(Date.UTC(2026, 5, 11 + Math.floor(day / 4)));
      matches.push({
        id,
        stage: "group",
        group_letter: letter,
        match_no: id,
        slot_label: `Group ${letter}`,
        home_team_id: ids[a - 1],
        away_team_id: ids[b - 1],
        kickoff_at: date.toISOString(),
      });
      id++;
      day += pairIdx % 2; // rough spread
    });
  });

  // Empty knockout slots — admin fills the real matchups after the group stage.
  const knockout: [string, number][] = [
    ["r32", 16],
    ["r16", 8],
    ["qf", 4],
    ["sf", 2],
    ["final", 1],
  ];
  knockout.forEach(([stage, count]) => {
    for (let i = 0; i < count; i++) {
      matches.push({
        id,
        stage,
        group_letter: null,
        match_no: id,
        slot_label: `${stage.toUpperCase()}-${i + 1}`,
        home_team_id: null,
        away_team_id: null,
        kickoff_at: null,
      });
      id++;
    }
  });

  return matches;
}
