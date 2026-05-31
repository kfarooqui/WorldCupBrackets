"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendMatchDayDigest } from "@/lib/email";

/** Admin-triggered: email the batched match-day digest to all participants. */
export async function sendDigest() {
  await requireAdmin();
  const result = await sendMatchDayDigest();
  revalidatePath("/admin/results");
  revalidatePath("/admin");
  return result;
}
