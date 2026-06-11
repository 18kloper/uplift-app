// One-shot: show all andrea-vernengo rows and clear duplicate needs-match rows
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const andreaRows = [];
  const needsMatchRows = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const slug = r[4]?.trim();
    if (slug !== "andrea-vernengo") continue;
    andreaRows.push({ sheetRow: idx + 2, threadId: r[0], mentorName: r[1], status: r[5] });
    if (r[5]?.trim() === "needs-match") needsMatchRows.push(idx + 2);
  }

  // Clear ALL needs-match rows for andrea-vernengo (she has a confirmed match)
  const log = [];
  for (const sheetRow of needsMatchRows) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A${sheetRow}:H${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [["", "", "", "", "", "", "", ""]] },
    });
    log.push(`Cleared needs-match row ${sheetRow} for andrea-vernengo`);
  }

  return res.status(200).json({ ok: true, andreaRows, log });
}
