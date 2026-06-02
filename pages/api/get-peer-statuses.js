// GET /api/get-peer-statuses
// Returns { statuses: { [pairKey]: status } } from the "Peer Connections" sheet tab

import { getSheetsClient } from "../../lib/sheets-helper";

const SHEET_NAME = "Peer Connections";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ statuses: {} });
  }

  try {
    const sheets = getSheetsClient();
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = read.data.values || [];
    const statuses = {};
    // Row 0 is header; col 0 = pairKey, col 4 = status
    for (let i = 1; i < rows.length; i++) {
      const pairKey = rows[i][0];
      const status = rows[i][4];
      if (pairKey) statuses[pairKey] = status || null;
    }

    return res.status(200).json({ statuses });
  } catch (err) {
    console.error("get-peer-statuses error:", err.message);
    return res.status(200).json({ statuses: {} });
  }
}
