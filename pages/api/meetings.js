// GET /api/meetings?slug=pearl-gabel
// Fetches this mentee's submitted mentor meeting reports from Typeform,
// then overlays manual verifications from the ManualVerifications sheet tab.

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

// Fetch manually verified session IDs for a given slug from the sheet.
// Returns a Set of session IDs (Typeform tokens).
async function getManualVerifications(slug) {
  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return new Set();

  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "ManualVerifications!A:B",
    });
    const rows = res.data.values || [];
    const ids = new Set();
    for (const row of rows) {
      if (row[0]?.trim().toLowerCase() === slug.toLowerCase() && row[1]?.trim()) {
        ids.add(row[1].trim());
      }
    }
    return ids;
  } catch (_) {
    return new Set();
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ meetings: [] });

  try {
    const [tfResponse, manualIds] = await Promise.all([
      fetch(
        `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      getManualVerifications(slug),
    ]);
    const data = await tfResponse.json();

    const parts     = slug.split("-");
    const firstName = parts[0].toLowerCase();
    const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);

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

      meetings.push({
        id:              item.token,
        date:            get(answers, FIELDS.date)?.text || get(answers, FIELDS.date)?.date || "",
        sixtyMin:        get(answers, FIELDS.sixtyMin)?.boolean ?? null,
        notes:           get(answers, FIELDS.notes)?.text     || "",
        takeaways:       get(answers, FIELDS.takeaways)?.text || "",
        submittedAt:     item.submitted_at,
        manuallyVerified: manualIds.has(item.token),
      });
    }

    // Sort newest first
    meetings.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return res.status(200).json({ meetings });
  } catch (err) {
    console.error("Meetings fetch failed:", err.message);
    return res.status(200).json({ meetings: [] });
  }
}
