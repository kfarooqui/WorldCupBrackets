import {
  assignThirds,
  resolveR32Occupants,
  computeOccupants,
  sanitizePicks,
  isBracketComplete,
  THIRD_SLOT_GROUPS,
  type Advancement,
  type BracketPicks,
  ROUNDS,
  ROUND_SIZE,
} from "../lib/bracket";
import { GROUP_LETTERS, teamIdsInGroup, groupLetterOfTeam } from "../lib/worldcup-data";

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  cond ? pass++ : fail++;
};

// Sample: each group's 1st/2nd/3rd = draw positions 1/2/3.
const adv: Advancement = {};
GROUP_LETTERS.forEach((l) => {
  const ids = teamIdsInGroup(l);
  adv[l] = { first: ids[0], second: ids[1] };
});
// Pick the 3rd-place teams of groups A–H as the 8 qualifiers.
const thirds = GROUP_LETTERS.slice(0, 8).map((l) => teamIdsInGroup(l)[2]);

// 1) Third-place matching is perfect + eligibility-respecting.
const tmap = assignThirds(thirds);
check("third matching fills all 8 slots", tmap.size === 8);
let eligOk = true;
tmap.forEach((teamId, slot) => {
  if (!THIRD_SLOT_GROUPS[slot].includes(groupLetterOfTeam(teamId))) eligOk = false;
});
check("every third assigned to an eligible slot", eligOk);

// 2) R32 has 32 distinct, non-null teams.
const r32 = resolveR32Occupants(adv, thirds);
const flat = r32.flat();
check("R32 has 16 matches", r32.length === 16);
check("all 32 R32 slots filled", flat.every((t) => t !== null));
check("32 distinct teams in R32", new Set(flat).size === 32);

// 3) No two same-group teams meet in the R32.
const sameGroupClash = r32.some(
  ([a, b]) => a && b && groupLetterOfTeam(a) === groupLetterOfTeam(b),
);
check("no same-group clash in R32", !sameGroupClash);

// 4) Advancing the top occupant each round yields a complete, consistent bracket.
let picks: BracketPicks = {};
for (const round of ROUNDS) {
  const occ = computeOccupants(adv, thirds, picks)[round];
  const rp: Record<number, number | null> = {};
  occ.forEach(([top], slot) => (rp[slot] = top));
  picks = { ...picks, [round]: rp };
}
check("bracket complete after picking through", isBracketComplete(picks));
check("exactly one champion (final slot 0)", typeof picks.final?.[0] === "number");
check(
  "champion is the top R32-match-73 team",
  picks.final?.[0] === r32[0][0],
);

// 5) sanitize clears downstream when an upstream pick is removed.
const broken = { ...picks, r32: { ...picks.r32, 0: r32[0][1] } }; // change M73 winner
const sane = sanitizePicks(adv, thirds, broken);
check(
  "changing an R32 winner clears the now-invalid R16 pick",
  sane.r16?.[0] !== picks.r16?.[0] || sane.r16?.[0] == null,
);

// round sizes sanity
check(
  "round sizes 16/8/4/2/1",
  ROUND_SIZE.r32 === 16 && ROUND_SIZE.r16 === 8 && ROUND_SIZE.qf === 4 &&
    ROUND_SIZE.sf === 2 && ROUND_SIZE.final === 1,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
