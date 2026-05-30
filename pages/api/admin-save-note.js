// POST /api/admin-save-note
// Body: { slug, note }
// Finds the row in Dashboard!A:A matching slug, then writes to the Notes column.

import { getSheetsClient } from "../../lib/sheets-helper";

function colIndexToLetter(n) {
  let result = "";
  n = n + 1; // convert 0-indexed to 1-indexed for this algorithm
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, note } = req.body || {};
  if (!slug) return res.status(400).json({ error: "slug required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, skipped: "no sheets config" });

  try {
    const sheets = getSheetsClient();

    // Read header row to find "Notes" column index
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Dashboard!1:1",
    });
    const headers = headerRes.data.values?.[0] || [];
    const notesColIdx = headers.findIndex(h => h?.toLowerCase() === "notes");

    if (notesColIdx < 0) {
      return res.status(400).json({ error: "Notes column not found — add a 'Notes' header to the Dashboard sheet" });
    }

    // Find the row number for this slug (column A)
    const slugRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Dashboard!A:A",
    });
    const slugRows = slugRes.data.values || [];
    const rowIdx = slugRows.findIndex((r, i) => i > 0 && r[0] === slug);

    if (rowIdx < 0) {
      return res.status(404).json({ error: `Slug "${slug}" not found in Dashboard sheet` });
    }

    const col    = colIndexToLetter(notesColIdx);
    const rowNum = rowIdx + 1; // 1-indexed for Sheets

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Dashboard!${col}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [[note || ""]] },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("admin-save-note failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
