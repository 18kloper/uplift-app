// One-shot: confirm Jose Gabriel → bejan-moers in sheet
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
      "admin-confirmed-jose-bejan",
      "Jose Gabriel Carrasco Ramirez",
      "jgcarrasco@quarksadvantage.com",
      "Bejan Moers",
      "bejan-moers",
      "confirmed",
      now,
      "Jose Gabriel confirmed — matched with Bejan Moers (United Solution). First session available June 20th or later.",
    ]]},
  });

  return res.status(200).json({ ok: true, log: ["Appended: Jose Gabriel → bejan-moers → confirmed"] });
}
