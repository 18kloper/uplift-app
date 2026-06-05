// One-shot: move Jimmy Bastien from Anatole → Joe Maruschak (sent)
// and mark Anatole's Gunjan row as sent

import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  rows.forEach((row, idx) => {
    const sheetRow = idx + 2;
    const mentor = row[1]?.trim();
    const slug = row[4]?.trim();
    const status = row[5]?.trim().toLowerCase();

    // Fix Jimmy: update Anatole's row for Jimmy → change mentor to Joe, mark sent
    if (slug === "jimmy-bastien" && mentor === "Anatole Norland") {
      updates.push({ range: `${TAB}!B${sheetRow}`, values: [["Joe Maruschak"]] });
      updates.push({ range: `${TAB}!C${sheetRow}`, values: [["joe.maruschak@gmail.com"]] });
      updates.push({ range: `${TAB}!F${sheetRow}`, values: [["sent"]] });
      log.push(`Jimmy Bastien: Anatole → Joe Maruschak (sent)`);
    }

    // Fix Gunjan: mark Anatole's Gunjan row as sent
    if (slug === "gunjan-aggarwal" && mentor === "Anatole Norland" && status === "pending") {
      updates.push({ range: `${TAB}!F${sheetRow}`, values: [["sent"]] });
      log.push(`Gunjan Aggarwal: Anatole Norland → sent`);
    }
  });

  if (updates.length === 0) return res.status(200).json({ ok: true, log: ["nothing to update"] });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, log });
}
