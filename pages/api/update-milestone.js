// POST /api/update-milestone
// Body: { slug, milestone, value }
// Sets a single milestone checkbox in the Dashboard tab.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { slug, milestone, value } = req.body;
  if (!slug || !milestone) {
    return res.status(400).json({ error: "Missing slug or milestone" });
  }

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const milestoneIdx = MILESTONE_KEYS.indexOf(milestone);
  if (milestoneIdx === -1) {
    return res.status(400).json({ error: `Unknown milestone: ${milestone}` });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read Dashboard header + slug column to find both the mentee row and milestone column
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Milestone Dashboard!A1:Z1",
    });
    const headerRow = (read.data.values || [[]])[0] || [];

    // Find milestone column by its header label (robust to extra columns)
    const milestoneLabel = MILESTONE_LABELS[milestone];
    let colIndex = headerRow.findIndex(h => h === milestoneLabel);
    if (colIndex === -1) colIndex = 6 + milestoneIdx; // fallback to hardcoded offset

    // Find the mentee's row
    const slugRead = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Milestone Dashboard!A:A",
    });
    const slugCol = slugRead.data.values || [];
    const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);

    if (rowIdx === -1) {
      return res.status(404).json({ error: `Mentee ${slug} not found in Dashboard` });
    }

    const colLetter = colIndexToLetter(colIndex);
    const rowNum = rowIdx + 1; // 1-based sheet row

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Milestone Dashboard!${colLetter}${rowNum}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value ? "TRUE" : "FALSE"]] },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("update-milestone error:", err.message);
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
