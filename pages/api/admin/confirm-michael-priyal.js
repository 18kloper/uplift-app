// One-shot: confirm Michael Baer → priyal-levine (update pending row to confirmed)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H600` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    const slug = (rows[idx][4] || "").trim();
    const status = (rows[idx][5] || "").trim();
    if (slug === "priyal-levine" && status === "pending") {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Michael Baer confirmed — matched with Priyal Levine"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: priyal-levine → confirmed`);
    }
  }

  return res.status(200).json({ ok: true, log });
}
