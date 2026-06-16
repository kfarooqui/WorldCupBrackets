import { NextResponse, type NextRequest } from "next/server";
import { sendMorningBriefing } from "@/lib/email";

// Two batched Claude calls (recaps + predictions, ~9s) plus SMTP sends, so give
// the serverless function headroom above the default ceiling.
export const maxDuration = 30;

/**
 * Daily morning briefing (Vercel Cron, 08:00 ET). Recaps yesterday's results
 * and "predicts" today's fixtures for every approved participant.
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendMorningBriefing();
  return NextResponse.json(result);
}
