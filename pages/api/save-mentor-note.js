// POST /api/save-mentor-note
// Body: { mentorKey, note }
// Upserts a row in the "Mentor Notes" sheet tab.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Notes";
const HEADERS = ["Mentor Key", "Note", "Updated At"];

async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { mentorKey, note } = req.body || {};
  if (!mentorKey) return res.status(400).json({ error: "mentorKey required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    await ensureTab(sheets, spreadsheetId);

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:A500`,
    });

    const rows = result.data.values || [];
    const rowIdx = rows.findIndex(r => r[0]?.trim() === mentorKey);
    const updatedAt = new Date().toISOString().slice(0, 10);

    if (rowIdx === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:C`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[mentorKey, note ?? "", updatedAt]] },
      });
    } else {
      const sheetRow = rowIdx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!B${sheetRow}:C${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[note ?? "", updatedAt]] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-mentor-note error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
