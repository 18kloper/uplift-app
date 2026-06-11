// One-shot: demote gifty-anane, lina-escobar, mark-kallback, alina-okun, alisha-sharma to needs-match
// Also diagnose blank Pavan Kumar cards
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const targets = new Set(["gifty-anane", "lina-escobar", "mark-kallback", "alina-okun", "alisha-sharma"]);
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];
  const pavanRows = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const slug = row[4]?.trim();
    const status = row[5]?.trim();
    const mentorName = row[1]?.trim();
    const menteeName = row[3]?.trim();

    // Log Pavan Kumar rows for diagnosis
    if (mentorName === "Pavan Kumar") {
      pavanRows.push({ sheetRow: idx + 2, slug, menteeName, status });
    }

    if (!targets.has(slug)) continue;
    const sheetRow = idx + 2;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: [
        { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
        { range: `${TAB}!G${sheetRow}`, values: [[now]] },
        { range: `${TAB}!H${sheetRow}`, values: [["Mentor non-responsive — needs new match"]] },
      ]},
    });
    log.push(`Row ${sheetRow}: ${slug} (${menteeName}) → needs-match`);
    targets.delete(slug);
  }

  // Append any not found
  for (const slug of targets) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [[`admin-needs-match-${slug}`, "", "", "", slug, "needs-match", now, "Mentor non-responsive — needs new match"]] },
    });
    log.push(`Appended: ${slug} → needs-match`);
  }

  return res.status(200).json({ ok: true, log, pavanRows });
}
