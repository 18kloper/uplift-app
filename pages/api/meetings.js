// GET /api/meetings?slug=pearl-gabel
// Fetches this mentee's submitted mentor meeting reports from Typeform.
// Pending sessions (not auto-qualified) are synced to the SessionReview
// sheet tab so admins can check them off. Checked rows are returned as
// manuallyVerified: true and promoted to the verified stack on the portal.
//
// After resolving approved/denied sessions, the API automatically syncs
// mentorSession1/2/3 milestones to the Dashboard tab so approvals in the
// SessionReview sheet are immediately reflected without requiring the mentee
// to reload their portal.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../lib/sheets-helper";

const FORM_ID = "e0L62296";
const FIELDS  = {
  first:      "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:       "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:       "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  sixtyMin:   "fcee13e9-5193-4f01-b3b4-aed4f421b933",
  notes:      "719c5b7a-8246-4c7a-be74-a1e71512ee46",
  takeaways:  "0d816bc2-6793-4c72-b28d-5b34f48ce5b7",
};

// SessionReview sheet columns (1-indexed for humans, 0-indexed in rows array):
// A(0): Approved   B(1): Slug   C(2): Mentee Name   D(3): Date
// E(4): 60+ Min    F(5): Has Transcript   G(6): Key Takeaways
// H(7): Session ID   I(8): Submitted At

async function ensureSessionReviewTab(sheets) {
  // Create the SessionReview tab + header row if needed, then apply the
  // Pending / Approved / Denied dropdown to column A (rows 2–1000).
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
    let sheetInfo = meta.data.sheets?.find(s => s.properties.title === "SessionReview");

    if (!sheetInfo) {
      const addRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: "SessionReview" } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A1:I1",
        valueInputOption: "RAW",
        requestBody: { values: [["Approved", "Slug", "Mentee Name", "Date", "60+ Min", "Has Transcript", "Key Takeaways", "Session ID", "Submitted At"]] },
      });
      sheetInfo = addRes.data.replies?.[0]?.addSheet;
    }

    const sheetId = sheetInfo?.properties?.sheetId;
    if (sheetId != null) {
      // (Re-)apply the dropdown validation so it's always present
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [{
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1, endRowIndex: 1000,
                startColumnIndex: 0, endColumnIndex: 1,
              },
              rule: {
                condition: {
                  type: "ONE_OF_LIST",
                  values: [
                    { userEnteredValue: "Pending" },
                    { userEnteredValue: "Approved" },
                    { userEnteredValue: "Half Credit" },
                    { userEnteredValue: "Denied" },
                  ],
                },
                strict: false,
                showCustomUi: true,
              },
            },
          }],
        },
      });
    }
  } catch (err) {
    console.error("ensureSessionReviewTab failed:", err.message);
  }
}

async function syncSessionReview(slug, menteeName, pendingSessions) {
  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets || pendingSessions.length === 0) return { approvedIds: new Set(), deniedIds: new Set(), halfCreditIds: new Set() };

  try {
    const sheets = getSheetsClient();

    // Auto-create tab + headers if needed
    await ensureSessionReviewTab(sheets);

    // Read existing rows to find already-tracked IDs and approved ones
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "SessionReview!A:I",
    });
    const rows = readRes.data.values || [];

    const existingIds  = new Set();
    const approvedIds  = new Set();
    const deniedIds    = new Set();
    const halfCreditIds = new Set();
    // Start at row 1 to skip header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const sessionId = row[7]?.trim();
      if (!sessionId) continue;
      existingIds.add(sessionId);
      const approved = row[0];
      if (approved === "TRUE" || approved === true || approved === "YES" || approved === "Approved") {
        approvedIds.add(sessionId);
        if (row[4] === "No") halfCreditIds.add(sessionId);
      } else if (approved === "Half Credit") {
        approvedIds.add(sessionId);
        halfCreditIds.add(sessionId);
      } else if (approved === "DENIED" || approved === "Denied") {
        deniedIds.add(sessionId);
      }
    }

    // Append any pending sessions not yet in the sheet
    const toAppend = pendingSessions.filter(m => !existingIds.has(m.id));
    console.log(`[SessionReview] slug=${slug} menteeName="${menteeName}" pending=${pendingSessions.length} toAppend=${toAppend.length}`);
    if (toAppend.length > 0) {
      const newRows = toAppend.map(m => [
        "Pending",
        String(slug),
        String(menteeName),
        String(m.date || ""),
        m.sixtyMin === true ? "Yes" : m.sixtyMin === false ? "No" : "",
        m.notes?.trim() ? "Yes" : "No",
        String(m.takeaways || ""),
        String(m.id || ""),
        String(m.submittedAt || ""),
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A:I",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: newRows },
      });
    }

    return { approvedIds, deniedIds, halfCreditIds };
  } catch (err) {
    console.error("SessionReview sync failed:", err.message);
    return { approvedIds: new Set(), deniedIds: new Set(), halfCreditIds: new Set() };
  }
}

