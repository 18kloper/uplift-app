// One-shot: decline Pavan Kumar → rajesh-ivaturi (Rajesh already matched with Kenneth Jones)
// and mark Pavan as needs-match
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const slug = row[4]?.trim();
    const mentorEmail = row[2]?.trim().toLowerCase();
    const isPavan = mentorEmail === "pavan@3pmventures.com";
    const isRajesh = slug === "rajesh-ivaturi";

    if (isPavan && isRajesh) {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["declined"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Rajesh already matched with Kenneth Jones — removed from Pavan"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: Pavan → rajesh-ivaturi → declined`);
    }
  }

  // Append needs-match entry for Pavan
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
    requestBody: { values: [["admin-needs-match-pavan", "Pavan Kumar", "pavan@3pmventures.com", "", "", "needs-match", now, "Rajesh was already matched with Kenneth — Pavan needs a new mentee"]] },
  });
  log.push("Appended: Pavan Kumar → needs-match");

  return res.status(200).json({ ok: true, log });
}
