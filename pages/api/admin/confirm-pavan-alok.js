// One-shot: confirm Pavan Kumar → alok-rai in sheet
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
      "admin-confirmed-pavan-alok",
      "Pavan Kumar",
      "pavan@3pmventures.com",
      "Alok Rai",
      "alok-rai",
      "confirmed",
      now,
      "Pavan Kumar confirmed — matched with Alok Rai (Dumroo.ai)",
    ]]},
  });

  return res.status(200).json({ ok: true, log: ["Appended: Pavan Kumar → alok-rai → confirmed"] });
}
