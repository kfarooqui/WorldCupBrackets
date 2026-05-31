import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCORING } from "@/lib/scoring";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

function fmtDeadline(iso: string | null): string {
  if (!iso) return "the first match kickoff";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function HowItWorksPage() {
  const profile = await getProfile();
  let lockAt: string | null = null;
  try {
    const db = createAdminClient();
    const { data } = await db.from("app_settings").select("lock_at").eq("id", 1).single();
    lockAt = data?.lock_at ?? null;
  } catch {
    /* ignore */
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">How the pool works 🌎⚽</h1>
        <p className="mt-2 text-[var(--muted)]">
          Predict the 2026 FIFA World Cup, score points as the real results come in, and
          battle friends &amp; family on the leaderboard.
        </p>
      </div>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">⏱ The deadline</h2>
        <p className="text-sm text-[var(--muted)]">
          You can edit your picks as much as you like until they lock at:
        </p>
        <p className="text-base font-semibold text-[var(--accent)]">{fmtDeadline(lockAt)}</p>
        <p className="text-sm text-[var(--muted)]">
          That&apos;s the first kickoff of the tournament. After that, all predictions are
          final and everyone&apos;s picks become visible to the whole group.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">🎟 Getting in</h2>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-[var(--muted)]">
          <li>Request an account with your name, email and phone.</li>
          <li>The organizer approves you (you&apos;ll sign in with a magic link — no password).</li>
          <li>Once approved, head to <strong>My Picks</strong> and fill out your predictions.</li>
        </ol>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">📝 Making your picks (3 steps)</h2>
        <div className="space-y-2 text-sm text-[var(--muted)]">
          <p>
            <strong className="text-[var(--foreground)]">1. Group stage.</strong> Pick the
            winner (or a draw) for all 72 group matches. Optionally predict the exact
            scoreline for bonus points.
          </p>
          <p>
            <strong className="text-[var(--foreground)]">2. Who advances.</strong> We
            auto-fill each group&apos;s finishing order from your match picks (and the 8 best
            third-place teams), so the round of 32 is set by your group predictions. Tweak
            anything you like.
          </p>
          <p>
            <strong className="text-[var(--foreground)]">3. The bracket.</strong> Fill out
            the entire knockout bracket to the Final. Each match only offers the teams you
            advanced — so you can never pick a team you&apos;ve already knocked out.
          </p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">🏅 Scoring</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
            <span>Correct group result (win / draw / loss)</span>
            <span className="font-bold text-[var(--accent)]">{SCORING.groupOutcome} pt</span>
          </li>
          <li className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
            <span>Correct exact score in a group match</span>
            <span className="font-bold text-[var(--accent)]">+{SCORING.groupExactScore} pt</span>
          </li>
          <li className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
            <span>Each correct winner in an elimination match (Round of 32 → Final)</span>
            <span className="font-bold text-[var(--accent)]">{SCORING.reachR16} pts</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Correctly picking the champion</span>
            <span className="font-bold text-[var(--accent)]">{SCORING.champion} pts</span>
          </li>
        </ul>
        <p className="text-xs text-[var(--muted)]">
          So a perfect group stage is worth a lot of small points; the knockout rounds each
          reward 2 points for every team you correctly send through. A knockout pick counts
          as correct if the team you advanced actually wins its real match that round.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">👀 Seeing everyone&apos;s picks</h2>
        <p className="text-sm text-[var(--muted)]">
          To keep it fair, your predictions stay private until the deadline. Once picks lock,
          the <strong>Everyone</strong> page reveals what each person guessed for every game,
          and the <strong>Leaderboard</strong> updates live as the organizer enters results.
        </p>
      </section>

      <div className="flex gap-3">
        {profile?.status === "approved" ? (
          <Link href="/predict" className="btn-primary">Make my picks →</Link>
        ) : profile ? (
          <Link href="/pending" className="btn-primary">Check my status →</Link>
        ) : (
          <Link href="/" className="btn-primary">Request an account →</Link>
        )}
        <Link href="/leaderboard" className="btn-ghost">View leaderboard</Link>
      </div>
    </div>
  );
}
