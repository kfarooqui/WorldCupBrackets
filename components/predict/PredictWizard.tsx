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
import { GROUP_LETTERS, teamIdsInGroup } from "@/lib/worldcup-data";
import {
  standingsFromPicks,
  computeStats,
  groupOrderConsistent,
} from "@/lib/predict-standings";
import type { PickResults, ScoreBreakdown } from "@/lib/score-engine";

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
  results: PickResults;
  breakdown: ScoreBreakdown;
  hasResults: boolean;
}) {
  const router = useRouter();
  const teamsById = useMemo(
    () => new Map(props.teams.map((t) => [t.id, t])),
    [props.teams],
  );

  const readOnly = props.locked || !!props.submittedAt;

  // Real results (as Sets) so the steps can mark each pick right/wrong + points.
  const reachedSets = useMemo(
    () => ({
      r32: new Set(props.results.reached.r32),
      r16: new Set(props.results.reached.r16),
      qf: new Set(props.results.reached.qf),
      sf: new Set(props.results.reached.sf),
      final: new Set(props.results.reached.final),
    }),
    [props.results],
  );

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

  // Groups whose chosen finishing order contradicts the group-match picks
  // (a team seeded above another that strictly outscores it). Ties are allowed.
  const stats = useMemo(
    () => computeStats(props.groupMatches, matchPicks),
    [props.groupMatches, matchPicks],
  );
  const inconsistentGroups = useMemo(() => {
    return GROUP_LETTERS.filter((l) => {
      const r = advancement[l];
      if (!r?.first || !r?.second || !r?.third) return false;
      const ids = teamIdsInGroup(l);
      const fourth = ids.find((id) => id !== r.first && id !== r.second && id !== r.third) ?? null;
      return !groupOrderConsistent(stats, [r.first, r.second, r.third, fourth]);
    });
  }, [advancement, stats]);
  const isConsistent = inconsistentGroups.length === 0;

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
      if (!res.ok) setMsg(res.error ?? "Save failed.");
      else if (!isConsistent)
        setMsg("Saved — but your bracket doesn't match your group picks yet (see warning above). You can't submit until it does.");
      else setMsg("Progress saved.");
    });

  const doSubmit = () =>
    startSave(async () => {
      if (!isConsistent) return; // guarded by the disabled button too
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

      {/* Your score so far — appears once results start coming in */}
      {props.hasResults && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Your score so far
            </div>
            <div className="text-2xl font-extrabold text-[var(--accent)]">
              {props.breakdown.total} pts
            </div>
          </div>
          <div className="flex gap-4 text-sm text-[var(--muted)]">
            <span>
              Group <strong className="text-[var(--foreground)]">{props.breakdown.group}</strong>
            </span>
            <span>
              Bracket <strong className="text-[var(--foreground)]">{props.breakdown.reach}</strong>
            </span>
            <span>
              🏆 <strong className="text-[var(--foreground)]">{props.breakdown.champion}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Inconsistency warning — group picks no longer match the seeds/bracket */}
      {!readOnly && !isConsistent && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-500/60 bg-yellow-500/10 p-4">
          <div className="text-sm">
            <p className="font-bold text-yellow-300">
              ⚠️ Your bracket doesn&apos;t match your group picks
            </p>
            <p className="mt-1 text-[var(--muted)]">
              The finishing order for {inconsistentGroups.length === 1 ? "Group" : "Groups"}{" "}
              <strong>{inconsistentGroups.join(", ")}</strong> contradicts your group-match
              results. You can save, but you can&apos;t submit until it&apos;s fixed.
            </p>
          </div>
          <button onClick={fillFromGroupPicks} className="btn-primary shrink-0">
            ⚡ Re-fill from my group picks
          </button>
        </div>
      )}

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
          groupScores={props.results.groupScores}
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
          reached={reachedSets}
          champion={props.results.champion}
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
              disabled={saving || !allComplete || !isConsistent}
              className="btn-primary"
              title={
                !isConsistent
                  ? "Fix the group/bracket mismatch above before submitting"
                  : allComplete
                    ? ""
                    : "Complete all three steps to submit"
              }
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
