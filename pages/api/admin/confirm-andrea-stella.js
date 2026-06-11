// One-shot: confirm Stella Alvo → andrea-vernengo (row 87) + set mentorMatched milestone
import { getSheetsClient, MILESTONE_LABELS } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  // 1. Update row 87: Stella Alvo → andrea-vernengo → confirmed
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: [
      { range: `${TAB}!F87`, values: [["confirmed"]] },
      { range: `${TAB}!G87`, values: [[now]] },
      { range: `${TAB}!H87`, values: [["Admin confirmed — Stella Alvo matched with Andrea Vernengo"]] },
    ]},
  });
  log.push("Row 87: Stella Alvo → andrea-vernengo → confirmed");

  // 2. Also clear any needs-match rows for andrea-vernengo
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H600` });
  const rows = result.data.values || [];
  for (let idx = 0; idx < rows.length; idx++) {
    const slug = rows[idx][4]?.trim();
    const status = rows[idx][5]?.trim();
    if (slug === "andrea-vernengo" && status === "needs-match") {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!A${sheetRow}:H${sheetRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [["", "", "", "", "", "", "", ""]] },
      });
      log.push(`Cleared needs-match row ${sheetRow}`);
    }
  }

  // 3. Set mentorMatched = TRUE in Milestone Dashboard
  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones"];
  let sheetName = null, dashRows = [];
  for (const name of DASHBOARD_NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
      if ((r.data.values || []).length > 1) { dashRows = r.data.values; sheetName = name; break; }
    } catch (_) {}
  }
  if (sheetName) {
    const header = dashRows[0] || [];
    const matchedIdx = header.findIndex(h => h === MILESTONE_LABELS["mentorMatched"]);
    if (matchedIdx !== -1) {
      const col = String.fromCharCode(65 + matchedIdx);
      for (let i = 1; i < dashRows.length; i++) {
        if (dashRows[i][0]?.trim() === "andrea-vernengo") {
          await sheets.spreadsheets.values.update({
            spreadsheetId, range: `${sheetName}!${col}${i + 1}`,
            valueInputOption: "RAW", requestBody: { values: [["TRUE"]] },
          });
          log.push("andrea-vernengo mentorMatched = TRUE");
          break;
        }
      }
    }
  }

  return res.status(200).json({ ok: true, log });
}
