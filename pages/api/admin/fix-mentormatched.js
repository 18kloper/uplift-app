// One-shot: mark mentorMatched=TRUE in Dashboard for alok-rai and bejan-moers
// (intros were sent manually via Resend, bypassing send-match-emails milestone update)
import { getSheetsClient } from "../../../lib/sheets-helper";

const SLUGS_TO_FIX = ["alok-rai", "bejan-moers", "idongesit-obeya"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const log = [];

  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
  let tabName = null;
  let rows = [];

  for (const name of DASHBOARD_NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
      rows = r.data.values || [];
      if (rows.length > 1) { tabName = name; break; }
    } catch (_) {}
  }

  if (!tabName) return res.status(404).json({ error: "Dashboard tab not found" });

  const headerRow = rows[0] || [];
  const matchedIdx = headerRow.findIndex(h => (h || "").toLowerCase().includes("match"));
  log.push(`Tab: ${tabName}, matchedIdx: ${matchedIdx}, header: ${headerRow[matchedIdx]}`);

  if (matchedIdx < 0) return res.status(404).json({ error: "mentorMatched column not found", headers: headerRow });

  const updates = [];
  for (let i = 1; i < rows.length; i++) {
    const slug = (rows[i][0] || "").trim();
    if (SLUGS_TO_FIX.includes(slug)) {
      const sheetRow = i + 1;
      const col = String.fromCharCode(65 + matchedIdx);
      updates.push({ range: `${tabName}!${col}${sheetRow}`, values: [["TRUE"]] });
      log.push(`Set mentorMatched=TRUE for ${slug} at ${col}${sheetRow}`);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  return res.status(200).json({ ok: true, log });
}
