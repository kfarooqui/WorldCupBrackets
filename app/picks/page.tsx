import Link from "next/link";
import { requireApproved, predictionsLocked } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Match, Team, BracketPrediction } from "@/lib/types";
import { GROUP_LETTERS } from "@/lib/worldcup-data";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  await requireApproved();
  const locked = await predictionsLocked();

  if (!locked) {
    const db = createAdminClient();
    const { data } = await db.from("app_settings").select("lock_at").eq("id", 1).single();
    const when = data?.lock_at ? new Date(data.lock_at).toLocaleString() : "kickoff";
    return (
      <div className="card mx-auto max-w-lg text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold">Everyone&apos;s picks are hidden</h1>
        <p className="mt-2 text-[var(--muted)]">
          To keep things fair, all predictions stay private until they lock at{" "}
          <strong>{when}</strong>. Come back then to see what everyone guessed!
        </p>
      </div>
    );
  }

  const db = createAdminClient();
  const [{ data: profiles }, { data: matches }, { data: teams }, { data: champPicks }, { data: subs }] =
    await Promise.all([
      db.from("profiles").select("*").eq("status", "approved").order("first_name"),
      db.from("matches").select("*").eq("stage", "group").order("match_no"),
      db.from("teams").select("*"),
      db.from("bracket_predictions").select("*").eq("round", "final"),
      db.from("prediction_submissions").select("user_id"),
    ]);

  const teamsById = new Map((teams as Team[]).map((t) => [t.id, t]));
  const champByUser = new Map(
    (champPicks as BracketPrediction[]).map((b) => [b.user_id, b.team_id]),
  );
  const groupMatches = (matches as Match[]) ?? [];

  // Only show players who formally submitted their picks.
  const submitted = new Set((subs ?? []).map((s) => s.user_id));
  const players = ((profiles as Profile[]) ?? []).filter((p) => submitted.has(p.id));

  return (
    <div>
      <h1 className="text-2xl font-bold">Everyone&apos;s picks</h1>

      <div className="card mt-4">
        <h2 className="mb-3 font-bold">🏆 Predicted champions</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map((p) => {
            const champ = champByUser.get(p.id);
            return (
              <div key={p.id} className="flex justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                <span>{p.first_name} {p.last_name}</span>
                <span className="font-medium">
                  {champ ? `${teamsById.get(champ)?.flag_emoji} ${teamsById.get(champ)?.name}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="mt-6 mb-3 font-bold">Group matches</h2>
      <p className="mb-3 text-sm text-[var(--muted)]">Tap a match to see everyone&apos;s pick.</p>
      <div className="space-y-4">
        {GROUP_LETTERS.map((letter) => (
          <div key={letter} className="card">
            <h3 className="mb-2 font-bold">Group {letter}</h3>
            <div className="grid gap-1 sm:grid-cols-2">
              {groupMatches
                .filter((m) => m.group_letter === letter)
                .map((m) => (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm hover:bg-[var(--border)]"
                  >
                    <span>
                      {teamsById.get(m.home_team_id ?? -1)?.flag_emoji}{" "}
                      {teamsById.get(m.home_team_id ?? -1)?.name} v{" "}
                      {teamsById.get(m.away_team_id ?? -1)?.name}{" "}
                      {teamsById.get(m.away_team_id ?? -1)?.flag_emoji}
                    </span>
                    <span className="text-[var(--muted)]">
                      {m.status === "finished" ? `${m.home_score}–${m.away_score}` : "→"}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
