import { requireApproved } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";

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

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Player</th>
              <th className="py-2 pr-3 text-right">Group</th>
              <th className="py-2 pr-3 text-right">Bracket</th>
              <th className="py-2 pr-3 text-right">🏆</th>
              <th className="py-2 pr-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.profile.id}
                className={`border-b border-[var(--border)]/50 ${
                  r.profile.id === me.id ? "bg-[var(--primary)]/10" : ""
                }`}
              >
                <td className="py-2 pr-3 font-bold">
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </td>
                <td className="py-2 pr-3 font-medium">
                  {r.profile.first_name} {r.profile.last_name}
                  {r.profile.id === me.id && (
                    <span className="ml-2 text-xs text-[var(--accent)]">you</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right text-[var(--muted)]">{r.score.group}</td>
                <td className="py-2 pr-3 text-right text-[var(--muted)]">{r.score.reach}</td>
                <td className="py-2 pr-3 text-right text-[var(--muted)]">{r.score.champion}</td>
                <td className="py-2 pr-3 text-right text-lg font-extrabold text-[var(--accent)]">
                  {r.score.total}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--muted)]">
                  No approved players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
