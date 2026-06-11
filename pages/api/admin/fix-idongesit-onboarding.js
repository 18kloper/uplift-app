// One-shot: mark idongesit-obeya onboarding=TRUE and mentorMatched=TRUE in Dashboard sheet
import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";

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
  log.push(`Tab: ${tabName}, headers: ${JSON.stringify(headerRow.slice(0, 15))}`);

  // Find column indexes
  const onboardingIdx = headerRow.findIndex(h => h === MILESTONE_LABELS?.onboarding || h?.toLowerCase().includes("onboard"));
  const mentorMatchedIdx = headerRow.findIndex(h => h === MILESTONE_LABELS?.mentorMatched || h?.toLowerCase().includes("mentor match"));
  log.push(`onboardingIdx: ${onboardingIdx}, mentorMatchedIdx: ${mentorMatchedIdx}`);

  // Find idongesit row
  for (let i = 1; i < rows.length; i++) {
    const slug = (rows[i][0] || "").trim();
    if (slug === "idongesit-obeya") {
      const sheetRow = i + 1;
      const updates = [];
      if (onboardingIdx >= 0) {
        const col = String.fromCharCode(65 + onboardingIdx);
        updates.push({ range: `${tabName}!${col}${sheetRow}`, values: [["TRUE"]] });
        log.push(`Set onboarding TRUE at ${col}${sheetRow}`);
      }
      if (mentorMatchedIdx >= 0) {
        const col = String.fromCharCode(65 + mentorMatchedIdx);
        updates.push({ range: `${tabName}!${col}${sheetRow}`, values: [["TRUE"]] });
        log.push(`Set mentorMatched TRUE at ${col}${sheetRow}`);
      }
      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: "RAW", data: updates },
        });
      }
      log.push(`Done for row ${sheetRow}`);
      return res.status(200).json({ ok: true, log });
    }
  }

  return res.status(404).json({ error: "idongesit-obeya not found in Dashboard", log });
}
