import { createClient } from "@/lib/supabase/server";
import { predictionsLocked } from "@/lib/auth";
import type {
  Profile,
  Team,
  Match,
  AdvancementPrediction,
  ThirdPlacePrediction,
  BracketPrediction,
} from "@/lib/types";
import { deriveReality } from "@/lib/score-engine";
import {
  computeReachTallies,
  computeKnockoutResults,
  type PlayerPredictions,
  type RungTally,
  type ResultsRound,
} from "@/lib/knockout-reach";

export type EveryoneViewData = {
  rungs: RungTally[];
  rounds: ResultsRound[];
  totalPlayers: number;
  locked: boolean;
};

/**
 * Real data for the knockout "Everyone" views (reach tally + match results).
 *
 * Reads through the USER-SCOPED Supabase client so Row Level Security is the
 * source of truth for visibility: before the lock deadline the prediction
 * tables return only the signed-in user's rows; after lock they return every
 * approved player's rows. We therefore never hand-filter picks by lock state —
 * `locked` here only drives the UI notice (see app/picks/everyone/page.tsx).
 */
export async function getEveryoneViewData(): Promise<EveryoneViewData> {
  const supabase = await createClient();
  const [
    { data: profiles },
    { data: teams },
    { data: matches },
    { data: adv },
    { data: thirds },
    { data: bracket },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("status", "approved"),
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*").order("match_no"),
    supabase.from("advancement_predictions").select("*"),
    supabase.from("third_place_predictions").select("*"),
    supabase.from("bracket_predictions").select("*"),
  ]);

  const allMatches = (matches as Match[]) ?? [];
  const teamsById = new Map<number, Team>(
    ((teams as Team[]) ?? []).map((t) => [t.id, t]),
  );
  const reality = deriveReality(allMatches);

  // Group prediction rows by user. RLS has already scoped which rows we can see.
  const group = <T extends { user_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    (rows ?? []).forEach((r) => {
      const list = m.get(r.user_id) ?? [];
      list.push(r);
      m.set(r.user_id, list);
    });
    return m;
  };
  const advBy = group(adv as AdvancementPrediction[]);
  const thirdsBy = group(thirds as ThirdPlacePrediction[]);
  const bracketBy = group(bracket as BracketPrediction[]);

  const nameById = new Map<string, string>(
    ((profiles as Profile[]) ?? []).map((p) => [
      p.id,
      `${p.first_name} ${p.last_name}`.trim() || "Player",
    ]),
  );

  // One player per user that has any visible prediction rows. Players with no
  // visible picks simply don't appear (covers partial/empty predictions).
  const userIds = new Set<string>([
    ...advBy.keys(),
    ...thirdsBy.keys(),
    ...bracketBy.keys(),
  ]);
  const players: PlayerPredictions[] = [...userIds].map((userId) => ({
    userId,
    name: nameById.get(userId) ?? "Player",
    advancement: advBy.get(userId) ?? [],
    thirds: (thirdsBy.get(userId) ?? []).map((t) => t.team_id),
    bracket: bracketBy.get(userId) ?? [],
  }));

  const rungs = computeReachTallies(players, teamsById, reality);
  const rounds = computeKnockoutResults(allMatches, players, teamsById);
  const locked = await predictionsLocked();

  return { rungs, rounds, totalPlayers: players.length, locked };
}
