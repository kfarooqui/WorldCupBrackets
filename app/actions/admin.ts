"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Approve or reject a pending account. Admin-only. */
export async function setUserStatus(
  userId: string,
  status: "approved" | "rejected" | "pending",
) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", userId);
  if (error) throw error;
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}
