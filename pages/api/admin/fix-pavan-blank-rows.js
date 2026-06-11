// One-shot: clear blank needs-match rows from Pavan Kumar (rows 111 & 112 with empty slug/name)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];

  // Find rows that have Pavan Kumar as mentor but empty slug
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const mentorName = row[1]?.trim();
    const slug = row[4]?.trim();
    if (mentorName === "Pavan Kumar" && !slug) {
      // Clear the entire row by overwriting with empty values
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!A${sheetRow}:H${sheetRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [["", "", "", "", "", "", "", ""]] },
      });
      log.push(`Cleared blank row ${sheetRow} (Pavan Kumar, empty slug)`);
    }
  }

  return res.status(200).json({ ok: true, log });
}
