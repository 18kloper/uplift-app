// GET /api/luma-events
// Returns combined past + future Luma events sorted by start_at desc.

import { classifyEvent } from "../../lib/luma-helper";

const CALENDAR_ID = "cal-wVdcBds3K0Ylw3n";
const LUMA_BASE = "https://api.lu.ma/public/v1";

async function fetchEvents(apiKey, period) {
  const url = `${LUMA_BASE}/calendar/list-events?calendar_api_id=${CALENDAR_ID}&period=${period}`;
  const res = await fetch(url, {
    headers: { "x-luma-api-key": apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Luma API ${period} error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.entries || data.events || [];
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

    const combined = [...futureRaw.map(normalize), ...pastRaw.map(normalize)];

    // Sort descending by start_at
    combined.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

    return res.status(200).json({ events: combined });
  } catch (err) {
    console.error("[luma-events] error:", err.message);
    return res.status(500).json({ error: err.message, events: [] });
  }
}
