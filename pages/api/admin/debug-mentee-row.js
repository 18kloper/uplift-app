import { getSheetsClient } from "../../../lib/sheets-helper";
export default async function handler(req, res) {
  const { slug } = req.query;
  const sheets = getSheetsClient();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: "Mentor Confirmations!A2:H500" });
  const rows = (result.data.values || []).filter(r => r[4]?.toLowerCase().includes(slug?.toLowerCase() || "jimmy"));
  return res.status(200).json({ rows });
}
