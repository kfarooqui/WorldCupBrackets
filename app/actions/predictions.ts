"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApproved, predictionsLocked } from "@/lib/auth";
import type { Round } from "@/lib/bracket";
import type { Pick } from "@/lib/types";

export type SavePayload = {
  matches: {
    match_id: number;
    pick: Pick;
    pred_home_score: number | null;
    pred_away_score: number | null;
  }[];
  advancement: {
    group_letter: string;
    first_team_id: number;
    second_team_id: number;
    third_team_id: number | null;
  }[];
  thirds: number[];
  bracket: { round: Round; slot: number; team_id: number }[];
};

export type SaveResult = { ok: boolean; error?: string };

/** Persist the user's full prediction set. Replaces each section wholesale. */
export async function savePredictions(payload: SavePayload): Promise<SaveResult> {
  const profile = await requireApproved();
  if (await predictionsLocked()) {
    return { ok: false, error: "Predictions are locked." };
  }

  const supabase = await createClient();
  const uid = profile.id;

  // Group-stage match picks.
  await supabase.from("match_predictions").delete().eq("user_id", uid);
  if (payload.matches.length) {
    const rows = payload.matches.map((m) => ({ user_id: uid, ...m }));
    const { error } = await supabase.from("match_predictions").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  // Advancement (1st/2nd per group).
  await supabase.from("advancement_predictions").delete().eq("user_id", uid);
  if (payload.advancement.length) {
    const rows = payload.advancement.map((a) => ({ user_id: uid, ...a }));
    const { error } = await supabase.from("advancement_predictions").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  // Best third-place teams.
  await supabase.from("third_place_predictions").delete().eq("user_id", uid);
  if (payload.thirds.length) {
    const rows = payload.thirds.map((team_id) => ({ user_id: uid, team_id }));
    const { error } = await supabase.from("third_place_predictions").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  // Knockout bracket picks.
  await supabase.from("bracket_predictions").delete().eq("user_id", uid);
  if (payload.bracket.length) {
    const rows = payload.bracket.map((b) => ({ user_id: uid, ...b }));
    const { error } = await supabase.from("bracket_predictions").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/predict");
  return { ok: true };
}

/** Reopen a submitted bracket for editing (only allowed before the lock). */
export async function unsubmitPredictions(): Promise<SaveResult> {
  const profile = await requireApproved();
  if (await predictionsLocked()) {
    return { ok: false, error: "Predictions are locked." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("prediction_submissions")
    .delete()
    .eq("user_id", profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/predict");
  return { ok: true };
}

/** Save (if provided) and mark the user's predictions submitted. */
export async function submitPredictions(payload: SavePayload): Promise<SaveResult> {
  const saved = await savePredictions(payload);
  if (!saved.ok) return saved;

  const profile = await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("prediction_submissions")
    .upsert({ user_id: profile.id }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/predict");
  return { ok: true };
}
