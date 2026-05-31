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
import PredictWizard from "@/components/predict/PredictWizard";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
  const profile = await requireApproved();
  const locked = await predictionsLocked();
  const supabase = await createClient();
  const uid = profile.id;

  const [
    { data: teams },
    { data: matches },
    { data: matchPreds },
    { data: advPreds },
    { data: thirdPreds },
    { data: bracketPreds },
    { data: submission },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("id"),
    supabase.from("matches").select("*").eq("stage", "group").order("match_no"),
    supabase.from("match_predictions").select("*").eq("user_id", uid),
    supabase.from("advancement_predictions").select("*").eq("user_id", uid),
    supabase.from("third_place_predictions").select("*").eq("user_id", uid),
    supabase.from("bracket_predictions").select("*").eq("user_id", uid),
    supabase.from("prediction_submissions").select("submitted_at").eq("user_id", uid).maybeSingle(),
  ]);

  return (
    <PredictWizard
      teams={(teams as Team[]) ?? []}
      groupMatches={(matches as Match[]) ?? []}
      initialMatchPreds={(matchPreds as MatchPrediction[]) ?? []}
      initialAdvancement={(advPreds as AdvancementPrediction[]) ?? []}
      initialThirds={(thirdPreds as ThirdPlacePrediction[]) ?? []}
      initialBracket={(bracketPreds as BracketPrediction[]) ?? []}
      locked={locked}
      submittedAt={submission?.submitted_at ?? null}
    />
  );
}
