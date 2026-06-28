const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-06-11" → "Jun 11" (timezone-safe). */
export function fmtDate(d?: string | null): string {
  if (!d) return "";
  const [, m, day] = d.split("-").map(Number);
  if (!m || !day) return "";
  return `${MONTHS[m - 1]} ${day}`;
}

/** Compose a "Jun 11 · 3:00 PM ET · Stadium, City" line from match fields. */
export function fixtureLine(m: {
  match_date?: string | null;
  kickoff?: string | null;
  venue?: string | null;
  city?: string | null;
}): string {
  const when = [fmtDate(m.match_date), m.kickoff].filter(Boolean).join(" · ");
  const where = [m.venue, m.city].filter(Boolean).join(", ");
  return [when, where].filter(Boolean).join(" · ");
}

/**
 * Parse a US-Eastern kickoff label ("3:00 PM ET", "12:00 AM ET") into minutes
 * for chronological sorting within a day. World Cup games start at noon ET, so
 * an AM kickoff is a post-midnight late game and sorts after the PM games.
 * Null/unparseable values sort last.
 */
export function kickoffMinutes(label?: string | null): number {
  if (!label) return Number.MAX_SAFE_INTEGER;
  const m = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const pm = /PM/i.test(m[3]);
  const mins = ((Number(m[1]) % 12) + (pm ? 12 : 0)) * 60 + Number(m[2]);
  return pm ? mins : mins + 24 * 60; // AM = after midnight → sort after PM games
}
