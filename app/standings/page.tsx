import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeStandings } from "@/lib/standings";
import { GROUP_LETTERS } from "@/lib/worldcup-data";
import type { Team, Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  await requireApproved();

  const supabase = await createClient();
  const [{ data: teams }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*").eq("stage", "group"),
  ]);

  const allTeams = (teams as Team[]) ?? [];
  const teamsById = new Map(allTeams.map((t) => [t.id, t]));
  const { byGroup } = computeStandings((matches as Match[]) ?? [], allTeams);

  const numHead = "w-9 px-1 py-1 text-right font-medium";
  const numCell = "px-1 py-1 text-right text-[var(--muted)]";

  return (
    <div>
      <h1 className="text-2xl font-bold">Group Standings</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        Live group tables, updated as results are entered. The top two of each group (shaded)
        advance, along with the best third-placed teams.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {GROUP_LETTERS.map((letter) => (
          <div key={letter} className="card">
            <h2 className="mb-2 font-bold">Group {letter}</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm tabular-nums">
                <thead className="text-xs text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-1 pr-2 text-left font-medium">Team</th>
                    <th className={numHead} title="Played">P</th>
                    <th className={numHead} title="Won">W</th>
                    <th className={numHead} title="Drawn">D</th>
                    <th className={numHead} title="Lost">L</th>
                    <th className={numHead} title="Goals for">GF</th>
                    <th className={numHead} title="Goals against">GA</th>
                    <th className={numHead} title="Goal difference">GD</th>
                    <th className={numHead} title="Points">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {(byGroup[letter] ?? []).map((s, i) => {
                    const t = teamsById.get(s.teamId);
                    return (
                      <tr
                        key={s.teamId}
                        className={`border-b border-[var(--border)]/40 ${
                          i < 2 ? "bg-[var(--primary)]/5" : ""
                        }`}
                      >
                        <td className="truncate py-1 pr-2 font-medium">
                          {t?.flag_emoji} {t?.name ?? "?"}
                        </td>
                        <td className={numCell}>{s.played}</td>
                        <td className={numCell}>{s.won}</td>
                        <td className={numCell}>{s.drawn}</td>
                        <td className={numCell}>{s.lost}</td>
                        <td className={numCell}>{s.gf}</td>
                        <td className={numCell}>{s.ga}</td>
                        <td className={numCell}>{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                        <td className="px-1 py-1 text-right font-bold">{s.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
