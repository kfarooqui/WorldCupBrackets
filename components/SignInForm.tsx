"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export default function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-lg font-bold">Sign in</h2>
      {state.message ? (
        <p className="text-sm text-[var(--primary)]">{state.message}</p>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" required />
          </div>
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Sending…" : "Email me a sign-in link"}
          </button>
          <p className="text-xs text-[var(--muted)]">
            New here? <Link href="/" className="text-[var(--accent)] hover:underline">Request an account</Link>.
          </p>
        </>
      )}
    </form>
  );
}
