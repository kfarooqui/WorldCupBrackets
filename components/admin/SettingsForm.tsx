"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/actions/settings";

export default function SettingsForm({
  lockAtLocal,
  tournamentName,
}: {
  lockAtLocal: string;
  tournamentName: string;
}) {
  const [state, action, pending] = useActionState(updateSettings, {} as {
    error?: string;
    message?: string;
  });

  return (
    <form action={action} className="card max-w-lg space-y-4">
      <div>
        <label className="label" htmlFor="tournament_name">Tournament name</label>
        <input id="tournament_name" name="tournament_name" className="input" defaultValue={tournamentName} />
      </div>
      <div>
        <label className="label" htmlFor="lock_at">Predictions lock at</label>
        <input
          id="lock_at"
          name="lock_at"
          type="datetime-local"
          className="input"
          defaultValue={lockAtLocal}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          After this time, no one can edit picks and everyone&apos;s predictions become visible.
        </p>
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.message && <p className="text-sm text-[var(--primary)]">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
