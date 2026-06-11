// One-shot: confirm Dee Marshall → jeremy-ruiz-villavicencio
// Dee confirmed Jun 8: "Yes I'm in."
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const updates = [];

  let found = false;
  rows.forEach((row, idx) => {
    if (row[2]?.trim().toLowerCase() === "dee.c.marshall@aitrainingplus.com" && row[4]?.trim() === "jeremy-ruiz-villavicencio") {
      const sheetRow = idx + 2;
      updates.push({ range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] });
      updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
      updates.push({ range: `${TAB}!H${sheetRow}`, values: [["confirmed Jun 8: Yes I'm in."]] });
      log.push(`Row ${sheetRow}: Dee Marshall → jeremy-ruiz-villavicencio confirmed`);
      found = true;
    }
  });

  if (!found) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [["manual-confirm-jeremy", "Dee Marshall", "dee.c.marshall@aitrainingplus.com", "Jeremy Ruiz Villavicencio", "jeremy-ruiz-villavicencio", "confirmed", now, "confirmed Jun 8: Yes I'm in."]] },
    });
    log.push("Appended: Dee Marshall → jeremy-ruiz-villavicencio confirmed");
  } else {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
  }

  return res.status(200).json({ ok: true, log });
}
