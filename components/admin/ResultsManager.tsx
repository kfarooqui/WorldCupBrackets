"use client";

import { useState, useTransition } from "react";
import type { Match, Team } from "@/lib/types";
import { autoFillR32 } from "@/app/actions/results";
import { sendDigest } from "@/app/actions/email";
import { ROUND_LABEL } from "@/lib/scoring";
import { GROUP_LETTERS } from "@/lib/worldcup-data";
import ResultRow from "./ResultRow";

const KO_STAGES = ["r32", "r16", "qf", "sf", "final"] as const;

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
          {GROUP_LETTERS.map((letter) => (
            <div key={letter} className="card">
              <h3 className="mb-2 font-bold">Group {letter}</h3>
              <div className="space-y-2">
                {matches
                  .filter((m) => m.stage === "group" && m.group_letter === letter)
                  .map((m) => (
                    <ResultRow key={m.id} match={m} teams={teams} allowTeamEdit={false} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              After the group stage, auto-fill the Round of 32 from standings, then tweak any
              matchup. Winners advance automatically as you enter knockout scores.
            </p>
            <AutoFillButton />
          </div>
          {KO_STAGES.map((stage) => (
            <div key={stage} className="card">
              <h3 className="mb-2 font-bold">{ROUND_LABEL[stage]}</h3>
              <div className="space-y-2">
                {matches
                  .filter((m) => m.stage === stage)
                  .map((m) => (
                    <ResultRow key={m.id} match={m} teams={teams} allowTeamEdit />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoFillButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => autoFillR32())}
      disabled={pending}
      className="btn-ghost shrink-0"
    >
      {pending ? "Filling…" : "Auto-fill R32"}
    </button>
  );
}
