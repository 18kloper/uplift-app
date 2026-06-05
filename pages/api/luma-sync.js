// POST /api/luma-sync
// Body: { eventId }
// Fetches all guests for an event and logs them as "pending" review.
// Milestones are NOT set here — admin approves manually via /api/luma-approve.

import { getSheetsClient } from "../../lib/sheets-helper";
import { matchMentee, logLumaAttendance } from "../../lib/luma-helper";
import { MENTEES } from "../../lib/mentees";

const LUMA_BASE = "https://api.lu.ma/public/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { eventId } = req.body || {};
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "LUMA_API_KEY not configured" });

  // Fetch event details to get name/date
  let eventName = "";
  let eventDate = "";
  try {
    const evRes = await fetch(`${LUMA_BASE}/event/get?api_id=${encodeURIComponent(eventId)}`, {
      headers: { "x-luma-api-key": apiKey },
    });
    if (evRes.ok) {
      const evData = await evRes.json();
      const ev = evData.event || evData;
      eventName = ev.name || "";
      eventDate = ev.start_at || "";
    }
  } catch (err) {
    console.warn("[luma-sync] could not fetch event details:", err.message);
  }

  // Fetch guests
  let rawGuests = [];
  try {
    const guestRes = await fetch(
      `${LUMA_BASE}/event/get-guests?event_id=${encodeURIComponent(eventId)}`,
      { headers: { "x-luma-api-key": apiKey } }
    );
    if (!guestRes.ok) {
      const text = await guestRes.text();
      throw new Error(`Luma API error ${guestRes.status}: ${text}`);
    }
    const guestData = await guestRes.json();
    rawGuests = guestData.entries || guestData.guests || [];
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  let sheets, spreadsheetId;
  if (hasSheets) {
    sheets = getSheetsClient();
    spreadsheetId = process.env.GOOGLE_SHEET_ID;
  }

  let logged = 0;
  let skipped = 0;
  const notMatched = [];
  const timestamp = new Date().toISOString();

  for (const entry of rawGuests) {
    const g = entry.guest || entry;
    const rawStatus = g.status || "";
    // "going" = joined virtual event; treat same as checked_in
    const status =
      rawStatus === "checked_in" || rawStatus === "going"
        ? "checked_in"
        : rawStatus === "no_show"
        ? "no_show"
        : "registered";

    const joinedAt = g.checked_in_at || g.approved_at || "";

    if (status !== "checked_in" && status !== "no_show" && status !== "registered") {
      skipped++;
      continue;
    }

    const { slug: menteeSlug, matchedBy } = matchMentee(g.email, g.name);
    const mentee = menteeSlug ? MENTEES.find((m) => m.slug === menteeSlug) : null;
    const menteeName = mentee ? `${mentee.first} ${mentee.last}` : g.name || "";

    if (!menteeSlug) {
      notMatched.push(g.name || g.email || "unknown");
    }

    // Determine reviewStatus — no_show requires no approval
    const reviewStatus = status === "no_show" ? "no_show" : "pending";

    // Log to sheet
    if (hasSheets) {
      try {
        await logLumaAttendance(
          sheets,
          spreadsheetId,
          [
            timestamp,
            "manual-sync",
            eventName,
            eventId,
            eventDate,
            menteeName,
            menteeSlug || "",
            g.email || "",
            status,
            matchedBy || "",
            rawStatus,
            joinedAt,
          ],
          reviewStatus
        );
        logged++;
      } catch (err) {
        console.error("[luma-sync] log error:", err.message);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return res.status(200).json({ logged, skipped, notMatched });
}
