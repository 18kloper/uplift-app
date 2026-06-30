// GET /api/admin/sync-all-sessions?token=...
// Hits /api/meetings for every active mentee so Typeform sessions are pulled
// and mentorSession1/2/3 milestones are synced to the Dashboard.
// Designed to be called by a scheduled cron job twice per day.

import { MENTEES } from "../../../lib/mentees";
import { fetchMeetings, fetchTypeformResponses } from "../meetings";

// Give the full-cohort loop room to finish (default is 10s, which it overruns).
export const config = { maxDuration: 60 };

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const slugs = MENTEES
    .filter(m => !TEST_SLUGS.has(m.slug) && m.mentor?.email)
    .map(m => m.slug);

  // Fetch all Typeform responses ONCE, then process every mentee against it.
  // Re-fetching per mentee (70+ × 1000 responses) is what made this time out.
  const typeformData = await fetchTypeformResponses();

  const results = [];
  for (const slug of slugs) {
    try {
      // Call meetings logic in-process — no public self-fetch, so Vercel's
      // challenge layer never intercepts this. fetchMeetings() also triggers
      // autoSyncMentorMilestones internally.
      const meetings = await fetchMeetings(slug, typeformData);
      const count = (meetings || [])
        .filter(m => { const INVALID = new Set(["n/a","na","none","no","nothing","-","n.a.","n/a."]); const vn = n => { const t = n?.trim().toLowerCase(); return t && !INVALID.has(t); }; return !m.denied && (vn(m.notes) || m.manuallyVerified); })
        .reduce((sum, m) => sum + (m.minutes != null ? Math.round((m.minutes / 60) * 100) / 100 : 1.0), 0);
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
