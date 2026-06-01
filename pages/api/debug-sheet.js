// GET /api/debug-sheet — returns raw Dashboard header + first 5 data rows
// Temporary diagnostic — remove after confirming column structure

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const result = {};

  // List all sheet tab names
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    result.sheetTabs = meta.data.sheets.map(s => s.properties.title);
  } catch (e) {
    result.sheetTabsError = e.message;
  }

  // Try common dashboard tab names
  for (const name of ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"]) {
    try {
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${name}!A1:Z6`,
      });
      result[`tab_${name}`] = r.data.values || [];
      break; // stop at first one that works
    } catch (e) {
      result[`tab_${name}_error`] = e.message;
    }
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
