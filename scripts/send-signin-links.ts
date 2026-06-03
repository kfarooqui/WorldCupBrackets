/**
 * Re-send Supabase magic "sign-in link" emails to approved users.
 *
 * Dry run (default) — just prints who WOULD get an email:
 *   npm run send-signin-links
 *
 * Actually send:
 *   npm run send-signin-links -- --send
 *
 * Target specific people instead of the auto-detected set:
 *   npm run send-signin-links -- a@x.com b@y.com --send
 *
 * With no emails listed, it targets approved users who have NEVER signed in
 * (auth last_sign_in_at is null) — i.e. those who likely never got/used a link.
 *
 * The email itself is sent by Supabase Auth using the SMTP you configured in
 * the Supabase dashboard (your Gmail). Mind Supabase's email rate limit
 * (Authentication → Rate Limits) and Gmail's ~500/day cap.
 *
 * Safe to delete after the backfill.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (!url || !serviceKey || !anonKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const send = argv.includes("--send");
const explicit = argv.filter((a) => a.includes("@")).map((e) => e.toLowerCase());
const DELAY_MS = Number(process.env.SIGNIN_DELAY_MS ?? 2000);

// Service-role client for reading profiles + auth users (bypasses RLS).
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// Anon client to trigger the magic-link send, mirroring the real app flow.
const pub = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms: number) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

async function approvedEmails(): Promise<Set<string>> {
  const { data, error } = await admin
    .from("profiles")
    .select("email")
    .eq("status", "approved");
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((p) => (p.email ?? "").toLowerCase())
      .filter(Boolean),
  );
}

/** Approved users whose auth account has never recorded a sign-in. */
async function neverSignedIn(approved: Set<string>): Promise<string[]> {
  const out: string[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const u of data.users) {
      const email = (u.email ?? "").toLowerCase();
      if (email && approved.has(email) && !u.last_sign_in_at) out.push(email);
    }
    if (data.users.length < perPage) break;
    page++;
  }
  return out;
}

async function main() {
  const approved = await approvedEmails();

  let targets: string[];
  if (explicit.length) {
    const notApproved = explicit.filter((e) => !approved.has(e));
    if (notApproved.length) {
      console.warn(`⚠ Skipping (not approved): ${notApproved.join(", ")}`);
    }
    targets = explicit.filter((e) => approved.has(e));
  } else {
    targets = await neverSignedIn(approved);
  }

  if (!targets.length) {
    console.log("No matching recipients. Nothing to do.");
    return;
  }

  console.log(
    `${targets.length} recipient(s)${explicit.length ? "" : " (approved + never signed in)"}:`,
  );
  targets.forEach((e) => console.log(`  - ${e}`));

  if (!send) {
    console.log("\nDRY RUN — no emails sent. Re-run with --send to actually send.");
    return;
  }

  console.log(`\nSending (≈${DELAY_MS}ms apart to respect rate limits)…`);
  let ok = 0;
  for (const email of targets) {
    const { error } = await pub.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE}/auth/callback` },
    });
    if (error) {
      console.error(`  ✗ ${email}: ${error.message}`);
    } else {
      ok++;
      console.log(`  ✓ ${email}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`\nDone. Sent ${ok}/${targets.length}.`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
