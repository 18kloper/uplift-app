// POST /api/luma-approve
// Body: { eventId, menteeSlug, approve: true|false }
// Approves or denies a pending attendance entry and sets milestones when approved.

import { getSheetsClient } from "../../lib/sheets-helper";
import {
  classifyEvent,
  approveAttendance,
  logLumaAttendance,
  setMilestone,
  setNextEduMilestone,
} from "../../lib/luma-helper";
import { MENTEES } from "../../lib/mentees";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { eventId, menteeSlug, approve } = req.body || {};
  if (!eventId || !menteeSlug) {
    return res.status(400).json({ error: "eventId and menteeSlug are required" });
  }

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

    let { ok, row } = await approveAttendance(sheets, spreadsheetId, eventId, menteeSlug, approve);

    // If no row exists yet (sync never run), create one on-the-fly then approve
    if (!ok) {
      const mentee = MENTEES.find(m => m.slug === menteeSlug);
      const menteeName = mentee ? `${mentee.first} ${mentee.last}` : menteeSlug;
      const timestamp = new Date().toISOString();
      await logLumaAttendance(sheets, spreadsheetId, [
        timestamp, "manual-approve", "", eventId, "", menteeName, menteeSlug, "", "checked_in", "manual", "", "",
      ], "pending");
      // Now approve the freshly created row
      ({ ok, row } = await approveAttendance(sheets, spreadsheetId, eventId, menteeSlug, approve));
      if (!ok) return res.status(500).json({ ok: false, error: "Could not create or find attendance row" });
    }

    let milestone = null;

    if (approve && (row.status === "checked_in" || row.status === "")) {
      const eventType = classifyEvent(row.eventName);
      if (eventType === "onboarding") {
        await setMilestone(sheets, spreadsheetId, menteeSlug, "onboarding");
        milestone = "onboarding";
        console.log(`[luma-approve] set onboarding=TRUE for ${menteeSlug}`);
      } else if (eventType === "midpoint") {
        await setMilestone(sheets, spreadsheetId, menteeSlug, "midpoint");
        milestone = "midpoint";
        console.log(`[luma-approve] set midpoint=TRUE for ${menteeSlug}`);
      } else if (eventType === "edu") {
        milestone = await setNextEduMilestone(sheets, spreadsheetId, menteeSlug);
        if (milestone) {
          console.log(`[luma-approve] set ${milestone}=TRUE for ${menteeSlug}`);
        } else {
          console.log(`[luma-approve] all edu slots filled for ${menteeSlug}`);
        }
      }
    }

    return res.status(200).json({ ok: true, milestone });
  } catch (err) {
    console.error("[luma-approve] error:", err.message, err.stack);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
