"use client";

import { signOut } from "@/app/actions/auth";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        Sign out
      </button>
    </form>
  );
}
