// POST /api/save-response
// Body: { slug, weekNum, fieldKey, value }
//
// Upserts the response into the mentee's individual tab and
// updates the "Last Active" timestamp on the Dashboard.

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, weekNum, fieldKey, value, question } = req.body;
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
        range: `${slug}!C${rowNum}:E${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[question || "", value || "", timestamp]] },
      });
    } else {
      // Append a new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${slug}!A:E`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[String(weekNum), fieldKey, question || "", value || "", timestamp]],
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

    // ── If this is a participation response, also update the Participation tab ─
    if (fieldKey === "participation" && (value === "accepted" || value === "declined")) {
      try {
        const statusLabel = value === "accepted" ? "Accepted" : "Declined";
        const partRead = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Participation!A6:A500",
        });
        const partSlugs = partRead.data.values || [];
        const partRowIdx = partSlugs.findIndex((row) => row[0] === slug);
        if (partRowIdx > -1) {
          const sheetRow = partRowIdx + 6; // rows start at 6 in the sheet
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Participation!E${sheetRow}:F${sheetRow}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[statusLabel, timestamp]] },
          });
        }
      } catch (_) {}
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Sheet write failed:", err.message);
    // Don't surface errors to the client — localStorage is the source of truth
    return res.status(200).json({ ok: true, sheetError: true });
  }
}
