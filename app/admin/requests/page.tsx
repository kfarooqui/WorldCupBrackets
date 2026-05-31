import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import UserStatusButtons from "@/components/UserStatusButtons";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
};

export default async function RequestsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const profiles = (data as Profile[]) ?? [];
  const pendingCount = profiles.filter((p) => p.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Account requests</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {pendingCount} pending · {profiles.length} total
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]/50">
                <td className="py-2 pr-4 font-medium">
                  {p.first_name} {p.last_name}
                  {p.role === "admin" && (
                    <span className="ml-2 pill bg-[var(--accent)]/20 text-[var(--accent)]">admin</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">{p.email}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{p.phone || "—"}</td>
                <td className="py-2 pr-4">
                  <span className={`pill ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                </td>
                <td className="py-2 pr-4">
                  {p.role !== "admin" && (
                    <UserStatusButtons userId={p.id} status={p.status} />
                  )}
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--muted)]">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
