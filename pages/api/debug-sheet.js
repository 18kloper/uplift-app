// GET /api/debug-sheet — returns raw Dashboard header + first 5 data rows
// Temporary diagnostic — remove after confirming column structure

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const result = {};

  // Dashboard header + first 5 rows
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Dashboard!A1:Z10",
    });
    result.dashboardRows = r.data.values || [];
    result.dashboardHeader = result.dashboardRows[0] || [];
  } catch (e) {
    result.dashboardError = e.message;
  }

  // Participation tab — rows 1-10 (to see structure)
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Participation!A1:F10",
    });
    result.participationRows = r.data.values || [];
  } catch (e) {
    result.participationError = e.message;
  }

  return res.status(200).json(result);
}
