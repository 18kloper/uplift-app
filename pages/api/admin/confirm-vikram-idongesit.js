// One-shot: confirm Vikram Wadhawan → idongesit-obeya in sheet
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
      "admin-confirmed-vikram-idongesit",
      "Vikram Wadhawan",
      "vikram@vasitum.com",
      "Idongesit Obeya",
      "idongesit-obeya",
      "confirmed",
      now,
      "Idongesit completed onboarding and is back on track — confirmed match with Vikram Wadhawan",
    ]]},
  });

  return res.status(200).json({ ok: true, log: ["Appended: Vikram Wadhawan → idongesit-obeya → confirmed"] });
}
