"use client";

import { useActionState } from "react";
import { requestAccess, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export default function RequestAccessForm() {
  const [state, action, pending] = useActionState(requestAccess, initial);

  if (state.message) {
    return (
      <div className="card border-[var(--primary)]">
        <p className="text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-lg font-bold">Request an account</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="first_name">First name</label>
          <input id="first_name" name="first_name" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="last_name">Last name</label>
          <input id="last_name" name="last_name" className="input" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone number</label>
        <input id="phone" name="phone" type="tel" className="input" placeholder="+1 555 123 4567" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Sending…" : "Request access"}
      </button>
      <p className="text-xs text-[var(--muted)]">
        We&apos;ll email you a sign-in link. The pool organizer approves new accounts before you can submit picks.
      </p>
    </form>
  );
}
