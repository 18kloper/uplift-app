// GET /api/admin/session-counts?token=...
// Read-only: per-mentee mentor-session progress across the whole roster.
// Uses the same matcher as /api/meetings and honors SessionReview denials.
// Returns sessions logged (distinct non-denied), credited minutes, milestones
// (>=60/120/180 = 1/2/3), plus cohort + mentor, and cohort/overall rollups.
// Powers both the Excel tracker and the admin portal completion sign.

import { MENTEES } from "../../../lib/mentees";
import { fetchTypeformResponses, matchesMentee } from "../meetings";
import { getSheetsClient } from "../../../lib/sheets-helper";

const FIELDS = {
  first:    "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:     "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  sixtyMin: "fcee13e9-5193-4f01-b3b4-aed4f421b933",
};
const STAFF = new Set(["kennedy", "jackie", "aaron", "mj"]);
const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };
const GOAL_COMPLETERS = 50; // minimum completers across all 5 cohorts (75+ mentees)

export default async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const data = await fetchTypeformResponses();
  if (!data) return res.status(500).json({ error: "No Typeform data (missing TYPEFORM_TOKEN?)" });

  // SessionReview: denied + approved (manually verified) session tokens
  const deniedIds = new Set();
  const approvedIds = new Set();
  try {
    const sheets = getSheetsClient();
    const rr = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "SessionReview!A:I",
    });
    const rows = rr.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const status = rows[i][0];
      const id = rows[i][7]?.trim();
      if (!id) continue;
      if (status === "Denied" || status === "DENIED") deniedIds.add(id);
      else if (["Approved", "TRUE", "YES", "Half Credit"].includes(status)) approvedIds.add(id);
    }
  } catch (e) { /* fall back to counting all matched */ }

  const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);
  const roster = MENTEES.filter(m => !STAFF.has(m.slug));
  const slugs = roster.map(m => m.slug);

  // Accumulate per-mentee: sessions logged + credited minutes
  const acc = {};
  slugs.forEach(s => { acc[s] = { sessions: 0, minutes: 0 }; });
  for (const item of data.items || []) {
    if (deniedIds.has(item.token)) continue;
    const answers = item.answers || [];
    const first = get(answers, FIELDS.first)?.text?.trim() || "";
    const last  = get(answers, FIELDS.last)?.text?.trim()  || "";
    if (!first && !last) continue; // blank/junk submission
    const slug = slugs.find(s => matchesMentee(first, last, s));
    if (!slug) continue;
    const rawMin = get(answers, FIELDS.sixtyMin);
    let minutes = rawMin?.number ?? (rawMin?.boolean === true ? 60 : null);
    if (minutes == null) minutes = approvedIds.has(item.token) ? 60 : 0;
    acc[slug].sessions += 1;
    acc[slug].minutes += minutes;
  }

  const milestonesFor = min => (min >= 180 ? 3 : min >= 120 ? 2 : min >= 60 ? 1 : 0);
  const mentees = roster.map(m => {
    const a = acc[m.slug];
    const milestones = milestonesFor(a.minutes);
    return {
      slug: m.slug,
      name: `${m.first} ${m.last}`.trim(),
      cohort: m.cohort || null,
      cohortName: COHORT_NAMES[m.cohort] || "",
      company: m.company || "",
      mentor: m.mentor?.name || "",
      sessions: a.sessions,
      minutes: a.minutes,
      milestones,
      complete: milestones >= 3,
      churned: !!m.churned,
    };
  });

  // Cohort rollup (active mentees only)
  const active = mentees.filter(m => !m.churned);
  const byCohort = {};
  for (const m of active) {
    const key = m.cohort || 0;
    byCohort[key] = byCohort[key] || { cohort: key, cohortName: m.cohortName, total: 0, complete: 0, two: 0, one: 0, zero: 0 };
    byCohort[key].total += 1;
    if (m.complete) byCohort[key].complete += 1;
    else if (m.milestones === 2 || m.sessions === 2) byCohort[key].two += 1;
    else if (m.milestones === 1 || m.sessions === 1) byCohort[key].one += 1;
    else byCohort[key].zero += 1;
  }

  const completeTotal = active.filter(m => m.complete).length;
  return res.status(200).json({
    ok: true,
    goal: GOAL_COMPLETERS,
    completeTotal,
    remainingToGoal: Math.max(0, GOAL_COMPLETERS - completeTotal),
    totalMentees: mentees.length,
    activeMentees: active.length,
    cohorts: Object.values(byCohort).sort((a, b) => a.cohort - b.cohort),
    mentees: mentees.sort((a, b) => (a.cohort - b.cohort) || (b.sessions - a.sessions) || a.name.localeCompare(b.name)),
  });
}
