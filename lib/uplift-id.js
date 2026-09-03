// What an Uplift ID is, in one place.
//
// An Uplift ID is a founder's or mentor's portal password (portal-auth.js), so
// the question "is this string a live Uplift ID?" is a security question, and
// every reader of the Uplift ID column has to answer it the same way. Before
// this module each one guessed: a truthy cell was good enough for the login
// check, the acceptance-email send, and the admin display alike, which meant
// any stray text typed into that column became somebody's password.
//
// The format is UF26 followed by the issue number, in approval order across
// founders and mentors as one sequence: UF261, UF262, ... UF2679. Assigned by
// fall-decide.js, which owns the rule that an ID names exactly one person for
// good and one person carries exactly one ID.

export const ID_PREFIX = "UF26";

// Deliberately strict and anchored. Anything else in that column is not an ID:
// not a login, not something to email anyone, not something to show as a
// person's ID. Retired markers fail this on purpose.
//
// No leading zero, so each issue number has exactly one spelling. UF2604 and
// UF264 would otherwise both read as number 4, which is two IDs by string
// compare (what the login does) and one ID by number (what the uniqueness
// check does). Numbering starts at 1, so UF260 is not an ID either.
const ID_RE = /^UF26[1-9]\d*$/;

export function isUpliftId(v) {
  return typeof v === "string" && ID_RE.test(v.trim());
}

// The issue number, or null if this is not an ID. Used for the high-water mark
// that keeps a number from ever being handed out twice.
export function upliftIdNum(v) {
  if (!isUpliftId(v)) return null;
  const n = parseInt(v.trim().slice(ID_PREFIX.length), 10);
  return Number.isFinite(n) ? n : null;
}

// Retiring an ID.
//
// An ID that was issued and should no longer be anybody's cannot simply be
// blanked out. The decision tabs are append-only and a blank cell says
// "never had one", which would let the number be issued again to someone else
// while the original holder may still have it in an inbox. So a retirement is
// written as its own marker, which keeps the number visibly spent in the sheet
// while failing isUpliftId() everywhere it is read.
export const RETIRED_PREFIX = "RETIRED-";

export function retireMarker(id) {
  if (!isUpliftId(id)) throw new Error(`Not an Uplift ID, cannot retire: ${id}`);
  return `${RETIRED_PREFIX}${id.trim()}`;
}

export function isRetiredMarker(v) {
  return typeof v === "string" && v.trim().startsWith(RETIRED_PREFIX);
}

// The number a retirement marker spent, so it stays reserved even if the row
// that originally issued it is ever edited away.
export function retiredNum(v) {
  if (!isRetiredMarker(v)) return null;
  return upliftIdNum(v.trim().slice(RETIRED_PREFIX.length));
}
