// GET /api/luma-pending
// Returns pending attendance rows that need admin review:
//   - Only checked_in rows (registered-only = no action needed)
//   - Excludes test/staff slugs

import { getSheetsClient } from "../../lib/sheets-helper";
import { getPendingAttendance, getAllMilestones, classifyEvent } from "../../lib/luma-helper";

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

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

    const [all, milestones] = await Promise.all([
      getPendingAttendance(sheets, spreadsheetId),
      getAllMilestones(sheets, spreadsheetId),
    ]);

    // Only show rows where:
    // 1. Person actually attended (checked_in)
    // 2. Not a test/staff account
    // 3. Their milestone for this event type isn't already set
    const pending = all.filter(row => {
      if (row.status !== "checked_in") return false;
      if (TEST_SLUGS.has(row.menteeSlug)) return false;
      // If their milestone is already set, no need to approve
      if (row.menteeSlug) {
        const m = milestones[row.menteeSlug] || {};
        const eventType = classifyEvent(row.eventName);
        if (eventType === "onboarding" && m.onboarding) return false;
        if (eventType === "midpoint" && m.midpoint) return false;
        if (eventType === "edu" && m.edu1 && m.edu2 && m.edu3) return false;
      }
      return true;
    });

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
