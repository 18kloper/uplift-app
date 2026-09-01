// Materialize the fall portal roster from the accepted applications.
//
//   npm run dev                              # in another shell
//   node scripts/build-fall-cohort.mjs       # reads http://localhost:3000/api/admin/fall-people?fresh=1
//   node scripts/build-fall-cohort.mjs http://localhost:54449/api/admin/fall-people?fresh=1
//   node scripts/build-fall-cohort.mjs some/saved-fall-people.json
//
// Writes lib/fall-cohort.js: one portal record per approved, non-test fall
// mentee, in Uplift ID order. Re-run it whenever founders are accepted or
// matched, then commit the diff — new founders append at the end, so the
// diff is readable and existing records stay put.
//
// Parsing deliberately does NOT live here. The script consumes
// /api/admin/fall-people, which is the shared lib/fall-applications.js parse
// layer, so Typeform question wording only ever has to be tracked in one
// place. That does mean this script needs the dev server (or a saved payload
// from it) rather than talking to Typeform itself.

import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "lib/fall-cohort.js");
const OUT_SLUGS = path.join(ROOT, "lib/fall-slugs.js");
const DEFAULT_SOURCE = "http://localhost:3000/api/admin/fall-people?fresh=1";

// Test portals stay hand-written in lib/mentees.js; only real founders are
// generated. Kept in sync with TEST_SLUGS in lib/fall-roster.js.
const TEST_NAMES = ["kennedy loper", "mj durkin", "hana yackanich"];

// ── helpers ──────────────────────────────────────────────────────────────────

