// Debug: dump Milestone Dashboard headers + first few rows
import { getSheetsClient } from "../../../lib/sheets-helper";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // List all sheet tab names
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabNames = meta.data.sheets.map(s => s.properties.title);

  // Try to read the milestone tab
  const NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
  let headers = [], sample = [];
  for (const name of NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A1:Z3` });
      const rows = r.data.values || [];
      if (rows.length > 0) {
        headers = rows[0];
        sample = rows.slice(1, 3);
        break;
      }
    } catch (_) {}
  }

  // Also check Participation tab format
  let partSample = [];
  try {
    const p = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Participation!A5:E8" });
    partSample = p.data.values || [];
  } catch (_) {}

  return res.status(200).json({ tabNames, milestoneHeaders: headers, milestoneSample: sample, partSample });
}
