// POST /api/set-churned
// Body: { slug, churned: true|false }
// Sets the "Churned" column to TRUE/FALSE in the Milestone Dashboard sheet.

import { getSheetsClient } from "../../lib/sheets-helper";

const SHEET = "Milestone Dashboard";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, churned } = req.body || {};
  if (!slug) return res.status(400).json({ error: "slug required" });

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

    // Find "Churned" column in header row
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!1:1`,
    });
    const headerRow = (headerRes.data.values || [[]])[0] || [];
    const churnedColIdx = headerRow.findIndex(h => h?.toLowerCase() === "churned");
    if (churnedColIdx === -1) return res.status(400).json({ error: "Churned column not found in Dashboard sheet" });

    // Find mentee row by slug (col A)
    const slugRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:A`,
    });
    const slugCol = slugRes.data.values || [];
    const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0]?.trim() === slug);
    if (rowIdx === -1) return res.status(404).json({ error: `Mentee ${slug} not found` });

    const colLetter = colIndexToLetter(churnedColIdx);
    const rowNum = rowIdx + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET}!${colLetter}${rowNum}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[churned ? "TRUE" : "FALSE"]] },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("set-churned error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

function colIndexToLetter(idx) {
  let letter = "";
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}
