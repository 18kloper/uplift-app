// Diagnostic: show all Mentor Confirmations rows involving evan-peneiras
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Mentor Confirmations!A2:H500" });
  const rows = result.data.values || [];
  const evan = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if ((r[4] || "").toLowerCase().includes("evan") || (r[3] || "").toLowerCase().includes("evan") || (r[1] || "").toLowerCase().includes("evan")) {
      evan.push({ sheetRow: i + 2, threadId: r[0], mentorName: r[1], mentorEmail: r[2], menteeName: r[3], menteeSlug: r[4], status: r[5], notes: r[7] });
    }
  }
  return res.status(200).json({ evan });
}
