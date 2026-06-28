"use client";

import { useState, useTransition } from "react";
import type { Match, Team } from "@/lib/types";
import { sendDigest } from "@/app/actions/email";
import { ROUND_LABEL } from "@/lib/scoring";
import { fmtDate, kickoffMinutes } from "@/lib/format";
import ResultRow from "./ResultRow";

const KO_STAGES = ["r32", "r16", "qf", "sf", "final"] as const;

// Key a row by its server-side data so it remounts (re-initialising ResultRow's
// local input/select state) whenever that data changes — e.g. after Auto-fill
// R32 sets the knockout teams, or another result is saved.
const rowKey = (m: Match) =>
  `${m.id}:${m.home_team_id ?? ""}:${m.away_team_id ?? ""}:${m.home_score ?? ""}:${m.away_score ?? ""}:${m.status}`;

export default function ResultsManager({
  matches,
  teams,
  pendingCount,
}: {
  matches: Match[];
  teams: Team[];
  pendingCount: number;
}) {
  const [tab, setTab] = useState<"group" | "knockout">("group");
  const [pending, start] = useTransition();
  const [digestMsg, setDigestMsg] = useState<string | null>(null);

  const send = () =>
    start(async () => {
      const r = await sendDigest();
      setDigestMsg(
        r.error ? r.error : `Sent ${r.results} result(s) to ${r.sent} player(s).`,
      );
    });

  // Group-stage matches arranged by match day (sorted by date), rather than by
  // group. match_date is ISO (YYYY-MM-DD), so it sorts chronologically; null
  // dates sort last. match_no breaks ties within a day.
  const groupByDate = matches
    .filter((m) => m.stage === "group")
    .slice()
    .sort(
      (a, b) =>
        (a.match_date ?? "9999").localeCompare(b.match_date ?? "9999") ||
        kickoffMinutes(a.kickoff) - kickoffMinutes(b.kickoff) ||
        a.match_no - b.match_no,
    )
    .reduce<{ date: string | null; items: Match[] }[]>((acc, m) => {
      const date = m.match_date ?? null;
      const last = acc[acc.length - 1];
      if (last && last.date === date) last.items.push(m);
      else acc.push({ date, items: [m] });
      return acc;
    }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Results</h1>
        <div className="flex items-center gap-3">
          {digestMsg && <span className="text-sm text-[var(--accent)]">{digestMsg}</span>}
          <button onClick={send} disabled={pending} className="btn-primary">
            📧 Send match-day update ({pendingCount})
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("group")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "group" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}
        >
          Group stage
        </button>
        <button
          onClick={() => setTab("knockout")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "knockout" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}
        >
          Knockout
        </button>
      </div>

      {tab === "group" ? (
        <div className="space-y-4">
          {groupByDate.map(({ date, items }) => (
            <div key={date ?? "tbd"} className="card">
              <h3 className="mb-2 font-bold">{date ? fmtDate(date) : "Date TBD"}</h3>
              <div className="space-y-2">
                {items.map((m) => (
                  <ResultRow key={rowKey(m)} match={m} teams={teams} allowTeamEdit={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <p className="text-sm text-[var(--muted)]">
              Set or adjust the knockout teams, then enter scores — winners advance
              automatically to the next round.
            </p>
          </div>
          {KO_STAGES.map((stage) => (
            <div key={stage} className="card">
              <h3 className="mb-2 font-bold">{ROUND_LABEL[stage]}</h3>
              <div className="space-y-2">
                {matches
                  .filter((m) => m.stage === stage)
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.match_date ?? "9999").localeCompare(b.match_date ?? "9999") ||
                      kickoffMinutes(a.kickoff) - kickoffMinutes(b.kickoff) ||
                      a.match_no - b.match_no,
                  )
                  .map((m) => (
                    <ResultRow key={rowKey(m)} match={m} teams={teams} allowTeamEdit />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
