// POST /api/track-visit
// Body: { slug, name }
// Upserts last-seen timestamp in PortalActivity tab — one row per mentee.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "PortalActivity";

async function ensureTab(sheets, spreadsheetId) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(s => s.properties.title === TAB);
    if (exists) return;

    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    const sheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1:C1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Slug", "Name", "Last Seen"]] },
    });

    if (sheetId != null) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                fields: "gridProperties.frozenRowCount",
              },
            },
            {
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
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
    }
  } catch (err) {
    console.error("ensurePortalActivityTab failed:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, name } = req.body || {};
  if (!slug) return res.status(400).json({ error: "slug required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, skipped: true });

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await ensureTab(sheets, spreadsheetId);

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });

    // Find existing row for this slug
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A:A`,
    });
    const slugCol = read.data.values || [];
    const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);

    if (rowIdx > 0) {
      // Update last seen in existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!B${rowIdx + 1}:C${rowIdx + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[name || slug, timestamp]] },
      });
    } else {
      // New row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:C`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [[slug, name || slug, timestamp]] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("track-visit error:", err.message);
    return res.status(200).json({ ok: true });
  }
}