// Names arrive exactly as typed into Typeform, which includes all-lowercase
// entries ("ceana santori"). Capitalize only when nothing was capitalized, so
// deliberate casing (JT, MJ, McPhillips) survives untouched.
const fixCase = (s) =>
  /[A-Z]/.test(s || "") ? (s || "").trim()
    : (s || "").trim().replace(/(^|[\s'-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase());

const slugify = (s) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// "Revenue-generating (paying customers; working toward scale)" reads as a
// paragraph in a pill. The roster has always stored the short form.
const shortStage = (s) => (s || "").split(" (")[0].trim() || null;

const initials = (name) =>
  (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

// Headshots live behind the Typeform API token, so they render through the
// same proxy the lookbook and founder profiles use (it also converts iPhone
// HEIC and downscales).
const photoUrl = (url) => (url ? `/api/admin/tf-file?u=${encodeURIComponent(url)}` : null);

const idNum = (upliftId) => {
  const n = parseInt(String(upliftId || "").replace(/^UF26/, ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const clean = (v) => (v === undefined || v === "" ? null : v);

// Typeform renders an "Other" option as the label "Other:" (the colon belongs
// to the follow-up text box, not to the answer), which reads as a typo in a
// pill on the portal. Applied to choice answers only, never to free text.
const choice = (v) => (typeof v === "string" ? (v.replace(/\s*:\s*$/, "").trim() || null) : clean(v));
const choices = (v) => (Array.isArray(v) ? v.map(choice).filter(Boolean) : []);

// JSON is a valid subset of JS object syntax, so the generated file is just
// pretty-printed JSON with the keys unquoted where they're safe to unquote.
function render(value, indent) {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const parts = value.map(v => render(v, indent + 1));
    const oneLine = `[${parts.join(", ")}]`;
    if (parts.every(p => !p.includes("\n")) && oneLine.length + pad.length <= 110) return oneLine;
    return `[\n${parts.map(p => padIn + p).join(",\n")},\n${pad}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).filter(k => value[k] !== undefined);
    if (!keys.length) return "{}";
    const parts = keys.map(k => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${render(value[k], indent + 1)}`);
    const oneLine = `{ ${parts.join(", ")} }`;
    if (parts.every(p => !p.includes("\n")) && oneLine.length + pad.length <= 110) return oneLine;
    return `{\n${parts.map(p => padIn + p).join(",\n")},\n${pad}}`;
  }
  return JSON.stringify(value);
}

// ── build ────────────────────────────────────────────────────────────────────

function mentorBlock(mentee, mentors) {
  const mt = mentors.find(x => x.id === mentee.matchedMentorId);
  if (!mt) return undefined;
  const tags = [...(mt.focusAreas || []).slice(0, 2), (mt.industries || [])[0]]
    .filter(t => t && !/^other/i.test(t));
  const availability = [mt.tier, (mt.timePref || []).join(", ").toLowerCase()]
    .filter(Boolean).join(" · ");
  return {
    name: mt.name,
    email: clean(mt.email),
    company: clean(mt.company),
    title: clean(mt.title),
    initials: initials(mt.name),
    tags,
    linkedin: clean(mt.linkedin),
    location: clean(mt.based),
    availability: availability || null,
    bio: null, // mentor applications have no bio field; filled in by hand
    whyMentor: clean(mt.why),
  };
}

function record(m, mentors) {
  const first = fixCase(m.first);
  const last = fixCase(m.last);
  const topics = (m.topics || []).filter(t => t && t !== m.primaryFocus);
  const mentor = mentorBlock(m, mentors);
  return {
    slug: slugify(`${first} ${last}`),
    // Typeform response id: the key every other fall table (decisions,
    // matches, the mentor-facing profile URLs) uses for this founder.
    applicationId: m.id,
    // Cohort placement is undetermined for fall as of the launch: null renders
    // as "Cohort TBD" in the portal and groups under "Unassigned" in the admin.
    // Assign real numbers here (or in lib/mentees.js) once Kennedy splits them.
    cohort: null,
    first, last,
    company: clean(m.company),
    stage: shortStage(m.stage),
    industry: choice(m.industry),
    county: clean(m.county),
    linkedin: clean(m.linkedin),
    photo: photoUrl(m.headshotUrl),
    primaryFocus: choice(m.primaryFocus),
    secondaryFoci: choices(topics),
    // Flips to true once onboarding attendance + Week 1 gate are confirmed;
    // the live sheet (mentorMatched milestone) overrides this at runtime.
    mentorUnlocked: false,
    ...(mentor ? { mentor } : {}),
    application: {
      submittedAt: (m.submittedAt || "").slice(0, 10) || null,
      title: clean(m.title),
      bio: clean(m.bio),
      city: clean(m.city),
      journeyStage: choice(m.journey),
      snapshot: {
        raising: choice(m.snapshot?.raising),
        hiring: choice(m.snapshot?.hiring),
        employees: m.snapshot?.employees ?? null,
        employeeCount: clean(m.snapshot?.employeeCount),
        generatingRevenue: m.snapshot?.generatingRevenue ?? null,
        lookingForCustomers: m.snapshot?.lookingForCustomers ?? null,
        seekingPartnerships: m.snapshot?.seekingPartnerships ?? null,
        priorOutsideCapital: m.snapshot?.priorCapital ?? null,
      },
      valueSought: clean(m.valueSought),
      hopingToAccomplish: clean(m.hoping),
      brings: clean(m.brings),
      successCriteria: choices(m.successCriteria),
      topCriterion: choice(m.topSuccess),
      confidence: choice(m.confidence),
      sessionTier: choice(m.tier),
      timePreference: choices(m.timePref),
      meetingMethod: choices(m.methods),
      mentorType: choices(m.mentorType),
      demoNightInterest: choice(m.demoNight),
      njResident: !!m.njResident,
      oct27Available: !!m.oct27,
    },
  };
}

async function loadPayload(source) {
  if (/^https?:\/\//.test(source)) {
    const r = await fetch(source);
    if (!r.ok) throw new Error(`${source} responded ${r.status}`);
    return r.json();
  }
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, source), "utf8"));
}

const source = process.argv[2] || DEFAULT_SOURCE;
const payload = await loadPayload(source);
if (payload.error) throw new Error(`fall-people: ${payload.error}`);
if (payload.sheetReadError) throw new Error("fall-people reported sheetReadError — decisions unreadable, refusing to build a roster that would drop founders");

const accepted = (payload.mentees || [])
  .filter(m => m.decision === "approved")
  .filter(m => !TEST_NAMES.includes(`${m.first} ${m.last}`.trim().toLowerCase()))
  .sort((a, b) => idNum(a.upliftId) - idNum(b.upliftId) || (a.submittedAt || "").localeCompare(b.submittedAt || ""));

const missingId = accepted.filter(m => !m.upliftId);
if (missingId.length) {
  console.warn(`WARNING: no Uplift ID for ${missingId.map(m => `${m.first} ${m.last}`).join(", ")}. ` +
    "Re-approve them in /admin-fall so an ID is issued, then re-run.");
}

const records = accepted.map(m => record(m, payload.mentors || []));
const dupes = records.map(r => r.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dupes.length) throw new Error(`duplicate slugs: ${dupes.join(", ")} — disambiguate by hand before generating`);

const body = records.map(r => "  " + render(r, 1) + ",").join("\n");
const file = `// GENERATED FILE — do not edit by hand.
//   node scripts/build-fall-cohort.mjs
//
// The Fall 2026 portal roster: one record per accepted founder, built from
// their own application (Typeform hAbo7Jdh) plus the decision and match tabs.
// Records are in Uplift ID order, which is the order people were accepted.
//
// These are spread into MENTEES (lib/mentees.js) so every founder gets a
// portal at /fall/<slug>, and their slugs make up FALL_SLUGS
// (lib/fall-roster.js), which is what gates portal login, response saving,
// and the admin roster.
//
// What is deliberately NOT in here, because the roster is imported by a page
// component and therefore has to be treated as public:
//   - Uplift ID. It is the founder's portal password. It lives only in the
//     FallMentees tab, is assigned on approval and never reassigned, and is
//     read server-side by pages/api/portal-auth.js.
//   - The demographic disclosure block and revenue range, for the same reason
//     MENTOR_SAFE_FIELDS in components/FounderSheet.js holds disclosure back:
//     eligibility review reads those live from Typeform, server-side.
//   - Email and phone. Mentors get them from the profile page they are sent.
//
// Anything a founder or the team edits later (mentor bio, mentorUnlocked,
// cohort assignment) belongs in the live sheet or in mentees.js, not here:
// re-running the generator overwrites this file.
//
// Built ${new Date().toISOString().slice(0, 10)} from ${records.length} accepted founders.

export const FALL_FOUNDERS = [
${body}
];
`;

// The slug list lives in its own tiny module, NOT as
// FALL_FOUNDERS.map(f => f.slug) in the file above. lib/fall-roster.js is in
// the browser bundle (the portal reads PULSE_WINDOWS from it), so deriving
// the slugs from the records would drag all 36 records into the client bundle
// with them — which is exactly what happened the first time this was built.
const slugFile = `// GENERATED FILE — do not edit by hand.
//   node scripts/build-fall-cohort.mjs
//
// Just the slugs from lib/fall-cohort.js, as a flat literal. Separate on
// purpose: lib/fall-roster.js imports this and is bundled for the browser,
// so it must not reach the founder records themselves.

export const FALL_FOUNDER_SLUGS = ${render(records.map(r => r.slug), 0)};
`;

fs.writeFileSync(OUT, file);
fs.writeFileSync(OUT_SLUGS, slugFile);
console.log(`Wrote ${path.relative(ROOT, OUT)} + ${path.relative(ROOT, OUT_SLUGS)}: ${records.length} founders (${records.filter(r => r.mentor).length} matched).`);
// Uplift IDs are printed but never written into the file — see the header.
console.log(records.map((r, i) => `  ${accepted[i].upliftId || "(no id)"}  /fall/${r.slug}${r.mentor ? `  → ${r.mentor.name}` : ""}`).join("\n"));
