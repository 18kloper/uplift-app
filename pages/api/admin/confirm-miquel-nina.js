// One-shot: confirm Miquel de Quadras → nina-mladenovski (both confirmed + intro'd)
// Also set mentorMatched milestone
import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();
  const log = [];

  // 1. Update Mentor Confirmations
  const TAB = "Mentor Confirmations";
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  let found = false;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row[4]?.trim() === "nina-mladenovski" && row[2]?.trim().toLowerCase() === "mquadras@atomian.com") {
      const sheetRow = idx + 2;
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["confirmed"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Admin confirmed — both intro'd and confirmed"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: Miquel → nina-mladenovski → confirmed`);
      found = true;
      break;
    }
  }

  if (!found) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [["admin-confirmed-miquel-nina", "Miquel de Quadras", "mquadras@atomian.com", "Nina Mladenovski", "nina-mladenovski", "confirmed", now, "Admin confirmed — both intro'd and confirmed"]] },
    });
    log.push("Appended: Miquel → nina-mladenovski → confirmed");
  }

  // 2. Set mentorMatched milestone in Milestone Dashboard
  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
  let sheetName = null, dashRows = [];
  for (const name of DASHBOARD_NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
      if ((r.data.values || []).length > 1) { dashRows = r.data.values; sheetName = name; break; }
    } catch (_) {}
  }

  if (sheetName) {
    const headerRow = dashRows[0] || [];
    const milestoneMatchedIdx = headerRow.findIndex(h => h === "Matched with a Mentor");
    if (milestoneMatchedIdx !== -1) {
      const col = String.fromCharCode(65 + milestoneMatchedIdx);
      for (let i = 1; i < dashRows.length; i++) {
        if (dashRows[i][0]?.trim() === "nina-mladenovski") {
          await sheets.spreadsheets.values.update({
            spreadsheetId, range: `${sheetName}!${col}${i + 1}`,
            valueInputOption: "RAW", requestBody: { values: [["TRUE"]] },
          });
          log.push(`Milestone: nina-mladenovski mentorMatched = TRUE`);
          break;
        }
      }
    }
  }

  return res.status(200).json({ ok: true, log });
}
