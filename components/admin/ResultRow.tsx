"use client";

import { useState, useTransition } from "react";
import type { Match, Team } from "@/lib/types";
import { saveResult, clearResult, setKnockoutTeams } from "@/app/actions/results";
import { fixtureLine } from "@/lib/format";

export default function ResultRow({
  match,
  teams,
  allowTeamEdit,
}: {
  match: Match;
  teams: Team[];
  allowTeamEdit: boolean;
}) {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  const [homeTeam, setHomeTeam] = useState(match.home_team_id?.toString() ?? "");
  const [awayTeam, setAwayTeam] = useState(match.away_team_id?.toString() ?? "");
  const [pending, start] = useTransition();

  const num = (s: string) => (s === "" ? null : Number(s));

  const save = () => {
    if (home === "" || away === "") return;
    start(() => saveResult(match.id, Number(home), Number(away)));
  };
  const clear = () => start(() => clearResult(match.id));
  const saveTeams = () =>
    start(() => setKnockoutTeams(match.id, num(homeTeam), num(awayTeam)));

  const finished = match.status === "finished";

  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-2">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-14 shrink-0 text-xs text-[var(--muted)]">{match.slot_label}</span>

      {allowTeamEdit ? (
        <>
          <TeamSelect teams={teams} value={homeTeam} onChange={setHomeTeam} />
          <span className="text-[var(--muted)]">vs</span>
          <TeamSelect teams={teams} value={awayTeam} onChange={setAwayTeam} />
          <button onClick={saveTeams} disabled={pending} className="btn-ghost px-2 py-1 text-xs">
            Set teams
          </button>
        </>
      ) : (
        <span className="min-w-[160px] flex-1">
          {teamsById.get(match.home_team_id ?? -1)?.flag_emoji}{" "}
          {teamsById.get(match.home_team_id ?? -1)?.name ?? "—"}
          <span className="mx-1 text-[var(--muted)]">v</span>
          {teamsById.get(match.away_team_id ?? -1)?.name ?? "—"}{" "}
          {teamsById.get(match.away_team_id ?? -1)?.flag_emoji}
        </span>
      )}

      <input
        inputMode="numeric"
        value={home}
        onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
        className="input w-12 px-2 py-1 text-center"
        aria-label="home score"
      />
      <span>-</span>
      <input
        inputMode="numeric"
        value={away}
        onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
        className="input w-12 px-2 py-1 text-center"
        aria-label="away score"
      />
      <button onClick={save} disabled={pending} className="btn-primary px-3 py-1 text-xs">
        {finished ? "Update" : "Save"}
      </button>
      {finished && (
        <>
          <span className="pill bg-green-500/20 text-green-300">final</span>
          <button onClick={clear} disabled={pending} className="text-xs text-[var(--muted)] hover:text-red-300">
            clear
          </button>
        </>
      )}
    </div>
    {fixtureLine(match) && (
      <p className="mt-1 text-[11px] text-[var(--muted)]">🗓 {fixtureLine(match)}</p>
    )}
    </div>
  );
}

function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: Team[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select className="input w-36 py-1" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— team —</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.flag_emoji} {t.name}
        </option>
      ))}
    </select>
  );
}
