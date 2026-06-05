// GET /api/luma-event-guests?eventId=xxx
// Returns guests for a Luma event, matched to mentee slugs where possible.

import { matchMentee } from "../../lib/luma-helper";

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

    const guests = rawGuests.map((entry) => {
      const g = entry.guest || entry;
      const { slug: menteeSlug, matchedBy } = matchMentee(g.email, g.name);
      return {
        name: g.name || "",
        email: g.email || "",
        status: g.status || "",
        checked_in_at: g.checked_in_at || null,
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
