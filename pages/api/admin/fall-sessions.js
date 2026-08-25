// GET /api/admin/fall-sessions
//
// Session logistics for the fall admin: which of the 22 educational sessions
// have live Luma events, their registration counts (synced from Luma), plus
// the onboarding slots and Uplift at OverdriveAI. One calendar listing + one
// get-event per matched session, cached 5 minutes; ?fresh=1 bypasses.

const LUMA_BASE = "https://api.lu.ma/public/v1";
const CALENDAR_ID = "cal-wVdcBds3K0Ylw3n";

// Mirror of the fall schedule in pages/fall/[mentee].js (source of truth for
// founders). Update both together.
const EDU_SESSIONS = [
  { n: 1, day: "Fri Sept 11", time: "12:30 PM", slug: "techun-lfmg" },
  { n: 2, day: "Mon Sept 14", time: "12:30 PM", slug: "3qg5eegx" },
  { n: 3, day: "Tue Sept 15", time: "5:30 PM", slug: "vxh6h310" },
  { n: 4, day: "Fri Sept 18", time: "12:30 PM", slug: "smzvhwxk" },
  { n: 5, day: "Mon Sept 21", time: "12:30 PM", slug: "zkb2rc8p" },
  { n: 6, day: "Tue Sept 22", time: "5:30 PM", slug: "de3y5zeu" },
  { n: 7, day: "Fri Sept 25", time: "12:30 PM", slug: "k1mvgwvs" },
  { n: 8, day: "Mon Sept 28", time: "12:30 PM", slug: "pidrg7sw" },
  { n: 9, day: "Tue Sept 29", time: "5:30 PM", slug: "bruqh9hf" },
  { n: 10, day: "Fri Oct 2", time: "12:30 PM", slug: "rjxdyml0" },
  { n: 11, day: "Mon Oct 5", time: "12:30 PM", slug: "7ajm07pv" },
  { n: 12, day: "Tue Oct 6", time: "5:30 PM", slug: "6fqmptfu" },
  { n: 13, day: "Fri Oct 9", time: "12:30 PM", slug: "872810d3" },
  { n: 14, day: "Mon Oct 12", time: "12:30 PM", slug: "g2j1tlk4" },
  { n: 15, day: "Fri Oct 16", time: "12:30 PM", slug: "mbjuraiq" },
  { n: 16, day: "Mon Oct 19", time: "12:30 PM", slug: "6droguib" },
  { n: 17, day: "Tue Oct 20", time: "5:30 PM", slug: "krpytz6i" },
  { n: 18, day: "Tue Oct 20", time: "5:30 PM", slug: "hbm2pxfg" },
  { n: 19, day: "Wed Oct 21", time: "12:30 PM", slug: "widxhy78" },
  { n: 20, day: "Fri Oct 23", time: "5:30 PM", slug: "s012hqvf" },
  { n: 21, day: "Tue Nov 3", time: "5:30 PM", slug: "c5o9r8zg" },
  { n: 22, day: "Wed Nov 4", time: "12:30 PM", slug: "b7bf0c6h" },
];

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
