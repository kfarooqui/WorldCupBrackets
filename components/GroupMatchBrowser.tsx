"use client";

import Link from "next/link";
import { useState } from "react";
import type { Match, Team } from "@/lib/types";
import { fmtDate, fixtureLine } from "@/lib/format";
import { GROUP_LETTERS } from "@/lib/worldcup-data";

type View = "group" | "date";

const tabCls = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
  }`;

export default function GroupMatchBrowser({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Team[];
}) {
  const [view, setView] = useState<View>("date");
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  // dateMode shows a Group tag (since rows aren't grouped by group) and omits
  // the date from the row detail (it's already in the day header).
  const matchRow = (m: Match, dateMode: boolean) => {
    const home = teamsById.get(m.home_team_id ?? -1);
    const away = teamsById.get(m.away_team_id ?? -1);
    const loc = [m.venue, m.city].filter(Boolean).join(", ");
    const detail = dateMode ? [m.kickoff, loc].filter(Boolean).join(" · ") : fixtureLine(m);
    return (
      <Link
        key={m.id}
        href={`/matches/${m.id}`}
        className="flex flex-col gap-1 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm hover:bg-[var(--border)]"
      >
        <div className="flex items-center justify-between gap-2">
          <span>
            {home?.flag_emoji} {home?.name} <span className="text-[var(--muted)]">v</span>{" "}
            {away?.name} {away?.flag_emoji}
          </span>
          <span className="shrink-0 text-[var(--muted)]">
            {m.status === "finished" ? `${m.home_score}–${m.away_score}` : "→"}
          </span>
        </div>
        {(dateMode || detail) && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
            {dateMode && m.group_letter && (
              <span className="rounded px-1.5 py-0.5 font-medium bg-[var(--border)] text-[var(--muted)]">
                Group {m.group_letter}
              </span>
            )}
            {detail && <span>🗓 {detail}</span>}
          </div>
        )}
      </Link>
    );
  };

  // Chronological grouping by match_date (ISO, sorts correctly); nulls last.
  const byDate = [...matches]
    .sort(
      (a, b) =>
        (a.match_date ?? "9999").localeCompare(b.match_date ?? "9999") ||
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
      <div className="mb-3 flex gap-2">
        <button onClick={() => setView("group")} className={tabCls(view === "group")}>
          By group
        </button>
        <button onClick={() => setView("date")} className={tabCls(view === "date")}>
          By date
        </button>
      </div>

      {view === "group" ? (
        <div className="space-y-4">
          {GROUP_LETTERS.map((letter) => {
            const ms = matches.filter((m) => m.group_letter === letter);
            if (!ms.length) return null;
            return (
              <div key={letter} className="card">
                <h3 className="mb-2 font-bold">Group {letter}</h3>
                <div className="grid gap-1 sm:grid-cols-2">
                  {ms.map((m) => matchRow(m, false))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {byDate.map(({ date, items }) => (
            <div key={date ?? "tbd"} className="card">
              <h3 className="mb-2 font-bold">{date ? fmtDate(date) : "Date TBD"}</h3>
              <div className="grid gap-1 sm:grid-cols-2">
                {items.map((m) => matchRow(m, true))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
