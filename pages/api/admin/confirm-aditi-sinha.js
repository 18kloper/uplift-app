// One-shot: mark Aditi Sinha as confirmed for Eliana Zebro
// Aditi replied Jun 10: "I am still available and interested in volunteering."
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });
  const rows = result.data.values || [];
  const updates = [];
  const log = [];

  rows.forEach((row, idx) => {
    const mentorEmail = row[2]?.trim().toLowerCase();
    const slug = row[4]?.trim();
    if (mentorEmail === "sinha27aditi@gmail.com" && slug === "eliana-zebro") {
      const sheetRow = idx + 2;
      updates.push({ range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] });
      updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
      updates.push({ range: `${TAB}!H${sheetRow}`, values: [["confirmed Jun 10: traveling this week, available next week"]] });
      log.push(`Row ${sheetRow}: Aditi Sinha → eliana-zebro confirmed`);
    }
  });

  if (updates.length === 0) {
    // Row may not exist yet — append it
    const newRow = [
      "manual-confirm-aditi-sinha",
      "Aditi Sinha",
      "sinha27aditi@gmail.com",
      "Eliana Zebro",
      "eliana-zebro",
      "confirmed",
      now,
      "confirmed Jun 10: traveling this week, available next week",
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:H`,
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });
    log.push("Appended new row: Aditi Sinha → eliana-zebro confirmed");
  } else {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  return res.status(200).json({ ok: true, log });
}
