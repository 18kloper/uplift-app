// One-shot: mark Michael Baer → priyal-levine as pending (awaiting confirmation)
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
      "admin-pending-michael-priyal",
      "Michael Baer",
      "michael.baer@techcxo.com",
      "Priyal Levine",
      "priyal-levine",
      "pending",
      now,
      "Admin assigned — awaiting Michael Baer confirmation",
    ]]},
  });

  return res.status(200).json({ ok: true, log: ["Appended: Michael Baer → priyal-levine → pending"] });
}
