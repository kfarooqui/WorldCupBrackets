import { requireApproved, predictionsLocked } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Team,
  Match,
  MatchPrediction,
  AdvancementPrediction,
  ThirdPlacePrediction,
  BracketPrediction,
} from "@/lib/types";
import {
  deriveReality,
  scoreUser,
  serializeReality,
  type UserPredictions,
} from "@/lib/score-engine";
import PredictWizard from "@/components/predict/PredictWizard";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
  const profile = await requireApproved();
  const locked = await predictionsLocked();
  const supabase = await createClient();
  const uid = profile.id;

  const [
    { data: teams },
    { data: allMatches },
    { data: matchPreds },
    { data: advPreds },
    { data: thirdPreds },
    { data: bracketPreds },
    { data: submission },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("id"),
    supabase.from("matches").select("*").order("match_no"),
    supabase.from("match_predictions").select("*").eq("user_id", uid),
    supabase.from("advancement_predictions").select("*").eq("user_id", uid),
    supabase.from("third_place_predictions").select("*").eq("user_id", uid),
    supabase.from("bracket_predictions").select("*").eq("user_id", uid),
    supabase.from("prediction_submissions").select("submitted_at").eq("user_id", uid).maybeSingle(),
  ]);

  const matches = (allMatches as Match[]) ?? [];
  const groupMatches = matches.filter((m) => m.stage === "group");
  const thirds = (thirdPreds as ThirdPlacePrediction[]) ?? [];

  // Score the user's picks against real results so the wizard can show right/wrong + points.
  const userPreds: UserPredictions = {
    matches: (matchPreds as MatchPrediction[]) ?? [],
    advancement: (advPreds as AdvancementPrediction[]) ?? [],
    thirds: thirds.map((t) => t.team_id),
    bracket: (bracketPreds as BracketPrediction[]) ?? [],
  };
  const reality = deriveReality(matches);
  const breakdown = scoreUser(userPreds, reality);
  const results = serializeReality(matches);
  const hasResults =
    reality.finishedGroup.size > 0 ||
    results.reached.r16.length > 0 ||
    results.champion != null;

  return (
    <PredictWizard
      teams={(teams as Team[]) ?? []}
      groupMatches={groupMatches}
      initialMatchPreds={userPreds.matches}
      initialAdvancement={userPreds.advancement}
      initialThirds={thirds}
      initialBracket={userPreds.bracket}
      locked={locked}
      submittedAt={submission?.submitted_at ?? null}
      results={results}
      breakdown={breakdown}
      hasResults={hasResults}
    />
  );
}
