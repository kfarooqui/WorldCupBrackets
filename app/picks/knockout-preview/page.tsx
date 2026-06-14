import type { Team, BracketPrediction, AdvancementPrediction } from "@/lib/types";
import type { Round } from "@/lib/bracket";
import { TEAMS } from "@/lib/worldcup-data";
import {
  computeReachTallies,
  type PlayerPredictions,
  type ReachReality,
} from "@/lib/knockout-reach";
import KnockoutReachBrowser from "@/components/KnockoutReachBrowser";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * PREVIEW PAGE — 100% fake data, no DB, no auth. It exists so we can play with
 * the knockout "everyone" view before the tournament reaches the bracket stage.
 * Everything below is throwaway; delete this whole file (and the route folder)
 * when the real page is wired up.
 * ────────────────────────────────────────────────────────────────────────── */

const teams: Team[] = TEAMS.map((t) => ({
  id: t.id,
  name: t.name,
  code: t.code,
  flag_emoji: t.flag,
  group_letter: t.group,
}));
const teamsById = new Map(teams.map((t) => [t.id, t]));

// Relative strength so favorites recur across players (makes the tally look
// realistic — clear favorites plus a few contrarian picks).
const FAVORITES = [
  "BRA", "FRA", "ARG", "ESP", "ENG", "GER", "POR", "NED", "BEL", "CRO",
  "URU", "ITA", "COL", "MAR", "USA", "MEX", "JPN", "SUI", "DEN", "KOR",
];
const baseStrength = (code: string) => {
  const i = FAVORITES.indexOf(code);
  return i === -1 ? 0 : FAVORITES.length - i; // 20..1, else 0
};

// Tiny deterministic RNG so the preview is stable across reloads.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The "true" outcome (pure strength) — R32→SF resolved, Final/Champion pending.
const realityOrder = [...teams].sort(
  (a, b) => baseStrength(b.code) - baseStrength(a.code) || a.id - b.id,
);
const idsOf = (arr: Team[]) => new Set(arr.map((t) => t.id));
const reality: ReachReality = {
  reached: {
    r32: idsOf(realityOrder.slice(0, 32)),
    r16: idsOf(realityOrder.slice(0, 16)),
    qf: idsOf(realityOrder.slice(0, 8)),
    sf: idsOf(realityOrder.slice(0, 4)),
    final: new Set<number>(), // not played yet
  },
  champion: null, // not played yet
};

function buildPlayer(index: number, userId: string, name: string): PlayerPredictions {
  const rng = mulberry32(index + 1);
  const ranked = [...teams]
    .map((t) => ({ t, s: baseStrength(t.code) + rng() * 9 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
  const top = (n: number) => ranked.slice(0, n);
  const top32 = top(32);

  // Reach R32 = qualify from the group: 12 advancement pairs + 8 thirds.
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

  // Bracket picks. round = the round a team is picked to WIN (→ reaches next).
  let bid = index * 1000;
  const rows = (round: Round, arr: Team[]): BracketPrediction[] =>
    arr.map((t, slot) => ({ id: bid++, user_id: userId, round, slot, team_id: t.id }));
  const bracket: BracketPrediction[] = [
    ...rows("r32", top(16)), // win R32 → reach R16
    ...rows("r16", top(8)), //  win R16 → reach QF
    ...rows("qf", top(4)), //   win QF  → reach SF
    ...rows("sf", top(2)), //   win SF  → reach Final
    ...rows("final", top(1)), // win Final → champion
  ];

  return { userId, name, advancement, thirds, bracket };
}

const PLAYERS: PlayerPredictions[] = (
  [
    ["me", "Khurram Farooqui"],
    ["u2", "Nadira"],
    ["u3", "Ayesha"],
    ["u4", "Bilal"],
    ["u5", "Sara"],
    ["u6", "Omar"],
    ["u7", "Zoya"],
    ["u8", "Imran"],
  ] as const
).map(([id, name], i) => buildPlayer(i, id, name));

export default function KnockoutPreviewPage() {
  const rungs = computeReachTallies(PLAYERS, teamsById, reality);
  return (
    <div>
      <div className="card mb-4 border border-[var(--accent)]/40 bg-[var(--accent)]/10">
        <p className="text-sm">
          <strong>⚙️ Preview — fake data.</strong> A sandbox for the knockout
          “everyone” view, using {PLAYERS.length} made-up players. R32→SF are
          marked “played” (✓ reached / ✗ out); the Final &amp; Champion are still
          “predictions only.” Not linked anywhere — safe to delete.
        </p>
      </div>

      <h1 className="text-2xl font-bold">Everyone&apos;s picks — Knockouts</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        Who did everyone send to each round? Tap a team to see the believers.
      </p>

      <KnockoutReachBrowser rungs={rungs} meId="me" totalPlayers={PLAYERS.length} />
    </div>
  );
}
