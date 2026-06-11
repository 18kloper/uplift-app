// One-shot: mark Tom Oser + Rikin Diwan as no-reply in Mentor Confirmations
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  const targets = new Set(["tomoser@pipeline-strategies.com", "rikin@lowercaseb2b.com"]);

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H600` });
  const rows = result.data.values || [];

  for (let idx = 0; idx < rows.length; idx++) {
    const email = (rows[idx][2] || "").trim().toLowerCase();
    const status = (rows[idx][5] || "").trim();
    if (!targets.has(email)) continue;
    if (status === "no-reply") { log.push(`Row ${idx + 2}: already no-reply`); continue; }
    const sheetRow = idx + 2;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: [
        { range: `${TAB}!F${sheetRow}`, values: [["no-reply"]] },
        { range: `${TAB}!G${sheetRow}`, values: [[now]] },
        { range: `${TAB}!H${sheetRow}`, values: [["Mentor non-responsive"]] },
      ]},
    });
    log.push(`Row ${sheetRow}: ${rows[idx][1]} → ${rows[idx][3]} → no-reply`);
  }

  return res.status(200).json({ ok: true, log });
}
