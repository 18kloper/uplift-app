// GET /api/get-mentor-confirmations
// Returns all rows from the "Mentor Confirmations" sheet as a key→status map.
// Key format: threadId|menteeSlug

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ confirmations: {} });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets.some(s => s.properties.title === TAB);
    if (!exists) return res.status(200).json({ confirmations: {} });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:G500`,
    });

    const rows = result.data.values || [];
    const confirmations = {};
    for (const row of rows) {
      const threadId  = row[0]?.trim();
      const slug      = row[4]?.trim();
      const status    = row[5]?.trim();
      if (threadId && slug && status) {
        confirmations[`${threadId}|${slug}`] = status;
      }
    }

    return res.status(200).json({ confirmations });
  } catch (err) {
    console.error("get-mentor-confirmations error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
