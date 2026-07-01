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
    // Luma caps get-guests at 50 per page; loop the pagination cursor so large
    // events (>50 registrants) return every guest, not just the first page.
    const rawGuests = [];
    let cursor = null;
    for (let page = 0; page < 50; page++) {
      const qs = new URLSearchParams({ event_id: eventId, pagination_limit: "100" });
      if (cursor) qs.set("pagination_cursor", cursor);
      const lumaRes = await fetch(`${LUMA_BASE}/event/get-guests?${qs.toString()}`, {
        headers: { "x-luma-api-key": apiKey },
      });
      if (!lumaRes.ok) {
        const text = await lumaRes.text();
        throw new Error(`Luma API error ${lumaRes.status}: ${text}`);
      }
      const data = await lumaRes.json();
      rawGuests.push(...(data.entries || data.guests || []));
      if (!data.has_more) break;
      cursor = data.next_cursor || data.pagination_cursor;
      if (!cursor) break;
    }

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

      const rawStatus = g.status || entry.status || "";

      // "Joined Time" in Luma UI = checked_in_at (virtual join) or approved_at
      // Luma may put this on the entry wrapper OR the nested guest object
      const joinedAt = entry.checked_in_at || entry.joined_at || g.checked_in_at || g.joined_at || g.approved_at || null;

      // Treat as attended if: status is checked_in/going OR Luma has a join timestamp
      const attended = rawStatus === "checked_in" || rawStatus === "going" || !!joinedAt;
      const normalizedStatus = attended ? "checked_in" : rawStatus;

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
