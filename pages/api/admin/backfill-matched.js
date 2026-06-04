// GET /api/admin/backfill-matched
// Reads the "Mentor Confirmations" tab and for every confirmed row,
// sets matched=TRUE in the Milestone Dashboard.
// Safe to re-run. Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";

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
  if (!hasSheets) return res.status(200).json({ ok: true, skipped: true, reason: "No sheet credentials" });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // 1. Read all confirmed rows from Mentor Confirmations
  const confRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Mentor Confirmations!A2:G500",
  });
  const confRows = confRes.data.values || [];
  // Cols: ThreadID(0), MentorName(1), MentorEmail(2), MenteeName(3), MenteeSlug(4), Status(5)
  const confirmedSlugs = [...new Set(
    confRows
      .filter(r => r[5]?.trim().toLowerCase() === "confirmed" && r[4]?.trim())
      .map(r => r[4].trim())
  )];

  if (confirmedSlugs.length === 0) {
    return res.status(200).json({ ok: true, updated: 0, confirmedSlugs });
  }

  // 2. Read Milestone Dashboard headers + slug column
  const dashHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A1:Z1",
  });
  const headers = dashHeader.data.values?.[0] || [];
  const matchedCol = headers.findIndex(h => h?.toLowerCase().trim() === "matched");
  if (matchedCol === -1) {
    return res.status(200).json({ ok: false, error: "No 'matched' column found in Milestone Dashboard" });
  }

  const dashSlugs = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A2:A300",
  });
  const slugRows = dashSlugs.data.values || [];
  const colLetter = String.fromCharCode(65 + matchedCol);

  const updated = [];
  const notFound = [];

  for (const slug of confirmedSlugs) {
    const rowIdx = slugRows.findIndex(r => r[0]?.trim() === slug);
    if (rowIdx === -1) { notFound.push(slug); continue; }
    const sheetRow = rowIdx + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Milestone Dashboard!${colLetter}${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["TRUE"]] },
    });
    updated.push(slug);
  }

  return res.status(200).json({ ok: true, updated: updated.length, updatedList: updated, notFound });
}
