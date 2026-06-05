// GET /api/luma-event-guests?eventId=xxx
// Returns guests for a Luma event, matched to mentee slugs where possible.

import { matchMentee, getEventAttendanceMap } from "../../lib/luma-helper";
import { getSheetsClient } from "../../lib/sheets-helper";

const LUMA_BASE = "https://api.lu.ma/public/v1";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ guests: [], error: "LUMA_API_KEY not configured" });
  }

  try {
    const url = `${LUMA_BASE}/event/get-guests?event_id=${encodeURIComponent(eventId)}`;
    const lumaRes = await fetch(url, {
      headers: { "x-luma-api-key": apiKey },
    });

    if (!lumaRes.ok) {
      const text = await lumaRes.text();
      throw new Error(`Luma API error ${lumaRes.status}: ${text}`);
    }

    const data = await lumaRes.json();
    const rawGuests = data.entries || data.guests || [];

    // Load stored review decisions from LumaAttendance sheet
    let storedMap = {};
    const hasSheets = process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
    if (hasSheets) {
      try {
        const sheets = getSheetsClient();
        storedMap = await getEventAttendanceMap(sheets, process.env.GOOGLE_SHEET_ID, eventId);
      } catch (e) {
        console.warn("[luma-event-guests] could not load stored attendance:", e.message);
      }
    }

    const guests = rawGuests.map((entry) => {
      const g = entry.guest || entry;
      const { slug: menteeSlug, matchedBy } = matchMentee(g.email, g.name);

      // Luma uses "going" for virtual attendees; "checked_in" for physical.
      // Both mean the person actually showed up.
      const rawStatus = g.status || "";
      const attended = rawStatus === "checked_in" || rawStatus === "going";
      const normalizedStatus = attended ? "checked_in" : rawStatus;

      // "Joined Time" in Luma UI = checked_in_at (virtual join) or approved_at
      // Luma may put this on the entry wrapper OR the nested guest object
      const joinedAt = entry.checked_in_at || entry.joined_at || g.checked_in_at || g.joined_at || g.approved_at || null;

      const stored = menteeSlug ? (storedMap[menteeSlug] || {}) : {};
      // Use stored joinedAt if Luma didn't return one
      const finalJoinedAt = joinedAt || stored.joinedAt || null;
      const reviewStatus = stored.reviewStatus || null;

      return {
        name: g.name || "",
        email: g.email || "",
        status: normalizedStatus,
        rawStatus,
        checked_in_at: finalJoinedAt,
        reviewStatus,
        menteeSlug: menteeSlug || null,
        matchedBy: matchedBy || null,
      };
    });

    return res.status(200).json({ guests });
  } catch (err) {
    console.error("[luma-event-guests] error:", err.message);
    return res.status(500).json({ error: err.message, guests: [] });
  }
}
