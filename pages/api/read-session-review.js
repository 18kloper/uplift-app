// GET /api/read-session-review?clear=1  — clears data rows and returns current contents
// GET /api/read-session-review           — just reads current contents
import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  try {
    const sheets = getSheetsClient();

    if (req.query.clear === "1") {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A2:I",
      });
    }

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
