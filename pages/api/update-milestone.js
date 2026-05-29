// POST /api/update-milestone
// Body: { slug, milestone, value }
// Sets a single milestone checkbox in the Dashboard tab.

import { getSheetsClient, MILESTONE_KEYS } from "../../lib/sheets-helper";

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

    // Find the mentee's row in the Dashboard (column A = slugs)
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Dashboard!A:A",
    });
    const slugCol = read.data.values || [];
    const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);

    if (rowIdx === -1) {
      return res.status(404).json({ error: `Mentee ${slug} not found in Dashboard` });
    }

    // Column G (index 6) is the first milestone column
    const colIndex = 6 + milestoneIdx; // 0-based
    const colLetter = colIndexToLetter(colIndex);
    const rowNum = rowIdx + 1; // 1-based sheet row

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Dashboard!${colLetter}${rowNum}`,
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
