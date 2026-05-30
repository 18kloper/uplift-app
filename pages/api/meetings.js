// GET /api/meetings?slug=pearl-gabel
// Fetches this mentee's submitted mentor meeting reports from Typeform.
// Pending sessions (not auto-qualified) are synced to the SessionReview
// sheet tab so admins can check them off. Checked rows are returned as
// manuallyVerified: true and promoted to the verified stack on the portal.

import { getSheetsClient } from "../../lib/sheets-helper";

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
  // Create the SessionReview tab + header row if it doesn't exist yet
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
    const exists = meta.data.sheets?.some(s => s.properties.title === "SessionReview");
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: "SessionReview" } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A1:I1",
        valueInputOption: "RAW",
        requestBody: { values: [["Approved", "Slug", "Mentee Name", "Date", "60+ Min", "Has Transcript", "Key Takeaways", "Session ID", "Submitted At"]] },
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
  if (!hasSheets || pendingSessions.length === 0) return { approvedIds: new Set(), deniedIds: new Set() };

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

    const existingIds = new Set();
    const approvedIds = new Set();
    const deniedIds   = new Set();
    // Start at row 1 to skip header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const sessionId = row[7]?.trim();
      if (!sessionId) continue;
      existingIds.add(sessionId);
      const approved = row[0];
      if (approved === "TRUE" || approved === true || approved === "YES") {
        approvedIds.add(sessionId);
      } else if (approved === "DENIED") {
        deniedIds.add(sessionId);
      }
    }

    // Append any pending sessions not yet in the sheet
    const toAppend = pendingSessions.filter(m => !existingIds.has(m.id));
    console.log(`[SessionReview] slug=${slug} menteeName="${menteeName}" pending=${pendingSessions.length} toAppend=${toAppend.length}`);
    if (toAppend.length > 0) {
      const newRows = toAppend.map(m => [
        "FALSE",
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

    return { approvedIds, deniedIds };
  } catch (err) {
    console.error("SessionReview sync failed:", err.message);
    return { approvedIds: new Set(), deniedIds: new Set() };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ meetings: [] });

  try {
    const tfResponse = await fetch(
      `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await tfResponse.json();

    const parts     = slug.split("-");
    const firstName = parts[0].toLowerCase();
    const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);

    let menteeName = "";
    const meetings = [];
    for (const item of data.items || []) {
      const answers  = item.answers || [];
      const first    = get(answers, FIELDS.first)?.text?.trim().toLowerCase()  || "";
      const last     = get(answers, FIELDS.last)?.text?.trim().toLowerCase()   || "";

      // Match first name: exact OR first word only (handles "Pradeep Kumar" → "pradeep")
      const firstWord = first.split(/\s+/)[0];
      if (firstWord !== firstName) continue;

      // Verify last name appears in slug (skip for single-word slugs like "kennedy")
      const hasLastInSlug = slug.includes("-")
        ? slug.includes(last.split(" ")[0].replace(/[^a-z]/g, ""))
        : true;
      if (!hasLastInSlug) continue;

      // Capture display name from first matching response
      if (!menteeName) {
        const rawFirst = get(answers, FIELDS.first)?.text?.trim() || "";
        const rawLast  = get(answers, FIELDS.last)?.text?.trim()  || "";
        menteeName = `${rawFirst} ${rawLast}`.trim();
      }

      meetings.push({
        id:          item.token,
        date:        get(answers, FIELDS.date)?.text || get(answers, FIELDS.date)?.date || "",
        sixtyMin:    get(answers, FIELDS.sixtyMin)?.boolean ?? null,
        notes:       get(answers, FIELDS.notes)?.text     || "",
        takeaways:   get(answers, FIELDS.takeaways)?.text || "",
        submittedAt: item.submitted_at,
      });
    }

    // Sort newest first
    meetings.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Separate pending sessions and sync to SessionReview sheet
    const autoQualifies = m => m.sixtyMin === true && m.notes?.trim();
    const pending = meetings.filter(m => !autoQualifies(m));
    const { approvedIds, deniedIds } = await syncSessionReview(slug, menteeName, pending);

    // Flag any approved or denied sessions
    const result = meetings.map(m => ({
      ...m,
      manuallyVerified: approvedIds.has(m.id),
      denied: deniedIds.has(m.id),
    }));

    return res.status(200).json({ meetings: result });
  } catch (err) {
    console.error("Meetings fetch failed:", err.message);
    return res.status(200).json({ meetings: [] });
  }
}
