// GET  /api/admin/ai-cache?key=<key>   → returns { value: <parsed JSON> | null }
// POST /api/admin/ai-cache              → body { key, value } → saves to AICache sheet tab

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "AICache";

export default async function handler(req, res) {
  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true, value: null });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Ensure AICache tab exists
  async function ensureTab() {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(s => s.properties.title === TAB);
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
      });
      // Write header
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!A1:C1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["key", "json", "updatedAt"]] },
      });
    }
  }

  async function readAll() {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A:C` });
    return r.data.values || [];
  }

  if (req.method === "GET") {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: "key required" });

    try {
      await ensureTab();
      const rows = await readAll();
      // rows[0] is header
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === key) {
          try {
            return res.status(200).json({ value: JSON.parse(rows[i][1]) });
          } catch (_) {
            return res.status(200).json({ value: null });
          }
        }
      }
      return res.status(200).json({ value: null });
    } catch (err) {
      console.error("ai-cache GET error:", err.message);
      return res.status(200).json({ value: null, error: err.message });
    }
  }

  if (req.method === "POST") {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: "key and value required" });

    try {
      await ensureTab();
      const rows = await readAll();

      const jsonStr = JSON.stringify(value);
      const now = new Date().toISOString();

      // Find existing row index (1-based sheet row = i+1 because sheet row 1 = header)
      let existingSheetRow = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === key) {
          existingSheetRow = i + 1; // 1-based sheet row
          break;
        }
      }

      if (existingSheetRow > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${TAB}!A${existingSheetRow}:C${existingSheetRow}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[key, jsonStr, now]] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${TAB}!A:C`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [[key, jsonStr, now]] },
        });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("ai-cache POST error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
