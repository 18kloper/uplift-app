// POST /api/admin/approve-session?token=...
// Body: { slug, sessionId, action: "approve" | "deny" }
// Finds the matching row in SessionReview and updates the Approved column.

import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const { slug, sessionId, action, halfCredit } = req.body || {};
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
    const { force, menteeName, date, sixtyMin, takeaways, submittedAt } = req.body || {};
    if (!force) {
      return res.status(404).json({
        error: "Session not found in SessionReview. Load the portal once to sync it, then retry.",
        hint: `GET /api/meetings?slug=${slug}`,
      });
    }
    // Force-insert the row, then approve/deny it below
    const newStatus = action === "approve" ? "Approved" : "Denied";
    const newRow = [
      newStatus,
      slug,
      menteeName || slug,
      date || "",
      sixtyMin === true ? "Yes" : sixtyMin === false ? "No" : "",
      "No",
      takeaways || "",
      sessionId,
      submittedAt || "",
    ];
    if (action === "approve" && halfCredit) newRow[4] = "No";
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "SessionReview!A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [newRow] },
    });
    return res.status(200).json({ ok: true, slug, sessionId, action, halfCredit: !!halfCredit, inserted: true });
  }

  const newStatus = action === "approve" ? "Approved" : "Denied";

  // Write approval status; if halfCredit, also set col E (60+ Min) to "No"
  const updates = [
    {
      range: `SessionReview!A${targetRow}`,
      values: [[newStatus]],
    },
  ];
  if (action === "approve" && halfCredit) {
    updates.push({
      range: `SessionReview!E${targetRow}`,
      values: [["No"]],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, slug, sessionId, action, halfCredit: !!halfCredit, sheetRow: targetRow });
}
