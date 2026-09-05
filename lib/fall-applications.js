// Fall 2026 applications: the single fetch + parse layer over the two
// Typeforms (mentee hAbo7Jdh / mentor AayoroO1) and the decision tabs.
//
// Extracted from pages/api/admin/fall-people.js so the admin board and the
// mentor-facing founder profiles (pages/fall/profile/[id].js) read the same
// parsed shape. The field fragments below are matched against live Typeform
// question titles, so they are the one place that has to change when a
// question is reworded — having had two copies of them was the risk this
// extraction removes.

import { credibility } from "./mentor-verification";
import { servedInSummer } from "./summer-mentors";
import { MENTEES } from "./mentees";
import { FALL_SLUGS, TEST_SLUGS } from "./fall-roster";
import { getSheetsClient } from "./sheets-helper";
import { isUpliftId, isRetiredMarker } from "./uplift-id";

export const MENTEE_FORM = "hAbo7Jdh";
export const MENTOR_FORM = "AayoroO1";

// Both Typeforms are reused from Summer 2026, so old Summer submissions are
// mixed into the same response stream as real Fall ones and must be
// excluded, or they inflate Fall funnel numbers and pollute the matching
// pool with people who aren't actually in this cohort. Cutoffs are set
// inside each form's real Summer->Fall gap (found by inspecting submission
// timestamps directly, Aug 25 2026): mentee responses jump from Jul 13 to
// Aug 4 (22-day gap); mentor responses jump from Jun 27 to Aug 20 (54-day
// gap). These are NOT the same date, and NOT the fall-overview.js
// FALL_CUTOFF (that one guards meeting logs, a different question — do not
// reuse it here without re-checking, and re-verify these if the gap moves).
export const MENTEE_FALL_CUTOFF = new Date("2026-08-01");
export const MENTOR_FALL_CUTOFF = new Date("2026-08-10");

