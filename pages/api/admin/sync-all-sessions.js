// GET /api/admin/sync-all-sessions?token=...
// Pulls every active mentee's Typeform sessions and syncs mentorSession1/2/3
// milestones to the Dashboard. Designed to also be called by a cron job.
//
// Performance: Typeform is fetched ONCE and the Dashboard is read + written
// ONCE in bulk (rather than per-mentee), so the full cohort completes well
// inside the function time limit.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";
import { fetchMeetings, fetchTypeformResponses, meetingsQualifyingCount } from "../meetings";

export const config = { maxDuration: 60 };

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);
const MENTOR_KEYS = ["mentorSession1", "mentorSession2", "mentorSession3"];
const MILESTONE_COL_OFFSET = 6; // col G

function colLetter(idx) {
  let s = "";
  let n = idx;
  while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const slugs = MENTEES
    .filter(m => !TEST_SLUGS.has(m.slug) && m.mentor?.email)
    .map(m => m.slug);

  // 1. Fetch all Typeform responses ONCE, then match every mentee against it.
  const typeformData = await fetchTypeformResponses();

  // 2. Per mentee: get their meetings (skip the per-mentee Dashboard write —
  //    we do one bulk write below). Compute qualifyingCount + a display count.
  const INVALID = new Set(["n/a","na","none","no","nothing","-","n.a.","n/a."]);
  const vn = n => { const t = n?.trim().toLowerCase(); return t && !INVALID.has(t); };

  const results = [];
  for (const slug of slugs) {
    try {
      const meetings = await fetchMeetings(slug, typeformData, { skipMilestoneSync: true });
      const qualifyingCount = meetingsQualifyingCount(meetings || []);
      const sessions = (meetings || [])
        .filter(m => !m.denied && (vn(m.notes) || m.manuallyVerified))
        .reduce((sum, m) => sum + (m.minutes != null ? Math.round((m.minutes / 60) * 100) / 100 : 1.0), 0);
      results.push({ slug, sessions, qualifyingCount, ok: true });
    } catch (e) {
      results.push({ slug, ok: false, error: e.message });
    }
  }

  // 3. Read the Dashboard ONCE, compute every cell that should flip to TRUE,
  //    write them all in a single batchUpdate.
  let updatedCells = 0;
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Milestone Dashboard!A1:Z1" });
    const headerRow = (headerRes.data.values || [[]])[0] || [];
    const colIdxs = MENTOR_KEYS.map(k => {
      const byLabel = headerRow.findIndex(h => h === MILESTONE_LABELS[k]);
      return byLabel !== -1 ? byLabel : MILESTONE_COL_OFFSET + MILESTONE_KEYS.indexOf(k);
    });

    const maxCol = Math.max(...colIdxs);
    const dashRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `Milestone Dashboard!A:${colLetter(maxCol)}` });
    const rows = dashRes.data.values || [];
    const rowBySlug = {};
    rows.forEach((r, i) => { if (i > 0 && r[0]) rowBySlug[r[0]] = { row: r, sheetRow: i + 1 }; });

    const data = [];
    for (const r of results) {
      if (!r.ok || !r.qualifyingCount) continue;
      const entry = rowBySlug[r.slug];
      if (!entry) continue;
      MENTOR_KEYS.forEach((key, i) => {
        if (r.qualifyingCount < i + 1) return;
        const colIdx = colIdxs[i];
        const current = entry.row[colIdx];
        if (current === "TRUE" || current === true) return;
        data.push({ range: `Milestone Dashboard!${colLetter(colIdx)}${entry.sheetRow}`, values: [["TRUE"]] });
      });
    }

    if (data.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data },
      });
      updatedCells = data.length;
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: `bulk write failed: ${e.message}`, results });
  }

  const totalSessions = results.reduce((sum, r) => sum + (r.sessions || 0), 0);
  const withSessions = results.filter(r => r.sessions > 0).map(r => ({ slug: r.slug, sessions: r.sessions, milestones: r.qualifyingCount }));

  return res.status(200).json({
    ok: true,
    synced: results.length,
    updatedCells,
    totalSessions: Math.round(totalSessions * 100) / 100,
    withSessions,
  });
}
