import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Lightweight health check: confirms the server can reach Supabase. */
export async function GET() {
  const env = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  };
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from("teams")
      .select("*", { count: "exact", head: true });
    if (error) return NextResponse.json({ ok: false, env, db: error.message });
    return NextResponse.json({ ok: true, env, teams: count });
  } catch (e) {
    return NextResponse.json({ ok: false, env, error: (e as Error).message });
  }
}