export async function fetchForm(formId, token) {
  const [def, resp] = await Promise.all([
    fetch(`https://form.typeform.com/forms/${formId}`).then(r => r.json()),
    fetch(`https://api.typeform.com/forms/${formId}/responses?page_size=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  ]);
  const titles = {};
  (def.fields || []).forEach(function walk(f) {
    titles[f.id] = f.title || "";
    (f.properties?.fields || []).forEach(walk);
  });
  return { titles, items: resp.items || [] };
}

function makeGetter(titles, item) {
  return (frag) => {
    const a = (item.answers || []).find(x => (titles[x.field.id] || "").toLowerCase().includes(frag));
    if (!a) return null;
    return a.text ?? a.email ?? a.url ?? a.phone_number ?? a.number ?? a.boolean
      ?? (a.choice ? a.choice.label : null)
      ?? (a.choices ? a.choices.labels : null);
  };
}

function getFileUrl(titles, item, frag) {
  const a = (item.answers || []).find(x => (titles[x.field.id] || "").toLowerCase().includes(frag));
  return a?.file_url || null;
}

export function parseMentee(titles, item) {
  const get = makeGetter(titles, item);
  const first = get("first name") || "";
  const last = get("last name") || "";
  const email = (get("email") || "").toLowerCase();
  // Which portal (if any) belongs to this applicant. Every accepted founder
  // has one now, so inRoster answers "does a portal exist for them", NOT
  // "is this a test account" — that is isTest, below.
  const rosterMatch = MENTEES.find(m =>
    FALL_SLUGS.includes(m.slug) &&
    (`${m.first} ${m.last}`.toLowerCase() === `${first} ${last}`.toLowerCase())
  );
  return {
    id: item.response_id,
    submittedAt: item.submitted_at,
    first, last, email,
    phone: get("phone number"),
    company: get("company's name"),
    title: get("your title"),
    bio: get("brief bio"),
    city: get("what city"),
    county: get("nj county"),
    njResident: get("resident of new jersey") === true,
    oct27: get("in-person event on october 27") === true,
    stage: get("current stage of your company"),
    industry: get("industry or sector"),
    linkedin: get("linkedin profile"),
    topics: get("topics would you most") || [],
    primaryFocus: get("primary focus area"),
    // How confident they feel in the very area they're asking for help with:
    // the gap a mentor is being asked to close.
    confidence: get("confident do you currently feel"),
    journey: get("company-building journey"),
    successCriteria: get("program successful for you") || [],
    topSuccess: get("success criteria is most important"),
    milestonesExpected: get("major milestones you expect"),
    milestonesText: get("briefly describe those milestones"),
    priorProgram: get("structured accelerator"),
    tier: get("availability & scheduling"),
    constraints: get("anticipate any known scheduling"),
    constraintsText: get("briefly describe your scheduling"),
    methods: get("communication method") || [],
    demoNight: get("demo night interest"),
    headshotUrl: getFileUrl(titles, item, "headshot"),
    mentorType: get("matching preference") || [],
    hoping: get("hoping to accomplish"),
    valueSought: get("feels valuable"),
    brings: get("bring to the mentorship"),
    timePref: get("time-of-day") || [],
    snapshot: {
      raising: get("raising capital"),
      hiring: get("currently hiring"),
      employees: get("have employees"),
      generatingRevenue: get("generating revenue"),
      revenueRange: get("how much revenue"),
      employeeCount: get("full-time employees"),
      priorCapital: get("previously raised outside capital"),
      lookingForCustomers: get("looking for customers"),
      seekingPartnerships: get("strategic partnerships"),
    },
    disclosure: { gender: get("gender identity"), ethnicity: get("ethnicity"), age: get("age range") },
    inRoster: rosterMatch ? rosterMatch.slug : null,
    isTest: !!rosterMatch && TEST_SLUGS.includes(rosterMatch.slug),
    // A name that matches a roster entry outside the fall cohort is a Summer
    // 2026 alum, who volunteers rather than re-enrolling.
    summerAlum: !!MENTEES.find(m => !FALL_SLUGS.includes(m.slug) &&
      `${m.first} ${m.last}`.toLowerCase() === `${first} ${last}`.toLowerCase()),
  };
}

// Program focus: women and minority founders, with undisclosed given the
// benefit of the doubt. Ineligible only when both fields are disclosed and
// neither applies.
export function meetsFocus(disclosure) {
  const g = (disclosure.gender || "").toLowerCase();
  const e = (disclosure.ethnicity || "").toLowerCase();
  const genderBlank = !g || g.includes("prefer");
  const ethnicityBlank = !e || e.includes("prefer");
  const isWoman = g && !genderBlank && g !== "male";
  const isMinority = e && !ethnicityBlank && !e.includes("white");
  if (isWoman || isMinority) return true;
  if (genderBlank || ethnicityBlank) return true;
  return false;
}

// ── mentor screening ─────────────────────────────────────────────────────────
// Founders go through an approve/reject gate with an eligibility computation
// behind it. Mentors never had one: parseMentor read the Typeform and handed
// the record straight to matching, so the only thing standing between an
// application and a founder was somebody clicking approve on a board that
// showed no reason to hesitate.
//
// Fall 2026 is why this exists. A mentor based in Dhaka, reachable only on a
// Bangladeshi mobile, who left both narrative answers blank and gave "Mentor"
// as his job title, was approved and matched to a Newark founder. Nothing in
// the pipeline objected. He was also the only mentor in the pool whose
// application predated MENTOR_FALL_CUTOFF — he was a summer-era leftover that
// keep() admitted precisely because approving him overrode the era filter.
//
// This does not reject anybody. It scores, so the admin board can sort the
// pool by how much a human should look before clicking approve.
// Mentors write "Jersey City" and "Hoboken" without a state as often as not,
// so bare city names have to count or the column fills with false alarms.
const TRI_STATE = /\bNJ\b|New Jersey|\bNY\b|New York|\bNYC\b|\bPA\b|Pennsylv|Philadelphia|Jersey City|Newark|Hoboken|Princeton|Montclair|Morristown|Trenton|Camden|Paterson|Edison|Brooklyn|Manhattan|Queens|Bronx/i;
const isBlank = (v) => v === null || v === undefined || v === "" ||
  (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);

// Returning summer mentors re-apply through a short form that never asks for
// company, title or LinkedIn, so those arriving blank is the returning path
// working, not a thin application. Weighting them as risk would flag a dozen
// of Uplift's most reliable mentors and teach everyone to ignore the column.
export const MENTOR_FLAG_WEIGHTS = {
  "outside-region": 4,      // not reachable in the tri-state area
  "non-us-phone": 4,
  "pre-cutoff": 4,          // in the pool only because an approve overrode keep()
  "no-location": 3,
  "both-narratives-blank": 3,
  "generic-title": 2,       // "Mentor" / "Advisor" is a role claim, not a job
  "multi-org-company": 2,   // several institutions stuffed into one field
  "bad-linkedin": 2,        // present but not a linkedin.com/in/ URL
  "thin-why": 2,
  "one-narrative-blank": 1,
  "no-time-pref": 1,
  "all-stages": 1,
  "email-name-mismatch": 1,
};

export function screenMentor(m, { returning = false, cutoff = MENTOR_FALL_CUTOFF } = {}) {
  const flags = [];
  const add = (k, detail) => flags.push({ flag: k, detail: detail || "" });

  const based = m.based || "";
  if (isBlank(based)) add("no-location");
  else if (!TRI_STATE.test(based)) add("outside-region", based.trim());

  const phone = (m.phone || "").replace(/[\s()-]/g, "");
  if (phone.startsWith("+") && !phone.startsWith("+1")) add("non-us-phone", phone);

  if (m.submittedAt && cutoff && new Date(m.submittedAt) < cutoff) {
    add("pre-cutoff", `submitted ${String(m.submittedAt).slice(0, 10)}`);
  }

  const giveBlank = isBlank(m.give), getBlank = isBlank(m.getOut);
  if (giveBlank && getBlank) add("both-narratives-blank");
  else if (giveBlank || getBlank) add("one-narrative-blank");

  const why = (m.why || "").trim();
  if (why && why.length < 45) add("thin-why", `${why.length} chars`);

  const title = (m.title || "").trim().toLowerCase();
  if (["mentor", "advisor", "consultant"].includes(title)) add("generic-title", m.title);

  // Blank company/LinkedIn is the returning-mentor form, not a gap.
  const li = m.linkedin || "";
  if (!isBlank(li) && !li.toLowerCase().includes("linkedin.com/in/")) add("bad-linkedin", li.slice(0, 60));

  const co = m.company || "";
  if (!returning && ((co.match(/,/g) || []).length >= 2 || (co.match(/\(/g) || []).length >= 2)) {
    add("multi-org-company", co.slice(0, 80));
  }

  if (isBlank(m.timePref)) add("no-time-pref");
  if ((m.stagePref || []).length >= 5) add("all-stages");

  const nameTokens = (m.name || "").toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3);
  const local = (m.email || "").split("@")[0].toLowerCase();
  if (nameTokens.length && !nameTokens.some(t => local.includes(t))) {
    add("email-name-mismatch", m.email);
  }

  const risk = flags.reduce((n, f) => n + (MENTOR_FLAG_WEIGHTS[f.flag] || 1), 0);
  return { flags, risk };
}

export function parseMentor(titles, item) {
  const get = makeGetter(titles, item);
  const first = get("first name") || "";
  const last = get("last name") || "";
  const name = `${first} ${last}`.trim();
  // Which fall founders' portals currently show this mentor
  // The three walkthrough portals borrow a real mentor's application to
  // demonstrate the mentor reveal. That used to mark the mentor as a test
  // account and hold them out of matching, which had it backwards: a demo
  // consumes none of their availability and Jeanne McPhillips has no actual
  // founders, so she belongs in the pool like anyone else. Only assignments to
  // real founders count against a mentor.
  const assigned = MENTEES.filter(m => FALL_SLUGS.includes(m.slug) && m.mentor?.name === name);
  const realFounders = assigned.filter(m => !TEST_SLUGS.includes(m.slug));
  const assignedTo = realFounders.map(m => `${m.first} ${m.last}`.trim());
  const inRoster = assignedTo.length > 0;
  // No mentor is a test account. The field stays so the admin's filters and
  // counters keep one shape across mentees and mentors.
  const isTest = false;
  const mentor = {
    id: item.response_id,
    submittedAt: item.submitted_at,
    first, last, name, inRoster, isTest,
    email: (get("email") || "").toLowerCase(),
    // Mentors give a phone on the application and it was never parsed, so
    // reaching one meant digging through Typeform. Contact details belong
    // wherever a founder's pairing is on screen.
    phone: get("phone"),
    company: get("company/organization"),
    title: get("title/role"),
    based: get("where are you based"),
    linkedin: get("linkedin"),
    focusAreas: get("mentorship focus areas") || [],
    industries: get("industry / domain") || [],
    stagePref: get("founder stage preference") || [],
    tier: get("1:1 mentoring session availability"),
    timePref: get("time-of-day") || [],
    method: get("communication method") || [],
    why: get("why are you interested"),
    give: get("hoping to provide"),
    getOut: get("hoping to get"),
    assignedTo,
  };
  // Screening is advisory: it never withholds a mentor, it only tells the
  // admin board how hard to look before approving.
  const { flags, risk } = screenMentor(mentor, { returning: servedInSummer(mentor.name) });
  const scored = { ...mentor, flags, risk };
  return { ...scored, credibility: credibility(scored) };
}

// A failed sheet read must never be served as "no decisions": that renders
// every approved applicant back as Undecided and looks exactly like lost
// work. Retry (rapid batch approvals can trip the per-minute quota), and
// if it still fails, say so via the failed flag instead of faking empty.
export async function readSheet(range) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const sheets = getSheetsClient();
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range,
      });
      return { rows: r.data.values || [], failed: false };
    } catch (e) {
      const code = e?.code || e?.response?.status;
      if (code === 400) return { rows: [], failed: false }; // tab doesn't exist yet
      lastErr = e;
      if (attempt < 2) await new Promise(r2 => setTimeout(r2, 700 * (attempt + 1)));
    }
  }
  console.error(`[fall-applications] sheet read failed for ${range}:`, lastErr?.message);
  return { rows: [], failed: true };
}

// Decisions (approved/rejected) + Uplift ID, latest row per applicant wins.
// Uplift ID only ever appears on an "approved" row but is carried forward
// by findExistingId() in fall-decide.js even through a later reject/clear,
// so once assigned it's permanent regardless of what this map returns for
// the current decision.
export async function readDecisions(tab) {
  const { rows, failed } = await readSheet(`${tab}!A2:F2000`);
  const latest = {};
  const ids = {};
  for (const row of rows) {
    if (!row[1]) continue;
    latest[row[1]] = row[4];
    // Only a real ID is reported as somebody's ID, and a retirement takes it
    // back off the record, so the admin board and the acceptance send both
    // read a retired ID as "has none" instead of showing a dead number.
    if (isRetiredMarker(row[5])) delete ids[row[1]];
    else if (isUpliftId(row[5])) ids[row[1]] = row[5].trim();
  }
  return { latest, ids, failed };
}

export async function readMatches() {
  const { rows, failed } = await readSheet("FallMatches!A2:I1000");
  const matches = rows
    .filter(row => row[7] === "matched")
    .map(row => ({
      matchedAt: row[0], menteeId: row[1], menteeName: row[2], menteeEmail: row[3],
      mentorId: row[4], mentorName: row[5], mentorEmail: row[6], note: row[8] || "",
    }));
  matches.failed = failed;
  return matches;
}

const isFallEra = (cutoff) => (item) => item.submitted_at && new Date(item.submitted_at) >= cutoff;
// A decided applicant must never be hidden by the era cutoff: Kennedy
// approved four pre-cutoff applicants on Aug 26 (before the cutoff dates
// were corrected) and the corrected filter made those approvals vanish
// from the board — which reads as lost work. An explicit approve/reject
// outranks the submitted-at heuristic; "clear" undoes that and lets the
// cutoff hide them again.
const isDecided = (decisions) => (item) => ["approved", "rejected"].includes(decisions.latest[item.response_id]);
export const keep = (cutoff, decisions) => (item) => isFallEra(cutoff)(item) || isDecided(decisions)(item);

// The mentee side on its own, for callers (the founder profile pages) that
// have no use for mentors and shouldn't pay for a second form fetch.
//
// Returns { mentees, failed }. `failed` means the decision sheet could not be
// read, so every founder looks undecided: a caller must say "try again"
// rather than treat an approved founder as nonexistent.
let menteeCache = { at: 0, mentees: null };
// Ten minutes, not one: these pages are opened in bursts (a matching session,
// or a mentor clicking through the lookbook), and the Typeform responses
// endpoint has been seen taking minutes under load. Approvals made in the
// admin board show up on the next refresh.
const MENTEE_CACHE_MS = 10 * 60 * 1000;

export async function getFallMentees(token) {
  if (menteeCache.mentees && Date.now() - menteeCache.at < MENTEE_CACHE_MS) {
    return { mentees: menteeCache.mentees, failed: false };
  }

  let menteeForm, matches, menteeDecisions;
  try {
    [menteeForm, matches, menteeDecisions] = await Promise.all([
      fetchForm(MENTEE_FORM, token),
      readMatches(),
      readDecisions("FallMentees"),
    ]);
  } catch (err) {
    // Stale beats broken: a mentor opening a profile link should see the
    // page, not an error, when Typeform is having a slow minute.
    if (menteeCache.mentees) {
      console.error("[fall-applications] refresh failed, serving cached:", err.message);
      return { mentees: menteeCache.mentees, failed: false };
    }
    throw err;
  }
  const matchByMentee = Object.fromEntries(matches.map(x => [x.menteeId, x]));
  const mentees = menteeForm.items
    .filter(keep(MENTEE_FALL_CUTOFF, menteeDecisions))
    .map(i => parseMentee(menteeForm.titles, i))
    // The "participated in Uplift before?" gate (added 2026-08-26) bounces
    // returning mentees to an ending screen after one answer; Typeform still
    // records that as a response, which lands here as a nameless, emailless
    // row nobody should be approving.
    .filter(m => m.email || m.first || m.last)
    .map(m => {
      const hit = matchByMentee[m.id];
      const d = menteeDecisions.latest[m.id];
      return {
        ...m,
        matchedMentorId: hit?.mentorId || null,
        matchedMentorName: hit?.mentorName || null,
        matchedAt: hit?.matchedAt || null,
        decision: d === "clear" ? null : d || null,
        upliftId: menteeDecisions.ids[m.id] || null,
        meetsRequirements: m.njResident && meetsFocus(m.disclosure) && !m.summerAlum,
      };
    })
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  // Opening thirty-odd profiles back to back is a normal afternoon during
  // matching, and each one re-reads the same two sheets. Cache the good
  // result; never cache one built on a failed decision read.
  if (!menteeDecisions.failed) menteeCache = { at: Date.now(), mentees };
  return { mentees, failed: menteeDecisions.failed };
}

// The approved, non-test founders: who the profile pages exist for.
export function approvedFounders(mentees) {
  return mentees.filter(m => m.decision === "approved" && !m.isTest);
}

// Profiles are linked by response id only: unguessable, permanent, and not
// the founder's Uplift ID, which doubles as their portal password and so must
// never end up in a URL that goes to a mentor.
export function findFounder(mentees, id) {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return null;
  return approvedFounders(mentees).find(m => m.id.toLowerCase() === key) || null;
}

// ── What Ulrike may know about the cohort ──────────────────────────────────
//
// The portal bot answers founder questions like "is anyone else in Essex
// County?" or "who else is in fintech?", so she needs a directory. She gets
// the same fields a mentor sees on a profile page and nothing more.
//
// Deliberately absent, and it must stay that way: revenue (both the range and
// whether they have any), the demographic disclosure, phone numbers, and the
// Uplift ID (a founder's portal password). Email and LinkedIn are in, because
// the point is founders reaching each other.
const DIRECTORY_YES_NO = (v) => (v === true ? "yes" : v === false ? "no" : null);

export function cohortDirectory(mentees) {
  return approvedFounders(mentees).map(m => ({
    name: `${m.first} ${m.last}`.trim(),
    company: m.company || null,
    title: m.title || null,
    city: m.city || null,
    county: m.county || null,
    stage: m.stage || null,
    industry: m.industry || null,
    wantsHelpWith: m.primaryFocus || null,
    otherTopics: m.topics || [],
    journey: m.journey || null,
    sessionsPlanned: m.tier || null,
    hiring: m.snapshot?.hiring || null,
    raising: m.snapshot?.raising || null,
    lookingForCustomers: DIRECTORY_YES_NO(m.snapshot?.lookingForCustomers),
    seekingPartnerships: DIRECTORY_YES_NO(m.snapshot?.seekingPartnerships),
    email: m.email || null,
    linkedin: m.linkedin || null,
  }));
}

// One compact line per founder: the bot reads this, not JSON.
export function cohortDirectoryText(mentees) {
  const rows = cohortDirectory(mentees);
  const line = (r) => [
    r.name,
    r.company && `${r.title ? `${r.title}, ` : ""}${r.company}`,
    r.industry && `industry: ${r.industry}`,
    r.stage && `stage: ${r.stage}`,
    r.county && `${r.county} County${r.city ? ` (${r.city})` : ""}`,
    r.wantsHelpWith && `wants help with: ${r.wantsHelpWith}`,
    r.otherTopics?.length && `also interested in: ${r.otherTopics.join(", ")}`,
    r.hiring && `hiring: ${r.hiring}`,
    r.raising && `raising: ${r.raising}`,
    r.lookingForCustomers && `looking for customers: ${r.lookingForCustomers}`,
    r.seekingPartnerships && `seeking partnerships: ${r.seekingPartnerships}`,
    r.email && `email: ${r.email}`,
    r.linkedin && `linkedin: ${r.linkedin}`,
  ].filter(Boolean).join(" | ");
  return `FALL 2026 FOUNDER DIRECTORY (${rows.length} founders)\n${rows.map(line).join("\n")}`;
}
