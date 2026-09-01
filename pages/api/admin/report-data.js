// GET /api/admin/report-data?token=...
// TEMPORARY one-off: single aggregation endpoint powering the NJEDA static
// reports in public/njeda-*.html. Pulls the Milestone Dashboard (source of
// truth for edu/mentor/midpoint milestones), live Typeform mentor-session
// minutes, and approved LumaAttendance rows (for the per-session checkmark
// grid), all in one payload so the reports can be regenerated in one pass.
// Safe to delete once no longer needed for report regeneration.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";
import { fetchTypeformResponses, matchesMentee } from "../meetings";

const FIELDS = {
  first:    "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:     "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  sixtyMin: "fcee13e9-5193-4f01-b3b4-aed4f421b933",
};
const STAFF = new Set(["kennedy", "jackie", "aaron", "mj"]);
const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

export default async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // ---- Milestone Dashboard (source of truth for edu/mentor/midpoint) ----
  const dashRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A1:Z400",
  });
  const dashRows = dashRes.data.values || [];
  const dashHeaders = dashRows[0] || [];
  const colFor = (key) => {
    const byLabel = dashHeaders.findIndex(h => h === MILESTONE_LABELS[key]);
    if (byLabel !== -1) return byLabel;
    return 6 + MILESTONE_KEYS.indexOf(key);
  };
  const cols = {};
  MILESTONE_KEYS.forEach(k => { cols[k] = colFor(k); });

  const dashBySlug = {};
  for (let i = 1; i < dashRows.length; i++) {
    const row = dashRows[i];
    const slug = (row[0] || "").trim();
    if (!slug) continue;
    const entry = {};
    for (const k of MILESTONE_KEYS) {
      entry[k] = (row[cols[k]] || "").toUpperCase() === "TRUE";
    }
    // Midpoint can also be "EXCUSED" (waived in-person requirement, still
    // credited toward the edu-session total) — keep the raw string too.
    entry.midpointRaw = (row[cols.midpoint] || "").toUpperCase();
    dashBySlug[slug] = entry;
  }

  // ---- Live Typeform mentor-session minutes (same logic as session-counts) ----
  const tfData = await fetchTypeformResponses();
  const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);
  const allSlugs = MENTEES.map(m => m.slug);
  const sessionAcc = {};
  allSlugs.forEach(s => { sessionAcc[s] = { sessions: 0, minutes: 0 }; });

  // SessionReview: denied + approved (manually verified) session tokens —
  // same reconciliation session-counts.js applies before trusting raw minutes.
  const deniedIds = new Set();
  const approvedIds = new Set();
  try {
    const rr = await sheets.spreadsheets.values.get({
      spreadsheetId,
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

  if (tfData) {
    for (const item of tfData.items || []) {
      if (deniedIds.has(item.token)) continue;
      const answers = item.answers || [];
      const first = get(answers, FIELDS.first)?.text?.trim() || "";
      const last  = get(answers, FIELDS.last)?.text?.trim()  || "";
      if (!first && !last) continue;
      const slug = allSlugs.find(s => matchesMentee(first, last, s));
      if (!slug) continue;
      const rawMin = get(answers, FIELDS.sixtyMin);
      let minutes = rawMin?.number ?? (rawMin?.boolean === true ? 60 : null);
      if (minutes == null) minutes = approvedIds.has(item.token) ? 60 : 0;
      sessionAcc[slug].sessions += 1;
      sessionAcc[slug].minutes += minutes;
    }
  }

  // ---- Approved LumaAttendance rows (for per-session checkmark grid) ----
  let attRows = [];
  try {
    const attRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "LumaAttendance!A:N",
    });
    const raw = attRes.data.values || [];
    const headers = raw[0] || [];
    const idx = (name) => headers.findIndex(h => h?.toLowerCase() === name.toLowerCase());
    const iName = idx("eventName"), iDate = idx("eventDate"), iSlug = idx("menteeSlug"),
          iStatus = idx("status"), iReview = idx("reviewStatus");
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      const slug = (row[iSlug] || "").trim();
      if (!slug) continue;
      const review = (row[iReview] || "").toLowerCase();
      const status = (row[iStatus] || "").toLowerCase();
      if (review !== "approved") continue;
      if (status !== "checked_in" && status !== "") continue;
      attRows.push({
        slug,
        eventName: row[iName] || "",
        eventDate: row[iDate] || "",
      });
    }
  } catch (e) {
    // LumaAttendance tab missing/unreadable — leave attRows empty
  }

  // ---- Roster ----
  const roster = MENTEES.filter(m => !STAFF.has(m.slug)).map(m => ({
    slug: m.slug,
    name: `${m.first} ${m.last}`.trim(),
    cohort: m.cohort || null,
    cohortName: COHORT_NAMES[m.cohort] || "",
    company: m.company || "",
    mentorName: m.mentor?.name || "",
    mentorEmail: m.mentor?.email || "",
    churned: !!m.churned,
  }));

  return res.status(200).json({
    ok: true,
    roster,
    dashboard: dashBySlug,
    mentorSessions: sessionAcc,
    lumaApproved: attRows,
  });
}
