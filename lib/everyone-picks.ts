import { createClient } from "@/lib/supabase/server";
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

/** One player's predicted champion (the team they sent through the Final). */
export type ChampionPick = { userId: string; name: string; team: Team | null };

export type EveryonePicksData = {
  champions: ChampionPick[];
  groupMatches: Match[];
  teams: Team[];
  rungs: RungTally[];
  rounds: ResultsRound[];
  totalPlayers: number;
};

/**
 * Real data for the "Everyone's Picks" page (champions, group, bracket, results).
 *
 * Reads through the USER-SCOPED Supabase client so Row Level Security remains the
 * source of truth for visibility. Callers MUST only invoke this after confirming
 * predictions are locked (the page renders a hidden-until-lock block otherwise);
 * post-lock, RLS returns every approved player's rows.
 *
 * "Who counts" = players who formally submitted (prediction_submissions), matching
 * the leaderboard and the former Group Picks page.
 */
export async function getEveryonePicksData(): Promise<EveryonePicksData> {
  const supabase = await createClient();
  const [
    { data: profiles },
    { data: teams },
    { data: matches },
    { data: adv },
    { data: thirds },
    { data: bracket },
    { data: subs },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("status", "approved").order("first_name"),
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*").order("match_no"),
    supabase.from("advancement_predictions").select("*"),
    supabase.from("third_place_predictions").select("*"),
    supabase.from("bracket_predictions").select("*"),
    supabase.from("prediction_submissions").select("user_id"),
  ]);

  const allTeams = (teams as Team[]) ?? [];
  const allMatches = (matches as Match[]) ?? [];
  const teamsById = new Map<number, Team>(allTeams.map((t) => [t.id, t]));
  const reality = deriveReality(allMatches);

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

  // Only players who formally submitted their picks are shown (matches leaderboard).
  const submitted = new Set((subs ?? []).map((s) => s.user_id));
  const submittedProfiles = ((profiles as Profile[]) ?? []).filter((p) =>
    submitted.has(p.id),
  );
  const nameOf = (p: Profile) => `${p.first_name} ${p.last_name}`.trim() || "Player";

  const players: PlayerPredictions[] = submittedProfiles.map((p) => ({
    userId: p.id,
    name: nameOf(p),
    advancement: advBy.get(p.id) ?? [],
    thirds: (thirdsBy.get(p.id) ?? []).map((t) => t.team_id),
    bracket: bracketBy.get(p.id) ?? [],
  }));

  const champions: ChampionPick[] = submittedProfiles.map((p) => {
    const finalPick = (bracketBy.get(p.id) ?? []).find((b) => b.round === "final");
    const team = finalPick ? teamsById.get(finalPick.team_id) ?? null : null;
    return { userId: p.id, name: nameOf(p), team };
  });

  const groupMatches = allMatches.filter((m) => m.stage === "group");
  const rungs = computeReachTallies(players, teamsById, reality);
  const rounds = computeKnockoutResults(allMatches, players, teamsById);

  return {
    champions,
    groupMatches,
    teams: allTeams,
    rungs,
    rounds,
    totalPlayers: players.length,
  };
}