// Dashboard columns: A(0)=Slug, B–F = name/cohort/company/email/mentorEmail,
// then MILESTONE_KEYS starting at column G (index 6).
const MILESTONE_COL_OFFSET = 6; // col G

function colLetter(idx) {
  let s = "";
  let n = idx;
  while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
  return s;
}

async function autoSyncMentorMilestones(slug, qualifyingCount) {
  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return;

  try {
    const sheets  = getSheetsClient();
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Read header row first to find actual milestone column positions
    const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Milestone Dashboard!A1:Z1" });
    const headerRow = (headerRes.data.values || [[]])[0] || [];

    const keys = ["mentorSession1", "mentorSession2", "mentorSession3"];
    const colIdxs = keys.map(k => {
      const byLabel = headerRow.findIndex(h => h === MILESTONE_LABELS[k]);
      return byLabel !== -1 ? byLabel : MILESTONE_COL_OFFSET + MILESTONE_KEYS.indexOf(k);
    });

    // Read slug column + the three milestone columns in one call
    const maxCol = Math.max(...colIdxs);
    const range  = `Milestone Dashboard!A:${colLetter(maxCol)}`;
    const res    = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows   = res.data.values || [];

    // Locate this mentee's row (1-based sheet row)
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === slug);
    if (rowIdx === -1) return; // slug not in Dashboard — nothing to do
    const sheetRow = rowIdx + 1;
    const row      = rows[rowIdx];

    // Build batch updates for any milestone that should now be TRUE but isn't
    const updates = keys
      .map((key, i) => ({ key, colIdx: colIdxs[i], shouldBeTrue: qualifyingCount >= i + 1 }))
      .filter(({ shouldBeTrue, colIdx }) => {
        const current = row[colIdx];
        return shouldBeTrue && current !== "TRUE" && current !== true;
      })
      .map(({ colIdx }) => ({
        range: `Milestone Dashboard!${colLetter(colIdx)}${sheetRow}`,
        values: [["TRUE"]],
      }));

    if (updates.length === 0) return;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: "USER_ENTERED", data: updates },
    });
    console.log(`[autoSyncMentorMilestones] slug=${slug} updated ${updates.map(u => u.range).join(", ")}`);
  } catch (err) {
    console.error("autoSyncMentorMilestones failed:", err.message);
  }
}

// Fetch all Typeform responses once. Server-side batch callers can fetch this
// a single time and pass it into fetchMeetings() so we don't re-download 1000
// responses per mentee (which makes a full-cohort sync time out).
// Compute how many mentor-session milestones a meetings array qualifies for.
// ≥60 min = 1, ≥120 = 2, ≥180 = 3. Shared by fetchMeetings + batch sync so the
// crediting rule lives in one place.
export function meetingsQualifyingCount(meetings = []) {
  const totalMinutes = meetings
    .filter(m => !m.denied && (m.minutes != null || m.manuallyVerified))
    .reduce((sum, m) => sum + (m.minutes ?? 60), 0);
  return totalMinutes >= 180 ? 3 : totalMinutes >= 120 ? 2 : totalMinutes >= 60 ? 1 : 0;
}

