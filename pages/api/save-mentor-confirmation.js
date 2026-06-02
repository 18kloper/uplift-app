// POST /api/save-mentor-confirmation
// Body: { threadId, mentorName, mentorEmail, menteeName, menteeSlug, status }
// Upserts a row in the "Mentor Confirmations" sheet tab.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Confirmations";
const HEADERS = ["Thread ID", "Mentor Name", "Mentor Email", "Mentee Name", "Mentee Slug", "Status", "Updated At"];

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

  const { threadId, mentorName, mentorEmail, menteeName, menteeSlug, status } = req.body || {};
  if (!threadId || !menteeSlug) return res.status(400).json({ error: "threadId and menteeSlug required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    await ensureTab(sheets, spreadsheetId);

    // Find existing row for this threadId + menteeSlug combo
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:E500`,
    });

    const rows = result.data.values || [];
    const rowIdx = rows.findIndex(r => r[0]?.trim() === threadId && r[4]?.trim() === menteeSlug);
    const updatedAt = new Date().toISOString().slice(0, 10);

    if (rowIdx === -1) {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:G`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[threadId, mentorName || "", mentorEmail || "", menteeName || "", menteeSlug, status || "", updatedAt]],
        },
      });
    } else {
      // Update existing row (cols F–G = status + updatedAt)
      const sheetRow = rowIdx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!F${sheetRow}:G${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[status || "", updatedAt]] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-mentor-confirmation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
