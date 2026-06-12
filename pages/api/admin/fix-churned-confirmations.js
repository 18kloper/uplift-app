// One-shot: mark churned mentees as "churned" in Mentor Confirmations sheet
// abhi-ray, victoria-hosendorf, shounak-thaker, sharon-joseph were incorrectly added as "confirmed"
import { getSheetsClient } from "../../../lib/sheets-helper";

const CHURNED_SLUGS = new Set(["abhi-ray", "victoria-hosendorf", "shounak-thaker", "sharon-joseph"]);
const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  rows.forEach((row, i) => {
    const slug = (row[4] || "").trim();
    if (CHURNED_SLUGS.has(slug)) {
      const sheetRow = i + 2;
      updates.push(
        { range: `${TAB}!F${sheetRow}`, values: [["churned"]] },
        { range: `${TAB}!G${sheetRow}`, values: [[now]] },
        { range: `${TAB}!H${sheetRow}`, values: [["Mentee churned — dropped out of program"]] },
      );
      log.push(`${slug} → churned (row ${sheetRow})`);
    }
  });

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  return res.status(200).json({ ok: true, updated: updates.length / 3, log });
}
