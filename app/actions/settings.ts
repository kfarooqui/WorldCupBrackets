"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateSettings(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const lockLocal = String(formData.get("lock_at") ?? "");
  const tournament_name = String(formData.get("tournament_name") ?? "").trim();

  const db = createAdminClient();
  const update: Record<string, unknown> = {};
  if (lockLocal) update.lock_at = new Date(lockLocal).toISOString();
  if (tournament_name) update.tournament_name = tournament_name;

  const { error } = await db.from("app_settings").update(update).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { message: "Settings saved." };
}
