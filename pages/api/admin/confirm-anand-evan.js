// One-shot: confirm Anand Rai → evan-peneiras
// New match replacing Adrienne Rosenthal who dropped out
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const target = {
    threadId: "admin-confirmed-anand-evan",
    mentorName: "Anand Rai",
    mentorEmail: "arai2@stevens.edu",
    menteeName: "Evan Peneiras",
    slug: "evan-peneiras",
    note: "Admin confirmed — new match replacing Adrienne Rosenthal (dropped out)",
  };

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row[4]?.trim() === target.slug && (row[2]?.trim().toLowerCase() === target.mentorEmail || row[0]?.trim() === target.threadId)) {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!B${sheetRow}`, values: [[target.mentorName]] },
          { range: `${TAB}!C${sheetRow}`, values: [[target.mentorEmail]] },
          { range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [[target.note]] },
        ]},
      });
      return res.status(200).json({ ok: true, log: [`Row ${sheetRow}: Anand Rai → evan-peneiras confirmed`] });
    }
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
    requestBody: { values: [[target.threadId, target.mentorName, target.mentorEmail, target.menteeName, target.slug, "confirmed", now, target.note]] },
  });
  return res.status(200).json({ ok: true, log: ["Appended: Anand Rai → evan-peneiras confirmed"] });
}
