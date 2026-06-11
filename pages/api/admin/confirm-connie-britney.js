// One-shot: confirm Connie Pascal → britney-medich, set alok-rai → needs-match
// Connie Jun 8: "I have time for one team this summer — best aligned with Britney Medich"
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
  const toAppend = [];

  rows.forEach((row, idx) => {
    const mentorEmail = row[2]?.trim().toLowerCase();
    const slug = row[4]?.trim();
    if (mentorEmail === "cpascal@comminfo.rutgers.edu") {
      const sheetRow = idx + 2;
      if (slug === "britney-medich") {
        updates.push({ range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] });
        updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
        updates.push({ range: `${TAB}!H${sheetRow}`, values: [["confirmed Jun 8: best aligned with Britney Medich"]] });
        log.push(`Row ${sheetRow}: Connie Pascal → britney-medich confirmed`);
      } else if (slug === "alok-rai") {
        updates.push({ range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] });
        updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
        updates.push({ range: `${TAB}!H${sheetRow}`, values: [["mentor chose Britney only — alok needs new mentor"]] });
        log.push(`Row ${sheetRow}: Connie Pascal → alok-rai needs-match`);
      }
    }
  });

  // If britney-medich row not found, append it
  const hasBritney = rows.some(r => r[2]?.trim().toLowerCase() === "cpascal@comminfo.rutgers.edu" && r[4]?.trim() === "britney-medich");
  if (!hasBritney) {
    toAppend.push(["manual-confirm-britney-medich", "Connie Pascal", "cpascal@comminfo.rutgers.edu", "Britney Medich", "britney-medich", "confirmed", now, "confirmed Jun 8: best aligned with Britney Medich"]);
    log.push("Appended: Connie Pascal → britney-medich confirmed");
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
  }
  if (toAppend.length > 0) {
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW", requestBody: { values: toAppend } });
  }

  return res.status(200).json({ ok: true, log });
}
