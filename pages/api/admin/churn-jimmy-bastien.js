// One-shot: mark Jimmy Bastien as churned — did not attend onboarding
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Milestone Dashboard";
  const now = new Date().toISOString();

  const headerResult = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!1:1` });
  const headers = (headerResult.data.values?.[0] || []).map(h => h?.trim().toLowerCase());
  const slugCol = headers.indexOf("slug");
  const statusCol = headers.findIndex(h => h.includes("status"));

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:Z500` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    if (rows[idx][slugCol]?.trim() === "jimmy-bastien") {
      const sheetRow = idx + 2;
      const col = String.fromCharCode(65 + statusCol);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!${col}${sheetRow}`, values: [["churned"]] },
        ]},
      });
      return res.status(200).json({ ok: true, log: [`Row ${sheetRow}: jimmy-bastien → churned`] });
    }
  }
  return res.status(200).json({ ok: false, log: ["jimmy-bastien not found"] });
}
