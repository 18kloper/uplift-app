// Temporary debug endpoint — reads current contents of SessionReview sheet
// GET /api/debug-session-review

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  try {
    const sheets = getSheetsClient();
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "SessionReview!A:I",
    });
    const rows = readRes.data.values || [];
    return res.status(200).json({ rowCount: rows.length, rows });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
