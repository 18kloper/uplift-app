// One-shot: clear Mohammad Saleh Nikoopayan Tak's churned status — user confirmed he IS participating
// Find his row in Milestone Dashboard by slug and set Status Override to empty / on-track
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Milestone Dashboard";
  const now = new Date().toISOString();
  const log = [];

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:Z500` });
  const rows = result.data.values || [];

  // Find the header row to identify column indices
  const headerResult = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!1:1` });
  const headers = (headerResult.data.values?.[0] || []).map(h => h?.trim().toLowerCase());
  const slugCol = headers.indexOf("slug");
  const statusCol = headers.indexOf("status override") !== -1 ? headers.indexOf("status override") : headers.indexOf("status");
  const updatedCol = headers.indexOf("updated at") !== -1 ? headers.indexOf("updated at") : -1;

  log.push(`Headers found: slug=${slugCol}, status=${statusCol}, updatedAt=${updatedCol}`);

  let found = false;
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const slug = row[slugCol]?.trim();
    if (slug && slug.toLowerCase().includes("mohammad")) {
      const sheetRow = idx + 2;
      log.push(`Found: row ${sheetRow}, slug="${slug}", current status="${row[statusCol]}"`);

      const updates = [];
      if (statusCol >= 0) {
        const col = String.fromCharCode(65 + statusCol);
        updates.push({ range: `${TAB}!${col}${sheetRow}`, values: [[""]] });
      }
      if (updatedCol >= 0) {
        const col = String.fromCharCode(65 + updatedCol);
        updates.push({ range: `${TAB}!${col}${sheetRow}`, values: [[now]] });
      }

      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: "RAW", data: updates },
        });
        log.push(`Cleared status override for row ${sheetRow}`);
      }
      found = true;
      break;
    }
  }

  if (!found) {
    log.push("ERROR: Mohammad Saleh not found in Milestone Dashboard by slug");
    // Try by name
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const name = (row[1] || row[0] || "").toLowerCase();
      if (name.includes("mohammad") || name.includes("nikoopayan")) {
        log.push(`Found by name: row ${idx + 2}, data=${JSON.stringify(row.slice(0, 8))}`);
      }
    }
  }

  return res.status(200).json({ ok: true, log });
}
