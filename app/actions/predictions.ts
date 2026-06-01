"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApproved, predictionsLocked } from "@/lib/auth";
import type { Round } from "@/lib/bracket";
import type { Pick, Match } from "@/lib/types";
import { computeStats, groupOrderConsistent } from "@/lib/predict-standings";
import { teamIdsInGroup } from "@/lib/worldcup-data";

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

/**
 * Verify the advancement seeding doesn't contradict the group-match picks
 * (a team can't be seeded above another that strictly outscores it). Returns
 * the offending group letters, or [] if consistent.
 */
async function findInconsistentGroups(payload: SavePayload): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("stage", "group");
  const groupMatches = (data as Match[]) ?? [];

  const picks: Record<number, { pick: Pick; ph: string; pa: string }> = {};
  payload.matches.forEach((m) => {
    picks[m.match_id] = {
      pick: m.pick,
      ph: m.pred_home_score?.toString() ?? "",
      pa: m.pred_away_score?.toString() ?? "",
    };
  });
  const stats = computeStats(groupMatches, picks);

  return payload.advancement
    .filter((a) => {
      const ids = teamIdsInGroup(a.group_letter);
      const fourth =
        ids.find(
          (id) =>
            id !== a.first_team_id && id !== a.second_team_id && id !== a.third_team_id,
        ) ?? null;
      return !groupOrderConsistent(stats, [
        a.first_team_id,
        a.second_team_id,
        a.third_team_id,
        fourth,
      ]);
    })
    .map((a) => a.group_letter);
}

/** Save (if provided) and mark the user's predictions submitted. */
export async function submitPredictions(payload: SavePayload): Promise<SaveResult> {
  const saved = await savePredictions(payload);
  if (!saved.ok) return saved;

  // Block submission (but not saving) if the bracket contradicts group picks.
  const bad = await findInconsistentGroups(payload);
  if (bad.length) {
    return {
      ok: false,
      error: `Your finishing order for Group ${bad.join(", ")} contradicts your group-match picks. Use "Re-fill from my group picks" before submitting.`,
    };
  }

  const profile = await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("prediction_submissions")
    .upsert({ user_id: profile.id }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/predict");
  return { ok: true };
}
