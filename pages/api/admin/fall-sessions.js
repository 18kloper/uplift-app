// GET /api/admin/fall-sessions
//
// Session logistics for the fall admin: which of the 22 educational sessions
// have live Luma events, their registration counts (synced from Luma), plus
// the onboarding slots and Uplift at OverdriveAI. One calendar listing + one
// get-event per matched session, cached 5 minutes; ?fresh=1 bypasses.

import { EDU_SESSIONS } from "../../../lib/edu-sessions";

const LUMA_BASE = "https://api.lu.ma/public/v1";
const CALENDAR_ID = "cal-wVdcBds3K0Ylw3n";

// Luma links pending for these; counted so the admin can see what's unbooked.
const ONBOARDING_SLOTS = 7;
const ONBOARDING_WITH_LUMA = 0;
const OVERDRIVE = { name: "Uplift at OverdriveAI", day: "Tue Oct 27", slug: null };

let cache = { at: 0, payload: null };
const CACHE_MS = 5 * 60 * 1000;

async function listAllEvents(apiKey) {
  const all = [];
  for (const period of ["future", "past"]) {
    let cursor = null;
    for (let page = 0; page < 20; page++) {
      const qs = new URLSearchParams({ calendar_api_id: CALENDAR_ID, period, pagination_limit: "100" });
      if (cursor) qs.set("pagination_cursor", cursor);
      const r = await fetch(`${LUMA_BASE}/calendar/list-events?${qs}`, { headers: { "x-luma-api-key": apiKey } });
      if (!r.ok) break;
      const data = await r.json();
      all.push(...(data.entries || data.events || []));
      if (!data.has_more) break;
      cursor = data.next_cursor || data.pagination_cursor;
      if (!cursor) break;
    }
  }
  return all.map(e => e.event || e);
}

async function guestCount(apiKey, apiId) {
  try {
    const r = await fetch(`${LUMA_BASE}/event/get?api_id=${apiId}`, { headers: { "x-luma-api-key": apiKey } });
    if (!r.ok) return null;
    const d = await r.json();
    const ev = d.event || d;
    return ev.guest_count ?? d.guest_count ?? null;
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  const fresh = req.query.fresh === "1";
  const now = Date.now();
  if (!fresh && cache.payload && now - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "LUMA_API_KEY not configured", sessions: [] });

  try {
    const events = await listAllEvents(apiKey);
    const bySlug = {};
    for (const ev of events) {
      const slug = (ev.url || "").split("/").pop();
      if (slug) bySlug[slug] = ev;
    }

    const sessions = await Promise.all(EDU_SESSIONS.map(async (s) => {
      const ev = bySlug[s.slug];
      const registered = ev ? (ev.guest_count ?? await guestCount(apiKey, ev.api_id)) : null;
      return {
        ...s,
        url: `https://luma.com/${s.slug}`,
        onLuma: !!ev,
        lumaName: ev?.name || null,
        registered,
      };
    }));

    const booked = sessions.filter(s => s.onLuma).length;
    const totalRegistrations = sessions.reduce((sum, s) => sum + (s.registered || 0), 0);

    const payload = {
      generatedAt: new Date().toISOString(),
      totals: {
        eduBooked: booked,
        eduTotal: EDU_SESSIONS.length,
        totalRegistrations,
        onboardingWithLuma: ONBOARDING_WITH_LUMA,
        onboardingSlots: ONBOARDING_SLOTS,
      },
      sessions,
      overdrive: OVERDRIVE,
    };
    cache = { at: now, payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[fall-sessions] failed:", err);
    return res.status(500).json({ error: err.message, sessions: [] });
  }
}
