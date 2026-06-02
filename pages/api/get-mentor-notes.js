// GET /api/get-mentor-notes
// Returns all rows from "Mentor Notes" sheet as mentorKey → note map.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Notes";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ notes: {} });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets.some(s => s.properties.title === TAB);
    if (!exists) return res.status(200).json({ notes: {} });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:C500`,
    });

    const rows = result.data.values || [];
    const notes = {};
    for (const row of rows) {
      const key  = row[0]?.trim();
      const note = row[1] ?? "";
      if (key) notes[key] = note;
    }

    return res.status(200).json({ notes });
  } catch (err) {
    console.error("get-mentor-notes error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
