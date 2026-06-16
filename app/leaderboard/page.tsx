import { requireApproved } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";
import LeaderboardTable from "@/components/LeaderboardTable";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await requireApproved();
  const { rows } = await getLeaderboard();

  return (
    <div>
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Updates automatically as the organizer enters results.
      </p>

      <LeaderboardTable rows={rows} meId={me.id} />
    </div>
  );
}
