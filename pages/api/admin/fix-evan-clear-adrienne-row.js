// One-shot: clear the stale Adrienne Rosenthal → evan-peneiras needs-match row (row 95)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const threadId = r[0]?.trim();
    const slug = r[4]?.trim();
    const status = r[5]?.trim();
    if (threadId === "no-reply-adrienne-evan" && slug === "evan-peneiras" && status === "needs-match") {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!A${sheetRow}:H${sheetRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [["", "", "", "", "", "", "", ""]] },
      });
      log.push(`Cleared row ${sheetRow}: Adrienne Rosenthal → evan-peneiras (stale needs-match)`);
    }
  }

  return res.status(200).json({ ok: true, log });
}
