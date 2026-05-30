// GET /api/read-session-review — reads current rows from SessionReview sheet
import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  try {
    const sheets = getSheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "SessionReview!A:I",
    });
    const rows = r.data.values || [];
    return res.status(200).json({ rowCount: rows.length, rows });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
