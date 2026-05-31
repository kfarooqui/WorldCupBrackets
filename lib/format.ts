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
