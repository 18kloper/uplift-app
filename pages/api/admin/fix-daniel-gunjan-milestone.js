// One-shot: set mentorMatched = TRUE for daniel-patton and gunjan-aggarwal
import { getSheetsClient, MILESTONE_LABELS } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TARGETS = new Set(["daniel-patton", "gunjan-aggarwal"]);
  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];

  let sheetName = null, rows = [];
  for (const name of DASHBOARD_NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
      if ((r.data.values || []).length > 1) { rows = r.data.values; sheetName = name; break; }
    } catch (_) {}
  }

  if (!sheetName) return res.status(500).json({ error: "No milestone sheet found" });

  const header = rows[0] || [];
  const matchedIdx = header.findIndex(h => h === MILESTONE_LABELS["mentorMatched"]);
  if (matchedIdx === -1) return res.status(500).json({ error: "Column not found", headers: header });

  const col = String.fromCharCode(65 + matchedIdx);
  const log = [];

  for (let i = 1; i < rows.length; i++) {
    const slug = rows[i][0]?.trim();
    if (!TARGETS.has(slug)) continue;
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetName}!${col}${i + 1}`,
      valueInputOption: "RAW", requestBody: { values: [["TRUE"]] },
    });
    log.push(`${slug} mentorMatched = TRUE`);
    TARGETS.delete(slug);
  }

  if (TARGETS.size > 0) log.push(`Not found: ${[...TARGETS].join(", ")}`);
  return res.status(200).json({ ok: true, log });
}
