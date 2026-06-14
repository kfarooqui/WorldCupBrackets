import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved, predictionsLocked } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Match, Team, MatchPrediction, Pick } from "@/lib/types";
import { scoreGroupPrediction } from "@/lib/scoring";
import { fixtureLine } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApproved();
  const locked = await predictionsLocked();
  const { id } = await params;
  const matchId = Number(id);

  const db = createAdminClient();
  const { data: match } = await db.from("matches").select("*").eq("id", matchId).single();
  if (!match) notFound();
  const m = match as Match;

  if (!locked) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold">Picks hidden until lock</h1>
        <p className="mt-2 text-[var(--muted)]">Everyone&apos;s guesses appear once predictions lock.</p>
        <Link href="/predict" className="btn-ghost mt-4 inline-flex">Back to my picks</Link>
      </div>
    );
  }

  const [{ data: teams }, { data: profiles }, { data: preds }, { data: subs }] = await Promise.all([
    db.from("teams").select("*"),
    db.from("profiles").select("*").eq("status", "approved"),
    db.from("match_predictions").select("*").eq("match_id", matchId),
    db.from("prediction_submissions").select("user_id"),
  ]);

  const teamsById = new Map((teams as Team[]).map((t) => [t.id, t]));
  // Only players who formally submitted appear in the per-match picks table.
  const submitted = new Set((subs ?? []).map((s) => s.user_id));
  const profById = new Map(
    (profiles as Profile[]).filter((p) => submitted.has(p.id)).map((p) => [p.id, p]),
  );
  const home = teamsById.get(m.home_team_id ?? -1);
  const away = teamsById.get(m.away_team_id ?? -1);
  const finished = m.status === "finished";

  // Show the predicted team name (or "Draw") rather than home/away terminology.
  const pickLabel = (pick: Pick): string =>
    pick === "HOME"
      ? home?.name ?? "Home"
      : pick === "AWAY"
        ? away?.name ?? "Away"
        : "Draw";

  const rows = (preds as MatchPrediction[])
    .filter((p) => profById.has(p.user_id))
    .map((p) => {
      const pts = finished
        ? scoreGroupPrediction(p.pick, p.pred_home_score, p.pred_away_score, m.home_score!, m.away_score!)
        : null;
      return { p, profile: profById.get(p.user_id)!, pts };
    })
    .sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0));

  return (
    <div>
      <Link href="/picks/everyone" className="text-sm text-[var(--muted)] hover:underline">← Everyone&apos;s picks</Link>
      <div className="card mt-3 text-center">
        <div className="text-sm text-[var(--muted)]">{m.slot_label}</div>
        <div className="mt-1 text-xl font-bold">
          {home?.flag_emoji} {home?.name} <span className="text-[var(--muted)]">vs</span> {away?.name} {away?.flag_emoji}
        </div>
        {finished ? (
          <div className="mt-1 text-2xl font-extrabold text-[var(--accent)]">
            {m.home_score} – {m.away_score}
          </div>
        ) : (
          <div className="mt-1 text-sm text-[var(--muted)]">Not played yet</div>
        )}
        {fixtureLine(m) && (
          <div className="mt-2 text-xs text-[var(--muted)]">🗓 {fixtureLine(m)}</div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-3">Player</th>
              <th className="py-2 pr-3">Pick</th>
              <th className="py-2 pr-3">Score guess</th>
              {finished && <th className="py-2 pr-3 text-right">Points</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, profile, pts }) => (
              <tr key={p.id} className="border-b border-[var(--border)]/50">
                <td className="py-2 pr-3 font-medium">{profile.first_name} {profile.last_name}</td>
                <td className="py-2 pr-3">{pickLabel(p.pick)}</td>
                <td className="py-2 pr-3 text-[var(--muted)]">
                  {p.pred_home_score != null && p.pred_away_score != null
                    ? `${p.pred_home_score}–${p.pred_away_score}`
                    : "—"}
                </td>
                {finished && (
                  <td className="py-2 pr-3 text-right font-bold text-[var(--accent)]">{pts}</td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-[var(--muted)]">No picks for this game.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
