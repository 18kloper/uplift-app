// One-shot: confirm Dennis Yuscavitch → kevin-navarro and Clare DeNicola → logan-jones
// Dennis replied Jun 8: "yes, was looking forward to participating"
// Clare replied Jun 9: "Confirmed. I can do it."
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });
  const rows = result.data.values || [];
  const updates = [];
  const toAppend = [];

  const targets = [
    { mentorEmail: "dyuscavitch@gmail.com", mentorName: "Dennis Yuscavitch", slug: "kevin-navarro", menteeName: "Kevin Navarro", note: "confirmed Jun 8: yes, was looking forward to participating" },
    { mentorEmail: "clare.denicola@the10company.com", mentorName: "Clare DeNicola", slug: "logan-jones", menteeName: "Logan Jones", note: "confirmed Jun 9: Confirmed. I can do it." },
  ];

  for (const t of targets) {
    let found = false;
    rows.forEach((row, idx) => {
      if (row[2]?.trim().toLowerCase() === t.mentorEmail && row[4]?.trim() === t.slug) {
        const sheetRow = idx + 2;
        updates.push({ range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] });
        updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
        updates.push({ range: `${TAB}!H${sheetRow}`, values: [[t.note]] });
        log.push(`Row ${sheetRow}: ${t.mentorEmail} → ${t.slug} confirmed`);
        found = true;
      }
    });
    if (!found) {
      toAppend.push([
        `manual-confirm-${t.slug}`,
        t.mentorName,
        t.mentorEmail,
        t.menteeName,
        t.slug,
        "confirmed",
        now,
        t.note,
      ]);
      log.push(`Appended new row: ${t.mentorEmail} → ${t.slug} confirmed`);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }
  if (toAppend.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:H`,
      valueInputOption: "RAW",
      requestBody: { values: toAppend },
    });
  }

  return res.status(200).json({ ok: true, log });
}
