// One-shot: mark Soojin Choung → andrea-ferguson-peterson as confirmed
import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";
const MENTOR_EMAIL = "soojin@witnesspartners.us";
const MENTEE_SLUGS = ["andrea-ferguson-peterson"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const email = row[2]?.trim().toLowerCase();
    const slug = row[4]?.trim();
    if (email === MENTOR_EMAIL && MENTEE_SLUGS.includes(slug)) {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push(`Soojin Choung → ${slug}: confirmed`);
    }
  });

  if (updates.length === 0) {
    return res.status(200).json({ ok: true, log: ["No matching rows found — check sheet"] });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, log });
}
