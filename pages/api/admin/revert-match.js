// POST /api/admin/revert-match
// Body: { menteeSlug }
// Clears the selectedMentor / responded fields in "Mentor Selections"
// and marks the Mentor Confirmations row as "cancelled".

import { getSheetsClient } from "../../../lib/sheets-helper";

const SEL_TAB = "Mentor Selections";
const CONF_TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { menteeSlug } = req.body || {};
  if (!menteeSlug) return res.status(400).json({ error: "menteeSlug required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // 1. Clear Mentor Selections cols F:I for this mentee
    const selRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SEL_TAB}!A2:A500`,
    });
    const selRows = selRes.data.values || [];
    const rowIdx = selRows.findIndex(r => r[0]?.trim() === menteeSlug);
    if (rowIdx !== -1) {
      const sheetRow = rowIdx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SEL_TAB}!F${sheetRow}:I${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["", "", "", ""]] },
      });
    }

    // 2. Mark Mentor Confirmations row as "cancelled"
    const confRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CONF_TAB}!A2:H500`,
    });
    const confRows = confRes.data.values || [];
    const confIdx = confRows.findIndex(r => r[4]?.trim() === menteeSlug);
    if (confIdx !== -1) {
      const confRow = confIdx + 2;
      const updatedAt = new Date().toISOString().slice(0, 10);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CONF_TAB}!F${confRow}:G${confRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["cancelled", updatedAt]] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("revert-match error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
