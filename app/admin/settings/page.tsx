import { createAdminClient } from "@/lib/supabase/admin";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = createAdminClient();
  const { data } = await db
    .from("app_settings")
    .select("lock_at, tournament_name")
    .eq("id", 1)
    .single();

  // ISO → "YYYY-MM-DDTHH:mm" for datetime-local input.
  const lockAtLocal = data?.lock_at ? new Date(data.lock_at).toISOString().slice(0, 16) : "";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <SettingsForm
        lockAtLocal={lockAtLocal}
        tournamentName={data?.tournament_name ?? "FIFA World Cup 2026"}
      />
    </div>
  );
}
