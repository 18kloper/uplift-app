// POST /api/setup-admin-tab
// One-time (safe-to-re-run) script that creates the "Admin" tab in the sheet.
// Rows are pre-populated with every mentee slug. Column B is a checkbox for Unlock Mentor.
//
// Call once:
//   curl -X POST https://uplift2026.vercel.app/api/setup-admin-tab \
//        -H "x-setup-secret: YOUR_SETUP_SECRET"

import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

const TAB_NAME = "Admin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (req.headers["x-setup-secret"] !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: "Forbidden — wrong or missing x-setup-secret header" });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) return res.status(500).json({ error: "GOOGLE_SHEET_ID not set" });

  const sheets = getSheetsClient();

  // ── 1. Get existing tabs ─────────────────────────────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets;
  const existingTitles = new Set(existingSheets.map(s => s.properties.title));

  // ── 2. Create Admin tab if missing ───────────────────────────────────────────
  let adminSheetId;
  if (!existingTitles.has(TAB_NAME)) {
    const createRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TAB_NAME } } }],
      },
    });
    adminSheetId = createRes.data.replies[0].addSheet.properties.sheetId;
  } else {
    adminSheetId = existingSheets.find(s => s.properties.title === TAB_NAME).properties.sheetId;
  }

  // ── 3. Write header row ───────────────────────────────────────────────────────
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB_NAME}!A1:C1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["Slug", "Unlock Mentor", "Note"]] },
  });

  // ── 4. Read existing slugs so we don't overwrite rows already present ─────────
  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAME}!A:A`,
  });
  const existingSlugs = new Set(
    (existingData.data.values || []).slice(1).map(r => r[0]).filter(Boolean)
  );

  // ── 5. Append missing mentee rows (Slug, FALSE, empty note) ──────────────────
  const newRows = MENTEES
    .filter(m => !existingSlugs.has(m.slug))
    .map(m => [m.slug, "FALSE", ""]);

  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB_NAME}!A:A`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: newRows },
    });
  }

  // ── 6. Apply checkbox validation to column B (Unlock Mentor) ─────────────────
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: adminSheetId,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 1, // B
              endColumnIndex: 2,
            },
            rule: {
              condition: { type: "BOOLEAN" },
              strict: true,
              showCustomUi: true,
            },
          },
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: {
              sheetId: adminSheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // Bold + purple header
        {
          repeatCell: {
            range: { sheetId: adminSheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.22, green: 0.18, blue: 0.54 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
      ],
    },
  });

  return res.status(200).json({
    ok: true,
    message: `Admin tab ready — ${newRows.length} new rows added`,
    newRows: newRows.map(r => r[0]),
  });
}
