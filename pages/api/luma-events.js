// GET /api/luma-events
// Returns combined past + future Luma events sorted by start_at desc.

import { classifyEvent } from "../../lib/luma-helper";

const CALENDAR_ID = "cal-wVdcBds3K0Ylw3n";
const LUMA_BASE = "https://api.lu.ma/public/v1";

async function fetchEvents(apiKey, period) {
  // Luma caps calendar/list-events at 50/page. Loop the pagination cursor so
  // ALL events are returned (single-page calls silently dropped later events,
  // e.g. July sessions that fell past the first 50).
  let all = [];
  let cursor = null;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ calendar_api_id: CALENDAR_ID, period, pagination_limit: "100" });
    if (cursor) qs.set("pagination_cursor", cursor);
    const res = await fetch(`${LUMA_BASE}/calendar/list-events?${qs.toString()}`, {
      headers: { "x-luma-api-key": apiKey },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Luma API ${period} error ${res.status}: ${text}`);
    }
    const data = await res.json();
    all.push(...(data.entries || data.events || []));
    if (!data.has_more) break;
    cursor = data.next_cursor || data.pagination_cursor;
    if (!cursor) break;
  }
  return all;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ events: [], error: "LUMA_API_KEY not configured" });
  }

  try {
    const [futureRaw, pastRaw] = await Promise.all([
      fetchEvents(apiKey, "future"),
      fetchEvents(apiKey, "past"),
    ]);

    const normalize = (entry) => {
      // Luma may wrap in { event: {...} } or return directly
      const ev = entry.event || entry;
      return {
        api_id: ev.api_id,
        name: ev.name,
        start_at: ev.start_at,
        url: ev.url,
        type: classifyEvent(ev.name || ""),
      };
    };

    const PROGRAM_START = new Date("2026-06-01T00:00:00Z");
    const seen = new Set();
    const combined = [...futureRaw.map(normalize), ...pastRaw.map(normalize)]
      .filter(e => new Date(e.start_at) >= PROGRAM_START)
      .filter(e => { if (seen.has(e.api_id)) return false; seen.add(e.api_id); return true; });

    // Sort: upcoming first (ascending), then past events descending
    const now = Date.now();
    const future = combined.filter(e => new Date(e.start_at) >= now).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    const past   = combined.filter(e => new Date(e.start_at) <  now).sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    combined.splice(0, combined.length, ...future, ...past);

    return res.status(200).json({ events: combined });
  } catch (err) {
    console.error("[luma-events] error:", err.message);
    return res.status(500).json({ error: err.message, events: [] });
  }
}
