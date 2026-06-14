import type { Team, Match, BracketPrediction, AdvancementPrediction } from "@/lib/types";
import type { Round } from "@/lib/bracket";
import { TEAMS } from "@/lib/worldcup-data";
import type { PlayerPredictions } from "@/lib/knockout-reach";

/* ──────────────────────────────────────────────────────────────────────────
 * SHARED FAKE DATA for the knockout preview pages (reach view + results view).
 * 100% made-up; no DB. Lives in one place so both previews agree on teams,
 * players, and outcomes. Delete this file together with the two preview routes
 * when the real, data-backed pages are wired in.
 *
 * Tournament state baked in: R32, R16, and QF are "played" (finished, with
 * scores); the SF teams are set but not played; the Final is empty. Stronger
 * team always wins, so favorites advance — which lines up with the reach tally.
 * ────────────────────────────────────────────────────────────────────────── */

export const FAKE_ME_ID = "me";

export const fakeTeams: Team[] = TEAMS.map((t) => ({
  id: t.id,
  name: t.name,
  code: t.code,
  flag_emoji: t.flag,
  group_letter: t.group,
}));
export const fakeTeamsById = new Map(fakeTeams.map((t) => [t.id, t]));

const FAVORITES = [
  "BRA", "FRA", "ARG", "ESP", "ENG", "GER", "POR", "NED", "BEL", "CRO",
  "URU", "ITA", "COL", "MAR", "USA", "MEX", "JPN", "SUI", "DEN", "KOR",
];
const baseStrength = (code: string) => {
  const i = FAVORITES.indexOf(code);
  return i === -1 ? 0 : FAVORITES.length - i; // 20..1, else 0
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// "True" strength order → who actually qualifies and advances.
const strengthOrder = [...fakeTeams].sort(
  (a, b) => baseStrength(b.code) - baseStrength(a.code) || a.id - b.id,
);
const qualified32 = strengthOrder.slice(0, 32);

let nextMatchId = 1000;
function ko(
  stage: Round,
  matchNo: number,
  home: Team | null,
  away: Team | null,
  scores: [number, number] | null,
): Match {
  return {
    id: nextMatchId++,
    stage,
    group_letter: null,
    match_no: matchNo,
    slot_label: null,
    home_team_id: home?.id ?? null,
    away_team_id: away?.id ?? null,
    kickoff_at: null,
    match_date: null,
    kickoff: null,
    venue: null,
    city: null,
    home_score: scores?.[0] ?? null,
    away_score: scores?.[1] ?? null,
    status: scores ? "finished" : "scheduled",
  };
}

/**
 * Build a round of finished matches by pairing strongest-vs-weakest; the
 * stronger team (earlier in `seeds`) wins. Returns the winners (next round).
 */
function playRound(stage: Round, startNo: number, seeds: Team[]): { matches: Match[]; winners: Team[] } {
  const matches: Match[] = [];
  const winners: Team[] = [];
  const n = seeds.length;
  for (let i = 0; i < n / 2; i++) {
    const home = seeds[i];
    const away = seeds[n - 1 - i];
    matches.push(ko(stage, startNo + i, home, away, [2, 1])); // home (stronger) wins
    winners.push(home);
  }
  return { matches, winners };
}

const r32 = playRound("r32", 73, qualified32);
const r16 = playRound("r16", 89, r32.winners); // 16 → 8
const qf = playRound("qf", 97, r16.winners); //   8 → 4
const sfTeams = qf.winners; // 4 teams reached the SF…

// …but the SF isn't played yet: teams are placed, no scores.
const sfMatches: Match[] = [
  ko("sf", 101, sfTeams[0], sfTeams[3], null),
  ko("sf", 102, sfTeams[1], sfTeams[2], null),
];
// Final not set yet.
const finalMatch: Match[] = [ko("final", 104, null, null, null)];

export const fakeMatches: Match[] = [
  ...r32.matches,
  ...r16.matches,
  ...qf.matches,
  ...sfMatches,
  ...finalMatch,
];

function buildPlayer(index: number, userId: string, name: string): PlayerPredictions {
  const rng = mulberry32(index + 1);
  const ranked = [...fakeTeams]
    .map((t) => ({ t, s: baseStrength(t.code) + rng() * 9 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
  const top = (n: number) => ranked.slice(0, n);
  const top32 = top(32);

  const advancement: AdvancementPrediction[] = [];
  for (let i = 0; i < 12; i++) {
    const first = top32[i * 2];
    const second = top32[i * 2 + 1];
    advancement.push({
      id: index * 100 + i,
      user_id: userId,
      group_letter: first.group_letter,
      first_team_id: first.id,
      second_team_id: second.id,
      third_team_id: null,
    });
  }
  const thirds = top32.slice(24, 32).map((t) => t.id);

  let bid = index * 1000;
  const rows = (round: Round, arr: Team[]): BracketPrediction[] =>
    arr.map((t, slot) => ({ id: bid++, user_id: userId, round, slot, team_id: t.id }));
  const bracket: BracketPrediction[] = [
    ...rows("r32", top(16)),
    ...rows("r16", top(8)),
    ...rows("qf", top(4)),
    ...rows("sf", top(2)),
    ...rows("final", top(1)),
  ];

  return { userId, name, advancement, thirds, bracket };
}

export const fakePlayers: PlayerPredictions[] = (
  [
    [FAKE_ME_ID, "Khurram Farooqui"],
    ["u2", "Nadira"],
    ["u3", "Ayesha"],
    ["u4", "Bilal"],
    ["u5", "Sara"],
    ["u6", "Omar"],
    ["u7", "Zoya"],
    ["u8", "Imran"],
  ] as const
).map(([id, name], i) => buildPlayer(i, id, name));
