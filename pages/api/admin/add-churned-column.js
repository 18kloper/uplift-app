// GET /api/admin/add-churned-column
// One-time: appends a "Churned" header column to the Milestone Dashboard tab
// if it doesn't already exist.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Milestone Dashboard";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Read header row
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!1:1`,
  });
  const headerRow = (headerRes.data.values || [[]])[0] || [];

  // Check if already exists
  const existing = headerRow.findIndex(h => h?.toLowerCase() === "churned");
  if (existing !== -1) {
    return res.status(200).json({ ok: true, message: "Churned column already exists", col: existing });
  }

  // Append "Churned" as next column after last header
  const nextColIdx = headerRow.length; // 0-based
  const colLetter = colIndexToLetter(nextColIdx);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB}!${colLetter}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["Churned"]] },
  });

  return res.status(200).json({ ok: true, addedAt: colLetter, colIndex: nextColIdx });
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
