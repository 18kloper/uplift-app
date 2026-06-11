// One-shot: demote jimmy-bastien, jagannadh-kanumuri, justin-savage to needs-match (churned)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const targets = new Set(["jimmy-bastien", "jagannadh-kanumuri", "justin-savage"]);

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const slug = rows[idx][4]?.trim();
    const status = rows[idx][5]?.trim();
    if (!targets.has(slug)) continue;
    if (status === "needs-match") { log.push(`Row ${idx + 2}: ${slug} already needs-match`); targets.delete(slug); continue; }
    const sheetRow = idx + 2;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: [
        { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
        { range: `${TAB}!G${sheetRow}`, values: [[now]] },
        { range: `${TAB}!H${sheetRow}`, values: [["Mentee churned — mentor needs new match"]] },
      ]},
    });
    log.push(`Row ${sheetRow}: ${slug} → needs-match`);
    targets.delete(slug);
  }

  for (const slug of targets) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [[`admin-needs-match-${slug}`, "", "", "", slug, "needs-match", now, "Mentee churned — mentor needs new match"]] },
    });
    log.push(`Appended: ${slug} → needs-match`);
  }

  return res.status(200).json({ ok: true, log });
}
