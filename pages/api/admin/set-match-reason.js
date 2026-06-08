// POST /api/admin/set-match-reason
// Body: { menteeSlug, matchReason }
// Writes the admin-authored match reason to col I of "Mentor Confirmations".
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";

const CONF_TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { menteeSlug, matchReason } = req.body || {};
  if (!menteeSlug) return res.status(400).json({ error: "menteeSlug required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CONF_TAB}!A2:I500`,
    });
    const rows = result.data.values || [];
    // Col E (index 4) = menteeSlug, Col I (index 8) = Match Reason
    const rowIdx = rows.findIndex(r => r[4]?.trim() === menteeSlug);

    if (rowIdx === -1) {
      return res.status(404).json({ error: `No confirmation row found for slug: ${menteeSlug}` });
    }

    const sheetRow = rowIdx + 2; // +1 for header, +1 for 1-indexed
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${CONF_TAB}!I${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[matchReason || ""]] },
    });

    return res.status(200).json({ ok: true, slug: menteeSlug, sheetRow });
  } catch (err) {
    console.error("set-match-reason error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
