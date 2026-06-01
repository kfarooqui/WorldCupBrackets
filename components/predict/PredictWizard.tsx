"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  Team,
  Match,
  MatchPrediction,
  AdvancementPrediction,
  ThirdPlacePrediction,
  BracketPrediction,
} from "@/lib/types";
import {
  type Advancement,
  type BracketPicks,
  type Round,
  ROUNDS,
  sanitizePicks,
  isBracketComplete,
  advancementComplete,
} from "@/lib/bracket";
import {
  savePredictions,
  submitPredictions,
  unsubmitPredictions,
  type SavePayload,
} from "@/app/actions/predictions";
import GroupStep, { type MatchPick } from "./GroupStep";
import AdvanceStep, { type GroupRank } from "./AdvanceStep";
import BracketStep from "./BracketStep";
import { GROUP_LETTERS } from "@/lib/worldcup-data";
import { standingsFromPicks } from "@/lib/predict-standings";

type Step = "group" | "advance" | "bracket";
const STEPS: { key: Step; label: string }[] = [
  { key: "group", label: "1 · Group matches" },
  { key: "advance", label: "2 · Who advances" },
  { key: "bracket", label: "3 · Bracket" },
];

export default function PredictWizard(props: {
  teams: Team[];
  groupMatches: Match[];
  initialMatchPreds: MatchPrediction[];
  initialAdvancement: AdvancementPrediction[];
  initialThirds: ThirdPlacePrediction[];
  initialBracket: BracketPrediction[];
  locked: boolean;
  submittedAt: string | null;
}) {
  const router = useRouter();
  const teamsById = useMemo(
    () => new Map(props.teams.map((t) => [t.id, t])),
    [props.teams],
  );

  const readOnly = props.locked || !!props.submittedAt;

  // ── State ─────────────────────────────────────────────────────────────
  const [matchPicks, setMatchPicks] = useState<Record<number, MatchPick>>(() => {
    const o: Record<number, MatchPick> = {};
    props.initialMatchPreds.forEach((p) => {
      o[p.match_id] = {
        pick: p.pick,
        ph: p.pred_home_score?.toString() ?? "",
        pa: p.pred_away_score?.toString() ?? "",
      };
    });
    return o;
  });

  const [advancement, setAdvancement] = useState<Record<string, GroupRank>>(() => {
    const o: Record<string, GroupRank> = {};
    GROUP_LETTERS.forEach((l) => (o[l] = { first: null, second: null, third: null }));
    props.initialAdvancement.forEach((a) => {
      o[a.group_letter] = {
        first: a.first_team_id,
        second: a.second_team_id,
        third: a.third_team_id,
      };
    });
    return o;
  });

  const [thirds, setThirds] = useState<number[]>(
    props.initialThirds.map((t) => t.team_id),
  );

  const [bracketPicks, setBracketPicks] = useState<BracketPicks>(() => {
    const o: BracketPicks = {};
    props.initialBracket.forEach((b) => {
      (o[b.round] ??= {})[b.slot] = b.team_id;
    });
    return o;
  });

  // True once the user hand-edits the advancement step; we then stop auto-deriving
  // it from group picks (so we don't clobber their manual seeding). Returning users
  // with saved advancement start as "manual" too.
  const [manualAdv, setManualAdv] = useState(props.initialAdvancement.length > 0);

  const [step, setStep] = useState<Step>("group");
  const [saving, startSave] = useTransition();
  const [, startReopen] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // ── Derived bracket inputs ────────────────────────────────────────────
  const adv: Advancement = useMemo(() => {
    const a: Advancement = {};
    GROUP_LETTERS.forEach((l) => {
      a[l] = { first: advancement[l]?.first ?? null, second: advancement[l]?.second ?? null };
    });
    return a;
  }, [advancement]);

  // ── Handlers (cascade-clean the bracket on upstream change) ───────────
  function reflowBracket(nextAdv: Advancement, nextThirds: number[], picks: BracketPicks) {
    return sanitizePicks(nextAdv, nextThirds, picks);
  }

  // Re-derive advancement + thirds from a set of group picks, then cascade-clean
  // the bracket (resetting any elimination game whose teams are no longer valid).
  const reDerive = (picks: Record<number, MatchPick>) => {
    const { byGroup, bestThirds } = standingsFromPicks(props.groupMatches, picks);
    const nextRanks: Record<string, GroupRank> = {};
    const nextAdv: Advancement = {};
    GROUP_LETTERS.forEach((l) => {
      const [a, b, c] = byGroup[l] ?? [];
      nextRanks[l] = { first: a ?? null, second: b ?? null, third: c ?? null };
      nextAdv[l] = { first: a ?? null, second: b ?? null };
    });
    setAdvancement(nextRanks);
    setThirds(bestThirds);
    setBracketPicks((bp) => reflowBracket(nextAdv, bestThirds, bp));
  };

  const onMatchChange = (matchId: number, v: MatchPick) => {
    const nextPicks = { ...matchPicks, [matchId]: v };
    setMatchPicks(nextPicks);
    // While the user hasn't hand-edited "who advances", keep the seeds (and any
    // affected bracket games) in sync with the group picks automatically.
    if (!manualAdv) reDerive(nextPicks);
  };

  const onAdvChange = (letter: string, rank: GroupRank) => {
    setManualAdv(true);
    setAdvancement((s) => {
      const next = { ...s, [letter]: rank };
      const nextAdv: Advancement = {};
      GROUP_LETTERS.forEach((l) => {
        nextAdv[l] = { first: next[l]?.first ?? null, second: next[l]?.second ?? null };
      });
      // Drop any selected third no longer matching this group's 3rd place.
      const validThirds = thirds.filter((t) =>
        GROUP_LETTERS.some((l) => next[l]?.third === t),
      );
      setThirds(validThirds);
      setBracketPicks((bp) => reflowBracket(nextAdv, validThirds, bp));
      return next;
    });
  };

  const onToggleThird = (teamId: number) => {
    setManualAdv(true);
    setThirds((s) => {
      const next = s.includes(teamId)
        ? s.filter((t) => t !== teamId)
        : s.length >= 8
          ? s
          : [...s, teamId];
      setBracketPicks((bp) => reflowBracket(adv, next, bp));
      return next;
    });
  };

  const onPick = (round: Round, slot: number, teamId: number) => {
    setBracketPicks((bp) => {
      const next: BracketPicks = { ...bp, [round]: { ...bp[round], [slot]: teamId } };
      return reflowBracket(adv, thirds, next);
    });
  };

  // "Re-fill from my group picks" — re-derive everything and resume auto-sync,
  // resetting any now-invalid bracket games.
  const fillFromGroupPicks = () => {
    setManualAdv(false);
    reDerive(matchPicks);
  };

  // Navigate to a step; make sure "who advances" is seeded before it's shown.
  const goToStep = (next: Step) => {
    if (next === "advance" && !readOnly && !manualAdv) {
      const hasGroupPicks = Object.values(matchPicks).some((p) => p.pick);
      if (hasGroupPicks) reDerive(matchPicks);
    }
    setStep(next);
  };

  // ── Payload + progress ────────────────────────────────────────────────
  function buildPayload(): SavePayload {
    const matches = Object.entries(matchPicks)
      .filter(([, v]) => v.pick)
      .map(([id, v]) => ({
        match_id: Number(id),
        pick: v.pick!,
        pred_home_score: v.ph === "" ? null : Number(v.ph),
        pred_away_score: v.pa === "" ? null : Number(v.pa),
      }));
    const advRows = GROUP_LETTERS.filter(
      (l) => advancement[l]?.first && advancement[l]?.second,
    ).map((l) => ({
      group_letter: l,
      first_team_id: advancement[l].first!,
      second_team_id: advancement[l].second!,
      third_team_id: advancement[l].third,
    }));
    const bracket = ROUNDS.flatMap((round) =>
      Object.entries(bracketPicks[round] ?? {})
        .filter(([, t]) => typeof t === "number")
        .map(([slot, t]) => ({ round, slot: Number(slot), team_id: t as number })),
    );
    return { matches, advancement: advRows, thirds, bracket };
  }

  const groupDone = props.groupMatches.filter((m) => matchPicks[m.id]?.pick).length;
  const groupComplete = groupDone === props.groupMatches.length;
  const advDone = advancementComplete(adv) && thirds.length === 8;
  const bracketDone = isBracketComplete(bracketPicks);
  const allComplete = groupComplete && advDone && bracketDone;

  const doSave = () =>
    startSave(async () => {
      setMsg(null);
      const res = await savePredictions(buildPayload());
      setMsg(res.ok ? "Progress saved." : res.error ?? "Save failed.");
    });

  const doSubmit = () =>
    startSave(async () => {
      setMsg(null);
      const res = await submitPredictions(buildPayload());
      if (res.ok) router.refresh();
      else setMsg(res.error ?? "Submit failed.");
    });

  const doReopen = () =>
    startReopen(async () => {
      await unsubmitPredictions();
      router.refresh();
    });

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My predictions</h1>
        <StatusBanner
          locked={props.locked}
          submittedAt={props.submittedAt}
          onReopen={doReopen}
        />
      </div>

      {/* Step tabs */}
      <div className="mb-5 flex gap-2">
        {STEPS.map((s) => {
          const complete =
            s.key === "group" ? groupComplete : s.key === "advance" ? advDone : bracketDone;
          return (
            <button
              key={s.key}
              onClick={() => goToStep(s.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                step === s.key
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label} {complete ? "✓" : ""}
            </button>
          );
        })}
      </div>

      {step === "group" && (
        <GroupStep
          matches={props.groupMatches}
          teamsById={teamsById}
          picks={matchPicks}
          onChange={onMatchChange}
          readOnly={readOnly}
        />
      )}
      {step === "advance" && (
        <AdvanceStep
          teamsById={teamsById}
          advancement={advancement}
          onChange={onAdvChange}
          thirds={thirds}
          onToggleThird={onToggleThird}
          onAutoFill={fillFromGroupPicks}
          readOnly={readOnly}
        />
      )}
      {step === "bracket" && (
        <BracketStep
          teamsById={teamsById}
          advancement={adv}
          thirds={thirds}
          picks={bracketPicks}
          onPick={onPick}
          readOnly={readOnly}
        />
      )}

      {/* Sticky action bar */}
      {!readOnly && (
        <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="text-sm text-[var(--muted)]">
            Group {groupDone}/{props.groupMatches.length} · Advance {advDone ? "✓" : "…"} ·
            Bracket {bracketDone ? "✓" : "…"}
            {msg && <span className="ml-3 text-[var(--accent)]">{msg}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={doSave} disabled={saving} className="btn-ghost">
              {saving ? "Saving…" : "Save progress"}
            </button>
            <button
              onClick={doSubmit}
              disabled={saving || !allComplete}
              className="btn-primary"
              title={allComplete ? "" : "Complete all three steps to submit"}
            >
              Submit my picks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBanner({
  locked,
  submittedAt,
  onReopen,
}: {
  locked: boolean;
  submittedAt: string | null;
  onReopen: () => void;
}) {
  if (locked) {
    return (
      <span className="pill bg-red-500/20 text-red-300">🔒 Predictions locked</span>
    );
  }
  if (submittedAt) {
    return (
      <div className="flex items-center gap-3">
        <span className="pill bg-green-500/20 text-green-300">✓ Submitted</span>
        <button onClick={onReopen} className="text-sm text-[var(--accent)] hover:underline">
          Reopen to edit
        </button>
      </div>
    );
  }
  return <span className="pill bg-yellow-500/20 text-yellow-300">Draft — not submitted</span>;
}
