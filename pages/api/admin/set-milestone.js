// POST /api/admin/set-milestone
// Body: { token, slug, milestone, value }
// Sets a single milestone cell to TRUE/FALSE on the Milestone Dashboard tab.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";

function colLetter(idx) {
  let s = "", n = idx;
  while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  const { token, slug, milestone, value } = req.body || {};
  if (secret && token !== secret) return res.status(401).json({ error: "unauthorized" });
  if (!slug || !milestone) return res.status(400).json({ error: "slug and milestone required" });
  if (!MILESTONE_KEYS.includes(milestone)) return res.status(400).json({ error: `unknown milestone: ${milestone}` });

  const hasSheets = process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return res.status(500).json({ error: "sheets not configured" });

  try {
    const sheets = getSheetsClient();
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Milestone Dashboard!A1:Z1" });
    const header = (headerRes.data.values || [[]])[0] || [];

    const colIdx = header.findIndex(h => h === MILESTONE_LABELS[milestone]);
    if (colIdx === -1) return res.status(404).json({ error: `column for ${milestone} not found`, header });

    const dataRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Milestone Dashboard!A:A" });
    const rows = dataRes.data.values || [];
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === slug);
    if (rowIdx === -1) return res.status(404).json({ error: `slug ${slug} not found in sheet` });

    const sheetRow = rowIdx + 1;
    const range = `Milestone Dashboard!${colLetter(colIdx)}${sheetRow}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value === false ? "FALSE" : "TRUE"]] },
    });

    return res.status(200).json({ ok: true, slug, milestone, range, value: value === false ? false : true });
  } catch (err) {
    console.error("set-milestone error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
