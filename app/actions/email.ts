"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendMatchDayDigest, sendCustomEmail } from "@/lib/email";

/** Admin-triggered: email the batched match-day digest to all participants. */
export async function sendDigest() {
  await requireAdmin();
  const result = await sendMatchDayDigest();
  revalidatePath("/admin/results");
  revalidatePath("/admin");
  return result;
}

export type BroadcastState = { error?: string; message?: string };

/** Admin-triggered: send a custom email to everyone registered (or approved). */
export async function sendBroadcast(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  await requireAdmin();
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("message") ?? "");
  const audience =
    String(formData.get("audience") ?? "all") === "approved" ? "approved" : "all";

  const r = await sendCustomEmail({ subject, body, audience });
  if (r.error) return { error: r.error };
  return {
    message: `Sent to ${r.sent} of ${r.total} ${
      audience === "approved" ? "approved" : "registered"
    } user(s).`,
  };
}
