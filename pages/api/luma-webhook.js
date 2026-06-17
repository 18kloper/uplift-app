// POST /api/luma-webhook
// Receives Luma webhook events for guest.registered and guest.updated.
// Auto-sets milestones immediately for matched mentees — no manual approval needed.
// Always returns 200 (Luma retries on non-200).

import { getSheetsClient } from "../../lib/sheets-helper";
import {
  matchMentee,
  logLumaAttendance,
  classifyEvent,
  setMilestone,
  setNextEduMilestone,
} from "../../lib/luma-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).end();

  const payload = req.body;
  console.log("[luma-webhook] raw payload:", JSON.stringify(payload, null, 2));

  try {
    const hookType = payload?.hook_type || "unknown";
    const event = payload?.event || {};
    const guest = payload?.guest || {};

    const eventName = event.name || "";
    const eventId = event.api_id || "";
    const eventDate = event.start_at || "";
    const guestName = guest.name || "";
    const guestEmail = guest.email || "";
    const rawStatus = guest.status || "";

    // Normalise status
    const status =
      rawStatus === "checked_in"
        ? "checked_in"
        : rawStatus === "no_show"
        ? "no_show"
        : ["going", "approved"].includes(rawStatus)
        ? "registered"
        : rawStatus;

    // Match to mentee
    const { slug: menteeSlug, matchedBy } = matchMentee(guestEmail, guestName);
    const { MENTEES } = await import("../../lib/mentees");
    const mentee = menteeSlug ? MENTEES.find((m) => m.slug === menteeSlug) : null;
    const menteeName = mentee ? `${mentee.first} ${mentee.last}` : guestName;

    const timestamp = new Date().toISOString();

    const hasSheets =
      process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY;

    let milestoneSet = null;

    if (hasSheets && menteeSlug && status !== "no_show") {
      const sheets = getSheetsClient();
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      // Auto-approve: log as approved immediately and set milestones
      await logLumaAttendance(
        sheets,
        spreadsheetId,
        [
          timestamp,
          hookType,
          eventName,
          eventId,
          eventDate,
          menteeName,
          menteeSlug,
          guestEmail,
          status,
          matchedBy || "",
          rawStatus,
          guest.checked_in_at || guest.joined_at || "",
        ],
        "approved"
      );

      // Set the appropriate milestone
      const eventType = classifyEvent(eventName);
      if (eventType === "onboarding") {
        await setMilestone(sheets, spreadsheetId, menteeSlug, "onboarding");
        milestoneSet = "onboarding";
      } else if (eventType === "edu") {
        milestoneSet = await setNextEduMilestone(sheets, spreadsheetId, menteeSlug);
      }
      // midpoint/other: log attendance but no Dashboard milestone key for it yet

      console.log(`[luma-webhook] auto-approved slug=${menteeSlug} event="${eventName}" type=${eventType} milestone=${milestoneSet}`);
    } else if (hasSheets) {
      // Unmatched guest or no-show — log as pending for manual review
      const sheets = getSheetsClient();
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      await logLumaAttendance(
        sheets,
        spreadsheetId,
        [
          timestamp,
          hookType,
          eventName,
          eventId,
          eventDate,
          menteeName,
          menteeSlug || "",
          guestEmail,
          status,
          matchedBy || "",
          rawStatus,
          guest.checked_in_at || guest.joined_at || "",
        ],
        status === "no_show" ? "no_show" : "pending"
      );
    }

    return res.status(200).json({ ok: true, menteeSlug, status, milestoneSet });
  } catch (err) {
    console.error("[luma-webhook] error:", err.message, err.stack);
    // Always 200 so Luma doesn't retry
    return res.status(200).json({ ok: false, error: err.message });
  }
}
