// One-shot: move alok-rai to needs-match (mentor declined)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row[4]?.trim() !== "alok-rai") continue;
    const sheetRow = idx + 2;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: [
        { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
        { range: `${TAB}!G${sheetRow}`, values: [[now]] },
        { range: `${TAB}!H${sheetRow}`, values: [["Mentor declined — needs new match"]] },
      ]},
    });
    return res.status(200).json({ ok: true, log: [`Row ${sheetRow}: alok-rai → needs-match`] });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
    requestBody: { values: [["admin-needs-match-alok-rai", "Connie Pascal", "cpascal@comminfo.rutgers.edu", "Alok Rai", "alok-rai", "needs-match", now, "Mentor declined — needs new match"]] },
  });
  return res.status(200).json({ ok: true, log: ["Appended: alok-rai → needs-match"] });
}
