import Link from "next/link";
import { getProfile } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

export default async function Nav() {
  const profile = await getProfile();

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="text-xl">🏆</span>
          <span className="hidden sm:inline">World Cup 2026 Pool</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/how-it-works" className="hover:text-[var(--accent)]">
            How it works
          </Link>
          {profile?.status === "approved" && (
            <>
              <Link href="/predict" className="hover:text-[var(--accent)]">
                My Picks
              </Link>
              <Link href="/leaderboard" className="hover:text-[var(--accent)]">
                Leaderboard
              </Link>
              <Link href="/picks/everyone" className="hover:text-[var(--accent)]">
                Everyone&apos;s Picks
              </Link>
            </>
          )}
          {profile?.role === "admin" && (
            <Link href="/admin" className="text-[var(--accent)] hover:underline">
              Admin
            </Link>
          )}
          {profile ? (
            <SignOutButton />
          ) : (
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
