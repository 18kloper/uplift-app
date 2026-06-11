// One-shot: confirm Goncalo Esteves (Neha, Jasmin) and Malak Atut (Angie, Mohammad)
// Goncalo Jun 8: "Yes I can mentor both."
// Malak Jun 8: "I would be happy to mentor both of these entrepreneurs."
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

  const targets = [
    { mentorEmail: "estevesgoncalo@gmail.com", mentorName: "Goncalo Esteves", slug: "neha-chopade", menteeName: "Neha Chopade", note: "confirmed Jun 8: Yes I can mentor both." },
    { mentorEmail: "estevesgoncalo@gmail.com", mentorName: "Goncalo Esteves", slug: "jasmin-jones", menteeName: "Jasmin Jones", note: "confirmed Jun 8: Yes I can mentor both." },
    { mentorEmail: "malakatut@gmail.com", mentorName: "Malak Atut", slug: "angie-tirado", menteeName: "Angie Tirado", note: "confirmed Jun 8: happy to mentor both, 1:1s over Zoom, in person for events" },
    { mentorEmail: "malakatut@gmail.com", mentorName: "Malak Atut", slug: "mohammad-saleh-nikoopayan-tak", menteeName: "Mohammad Saleh Nikoopayan Tak", note: "confirmed Jun 8: happy to mentor both, 1:1s over Zoom, in person for events" },
  ];

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
      toAppend.push([`manual-confirm-${t.slug}`, t.mentorName, t.mentorEmail, t.menteeName, t.slug, "confirmed", now, t.note]);
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
