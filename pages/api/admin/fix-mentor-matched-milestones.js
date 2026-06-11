// One-shot: set mentorMatched = TRUE for admin-confirmed mentees missing the milestone
// Affects: andrea-vernengo, evan-peneiras, andrea-ferguson-peterson
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
  const TARGETS = new Set(["andrea-vernengo", "evan-peneiras", "andrea-ferguson-peterson"]);

  let sheetName = null;
  let rows = [];
  for (const name of DASHBOARD_NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
      if ((r.data.values || []).length > 1) { rows = r.data.values; sheetName = name; break; }
    } catch (_) {}
  }

  if (!sheetName) return res.status(500).json({ error: "No milestone sheet found" });

  const headerRow = rows[0] || [];
  const milestoneMatchedIdx = headerRow.findIndex(h => h === "Matched with a Mentor");
  if (milestoneMatchedIdx === -1) return res.status(500).json({ error: "Column 'Matched with a Mentor' not found", headers: headerRow });

  const col = String.fromCharCode(65 + milestoneMatchedIdx); // A=65
  const log = [];

  for (let i = 1; i < rows.length; i++) {
    const slug = rows[i][0]?.trim();
    if (!TARGETS.has(slug)) continue;
    const sheetRow = i + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${col}${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [["TRUE"]] },
    });
    log.push(`Row ${sheetRow}: ${slug} mentorMatched = TRUE`);
    TARGETS.delete(slug);
  }

  if (TARGETS.size > 0) log.push(`Not found in sheet: ${[...TARGETS].join(", ")}`);

  return res.status(200).json({ ok: true, log });
}
