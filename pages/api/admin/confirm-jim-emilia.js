// One-shot: confirm James (Jim) Scott → emilia-savich in sheet
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
    requestBody: { values: [[
      "admin-match-emilia-savich",
      "James (Jim) Scott",
      "thecfo@outlook.com",
      "Emilia Savich",
      "emilia-savich",
      "confirmed",
      now,
      "Admin confirmed — Jim Scott matched with Emilia Savich",
    ]]},
  });

  return res.status(200).json({ ok: true, log: ["Appended: Jim Scott → emilia-savich → confirmed"] });
}
