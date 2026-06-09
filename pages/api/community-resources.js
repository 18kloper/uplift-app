// GET /api/community-resources
// Returns all rows from "Resource Submissions" tab with Status = "Approved"

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ resources: [] });
  }

  try {
    const sheets = getSheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Resource Submissions!A:G",
    });

    const rows = r.data.values || [];
    if (rows.length < 2) return res.status(200).json({ resources: [] });

    // Row: Timestamp(0) | Status(1) | Type(2) | Title(3) | URL(4) | Note(5) | Mentor(6)
    const approved = rows.slice(1)
      .filter(row => (row[1] || "").trim().toLowerCase() === "approved")
      .map(row => ({
        type:  row[2] || "Other",
        title: row[3] || "",
        url:   row[4] || "",
        note:  row[5] || "",
      }))
      .filter(r => r.title);

    return res.status(200).json({ resources: approved });
  } catch (err) {
    return res.status(200).json({ resources: [], error: err.message });
  }
}
