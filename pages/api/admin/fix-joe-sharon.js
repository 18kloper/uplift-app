// One-shot: decline Joe Spivack → sharon-joseph (Sharon churned) and mark Joe needs-match
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

    if (mentorEmail === "spivack@yahoo.com" && slug === "sharon-joseph") {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Sharon Joseph churned — Joe needs a new mentee"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: Joe Spivack → sharon-joseph → needs-match`);
    }
  }

  if (!log.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [["admin-needs-match-joe-spivack", "Joe Spivack", "spivack@yahoo.com", "Sharon Joseph", "sharon-joseph", "needs-match", now, "Sharon Joseph churned — Joe needs a new mentee"]] },
    });
    log.push("Appended: Joe Spivack → needs-match");
  }

  return res.status(200).json({ ok: true, log });
}
