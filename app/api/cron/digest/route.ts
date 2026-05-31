import { NextResponse, type NextRequest } from "next/server";
import { sendMatchDayDigest } from "@/lib/email";

/**
 * Daily batched digest (Vercel Cron). Sends any queued results to participants.
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendMatchDayDigest();
  return NextResponse.json(result);
}
