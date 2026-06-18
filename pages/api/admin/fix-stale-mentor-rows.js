// One-shot: demote stale mentor rows in Mentor Confirmations sheet
// Tom Oser → gifty-anane, alina-okun (replaced by Andrew Jacobs, Basia Walska)
// Miquel de Quadras → jerry-primus (old assignment, Jerry has Jose Carrasco)
import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

const STALE = [
  { mentor: "Tom Oser", slug: "gifty-anane" },
  { mentor: "Tom Oser", slug: "alina-okun" },
  { mentor: "Miquel de Quadras", slug: "jerry-primus" },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  rows.forEach((row, idx) => {
    const mentorName = row[1]?.trim();
    const slug       = row[4]?.trim();
    const status     = row[5]?.trim().toLowerCase();
    if (status === "needs-match") return;

    const isStale = STALE.some(s => s.mentor === mentorName && s.slug === slug);
    if (isStale) {
      const sheetRow = idx + 2;
      updates.push({ range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] });
      updates.push({ range: `${TAB}!H${sheetRow}`, values: [["stale — mentor replaced"]] });
      log.push(`Demoted: ${mentorName} → ${slug}`);
    }
  });

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  return res.status(200).json({ ok: true, log });
}
