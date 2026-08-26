// GET /api/admin/fall-people
//
// The funnel side of the fall admin: live mentee + mentor applications pulled
// straight from the two original Typeforms (hAbo7Jdh / AayoroO1), one request
// each, parsed server-side against the public form definitions. 60s in-memory
// cache; ?fresh=1 bypasses. Read-only for now: the Accept-into-roster action
// lands with the ingest build.

import { MENTEES } from "../../../lib/mentees";
import { getSheetsClient } from "../../../lib/sheets-helper";

const MENTEE_FORM = "hAbo7Jdh";
const MENTOR_FORM = "AayoroO1";
const FALL_SLUGS = ["kennedy", "hana", "mj"];
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
const MENTEE_FALL_CUTOFF = new Date("2026-08-01");
const MENTOR_FALL_CUTOFF = new Date("2026-08-10");

let cache = { at: 0, payload: null };
const CACHE_MS = 60 * 1000;

async function fetchForm(formId, token) {
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
    return a.text ?? a.email ?? a.url ?? a.number ?? a.boolean
      ?? (a.choice ? a.choice.label : null)
      ?? (a.choices ? a.choices.labels : null);
  };
}

function getFileUrl(titles, item, frag) {
  const a = (item.answers || []).find(x => (titles[x.field.id] || "").toLowerCase().includes(frag));
  return a?.file_url || null;
}

function parseMentee(titles, item) {
  const get = makeGetter(titles, item);
  const first = get("first name") || "";
  const last = get("last name") || "";
  const email = (get("email") || "").toLowerCase();
  const rosterMatch = MENTEES.find(m =>
    FALL_SLUGS.includes(m.slug) &&
    (`${m.first} ${m.last}`.toLowerCase() === `${first} ${last}`.toLowerCase())
  );
  return {
    id: item.response_id,
    submittedAt: item.submitted_at,
    first, last, email,
    company: get("company's name"),
    title: get("your title"),
    bio: get("brief bio"),
    city: get("what city"),
    county: get("nj county"),
    njResident: get("resident of new jersey") === true,
    oct27: get("in-person event on october 27") === true,
    stage: get("current stage of your company"),
    industry: get("industry or sector"),
    topics: get("topics would you most") || [],
    primaryFocus: get("primary focus area"),
    tier: get("availability & scheduling"),
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
      lookingForCustomers: get("looking for customers"),
      seekingPartnerships: get("strategic partnerships"),
    },
    disclosure: { gender: get("gender identity"), ethnicity: get("ethnicity"), age: get("age range") },
    inRoster: rosterMatch ? rosterMatch.slug : null,
    summerAlum: !!MENTEES.find(m => !FALL_SLUGS.includes(m.slug) &&
      `${m.first} ${m.last}`.toLowerCase() === `${first} ${last}`.toLowerCase()),
  };
}

// Program focus: women and minority founders, with undisclosed given the
// benefit of the doubt. Ineligible only when both fields are disclosed and
// neither applies.
function meetsFocus(disclosure) {
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

function parseMentor(titles, item) {
  const get = makeGetter(titles, item);
  const first = get("first name") || "";
  const last = get("last name") || "";
  const name = `${first} ${last}`.trim();
  // Which fall founders are currently assigned this mentor (mock matches for now)
  const assignedTo = MENTEES
    .filter(m => FALL_SLUGS.includes(m.slug) && m.mentor?.name === name)
    .map(m => `${m.first} ${m.last}`.trim());
  // A real mentor whose data is reused as the test-portal match (e.g. Jeanne
  // McPhillips for kennedy/hana/mj) is not available for real matching while
  // "assigned" to test accounts — flag it the same way test mentees are.
  const inRoster = assignedTo.length > 0;
  return {
    id: item.response_id,
    submittedAt: item.submitted_at,
    first, last, name, inRoster,
    email: (get("email") || "").toLowerCase(),
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
}

export default async function handler(req, res) {
  const fresh = req.query.fresh === "1";
  const now = Date.now();
  if (!fresh && cache.payload && now - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "TYPEFORM_TOKEN not configured", mentees: [], mentors: [] });

  try {
    // Decisions (approved/rejected) + Uplift ID, latest row per applicant wins.
    // Uplift ID only ever appears on an "approved" row but is carried forward
    // by findExistingId() in fall-decide.js even through a later reject/clear,
    // so once assigned it's permanent regardless of what this map returns for
    // the current decision.
    const readDecisions = async (tab) => {
      try {
        const sheets = getSheetsClient();
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${tab}!A2:F2000`,
        });
        const latest = {};
        const ids = {};
        for (const row of r.data.values || []) {
          if (!row[1]) continue;
          latest[row[1]] = row[4];
          if (row[5]) ids[row[1]] = row[5];
        }
        return { latest, ids };
      } catch (_) {
        return { latest: {}, ids: {} };
      }
    };

    // Live matches from the FallMatches sheet tab (empty until first match)
    const readMatches = async () => {
      try {
        const sheets = getSheetsClient();
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: "FallMatches!A2:I1000",
        });
        return (r.data.values || [])
          .filter(row => row[7] === "matched")
          .map(row => ({
            matchedAt: row[0], menteeId: row[1], menteeName: row[2], menteeEmail: row[3],
            mentorId: row[4], mentorName: row[5], mentorEmail: row[6], note: row[8] || "",
          }));
      } catch (_) {
        return []; // tab doesn't exist yet
      }
    };

    const [menteeForm, mentorForm, matches, menteeDecisions, mentorDecisions] = await Promise.all([
      fetchForm(MENTEE_FORM, token),
      fetchForm(MENTOR_FORM, token),
      readMatches(),
      readDecisions("FallMentees"),
      readDecisions("FallMentors"),
    ]);

    const isFallEra = (cutoff) => (item) => item.submitted_at && new Date(item.submitted_at) >= cutoff;
    const mentees = menteeForm.items.filter(isFallEra(MENTEE_FALL_CUTOFF)).map(i => parseMentee(menteeForm.titles, i))
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    const mentors = mentorForm.items.filter(isFallEra(MENTOR_FALL_CUTOFF)).map(i => parseMentor(mentorForm.titles, i))
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

    // Overlay live matches + decisions + eligibility
    const matchByMentee = Object.fromEntries(matches.map(x => [x.menteeId, x]));
    for (const m of mentees) {
      const hit = matchByMentee[m.id];
      m.matchedMentorId = hit?.mentorId || null;
      m.matchedMentorName = hit?.mentorName || null;
      m.matchedAt = hit?.matchedAt || null;
      const d = menteeDecisions.latest[m.id];
      m.decision = d === "clear" ? null : d || null;
      m.upliftId = menteeDecisions.ids[m.id] || null;
      m.meetsRequirements = m.njResident && meetsFocus(m.disclosure) && !m.summerAlum;
    }
    for (const mt of mentors) {
      const live = matches.filter(x => x.mentorId === mt.id).map(x => x.menteeName);
      mt.assignedTo = [...new Set([...(mt.assignedTo || []), ...live])];
      const d = mentorDecisions.latest[mt.id];
      mt.decision = d === "clear" ? null : d || null;
      mt.upliftId = mentorDecisions.ids[mt.id] || null;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      menteeCount: mentees.filter(m => !m.inRoster).length,
      mentorCount: mentors.filter(m => !m.inRoster).length,
      matchedCount: matches.length,
      mentees,
      mentors,
      matches,
    };
    cache = { at: now, payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[fall-people] failed:", err);
    return res.status(500).json({ error: err.message, mentees: [], mentors: [] });
  }
}
