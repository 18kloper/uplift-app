// POST /api/admin/approve-session?token=...
// Body: { slug, sessionId, action: "approve" | "deny" }
// Finds the matching row in SessionReview and updates the Approved column.

import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const { slug, sessionId, action } = req.body || {};
  if (!slug || !sessionId || !action) {
    return res.status(400).json({ error: "slug, sessionId, and action required" });
  }
  if (!["approve", "deny"].includes(action)) {
    return res.status(400).json({ error: "action must be 'approve' or 'deny'" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return res.status(500).json({ error: "Google Sheets not configured" });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "SessionReview!A:I",
  });
  const rows = readRes.data.values || [];

  // Find the row matching slug + sessionId
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] === slug && row[7] === sessionId) {
      targetRow = i + 1; // 1-indexed sheet row
      break;
    }
  }

  if (targetRow === -1) {
    // Row not in sheet yet — trigger a portal load to sync it first, then retry
    return res.status(404).json({
      error: "Session not found in SessionReview. Load the portal once to sync it, then retry.",
      hint: `GET /api/meetings?slug=${slug}`,
    });
  }

  const newStatus = action === "approve" ? "Approved" : "Denied";
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `SessionReview!A${targetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [[newStatus]] },
  });

  return res.status(200).json({ ok: true, slug, sessionId, action, sheetRow: targetRow });
}
