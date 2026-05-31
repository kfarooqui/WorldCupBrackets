import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Profile,
  Match,
  MatchPrediction,
  AdvancementPrediction,
  ThirdPlacePrediction,
  BracketPrediction,
} from "@/lib/types";
import {
  deriveReality,
  scoreUser,
  type ScoreBreakdown,
  type UserPredictions,
} from "@/lib/score-engine";

export type LeaderboardRow = {
  profile: Profile;
  score: ScoreBreakdown;
  submitted: boolean;
  rank: number;
};

/** Compute the full leaderboard server-side (service role; aggregates only). */
export async function getLeaderboard(): Promise<{
  rows: LeaderboardRow[];
  matches: Match[];
}> {
  const db = createAdminClient();
  const [
    { data: profiles },
    { data: matches },
    { data: mp },
    { data: adv },
    { data: thirds },
    { data: bracket },
    { data: subs },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("status", "approved"),
    db.from("matches").select("*").order("match_no"),
    db.from("match_predictions").select("*"),
    db.from("advancement_predictions").select("*"),
    db.from("third_place_predictions").select("*"),
    db.from("bracket_predictions").select("*"),
    db.from("prediction_submissions").select("user_id"),
  ]);

  const allMatches = (matches as Match[]) ?? [];
  const reality = deriveReality(allMatches);
  const submittedSet = new Set((subs ?? []).map((s) => s.user_id));

  const group = <T extends { user_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    (rows ?? []).forEach((r) => {
      (m.get(r.user_id) ?? m.set(r.user_id, []).get(r.user_id)!).push(r);
    });
    return m;
  };
  const mpBy = group(mp as MatchPrediction[]);
  const advBy = group(adv as AdvancementPrediction[]);
  const thirdsBy = group(thirds as ThirdPlacePrediction[]);
  const bracketBy = group(bracket as BracketPrediction[]);

  const scored = ((profiles as Profile[]) ?? []).map((profile) => {
    const pred: UserPredictions = {
      matches: mpBy.get(profile.id) ?? [],
      advancement: advBy.get(profile.id) ?? [],
      thirds: (thirdsBy.get(profile.id) ?? []).map((t) => t.team_id),
      bracket: bracketBy.get(profile.id) ?? [],
    };
    return { profile, score: scoreUser(pred, reality), submitted: submittedSet.has(profile.id) };
  });

  scored.sort((a, b) => b.score.total - a.score.total);

  let rank = 0;
  let prev = Number.NaN;
  const rows: LeaderboardRow[] = scored.map((s, i) => {
    if (s.score.total !== prev) {
      rank = i + 1;
      prev = s.score.total;
    }
    return { ...s, rank };
  });

  return { rows, matches: allMatches };
}
