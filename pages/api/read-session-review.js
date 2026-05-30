// GET /api/read-session-review?reset=1  — wipes all data rows, keeps header
// GET /api/read-session-review           — reads current contents
import { getSheetsClient } from "../../lib/sheets-helper";

const HEADER = ["Approved", "Slug", "Mentee Name", "Date", "60+ Min", "Has Transcript", "Key Takeaways", "Session ID", "Submitted At"];

export default async function handler(req, res) {
  try {
    const sheets = getSheetsClient();

    if (req.query.reset === "1") {
      // Clear everything, then re-write header only
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A:Z",
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A1:I1",
        valueInputOption: "RAW",
        requestBody: { values: [HEADER] },
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
