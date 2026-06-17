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

  const numCls = "py-1 px-1 text-right text-[var(--muted)]";

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
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-1 pr-2">Team</th>
                    <th className="py-1 px-1 text-right" title="Played">P</th>
                    <th className="py-1 px-1 text-right" title="Won">W</th>
                    <th className="py-1 px-1 text-right" title="Drawn">D</th>
                    <th className="py-1 px-1 text-right" title="Lost">L</th>
                    <th className="py-1 px-1 text-right" title="Goals for">GF</th>
                    <th className="py-1 px-1 text-right" title="Goals against">GA</th>
                    <th className="py-1 px-1 text-right" title="Goal difference">GD</th>
                    <th className="py-1 pl-1 text-right" title="Points">Pts</th>
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
                        <td className="py-1 pr-2 whitespace-nowrap font-medium">
                          {t?.flag_emoji} {t?.name ?? "?"}
                        </td>
                        <td className={numCls}>{s.played}</td>
                        <td className={numCls}>{s.won}</td>
                        <td className={numCls}>{s.drawn}</td>
                        <td className={numCls}>{s.lost}</td>
                        <td className={numCls}>{s.gf}</td>
                        <td className={numCls}>{s.ga}</td>
                        <td className={numCls}>{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                        <td className="py-1 pl-1 text-right font-bold">{s.points}</td>
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
