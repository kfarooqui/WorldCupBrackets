import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
};

/** Map of user id -> last_sign_in_at, pulled from Supabase auth (authoritative). */
async function lastSignInById(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) break;
    for (const u of data.users) map.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < perPage) break;
    page++;
  }
  return map;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function PlayersPage() {
  const admin = createAdminClient();

  const [{ data: profileData }, { data: mpData }, { data: subData }, lastSignIn] =
    await Promise.all([
      admin.from("profiles").select("*").order("created_at", { ascending: false }),
      admin.from("match_predictions").select("user_id"),
      admin.from("prediction_submissions").select("user_id"),
      lastSignInById(admin),
    ]);

  const profiles = (profileData as Profile[]) ?? [];

  // Count group-stage picks per user, and which users have formally submitted.
  const picksByUser = new Map<string, number>();
  for (const row of mpData ?? []) {
    picksByUser.set(row.user_id, (picksByUser.get(row.user_id) ?? 0) + 1);
  }
  const submitted = new Set((subData ?? []).map((s) => s.user_id));

  const signedInCount = profiles.filter(
    (p) => lastSignIn.get(p.id) || (p.sign_in_count ?? 0) > 0,
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Players</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {signedInCount} of {profiles.length} have signed in
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Logins</th>
              <th className="py-2 pr-4">Last login</th>
              <th className="py-2 pr-4">Picks</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const last = lastSignIn.get(p.id);
              const count = p.sign_in_count ?? 0;
              const hasSignedIn = Boolean(last) || count > 0;
              const picks = picksByUser.get(p.id) ?? 0;
              const didSubmit = submitted.has(p.id);
              return (
                <tr key={p.id} className="border-b border-[var(--border)]/50">
                  <td className="py-2 pr-4 font-medium">
                    {p.first_name} {p.last_name}
                    {p.role === "admin" && (
                      <span className="ml-2 pill bg-[var(--accent)]/20 text-[var(--accent)]">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{p.email}</td>
                  <td className="py-2 pr-4">
                    <span className={`pill ${STATUS_STYLE[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {count > 0 ? (
                      <span className="font-medium">{count}</span>
                    ) : hasSignedIn ? (
                      <span className="text-[var(--muted)]" title="signed in (count not yet tracked)">
                        ✓
                      </span>
                    ) : (
                      <span className="pill bg-[var(--surface-2)] text-[var(--muted)]">
                        never
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{fmtDate(last)}</td>
                  <td className="py-2 pr-4">
                    {didSubmit ? (
                      <span className="pill bg-green-500/20 text-green-300">
                        submitted
                      </span>
                    ) : picks > 0 ? (
                      <span className="text-[var(--muted)]">
                        {picks} pick{picks === 1 ? "" : "s"} (draft)
                      </span>
                    ) : (
                      <span className="pill bg-[var(--surface-2)] text-[var(--muted)]">
                        none
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--muted)]">
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Login counts are tracked from the app and reflect sign-ins since the
        feature was enabled; “last login” comes from Supabase auth and is
        complete.
      </p>
    </div>
  );
}
