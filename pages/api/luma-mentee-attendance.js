// GET /api/luma-mentee-attendance?slug=xxx
// Returns all LumaAttendance rows for a specific mentee, sorted by timestamp desc.

import { getSheetsClient } from "../../lib/sheets-helper";
import { getMenteeAttendance, classifyEvent } from "../../lib/luma-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug is required" });

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

    const rows = await getMenteeAttendance(sheets, spreadsheetId, slug);

    // Sort by timestamp descending
    rows.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

    const attendance = rows.map((r) => ({
      eventName: r.eventName,
      eventId: r.eventId,
      eventDate: r.eventDate,
      status: r.status,
      joinedAt: r.joinedAt || null,
      reviewStatus: r.reviewStatus,
      reviewedAt: r.reviewedAt,
      eventType: classifyEvent(r.eventName),
    }));

    return res.status(200).json({ attendance });
  } catch (err) {
    console.error("[luma-mentee-attendance] error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
