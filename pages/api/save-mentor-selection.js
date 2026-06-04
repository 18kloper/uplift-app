// POST /api/save-mentor-selection
// Body: { slug, responded, selectedMentor, responseDate, notes }
// Finds the mentee's row in "Mentor Selections" and updates cols F–I.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Selections";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, responded, selectedMentor, responseDate, notes } = req.body || {};
  if (!slug) return res.status(400).json({ error: "slug required" });

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
      range: `${TAB}!A2:A500`,
    });

    const rows = result.data.values || [];
    const rowIdx = rows.findIndex(r => r[0]?.trim() === slug);
    if (rowIdx === -1) return res.status(404).json({ error: "mentee not found in sheet" });

    const sheetRow = rowIdx + 2; // 1-indexed, skipping header
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!F${sheetRow}:I${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          responded ? "Yes" : "No",
          selectedMentor || "",
          responseDate || "",
          notes || "",
        ]],
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-mentor-selection error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
