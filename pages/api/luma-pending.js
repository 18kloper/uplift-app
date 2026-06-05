// GET /api/luma-pending
// Returns all pending attendance rows (checked_in or registered, not yet reviewed).
// Groups results by eventName.

import { getSheetsClient } from "../../lib/sheets-helper";
import { getPendingAttendance } from "../../lib/luma-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(500).json({ error: "Google Sheets not configured" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const pending = await getPendingAttendance(sheets, spreadsheetId);

    // Group by eventName
    const groupedByEvent = {};
    for (const row of pending) {
      const key = row.eventName || "(unknown event)";
      if (!groupedByEvent[key]) groupedByEvent[key] = [];
      groupedByEvent[key].push(row);
    }

    return res.status(200).json({ pending, groupedByEvent, total: pending.length });
  } catch (err) {
    console.error("[luma-pending] error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
