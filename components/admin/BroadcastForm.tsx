"use client";

import { useActionState, useState } from "react";
import { sendBroadcast, type BroadcastState } from "@/app/actions/email";

export default function BroadcastForm({
  totalCount,
  approvedCount,
}: {
  totalCount: number;
  approvedCount: number;
}) {
  const [state, action, pending] = useActionState(
    sendBroadcast,
    {} as BroadcastState,
  );
  const [audience, setAudience] = useState<"all" | "approved">("all");

  const recipientCount = audience === "approved" ? approvedCount : totalCount;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            `Send this email to ${recipientCount} ${
              audience === "approved" ? "approved" : "registered"
            } user(s)?`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="card max-w-lg space-y-4"
    >
      <div>
        <label className="label" htmlFor="audience">
          Send to
        </label>
        <select
          id="audience"
          name="audience"
          className="input"
          value={audience}
          onChange={(e) => setAudience(e.target.value as "all" | "approved")}
        >
          <option value="all">All registered ({totalCount})</option>
          <option value="approved">Approved only ({approvedCount})</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="subject">
          Subject
        </label>
        <input id="subject" name="subject" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          className="input min-h-40"
          required
          placeholder="Write your message… line breaks are preserved."
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Plain text — links sent as-is. Each person receives their own copy.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-[var(--primary)]">{state.message}</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Sending…" : `Send to ${recipientCount} user(s)`}
      </button>
    </form>
  );
}
