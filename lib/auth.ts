import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The logged-in user's profile, or null if signed out / no profile yet. */
export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return (data as Profile) ?? null;
  } catch {
    // Supabase not configured / unreachable — treat as signed out.
    return null;
  }
}

/** Require an approved user. Redirects to /login or /pending otherwise. */
export async function requireApproved(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending");
  return profile;
}

/** Require an admin. Redirects away if not. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");
  return profile;
}

/** Whether predictions are globally locked (deadline passed). */
export async function predictionsLocked(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("lock_at")
      .eq("id", 1)
      .single();
    if (!data?.lock_at) return false;
    return new Date(data.lock_at).getTime() <= Date.now();
  } catch {
    return false;
  }
}
