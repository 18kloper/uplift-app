// One-shot: set Stephen Makinen → andrea-vernengo rows to needs-match (Andrea rematched)
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
  let found = false;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const mentorName = r[1]?.trim();
    const slug = r[4]?.trim();
    const status = r[5]?.trim();
    if (mentorName === "Stephen Makinen" && slug === "andrea-vernengo" && status !== "needs-match") {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Andrea rematched — Stephen needs new mentee"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: Stephen Makinen → andrea-vernengo → needs-match`);
      found = true;
    }
  }

  if (!found) {
    // Append a needs-match row so he shows in the right column
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [[`admin-needs-match-stephen-andrea`, "Stephen Makinen", "stephen.makinen@gmail.com", "Andrea Vernengo", "andrea-vernengo", "needs-match", now, "Andrea rematched — Stephen needs new mentee"]] },
    });
    log.push("Appended: Stephen Makinen → andrea-vernengo → needs-match");
  }

  return res.status(200).json({ ok: true, log });
}
