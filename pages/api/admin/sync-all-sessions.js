// GET /api/admin/sync-all-sessions?token=...
// Hits /api/meetings for every active mentee so Typeform sessions are pulled
// and mentorSession1/2/3 milestones are synced to the Dashboard.
// Designed to be called by a scheduled cron job twice per day.

import { MENTEES } from "../../../lib/mentees";

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const slugs = MENTEES
    .filter(m => !TEST_SLUGS.has(m.slug) && m.mentor?.email)
    .map(m => m.slug);

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://uplift2026.vercel.app";

  const results = [];
  for (const slug of slugs) {
    try {
      const r = await fetch(`${baseUrl}/api/meetings?slug=${slug}`);
      const data = await r.json();
      const count = (data.meetings || []).filter(m =>
        !m.denied && ((m.sixtyMin === true && m.notes?.trim()) || m.manuallyVerified)
      ).length;
      results.push({ slug, sessions: count, ok: true });
    } catch (e) {
      results.push({ slug, ok: false, error: e.message });
    }
  }

  const totalSessions = results.reduce((sum, r) => sum + (r.sessions || 0), 0);
  const withSessions = results.filter(r => r.sessions > 0);

  return res.status(200).json({
    ok: true,
    synced: results.length,
    totalSessions,
    withSessions,
    results,
  });
}
