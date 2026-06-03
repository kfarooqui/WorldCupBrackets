import { createAdminClient } from "@/lib/supabase/admin";
import BroadcastForm from "@/components/admin/BroadcastForm";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const admin = createAdminClient();
  const [{ count: totalCount }, { count: approvedCount }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Send an email</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Compose a custom message to everyone who has registered, or just approved
        players. Sent from your pool address via Gmail.
      </p>

      <div className="mt-6">
        <BroadcastForm
          totalCount={totalCount ?? 0}
          approvedCount={approvedCount ?? 0}
        />
      </div>
    </div>
  );
}
