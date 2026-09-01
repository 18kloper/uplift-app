// The fall roster, shared by the portal save path and both admin endpoints.
// Everyone here has a portal at /fall/<slug> that accepts their Uplift ID as
// its password.
//
// The real founders come from lib/fall-cohort.js, which is generated from the
// accepted applications (node scripts/build-fall-cohort.mjs) — that is the
// application ingest this file used to say it was waiting for. Re-run the
// generator when founders are accepted and this list grows with it.
//
// Slugs only, from the generated companion module: this file is imported by
// the portal page component, so importing the records themselves would ship
// all 36 of them to the browser.
import { FALL_FOUNDER_SLUGS } from "./fall-slugs";

// The three walkthrough portals. Not real founders: they are excluded from
// funnel counts, cohort directories, and the mentor-facing profile pages, and
// they fall back to their slug as an access code because no Uplift ID is
// issued to them. Everything downstream that means "test account" should test
// against this list, never against "is in the roster" — every real founder is
// in the roster now too.
export const TEST_SLUGS = ["kennedy", "hana", "mj"];

export const FALL_SLUGS = [...TEST_SLUGS, ...FALL_FOUNDER_SLUGS];

// One tab for every founder's portal inputs (pulse, Deep Work, wins, quiz,
// check-offs). Replaces the summer pattern of one sheet tab per person, which
// ballooned to 70+ tabs and made every bulk read a fan-out.
export const FALL_RESPONSES_TAB = "FallResponses";
export const FALL_RESPONSES_HEADERS = ["Slug", "Week", "Field Key", "Question", "Value", "Updated At"];

// Single source of truth for pulse-check open/close windows. Used by both
// the portal (pages/fall/[mentee].js, decides whether this week's pulse
// widget is active) and the admin dashboard (fall-overview.js, computes
// response-rate stats) — previously two separately hardcoded copies that
// had to be kept in sync by hand, the same failure mode that silently broke
// the pulse widget all of Summer. Edit this one array only.
// Pulse checks open and close on Fridays: each week's pulse opens the prior
// Friday and closes that week's Friday night.
export const PULSE_WINDOWS = [
  { week: 2, start: new Date(2026, 8, 11), end: new Date(2026, 8, 18, 23, 59, 59) },
  { week: 3, start: new Date(2026, 8, 18), end: new Date(2026, 8, 25, 23, 59, 59) },
  { week: 4, start: new Date(2026, 8, 25), end: new Date(2026, 9, 2, 23, 59, 59) },
  { week: 5, start: new Date(2026, 9, 2), end: new Date(2026, 9, 9, 23, 59, 59) },
  { week: 6, start: new Date(2026, 9, 9), end: new Date(2026, 9, 23, 23, 59, 59) },
  { week: 7, start: new Date(2026, 9, 23), end: new Date(2026, 9, 30, 23, 59, 59) },
  { week: 8, start: new Date(2026, 9, 30), end: new Date(2026, 10, 6, 23, 59, 59) },
];
