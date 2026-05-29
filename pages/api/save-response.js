// POST /api/save-response
// Body: { slug, weekNum, fieldKey, value }
//
// Upserts the response into the mentee's individual tab and
// updates the "Last Active" timestamp on the Dashboard.

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, weekNum, fieldKey, value } = req.body;
  if (!slug || weekNum == null || !fieldKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Graceful degradation — if env vars aren't set, skip silently
  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const timestamp = new Date().toISOString();

    // ── Read existing rows from mentee tab (columns A & B only) ───────────────
    let existingRows = [];
    try {
      const read = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${slug}!A:B`,
      });
      existingRows = read.data.values || [];
    } catch (_) {
      // Tab doesn't exist yet — append will create it
    }

    // ── Find matching row (skip header at index 0) ────────────────────────────
    let matchRowIndex = -1;
    for (let i = 1; i < existingRows.length; i++) {
      if (
        String(existingRows[i][0]) === String(weekNum) &&
        existingRows[i][1] === fieldKey
      ) {
        matchRowIndex = i;
        break;
      }
    }

    if (matchRowIndex > -1) {
      // Update existing row — row numbers in Sheets are 1-indexed
      const rowNum = matchRowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${slug}!C${rowNum}:D${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[value || "", timestamp]] },
      });
    } else {
      // Append a new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${slug}!A:D`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[String(weekNum), fieldKey, value || "", timestamp]],
        },
      });
    }

    // ── Update Last Active on Dashboard ───────────────────────────────────────
    try {
      const dashRead = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Dashboard!A:A",
      });
      const slugCol = dashRead.data.values || [];
      const dashRowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);
      if (dashRowIdx > -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Dashboard!F${dashRowIdx + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[timestamp]] },
        });
      }
    } catch (_) {}

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Sheet write failed:", err.message);
    // Don't surface errors to the client — localStorage is the source of truth
    return res.status(200).json({ ok: true, sheetError: true });
  }
}
