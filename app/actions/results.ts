"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Match, Team, MatchPrediction } from "@/lib/types";
import { scoreGroupPrediction } from "@/lib/scoring";
import { computeStandings } from "@/lib/standings";
import {
  resolveR32Occupants,
  nextSlotFor,
  type Advancement,
  type Round,
} from "@/lib/bracket";
import { GROUP_LETTERS } from "@/lib/worldcup-data";

/** Recompute stored points for one group match's predictions (for per-match display). */
async function rescoreGroupMatch(db: ReturnType<typeof createAdminClient>, match: Match) {
  const { data } = await db
    .from("match_predictions")
    .select("*")
    .eq("match_id", match.id);
  const preds = (data as MatchPrediction[]) ?? [];
  for (const p of preds) {
    const pts =
      match.status === "finished" && match.home_score != null && match.away_score != null
        ? scoreGroupPrediction(
            p.pick,
            p.pred_home_score,
            p.pred_away_score,
            match.home_score,
            match.away_score,
          )
        : 0;
    if (pts !== p.points) {
      await db.from("match_predictions").update({ points: pts }).eq("id", p.id);
    }
  }
}

/** Save a final score for any match; marks it finished and queues an email digest. */
export async function saveResult(matchId: number, home: number, away: number) {
  await requireAdmin();
  const db = createAdminClient();

  const { data: updated } = await db
    .from("matches")
    .update({ home_score: home, away_score: away, status: "finished" })
    .eq("id", matchId)
    .select("*")
    .single();
  const match = updated as Match;

  if (match.stage === "group") {
    await rescoreGroupMatch(db, match);
  } else {
    await advanceWinner(db, match);
  }

  await db.from("pending_results").upsert({ match_id: matchId }, { onConflict: "match_id" });
  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
}

/** Clear a match result back to scheduled. */
export async function clearResult(matchId: number) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: updated } = await db
    .from("matches")
    .update({ home_score: null, away_score: null, status: "scheduled" })
    .eq("id", matchId)
    .select("*")
    .single();
  const match = updated as Match;
  if (match.stage === "group") await rescoreGroupMatch(db, match);
  await db.from("pending_results").delete().eq("match_id", matchId);
  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
}

/** Set the two teams for a knockout match (admin confirms the real bracket). */
export async function setKnockoutTeams(
  matchId: number,
  homeTeamId: number | null,
  awayTeamId: number | null,
) {
  await requireAdmin();
  const db = createAdminClient();
  await db
    .from("matches")
    .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
    .eq("id", matchId);
  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
}

/** Push the winner of a finished knockout match into its next-round slot,
 *  following the official bracket feed map. */
async function advanceWinner(db: ReturnType<typeof createAdminClient>, match: Match) {
  if (match.stage === "final") return;
  if (match.home_score == null || match.away_score == null) return;
  const winner =
    match.home_score >= match.away_score ? match.home_team_id : match.away_team_id;
  if (!winner) return;

  // Slot index of this match within its stage (ordered by id).
  const { data: stageMatches } = await db
    .from("matches")
    .select("*")
    .eq("stage", match.stage)
    .order("id");
  const idx = (stageMatches as Match[]).findIndex((m) => m.id === match.id);

  const dest = nextSlotFor(match.stage as Round, idx);
  if (!dest) return;

  const { data: nextMatches } = await db
    .from("matches")
    .select("*")
    .eq("stage", dest.nextStage)
    .order("id");
  const target = (nextMatches as Match[])[dest.slot];
  if (!target) return;

  const field = dest.position === 0 ? "home_team_id" : "away_team_id";
  await db.from("matches").update({ [field]: winner }).eq("id", target.id);
}

/**
 * Auto-fill the real Round of 32 from current group standings, using the same
 * bracket template the players' brackets use. Admin can then tweak any matchup.
 */
export async function autoFillR32() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: matches }, { data: teams }] = await Promise.all([
    db.from("matches").select("*"),
    db.from("teams").select("*"),
  ]);
  const { byGroup, bestThirds } = computeStandings(
    matches as Match[],
    teams as Team[],
  );

  const adv: Advancement = {};
  GROUP_LETTERS.forEach((l) => {
    adv[l] = {
      first: byGroup[l][0]?.teamId ?? null,
      second: byGroup[l][1]?.teamId ?? null,
    };
  });

  const occupants = resolveR32Occupants(adv, bestThirds);

  const { data: r32 } = await db
    .from("matches")
    .select("*")
    .eq("stage", "r32")
    .order("id");
  const r32Matches = (r32 as Match[]) ?? [];

  for (let i = 0; i < occupants.length && i < r32Matches.length; i++) {
    const [home, away] = occupants[i];
    await db
      .from("matches")
      .update({ home_team_id: home, away_team_id: away })
      .eq("id", r32Matches[i].id);
  }

  revalidatePath("/admin/results");
}
