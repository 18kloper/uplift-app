// POST /api/track-resource
// Body: { slug, title, url }
// Appends one row to the ResourceClicks sheet tab — fire-and-forget from the portal.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "ResourceClicks";

async function ensureTab(sheets, spreadsheetId) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(s => s.properties.title === TAB);
    if (exists) return;

    // Create tab
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    const sheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId;

    // Write header
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1:E1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Timestamp", "Slug", "Name", "Resource", "URL"]] },
    });

    // Freeze + bold header
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
    console.error("ensureResourceClicksTab failed:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, name, title, url } = req.body || {};
  if (!slug || !title) return res.status(400).json({ error: "slug and title required" });

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

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:E`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[timestamp, slug, name || slug, title, url || ""]] },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("track-resource error:", err.message);
    return res.status(200).json({ ok: true }); // never block navigation
  }
}
