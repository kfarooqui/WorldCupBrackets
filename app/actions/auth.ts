"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type AuthState = { error?: string; message?: string };

/** Public "request access" form. Creates the auth user (via signup metadata)
 * and emails a magic link. The DB trigger creates a pending profile. */
export async function requestAccess(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!first_name || !last_name || !email) {
    return { error: "First name, last name and email are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${SITE}/auth/callback`,
      data: { first_name, last_name, phone },
    },
  });

  if (error) return { error: error.message };
  return {
    message:
      "Request sent! Check your email for a sign-in link. Your account is pending approval.",
  };
}

/** Existing-user magic-link sign in. */
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${SITE}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  return { message: "Check your email for a sign-in link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
