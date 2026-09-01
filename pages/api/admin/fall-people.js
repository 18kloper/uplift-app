// GET /api/admin/fall-people
//
// The funnel side of the fall admin: live mentee + mentor applications pulled
// straight from the two original Typeforms (hAbo7Jdh / AayoroO1), one request
// each, parsed server-side against the public form definitions. 60s in-memory
// cache; ?fresh=1 bypasses. Read-only for now: the Accept-into-roster action
// lands with the ingest build.
//
// Fetching and parsing now live in lib/fall-applications.js, shared with the
// mentor-facing founder profiles.

import {
  MENTEE_FORM, MENTOR_FORM, MENTEE_FALL_CUTOFF, MENTOR_FALL_CUTOFF,
  fetchForm, parseMentee, parseMentor, meetsFocus,
  readDecisions, readMatches, keep,
} from "../../../lib/fall-applications";

let cache = { at: 0, payload: null };
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  const fresh = req.query.fresh === "1";
  const now = Date.now();
  if (!fresh && cache.payload && now - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "TYPEFORM_TOKEN not configured", mentees: [], mentors: [] });

  try {
    const [menteeForm, mentorForm, matches, menteeDecisions, mentorDecisions] = await Promise.all([
      fetchForm(MENTEE_FORM, token),
      fetchForm(MENTOR_FORM, token),
      readMatches(),
      readDecisions("FallMentees"),
      readDecisions("FallMentors"),
    ]);

    const mentees = menteeForm.items.filter(keep(MENTEE_FALL_CUTOFF, menteeDecisions)).map(i => parseMentee(menteeForm.titles, i))
      // The "participated in Uplift before?" gate (added 2026-08-26) bounces
      // returning mentees to an ending screen after one answer; Typeform still
      // records that as a response, which lands here as a nameless, emailless
      // row nobody should be approving.
      .filter(m => m.email || m.first || m.last)
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    const mentors = mentorForm.items.filter(keep(MENTOR_FALL_CUTOFF, mentorDecisions)).map(i => parseMentor(mentorForm.titles, i))
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

    // Overlay live matches + decisions + eligibility
    const matchByMentee = Object.fromEntries(matches.map(x => [x.menteeId, x]));
    for (const m of mentees) {
      const hit = matchByMentee[m.id];
      m.matchedMentorId = hit?.mentorId || null;
      m.matchedMentorName = hit?.mentorName || null;
      m.matchedAt = hit?.matchedAt || null;
      const d = menteeDecisions.latest[m.id];
      m.decision = d === "clear" ? null : d || null;
      m.upliftId = menteeDecisions.ids[m.id] || null;
      m.meetsRequirements = m.njResident && meetsFocus(m.disclosure) && !m.summerAlum;
    }
    for (const mt of mentors) {
      const live = matches.filter(x => x.mentorId === mt.id).map(x => x.menteeName);
      mt.assignedTo = [...new Set([...(mt.assignedTo || []), ...live])];
      const d = mentorDecisions.latest[mt.id];
      mt.decision = d === "clear" ? null : d || null;
      mt.upliftId = mentorDecisions.ids[mt.id] || null;
    }

    const sheetReadError = !!(menteeDecisions.failed || mentorDecisions.failed || matches.failed);
    const payload = {
      generatedAt: new Date().toISOString(),
      // Funnel counts are of real people: the walkthrough portals never
      // count, but accepted founders (who are all in the roster now) do.
      menteeCount: mentees.filter(m => !m.isTest).length,
      mentorCount: mentors.filter(m => !m.isTest).length,
      matchedCount: matches.length,
      sheetReadError,
      mentees,
      mentors,
      matches: [...matches],
    };
    // Never cache a payload with missing decisions — the next request should
    // retry the sheet rather than keep showing everyone as Undecided for 60s.
    if (!sheetReadError) cache = { at: now, payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[fall-people] failed:", err);
    return res.status(500).json({ error: err.message, mentees: [], mentors: [] });
  }
}
