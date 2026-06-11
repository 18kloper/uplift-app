// One-shot: clean up stale "sent" rows in Mentor Confirmations
// - Shippy Singh is churned — mark as needs-match
// - Tom Oser / Rikin Diwan mentees already marked needs-match; update their "sent" status too
// - Adrienne Rosenthal declined — mark evan-peneiras already done (needs-match), update priyal-levine
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  // Slugs to move from "sent" → "needs-match" due to churn or mentor dropout
  const demoteToNeedsMatch = new Set([
    "shippy-singh",    // churned mentee
    "priyal-levine",   // Adrienne Rosenthal dropped out
  ]);

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const status = (row[5] || "").trim().toLowerCase();
    const slug   = (row[4] || "").trim();
    const sheetRow = idx + 2;

    if (status === "sent" && demoteToNeedsMatch.has(slug)) {
      updates.push({ range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] });
      updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
      updates.push({ range: `${TAB}!H${sheetRow}`, values: [["Cleaned up — mentee churned or mentor dropped out"]] });
      log.push(`Row ${sheetRow}: ${slug} sent → needs-match`);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
  }

  return res.status(200).json({ ok: true, log: log.length ? log : ["Nothing to update"] });
}
