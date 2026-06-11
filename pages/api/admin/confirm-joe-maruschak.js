// One-shot: confirm Joe Maruschak → daniel-patton + jimmy-bastien
// Joe confirmed both on Jun 8 in reply to Kennedy's matching email
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  const targets = [
    { mentorName: "Joe Maruschak", mentorEmail: "joe.maruschak@gmail.com", menteeName: "Daniel Patton", slug: "daniel-patton", note: "confirmed Jun 8: replied confirming both matches" },
    { mentorName: "Joe Maruschak", mentorEmail: "joe.maruschak@gmail.com", menteeName: "Jimmy Bastien", slug: "jimmy-bastien", note: "confirmed Jun 8: replied confirming both matches" },
  ];

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const updates = [];
  const toAppend = [];

  for (const t of targets) {
    let found = false;
    rows.forEach((row, idx) => {
      if (row[2]?.trim().toLowerCase() === t.mentorEmail && row[4]?.trim() === t.slug) {
        const sheetRow = idx + 2;
        updates.push({ range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] });
        updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
        updates.push({ range: `${TAB}!H${sheetRow}`, values: [[t.note]] });
        log.push(`Row ${sheetRow}: ${t.mentorName} → ${t.slug} confirmed`);
        found = true;
      }
    });
    if (!found) {
      toAppend.push([`manual-confirm-${t.slug}-joem`, t.mentorName, t.mentorEmail, t.menteeName, t.slug, "confirmed", now, t.note]);
      log.push(`Appended: ${t.mentorName} → ${t.slug} confirmed`);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
  }
  if (toAppend.length > 0) {
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW", requestBody: { values: toAppend } });
  }

  return res.status(200).json({ ok: true, log });
}
