import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = createAdminClient();
  const [{ count: pending }, { count: approved }, { count: pendingResults }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("pending_results").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Organizer dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/requests" className="card hover:border-[var(--primary)]">
          <div className="text-3xl font-extrabold text-[var(--accent)]">{pending ?? 0}</div>
          <div className="mt-1 font-semibold">Pending requests</div>
          <p className="text-sm text-[var(--muted)]">{approved ?? 0} approved players</p>
        </Link>
        <Link href="/admin/results" className="card hover:border-[var(--primary)]">
          <div className="text-3xl font-extrabold text-[var(--accent)]">{pendingResults ?? 0}</div>
          <div className="mt-1 font-semibold">Results to announce</div>
          <p className="text-sm text-[var(--muted)]">Enter scores & send digests</p>
        </Link>
        <Link href="/admin/settings" className="card hover:border-[var(--primary)]">
          <div className="text-3xl">⚙️</div>
          <div className="mt-1 font-semibold">Settings</div>
          <p className="text-sm text-[var(--muted)]">Lock time & tournament</p>
        </Link>
      </div>
    </div>
  );
}
