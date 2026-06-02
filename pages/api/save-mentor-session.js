// POST /api/save-mentor-session
// Body: { mentorEmail, menteeSlug, count }
// Upserts a row in the "Mentor Sessions" sheet tab.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Sessions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { mentorEmail, menteeSlug, count } = req.body || {};
  if (!mentorEmail || !menteeSlug) return res.status(400).json({ error: "mentorEmail and menteeSlug required" });

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
      range: `${TAB}!A2:B500`,
    });

    const rows = result.data.values || [];
    const rowIdx = rows.findIndex(r => r[0]?.trim() === mentorEmail && r[1]?.trim() === menteeSlug);
    const updatedAt = new Date().toISOString().slice(0, 10);

    if (rowIdx === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:D`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[mentorEmail, menteeSlug, count ?? 0, updatedAt]] },
      });
    } else {
      const sheetRow = rowIdx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!C${sheetRow}:D${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[count ?? 0, updatedAt]] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-mentor-session error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
