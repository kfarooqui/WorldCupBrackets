import Link from "next/link";
import { getProfile, predictionsLocked } from "@/lib/auth";
import RequestAccessForm from "@/components/RequestAccessForm";

export default async function Home() {
  const profile = await getProfile();
  const locked = await predictionsLocked();

  // Logged-out: hero + request access.
  if (!profile) {
    return (
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Predict the <span className="text-[var(--accent)]">2026 World Cup</span> 🌎⚽
          </h1>
          <p className="mt-4 text-[var(--muted)]">
            Pick the winner of every group match and fill out the entire knockout
            bracket. Earn points as the real results roll in, and battle friends
            and family on the leaderboard.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[var(--muted)]">
            <li>✅ 48 teams · 12 groups · Round of 32 to the Final</li>
            <li>✅ 1 pt per correct result + bonus for exact scores</li>
            <li>✅ Escalating points the deeper your picks go</li>
          </ul>
        </div>
        <RequestAccessForm />
      </div>
    );
  }

  // Pending / rejected.
  if (profile.status !== "approved") {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold">
          {profile.status === "rejected" ? "Account not approved" : "Awaiting approval"}
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          {profile.status === "rejected"
            ? "Your access request was declined. Contact the organizer if you think this is a mistake."
            : "Thanks for signing up! The organizer needs to approve your account before you can submit picks. You'll be able to play as soon as you're approved."}
        </p>
      </div>
    );
  }

  // Approved dashboard.
  return (
    <div>
      <h1 className="text-3xl font-extrabold">
        Welcome, {profile.first_name} 👋
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {locked
          ? "Predictions are locked — the tournament is underway. Track the leaderboard!"
          : "Predictions are open. Fill out your picks before the first kickoff."}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/predict" className="card hover:border-[var(--primary)]">
          <div className="text-2xl">📝</div>
          <div className="mt-2 font-bold">{locked ? "View my picks" : "Make my picks"}</div>
          <p className="text-sm text-[var(--muted)]">Group matches + full bracket.</p>
        </Link>
        <Link href="/leaderboard" className="card hover:border-[var(--primary)]">
          <div className="text-2xl">📊</div>
          <div className="mt-2 font-bold">Leaderboard</div>
          <p className="text-sm text-[var(--muted)]">See who&apos;s in the lead.</p>
        </Link>
        <Link href="/picks" className="card hover:border-[var(--primary)]">
          <div className="text-2xl">👀</div>
          <div className="mt-2 font-bold">Everyone&apos;s picks</div>
          <p className="text-sm text-[var(--muted)]">
            {locked ? "Compare predictions." : "Visible once picks lock."}
          </p>
        </Link>
      </div>
    </div>
  );
}
