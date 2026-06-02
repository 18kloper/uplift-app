// POST /api/save-peer-status
// Body: { pairKey, status, founder1Name, founder2Name, sharedTheme }
// Upserts a row in the "Peer Connections" sheet tab

import { getSheetsClient } from "../../lib/sheets-helper";

const SHEET_NAME = "Peer Connections";
const HEADER = ["pairKey", "Founder 1", "Founder 2", "Theme", "Status", "Updated"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { pairKey, status, founder1Name, founder2Name, sharedTheme } = req.body || {};
  if (!pairKey) return res.status(400).json({ error: "Missing pairKey" });

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read existing rows
    let existingRows = [];
    try {
      const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A:F` });
      existingRows = read.data.values || [];
    } catch (_) {}

    // Ensure header row exists
    if (existingRows.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${SHEET_NAME}!A:F`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [HEADER] },
      });
      existingRows = [HEADER];
    }

    const timestamp = new Date().toISOString();
    const rowData = [pairKey, founder1Name || "", founder2Name || "", sharedTheme || "", status || "", timestamp];

    // Find existing row for this pairKey
    let matchRowIndex = -1;
    for (let i = 1; i < existingRows.length; i++) {
      if (existingRows[i][0] === pairKey) { matchRowIndex = i; break; }
    }

    if (matchRowIndex > -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A${matchRowIndex + 1}:F${matchRowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${SHEET_NAME}!A:F`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowData] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-peer-status error:", err.message);
    return res.status(200).json({ ok: true, sheetError: true });
  }
}
