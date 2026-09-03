// GET /api/admin/fall-sessions
//
// Session logistics for the fall admin: which of the 22 educational sessions
// have live Luma events, their registration counts (synced from Luma), plus
// the onboarding slots and Uplift at OverdriveAI. One calendar listing + one
// get-event per matched session, cached 5 minutes; ?fresh=1 bypasses.

import { EDU_SESSIONS } from "../../../lib/edu-sessions";

const LUMA_BASE = "https://api.lu.ma/public/v1";
const CALENDAR_ID = "cal-wVdcBds3K0Ylw3n";

// Seven onboarding slots run Sept 9-11; that number is the program design, so
// it stays here. Whether each one is live on Luma is not a decision, it is a
// fact about the calendar, and it used to be hardcoded to zero — which meant
// the dashboard kept asking for events that had already been created. Both the
// onboarding slots and the OverdriveAI summit are now recognised by name off
// the same calendar listing the educational sessions already use.
const ONBOARDING_SLOTS = 7;
const ONBOARDING_RE = /onboarding/i;
const OVERDRIVE_RE = /overdrive/i;
const OVERDRIVE = { name: "Uplift at OverdriveAI", day: "Tue Oct 27" };

// The fall calendar carries earlier cohorts too, so anything that starts
// before the fall program is somebody else's event.
const FALL_FROM = "2026-08-01";

function fallOnly(events) {
  return events.filter(e => (e.start_at || "") >= FALL_FROM);
}

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
  // The listing is paged twice (future and past) and Luma repeats events across
  // those windows, so the same event arrives more than once. Keyed by api_id it
  // does not matter for the slug lookup, but it very much matters for anything
  // that counts rows.
  const seen = new Set();
  return all.map(e => e.event || e).filter(e => {
    const key = e.api_id || e.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Luma's public API no longer returns guest_count on event/get — it answers
// 200 with the field simply absent, which is why every registration count on
// this screen had quietly gone to zero while the page still claimed they were
// syncing. The guest list itself is still readable, so count it: pages of 100,
// capped so one runaway event cannot stall the whole request.
const GUEST_PAGE = 100;
const GUEST_MAX_PAGES = 8;

async function guestCount(apiKey, apiId) {
  try {
    let total = 0;
    let cursor = null;
    for (let page = 0; page < GUEST_MAX_PAGES; page++) {
      const qs = new URLSearchParams({ event_api_id: apiId, pagination_limit: String(GUEST_PAGE) });
      if (cursor) qs.set("pagination_cursor", cursor);
      const r = await fetch(`${LUMA_BASE}/event/get-guests?${qs}`, { headers: { "x-luma-api-key": apiKey } });
      if (!r.ok) return page === 0 ? null : total;
      const d = await r.json();
      total += (d.entries || []).length;
      if (!d.has_more) return total;
      cursor = d.next_cursor || d.pagination_cursor;
      if (!cursor) return total;
    }
    return total;
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
      const registered = ev ? await guestCount(apiKey, ev.api_id) : null;
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

    // Onboarding slots, read off the calendar in start order rather than
    // declared. An eighth would show up here on its own, and so would a
    // renamed one, which is the point.
    const eduSlugs = new Set(EDU_SESSIONS.map(s => s.slug));
    const onboardingEvents = fallOnly(events)
      .filter(e => ONBOARDING_RE.test(e.name || "") && !eduSlugs.has((e.url || "").split("/").pop()))
      .sort((a, b) => (a.start_at || "").localeCompare(b.start_at || ""));
    const onboarding = await Promise.all(onboardingEvents.map(async (ev, i) => {
      const slug = (ev.url || "").split("/").pop();
      return {
        n: i + 1,
        name: ev.name,
        slug,
        url: ev.url || `https://luma.com/${slug}`,
        startAt: ev.start_at || null,
        inPerson: /in-?person/i.test(ev.name || ""),
        registered: await guestCount(apiKey, ev.api_id),
      };
    }));

    const overdriveEvent = fallOnly(events).find(e => OVERDRIVE_RE.test(e.name || ""));
    const overdriveSlug = overdriveEvent ? (overdriveEvent.url || "").split("/").pop() : null;

    const payload = {
      generatedAt: new Date().toISOString(),
      totals: {
        eduBooked: booked,
        eduTotal: EDU_SESSIONS.length,
        totalRegistrations,
        onboardingWithLuma: onboarding.length,
        onboardingSlots: Math.max(ONBOARDING_SLOTS, onboarding.length),
        onboardingRegistrations: onboarding.reduce((sum, o) => sum + (o.registered || 0), 0),
      },
      sessions,
      onboarding,
      overdrive: {
        ...OVERDRIVE,
        slug: overdriveSlug,
        onLuma: !!overdriveEvent,
        lumaName: overdriveEvent?.name || null,
        url: overdriveSlug ? `https://luma.com/${overdriveSlug}` : null,
        registered: overdriveEvent ? await guestCount(apiKey, overdriveEvent.api_id) : null,
      },
    };
    cache = { at: now, payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[fall-sessions] failed:", err);
    return res.status(500).json({ error: err.message, sessions: [] });
  }
}
