// One-shot: confirm Jose Gabriel Carrasco Ramirez → jerry-primus in sheet
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
      "admin-match-jerry-primus",
      "Jose Gabriel Carrasco Ramirez",
      "jgcarrasco@quarksadvantage.com",
      "Jerry Primus",
      "jerry-primus",
      "confirmed",
      now,
      "Admin confirmed — Jose Gabriel matched with Jerry Primus",
    ]]},
  });

  return res.status(200).json({ ok: true, log: ["Appended: Jose Gabriel → jerry-primus → confirmed"] });
}
