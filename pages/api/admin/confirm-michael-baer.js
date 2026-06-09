// One-shot: mark Michael Baer → soheil-khosravinejad as confirmed
import { getSheetsClient } from "../../../lib/sheets-helper";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const updates = [];
  rows.forEach((row, idx) => {
    if (row[2]?.trim().toLowerCase() === "michael.baer@techcxo.com" && row[4]?.trim() === "soheil-khosravinejad") {
      updates.push({ range: `${TAB}!F${idx+2}`, values: [["confirmed"]] });
      updates.push({ range: `${TAB}!H${idx+2}`, values: [["confirmed by mentor: yes and yes!"]] });
    }
  });
  if (!updates.length) return res.status(200).json({ ok: true, log: ["not found"] });
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
  return res.status(200).json({ ok: true, log: ["Michael Baer → soheil-khosravinejad: confirmed"] });
}
