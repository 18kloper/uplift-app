// GET /api/admin/fall-reporting
//
// The single computed answer to "who completed the program", for the admin
// dashboard's Reporting tab. Read-only, no token, matching the other fall-*
// read endpoints.
//
// This exists so the dashboard and the NJEDA exhibit forms cannot disagree.
// Before it, the tab counted milestone checkboxes off the Milestone Dashboard
// tab while the exhibits counted raw Luma check-ins and Approved sessions, so
// a missed tick made the same founder complete on one page and incomplete on
// the other. Both now read lib/njeda-reporting.js.
//
// Evidence first, per Kennedy 2026-09-03: a Luma check-in and an Approved
// SessionReview row are the truth, because they are what an auditor would
// examine. Manual overrides are merged in from the ManualVerification tab and
// stay labelled as overrides rather than masquerading as check-ins.

import {
  COHORT_START,
  COHORT_END,
  EDU_SESSIONS_REQUIRED,
  MENTOR_SESSIONS_REQUIRED,
  MILESTONE_COMPLETERS_REQUIRED,
  IN_PERSON_THRESHOLD,
  IN_PERSON_EVENT,
  FALL_COHORTS,
  loadReportingData,
  headlineMetrics,
  cohortBreakdown,
} from "../../../lib/njeda-reporting";

let cache = { at: 0, payload: null };
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const fresh = req.query.fresh === "1";
  if (!fresh && cache.payload && Date.now() - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  try {
    const { participants } = await loadReportingData();

    const payload = {
      generatedAt: new Date().toISOString(),
      cohortStart: COHORT_START,
      cohortEnd: COHORT_END,
      cohorts: FALL_COHORTS,

      requirements: {
        eduSessions: EDU_SESSIONS_REQUIRED,
        mentorSessions: MENTOR_SESSIONS_REQUIRED,
        completersPerCohort: MILESTONE_COMPLETERS_REQUIRED,
        inPersonThreshold: IN_PERSON_THRESHOLD,
        inPersonEvent: IN_PERSON_EVENT.name,
        inPersonEventDay: IN_PERSON_EVENT.day,
      },

      overall: headlineMetrics(participants),
      byCohort: cohortBreakdown(participants),

      participants: participants.map((p) => ({
        slug: p.slug,
        name: p.name,
        company: p.company,
        cohort: p.cohort,
        matched: p.matched,
        mentorName: p.mentorName || null,

        eduCount: p.eduCount,
        eduComplete: p.eduComplete,
        mentorCount: p.mentorCount,
        mentorComplete: p.mentorComplete,
        attendedInPerson: p.attendedInPerson,

        // A verified completer needs both requirements. This is the number
        // the grant milestone counts, so it is computed once, here.
        verifiedCompleter: p.eduComplete && p.mentorComplete,

        manualCount: p.manualCount,
      })),
    };

    cache = { at: Date.now(), payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[fall-reporting] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
