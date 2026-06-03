"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApprovalEmail } from "@/lib/email";
import type { Profile } from "@/lib/types";

/** Approve or reject a pending account. Admin-only. */
export async function setUserStatus(
  userId: string,
  status: "approved" | "rejected" | "pending",
) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;

  if (status === "approved" && data) {
    await sendApprovalEmail(data as Profile);
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}