export async function fetchTypeformResponses() {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return null;
  const tfResponse = await fetch(
    `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return tfResponse.json();
}

// Core logic extracted so server-side callers (e.g. sync-all-sessions) can run
// it in-process instead of fetching the public URL (which trips Vercel's
// challenge layer). Returns the meetings array, or [] on any failure.
// Pass prefetched Typeform data to avoid re-downloading per mentee.
export async function fetchMeetings(slug, prefetched = null, opts = {}) {
  if (!slug) return [];
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return [];
  const { skipMilestoneSync = false, rethrow = false } = opts;

  try {
    const data = prefetched || await fetchTypeformResponses();
    if (!data) return [];

    const parts     = slug.split("-");
    const firstName = parts[0].toLowerCase();
    const lastName  = parts.slice(1).join("-").toLowerCase();
    const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);

    // Levenshtein similarity: returns 0–1 where 1 = identical
    function similarity(a, b) {
      if (!a || !b) return 0;
      if (a === b) return 1;
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
          dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      return 1 - dp[m][n] / Math.max(m, n);
    }

    // Normalize a name token to alphanumerics only — strips every apostrophe
    // (straight ' and curly), quote, dash, period, and space variant uniformly.
    // Handles D'Anjou (straight apostrophe), D'Agostino, Adeoye-Davids, etc.
    function normalize(str) {
      return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    }

    function fuzzyMatch(submitted, fromSlug) {
      const s = submitted.toLowerCase().trim();
      const t = fromSlug.toLowerCase().trim();
      if (!s || !t) return false;
      // Exact match
      if (s === t) return true;
      // Normalized match (strip apostrophes + hyphens — handles D'Agostino → dagostino)
      if (normalize(s) === normalize(t)) return true;
      // First word of submitted (handles "Pradeep Kumar" → "pradeep")
      const firstWord = s.split(/\s+/)[0];
      if (firstWord === t) return true;
      if (normalize(firstWord) === normalize(t)) return true;
      // 70% similarity threshold on first word
      if (similarity(firstWord, t) >= 0.7) return true;
      // Also try normalized first word vs normalized slug token
      if (similarity(normalize(firstWord), normalize(t)) >= 0.7) return true;
      return false;
    }

    let menteeName = "";
    const meetings = [];
    for (const item of data.items || []) {
      const answers  = item.answers || [];
      const first    = get(answers, FIELDS.first)?.text?.trim() || "";
      const last     = get(answers, FIELDS.last)?.text?.trim()  || "";

      // Robust match, independent of how the name is split across the two
      // fields. Compare the combined normalized name to the combined slug —
      // handles full-name-in-one-field (e.g. "Kima D'Anjou" with empty last),
      // extra middle names, apostrophes, and hyphens uniformly.
      const submittedFull = normalize(first + last);
      const slugFull      = normalize(firstName + lastName);
      const combinedMatch = submittedFull && slugFull && submittedFull === slugFull;

      if (combinedMatch) {
        // full-name match — accept
      } else if (!first && last && lastName && fuzzyMatch(last, lastName)) {
        // last name match only — acceptable fallback for blank first name submissions
      } else if (!fuzzyMatch(first, firstName)) {
        continue;
      } else if (lastName && !fuzzyMatch(last, lastName)) {
        continue;
      }

      // Capture display name from first matching response
      if (!menteeName) {
        const rawFirst = get(answers, FIELDS.first)?.text?.trim() || "";
        const rawLast  = get(answers, FIELDS.last)?.text?.trim()  || "";
        menteeName = `${rawFirst} ${rawLast}`.trim();
      }

      // Normalize session length: new numeric field, or old boolean (true=60, false=30)
      const rawAnswer = get(answers, FIELDS.sixtyMin);
      let minutes = null;
      if (rawAnswer?.number != null) {
        minutes = rawAnswer.number;
      } else if (rawAnswer?.boolean === true) {
        minutes = 60;
      }

      meetings.push({
        id:          item.token,
        date:        get(answers, FIELDS.date)?.text || get(answers, FIELDS.date)?.date || "",
        minutes,
        sixtyMin:    minutes == null ? null : minutes >= 60,
        notes:       get(answers, FIELDS.notes)?.text     || "",
        takeaways:   get(answers, FIELDS.takeaways)?.text || "",
        submittedAt: item.submitted_at,
      });
    }

    // Sort newest first
    meetings.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Separate pending sessions and sync to SessionReview sheet
    const INVALID_NOTES = new Set(["n/a", "na", "none", "no", "nothing", "-", "n.a.", "n/a."]);
    const validNotes = n => { const t = n?.trim().toLowerCase(); return t && !INVALID_NOTES.has(t); };
    // Any session with a known duration auto-qualifies — no manual review needed
    const autoQualifies = m => m.minutes != null;
    const pending = meetings.filter(m => !autoQualifies(m));
    const { approvedIds, deniedIds, halfCreditIds } = await syncSessionReview(slug, menteeName, pending);

    // Flag any approved or denied sessions; override sixtyMin to false if admin flagged half-credit
    const result = meetings.map(m => ({
      ...m,
      manuallyVerified: approvedIds.has(m.id),
      denied: deniedIds.has(m.id),
      sixtyMin: halfCreditIds.has(m.id) ? false : m.sixtyMin,
    }));

    // Auto-sync mentor session milestones to Dashboard whenever sessions are loaded.
    // This ensures a manual approval in SessionReview is immediately reflected
    // without waiting for the mentee to trigger an update from their portal.
    // Total minutes across all non-denied qualifying sessions
    // ≥180 min total = all 3 milestones earned
    const totalMinutes = result
      .filter(m => !m.denied && (m.minutes != null || m.manuallyVerified))
      .reduce((sum, m) => sum + (m.minutes ?? 60), 0);
    // Convert to a session count equivalent for autoSyncMentorMilestones:
    // each 60-min block = 1 session credit; milestones unlock at 60, 120, 180 min
    const qualifyingCount = totalMinutes >= 180 ? 3 : totalMinutes >= 120 ? 2 : totalMinutes >= 60 ? 1 : 0;
    // Batch callers skip the per-mentee Dashboard read/write (which re-reads the
    // whole sheet each call) and do one bulk write themselves. They read
    // qualifyingCount off the returned array via meetingsQualifyingCount().
    if (!skipMilestoneSync) {
      await autoSyncMentorMilestones(slug, qualifyingCount);
    }

    return result;
  } catch (err) {
    console.error("Meetings fetch failed:", err.message);
    if (rethrow) throw err;
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });
  const meetings = await fetchMeetings(slug);
  return res.status(200).json({ meetings });
}
