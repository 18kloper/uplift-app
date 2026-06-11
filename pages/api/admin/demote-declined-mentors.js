// One-shot: move Annalyce, Favio, Priyal to needs-match (mentor declined/non-responsive)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const targets = new Set(["annalyce-dagostino-gavin", "favio-jasso", "priyal-levine"]);

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const log = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const slug = row[4]?.trim();
    if (!targets.has(slug)) continue;
    const sheetRow = idx + 2;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: [
        { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
        { range: `${TAB}!G${sheetRow}`, values: [[now]] },
        { range: `${TAB}!H${sheetRow}`, values: [["Mentor declined/non-responsive — needs new match"]] },
      ]},
    });
    log.push(`Row ${sheetRow}: ${slug} → needs-match`);
    targets.delete(slug);
  }

  // Append any not found
  for (const slug of targets) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [[`admin-needs-match-${slug}`, "", "", "", slug, "needs-match", now, "Mentor declined/non-responsive — needs new match"]] },
    });
    log.push(`Appended: ${slug} → needs-match`);
  }

  return res.status(200).json({ ok: true, log });
}
