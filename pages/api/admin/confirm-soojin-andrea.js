// One-shot: confirm Soojin Choung → andrea-ferguson-peterson
// Soojin forwarded confirmation to Kennedy Jun 3
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const target = {
    threadId: "19e8e9f2d22d5f8c",
    mentorName: "Soojin Choung",
    mentorEmail: "soojin@witnesspartners.us",
    menteeName: "Andrea Ferguson Peterson",
    slug: "andrea-ferguson-peterson",
    note: "Confirmed Jun 3: forwarded confirmation to Kennedy",
  };

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowEmail = (row[2] || "").trim().toLowerCase();
    const rowSlug  = (row[4] || "").trim();
    const rowThread = (row[0] || "").trim();
    if ((rowEmail === target.mentorEmail || rowThread === target.threadId) && rowSlug === target.slug) {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [[target.note]] },
        ]},
      });
      return res.status(200).json({ ok: true, log: [`Row ${sheetRow}: Soojin → andrea-ferguson-peterson confirmed`] });
    }
  }

  // Not found — append
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB}!A:H`,
    valueInputOption: "RAW",
    requestBody: { values: [[target.threadId, target.mentorName, target.mentorEmail, target.menteeName, target.slug, "confirmed", now, target.note]] },
  });
  return res.status(200).json({ ok: true, log: ["Appended: Soojin → andrea-ferguson-peterson confirmed"] });
}
