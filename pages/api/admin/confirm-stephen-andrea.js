// One-shot: confirm Stephen Makinen → andrea-vernengo
// Stephen confirmed Jun 8 — Stella was incorrectly assigned; Stella's real match is Abhaya Pawar
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const target = {
    threadId: "19e9938344ea45b9",
    mentorName: "Stephen Makinen",
    mentorEmail: "stephen.makinen@gmail.com",
    menteeName: "Andrea Vernengo",
    slug: "andrea-vernengo",
    note: "Confirmed Jun 8 — Stella Alvo correctly reassigned to Abhaya Pawar",
  };

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if ((row[0]?.trim() === target.threadId || row[2]?.trim().toLowerCase() === target.mentorEmail) && row[4]?.trim() === target.slug) {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [[target.note]] },
        ]},
      });
      return res.status(200).json({ ok: true, log: [`Row ${sheetRow}: Stephen Makinen → andrea-vernengo confirmed`] });
    }
  }

  // Not found — append
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB}!A:H`,
    valueInputOption: "RAW",
    requestBody: { values: [[target.threadId, target.mentorName, target.mentorEmail, target.menteeName, target.slug, "confirmed", now, target.note]] },
  });
  return res.status(200).json({ ok: true, log: ["Appended: Stephen Makinen → andrea-vernengo confirmed"] });
}
