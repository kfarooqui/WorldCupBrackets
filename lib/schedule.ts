// Official 2026 FIFA World Cup schedule (dates, kickoff in US Eastern Time, venues).
// Group fixtures use FIFA 3-letter codes. Knockout fixtures are keyed by bracket
// slot (our internal order), with teams resolved at tournament time.

export type GroupFixture = {
  match: number;
  home: string;
  away: string;
  date: string; // YYYY-MM-DD
  time: string; // local kickoff, US Eastern
  venue: string;
  city: string;
};

export const GROUP_SCHEDULE: GroupFixture[] = [
  { match: 1, home: "MEX", away: "RSA", date: "2026-06-11", time: "3:00 PM ET", venue: "Estadio Azteca", city: "Mexico City" },
  { match: 2, home: "KOR", away: "CZE", date: "2026-06-11", time: "10:00 PM ET", venue: "Estadio Akron", city: "Guadalajara" },
  { match: 3, home: "CAN", away: "BIH", date: "2026-06-12", time: "3:00 PM ET", venue: "BMO Field", city: "Toronto" },
  { match: 4, home: "USA", away: "PAR", date: "2026-06-12", time: "9:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" },
  { match: 5, home: "QAT", away: "SUI", date: "2026-06-13", time: "3:00 PM ET", venue: "Levi's Stadium", city: "Santa Clara" },
  { match: 6, home: "BRA", away: "MAR", date: "2026-06-13", time: "6:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" },
  { match: 7, home: "HAI", away: "SCO", date: "2026-06-13", time: "9:00 PM ET", venue: "Gillette Stadium", city: "Foxborough" },
  { match: 8, home: "AUS", away: "TUR", date: "2026-06-14", time: "12:00 AM ET", venue: "BC Place", city: "Vancouver" },
  { match: 9, home: "GER", away: "CUW", date: "2026-06-14", time: "1:00 PM ET", venue: "NRG Stadium", city: "Houston" },
  { match: 10, home: "NED", away: "JPN", date: "2026-06-14", time: "4:00 PM ET", venue: "AT&T Stadium", city: "Arlington" },
  { match: 11, home: "CIV", away: "ECU", date: "2026-06-14", time: "7:00 PM ET", venue: "Lincoln Financial Field", city: "Philadelphia" },
  { match: 12, home: "SWE", away: "TUN", date: "2026-06-14", time: "10:00 PM ET", venue: "Estadio BBVA", city: "Monterrey" },
  { match: 13, home: "ESP", away: "CPV", date: "2026-06-15", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { match: 14, home: "BEL", away: "EGY", date: "2026-06-15", time: "3:00 PM ET", venue: "Lumen Field", city: "Seattle" },
  { match: 15, home: "KSA", away: "URU", date: "2026-06-15", time: "6:00 PM ET", venue: "Hard Rock Stadium", city: "Miami Gardens" },
  { match: 16, home: "IRN", away: "NZL", date: "2026-06-15", time: "9:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" },
  { match: 17, home: "FRA", away: "SEN", date: "2026-06-16", time: "3:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" },
  { match: 18, home: "IRQ", away: "NOR", date: "2026-06-16", time: "6:00 PM ET", venue: "Gillette Stadium", city: "Foxborough" },
  { match: 19, home: "ARG", away: "ALG", date: "2026-06-16", time: "9:00 PM ET", venue: "Arrowhead Stadium", city: "Kansas City" },
  { match: 20, home: "AUT", away: "JOR", date: "2026-06-17", time: "12:00 AM ET", venue: "Levi's Stadium", city: "Santa Clara" },
  { match: 21, home: "POR", away: "COD", date: "2026-06-17", time: "1:00 PM ET", venue: "NRG Stadium", city: "Houston" },
  { match: 22, home: "ENG", away: "CRO", date: "2026-06-17", time: "4:00 PM ET", venue: "AT&T Stadium", city: "Arlington" },
  { match: 23, home: "GHA", away: "PAN", date: "2026-06-17", time: "7:00 PM ET", venue: "BMO Field", city: "Toronto" },
  { match: 24, home: "UZB", away: "COL", date: "2026-06-17", time: "10:00 PM ET", venue: "Estadio Akron", city: "Guadalajara" },
  { match: 25, home: "CZE", away: "RSA", date: "2026-06-18", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { match: 26, home: "SUI", away: "BIH", date: "2026-06-18", time: "3:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" },
  { match: 27, home: "CAN", away: "QAT", date: "2026-06-18", time: "6:00 PM ET", venue: "BC Place", city: "Vancouver" },
  { match: 28, home: "MEX", away: "KOR", date: "2026-06-18", time: "9:00 PM ET", venue: "Estadio Akron", city: "Guadalajara" },
  { match: 29, home: "USA", away: "AUS", date: "2026-06-19", time: "3:00 PM ET", venue: "Lumen Field", city: "Seattle" },
  { match: 30, home: "SCO", away: "MAR", date: "2026-06-19", time: "6:00 PM ET", venue: "Gillette Stadium", city: "Foxborough" },
  { match: 31, home: "BRA", away: "HAI", date: "2026-06-19", time: "8:30 PM ET", venue: "Lincoln Financial Field", city: "Philadelphia" },
  { match: 32, home: "TUR", away: "PAR", date: "2026-06-19", time: "11:00 PM ET", venue: "Levi's Stadium", city: "Santa Clara" },
  { match: 33, home: "NED", away: "SWE", date: "2026-06-20", time: "1:00 PM ET", venue: "NRG Stadium", city: "Houston" },
  { match: 34, home: "GER", away: "CIV", date: "2026-06-20", time: "4:00 PM ET", venue: "BMO Field", city: "Toronto" },
  { match: 35, home: "ECU", away: "CUW", date: "2026-06-20", time: "8:00 PM ET", venue: "Arrowhead Stadium", city: "Kansas City" },
  { match: 36, home: "TUN", away: "JPN", date: "2026-06-21", time: "12:00 AM ET", venue: "Estadio BBVA", city: "Monterrey" },
  { match: 37, home: "ESP", away: "KSA", date: "2026-06-21", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { match: 38, home: "BEL", away: "IRN", date: "2026-06-21", time: "3:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" },
  { match: 39, home: "URU", away: "CPV", date: "2026-06-21", time: "6:00 PM ET", venue: "Hard Rock Stadium", city: "Miami Gardens" },
  { match: 40, home: "NZL", away: "EGY", date: "2026-06-21", time: "9:00 PM ET", venue: "BC Place", city: "Vancouver" },
  { match: 41, home: "ARG", away: "AUT", date: "2026-06-22", time: "1:00 PM ET", venue: "AT&T Stadium", city: "Arlington" },
  { match: 42, home: "FRA", away: "IRQ", date: "2026-06-22", time: "5:00 PM ET", venue: "Lincoln Financial Field", city: "Philadelphia" },
  { match: 43, home: "NOR", away: "SEN", date: "2026-06-22", time: "8:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" },
  { match: 44, home: "JOR", away: "ALG", date: "2026-06-22", time: "11:00 PM ET", venue: "Levi's Stadium", city: "Santa Clara" },
  { match: 45, home: "POR", away: "UZB", date: "2026-06-23", time: "1:00 PM ET", venue: "NRG Stadium", city: "Houston" },
  { match: 46, home: "ENG", away: "GHA", date: "2026-06-23", time: "4:00 PM ET", venue: "Gillette Stadium", city: "Foxborough" },
  { match: 47, home: "PAN", away: "CRO", date: "2026-06-23", time: "7:00 PM ET", venue: "BMO Field", city: "Toronto" },
  { match: 48, home: "COL", away: "COD", date: "2026-06-23", time: "10:00 PM ET", venue: "Estadio Akron", city: "Guadalajara" },
  { match: 49, home: "SUI", away: "CAN", date: "2026-06-24", time: "3:00 PM ET", venue: "BC Place", city: "Vancouver" },
  { match: 50, home: "BIH", away: "QAT", date: "2026-06-24", time: "3:00 PM ET", venue: "Lumen Field", city: "Seattle" },
  { match: 51, home: "SCO", away: "BRA", date: "2026-06-24", time: "6:00 PM ET", venue: "Hard Rock Stadium", city: "Miami Gardens" },
  { match: 52, home: "MAR", away: "HAI", date: "2026-06-24", time: "6:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { match: 53, home: "CZE", away: "MEX", date: "2026-06-24", time: "9:00 PM ET", venue: "Estadio Azteca", city: "Mexico City" },
  { match: 54, home: "RSA", away: "KOR", date: "2026-06-24", time: "9:00 PM ET", venue: "Estadio BBVA", city: "Monterrey" },
  { match: 55, home: "CUW", away: "CIV", date: "2026-06-25", time: "4:00 PM ET", venue: "Lincoln Financial Field", city: "Philadelphia" },
  { match: 56, home: "ECU", away: "GER", date: "2026-06-25", time: "4:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" },
  { match: 57, home: "JPN", away: "SWE", date: "2026-06-25", time: "7:00 PM ET", venue: "AT&T Stadium", city: "Arlington" },
  { match: 58, home: "TUN", away: "NED", date: "2026-06-25", time: "7:00 PM ET", venue: "Arrowhead Stadium", city: "Kansas City" },
  { match: 59, home: "TUR", away: "USA", date: "2026-06-25", time: "10:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" },
  { match: 60, home: "PAR", away: "AUS", date: "2026-06-25", time: "10:00 PM ET", venue: "Levi's Stadium", city: "Santa Clara" },
  { match: 61, home: "NOR", away: "FRA", date: "2026-06-26", time: "3:00 PM ET", venue: "Gillette Stadium", city: "Foxborough" },
  { match: 62, home: "SEN", away: "IRQ", date: "2026-06-26", time: "3:00 PM ET", venue: "BMO Field", city: "Toronto" },
  { match: 63, home: "CPV", away: "KSA", date: "2026-06-26", time: "8:00 PM ET", venue: "NRG Stadium", city: "Houston" },
  { match: 64, home: "URU", away: "ESP", date: "2026-06-26", time: "8:00 PM ET", venue: "Estadio Akron", city: "Guadalajara" },
  { match: 65, home: "EGY", away: "IRN", date: "2026-06-26", time: "11:00 PM ET", venue: "Lumen Field", city: "Seattle" },
  { match: 66, home: "NZL", away: "BEL", date: "2026-06-26", time: "11:00 PM ET", venue: "BC Place", city: "Vancouver" },
  { match: 67, home: "PAN", away: "ENG", date: "2026-06-27", time: "5:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" },
  { match: 68, home: "CRO", away: "GHA", date: "2026-06-27", time: "5:00 PM ET", venue: "Lincoln Financial Field", city: "Philadelphia" },
  { match: 69, home: "COL", away: "POR", date: "2026-06-27", time: "7:30 PM ET", venue: "Hard Rock Stadium", city: "Miami Gardens" },
  { match: 70, home: "COD", away: "UZB", date: "2026-06-27", time: "7:30 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { match: 71, home: "ALG", away: "AUT", date: "2026-06-27", time: "10:00 PM ET", venue: "Arrowhead Stadium", city: "Kansas City" },
  { match: 72, home: "JOR", away: "ARG", date: "2026-06-27", time: "10:00 PM ET", venue: "AT&T Stadium", city: "Arlington" },
];

export type KOFixture = { date: string; time: string; venue: string; city: string };

// Indexed by our internal bracket slot order (see lib/bracket.ts FEED map),
// so each fixture lines up with the match a user advances teams into.
export const KO_SCHEDULE: Record<string, KOFixture[]> = {
  r32: [
    { date: "2026-06-28", time: "3:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" }, // 73
    { date: "2026-06-29", time: "4:30 PM ET", venue: "Gillette Stadium", city: "Foxborough" }, // 74
    { date: "2026-06-29", time: "9:00 PM ET", venue: "Estadio BBVA", city: "Monterrey" }, // 75
    { date: "2026-06-29", time: "1:00 PM ET", venue: "NRG Stadium", city: "Houston" }, // 76
    { date: "2026-06-30", time: "5:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" }, // 77
    { date: "2026-06-30", time: "1:00 PM ET", venue: "AT&T Stadium", city: "Arlington" }, // 78
    { date: "2026-06-30", time: "9:00 PM ET", venue: "Estadio Azteca", city: "Mexico City" }, // 79
    { date: "2026-07-01", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" }, // 80
    { date: "2026-07-01", time: "8:00 PM ET", venue: "Levi's Stadium", city: "Santa Clara" }, // 81
    { date: "2026-07-01", time: "4:00 PM ET", venue: "Lumen Field", city: "Seattle" }, // 82
    { date: "2026-07-02", time: "7:00 PM ET", venue: "BMO Field", city: "Toronto" }, // 83
    { date: "2026-07-02", time: "3:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" }, // 84
    { date: "2026-07-02", time: "11:00 PM ET", venue: "BC Place", city: "Vancouver" }, // 85
    { date: "2026-07-03", time: "6:00 PM ET", venue: "Hard Rock Stadium", city: "Miami Gardens" }, // 86
    { date: "2026-07-03", time: "9:30 PM ET", venue: "Arrowhead Stadium", city: "Kansas City" }, // 87
    { date: "2026-07-03", time: "2:00 PM ET", venue: "AT&T Stadium", city: "Arlington" }, // 88
  ],
  r16: [
    { date: "2026-07-04", time: "1:00 PM ET", venue: "NRG Stadium", city: "Houston" }, // slot0 (M90)
    { date: "2026-07-04", time: "5:00 PM ET", venue: "Lincoln Financial Field", city: "Philadelphia" }, // slot1 (M89)
    { date: "2026-07-05", time: "4:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" }, // slot2 (M91)
    { date: "2026-07-05", time: "8:00 PM ET", venue: "Estadio Azteca", city: "Mexico City" }, // slot3 (M92)
    { date: "2026-07-06", time: "3:00 PM ET", venue: "AT&T Stadium", city: "Arlington" }, // slot4 (M93)
    { date: "2026-07-06", time: "8:00 PM ET", venue: "Lumen Field", city: "Seattle" }, // slot5 (M94)
    { date: "2026-07-07", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" }, // slot6 (M95)
    { date: "2026-07-07", time: "4:00 PM ET", venue: "BC Place", city: "Vancouver" }, // slot7 (M96)
  ],
  qf: [
    { date: "2026-07-09", time: "4:00 PM ET", venue: "Gillette Stadium", city: "Foxborough" }, // 97
    { date: "2026-07-10", time: "3:00 PM ET", venue: "SoFi Stadium", city: "Inglewood" }, // 98
    { date: "2026-07-11", time: "5:00 PM ET", venue: "Hard Rock Stadium", city: "Miami Gardens" }, // 99
    { date: "2026-07-11", time: "9:00 PM ET", venue: "Arrowhead Stadium", city: "Kansas City" }, // 100
  ],
  sf: [
    { date: "2026-07-14", time: "3:00 PM ET", venue: "AT&T Stadium", city: "Arlington" }, // 101
    { date: "2026-07-15", time: "3:00 PM ET", venue: "Mercedes-Benz Stadium", city: "Atlanta" }, // 102
  ],
  final: [
    { date: "2026-07-19", time: "3:00 PM ET", venue: "MetLife Stadium", city: "East Rutherford" }, // 104
  ],
};
