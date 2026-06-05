// POST /api/luma-webhook
// Receives Luma webhook events for guest.registered and guest.updated.
// Logs the event as "pending" review — milestones are set manually via /api/luma-approve.
// Always returns 200 (Luma retries on non-200).

import { getSheetsClient } from "../../lib/sheets-helper";
import { matchMentee, logLumaAttendance } from "../../lib/luma-helper";

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
    const mentee = menteeSlug
      ? (await import("../../lib/mentees")).MENTEES.find((m) => m.slug === menteeSlug)
      : null;
    const menteeName = mentee ? `${mentee.first} ${mentee.last}` : guestName;

    const timestamp = new Date().toISOString();

    // Determine reviewStatus — no_show requires no approval
    const reviewStatus = status === "no_show" ? "no_show" : "pending";

    // Log to Google Sheets if configured
    if (
      process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    ) {
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
        ],
        reviewStatus
      );
    } else {
      console.log("[luma-webhook] Google Sheets not configured — skipping DB write");
    }

    return res.status(200).json({ ok: true, menteeSlug, status, reviewStatus });
  } catch (err) {
    console.error("[luma-webhook] error:", err.message, err.stack);
    // Always 200 so Luma doesn't retry
    return res.status(200).json({ ok: false, error: err.message });
  }
}
