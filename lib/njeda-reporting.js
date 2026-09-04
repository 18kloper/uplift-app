// Shared data layer for the NJEDA reporting pack (Exhibits A, C, D, E and the
// educational-session verification forms).
//
// Every NJEDA form asks the same handful of questions about the same handful
// of tabs, and the Summer pack answered them by hand in five separate one-shot
// HTML files that froze the day they were written. This module is the single
// place those answers live, so a fix to "what counts as attendance" lands on
// every form at once.
//
// Sources, all live:
//   FALL_FOUNDERS (lib/fall-cohort.js)  roster, participant fields, slugs
//   FallMatches tab                      mentor pairing
//   Typeform AayoroO1                    mentor title / company
//   LumaAttendance tab                   event attendance, check-ins only
//   SessionReview tab                    mentor 1:1 sessions, Approved only
//
// Two rules every consumer inherits, because this feeds a signed grant
// certification:
//
//   1. Attendance means a Luma check-in. A registration is not attendance.
//      The forms ask what was attended, so a no-show must never be counted.
//   2. A mentor session counts when SessionReview says Approved. Pending is
//      not counted, because pending is exactly the state where the team has
//      not yet verified it happened.

import { FALL_FOUNDERS } from "./fall-cohort";
import {
  MENTOR_FORM,
  fetchForm,
  parseMentor,
  readSheet,
  readMatches,
} from "./fall-applications";

// ── Program constants ───────────────────────────────────────────────────────

// Cohort dates as NJEDA sees them. Nov 20, not Nov 6: the eight weeks of
// program activity end Nov 6, and the paperwork window closes Nov 20, which is
// part of the cohort period the grant certifies.
// See public/program-requirements-fall2026.html.
export const COHORT_START = "September 9, 2026";
export const COHORT_END = "November 20, 2026";

// Verbatim from the grant agreement, quoted on the Summer verification forms.
// Do not paraphrase: it is quoted back to NJEDA on every participant form.
export const EDU_REQUIREMENT =
  "Completed a minimum of 1.5 hours (90 minutes) of educational programming " +
  "provided to the Cohort through at least three (3) separate sessions. " +
  "These sessions can be either in-person or virtual.";

export const EDU_SESSIONS_REQUIRED = 3;
export const MENTOR_SESSIONS_REQUIRED = 3;

// Milestone gate, from the Summer Exhibit A requisition language:
// "10 verified completers; in-person event >= 50% participation".
export const MILESTONE_COMPLETERS_REQUIRED = 10;
export const IN_PERSON_THRESHOLD = 0.5;

// The seven Fall onboarding slots, from pages/fall/[mentee].js week 1.
//
// Five carry a cohort name; slots 4 and 5 are in-person options open to
// anybody, so attending one does NOT determine a cohort. Those founders come
// out of deriveCohort as "Unassigned" rather than being silently bucketed,
// because guessing a cohort would put a wrong cohort name on a signed Exhibit
// C and D.
export const ONBOARDING_SLOTS = [
  { n: 1, cohort: "Edison",   day: "Wed Sept 9",  format: "Virtual",   lumaSlug: "techun-q0gf" },
  { n: 2, cohort: "Hopper",   day: "Wed Sept 9",  format: "Virtual",   lumaSlug: "0ajrxrma" },
  { n: 3, cohort: "Bardeen",  day: "Wed Sept 9",  format: "Virtual",   lumaSlug: "1joflzni" },
  { n: 4, cohort: null,       day: "Thu Sept 10", format: "In-Person", lumaSlug: "2egw051q" },
  { n: 5, cohort: null,       day: "Thu Sept 10", format: "In-Person", lumaSlug: "zchii8yf" },
  { n: 6, cohort: "Lawrence", day: "Fri Sept 11", format: "Virtual",   lumaSlug: "hw8z03dq" },
  { n: 7, cohort: "Morrison", day: "Fri Sept 11", format: "Virtual",   lumaSlug: "4lw55vqz" },
];

export const FALL_COHORTS = ["Edison", "Hopper", "Bardeen", "Lawrence", "Morrison"];

// The one required in-person event, which the milestone threshold is measured
// against. Oct 27 in Newark.
export const IN_PERSON_EVENT = { name: "Uplift at OverdriveAI", day: "Tue Oct 27", match: /overdrive/i };

const ONBOARDING_RE = /onboard/i;

// LumaAttendance holds every cohort the program has ever run, so anything that
// starts before the Fall program is somebody else's event. Without this cutoff
// a Fall founder who is also a Summer alum gets Summer sessions credited
// toward their Fall requirement, which would be a false statement on a signed
// certification. Same boundary pages/api/admin/fall-sessions.js already uses.
export const FALL_FROM = "2026-08-01";

// ── Readers ─────────────────────────────────────────────────────────────────

// Every Luma check-in, grouped two ways. Check-ins only: see rule 1 above.
export async function readAttendance() {
  const { rows } = await readSheet("LumaAttendance!A2:N2000");
  const bySlug = {};
  const byEvent = {};
  const seen = new Set();

  for (const r of rows || []) {
    const status = (r[8] || "").trim().toLowerCase();
    if (status !== "checked_in") continue;

    const slug = (r[6] || "").trim();
    const eventName = (r[2] || "").trim();
    if (!slug || !eventName) continue;

    const eventDate = (r[4] || "").trim();
    // Undated rows cannot be placed in a cohort period, so they are excluded
    // rather than assumed to be current.
    if (!eventDate || eventDate < FALL_FROM) continue;

    const key = `${slug}|${eventName}|${eventDate.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const rec = {
      slug,
      name: (r[5] || "").trim(),
      email: (r[7] || "").trim(),
      eventName,
      eventDate,
      isOnboarding: ONBOARDING_RE.test(eventName),
      isInPersonEvent: IN_PERSON_EVENT.match.test(eventName),
      manual: false,
    };

    (bySlug[slug] ||= []).push(rec);
    (byEvent[eventName] ||= { name: eventName, date: eventDate, attendees: [] }).attendees.push(rec);
  }

  const byDate = (a, b) => new Date(a.eventDate) - new Date(b.eventDate);
  for (const s of Object.keys(bySlug)) bySlug[s].sort(byDate);
  for (const e of Object.keys(byEvent)) {
    byEvent[e].attendees.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { bySlug, byEvent };
}

// Approved mentor sessions only, oldest first. See rule 2 above.
export async function readApprovedSessions() {
  const { rows } = await readSheet("SessionReview!A2:I1000");
  const bySlug = {};
  for (const r of rows || []) {
    if ((r[0] || "").trim().toLowerCase() !== "approved") continue;
    const slug = (r[1] || "").trim();
    if (!slug) continue;
    (bySlug[slug] ||= []).push({
      date: (r[3] || "").trim(),
      sixtyMin: (r[4] || "").trim().toLowerCase() === "yes",
      takeaways: (r[6] || "").trim(),
      sessionId: (r[7] || "").trim(),
    });
  }
  for (const s of Object.keys(bySlug)) {
    bySlug[s].sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  return bySlug;
}

// Real attendance that the evidence missed: someone showed up in person and
// was never scanned in, Luma glitched, a founder joined on a colleague's link.
// Excluding it would be its own kind of inaccurate, so the team can record it
// here — but it is kept SEPARATE from Luma evidence and carries who verified it
// and why, so the exhibit forms can print "manually verified by MJ, sign-in
// sheet" instead of silently claiming a check-in that never happened.
//
// Tab: ManualVerification
//   A Timestamp · B Slug · C Type (edu|mentor) · D Item · E Date
//   F Reason · G Verified By
export async function readManualVerifications() {
  const { rows } = await readSheet("ManualVerification!A2:G1000");
  const bySlug = {};
  for (const r of rows || []) {
    const slug = (r[1] || "").trim();
    const type = (r[2] || "").trim().toLowerCase();
    if (!slug || !["edu", "mentor"].includes(type)) continue;
    const date = (r[4] || "").trim();
    if (date && date < FALL_FROM) continue; // same cohort boundary as evidence
    (bySlug[slug] ||= []).push({
      type,
      item: (r[3] || "").trim(),
      date,
      reason: (r[5] || "").trim(),
      verifiedBy: (r[6] || "").trim(),
      manual: true,
    });
  }
  return bySlug;
}

export async function readMentorsById(typeformToken) {
  if (!typeformToken) return {};
  try {
    const { titles, items } = await fetchForm(MENTOR_FORM, typeformToken);
    const byId = {};
    for (const item of items || []) {
      const m = parseMentor(titles, item);
      if (m?.id) byId[m.id] = m;
    }
    return byId;
  } catch (err) {
    console.error("[njeda-reporting] mentor form fetch failed:", err.message);
    return {};
  }
}

// ── Derivations ─────────────────────────────────────────────────────────────

// A founder's cohort, from the onboarding session they checked into.
//
// Returns null when it cannot be determined: no onboarding check-in recorded,
// or the only check-in was one of the two unnamed in-person options. Callers
// must render that as "Unassigned" and never guess, because this string ends
// up on a signed certification.
export function deriveCohort(slug, attendanceBySlug) {
  const recs = (attendanceBySlug[slug] || []).filter(r => r.isOnboarding);
  for (const r of recs) {
    const slot = ONBOARDING_SLOTS.find(
      s => s.cohort && new RegExp(`\\(${s.cohort}\\)`, "i").test(r.eventName)
    );
    if (slot) return slot.cohort;
  }
  return null;
}

// Educational sessions a founder attended. Onboarding is excluded: onboarding
// is not educational programming, and counting it would inflate the number the
// participant personally attests to.
export function eduSessionsFor(slug, attendanceBySlug) {
  return (attendanceBySlug[slug] || []).filter(r => !r.isOnboarding);
}

// One assembled record per founder, the shape every form renders from.
export function buildParticipants({
  matchByMenteeId,
  mentorsById,
  attendanceBySlug,
  sessionsBySlug,
  manualBySlug = {},
}) {
  return FALL_FOUNDERS.map((f) => {
    const match = matchByMenteeId[f.applicationId] || null;
    const mentor = match?.mentorId ? mentorsById[match.mentorId] || null : null;
    const manual = manualBySlug[f.slug] || [];

    // Educational: Luma check-ins plus manual overrides, de-duplicated by
    // date so an override recorded for a session that later got a real
    // check-in is not counted twice.
    const lumaEdu = eduSessionsFor(f.slug, attendanceBySlug);
    const lumaEduDates = new Set(lumaEdu.map((a) => (a.eventDate || "").slice(0, 10)));
    const manualEdu = manual
      .filter((m) => m.type === "edu" && !lumaEduDates.has((m.date || "").slice(0, 10)))
      .map((m) => ({
        eventName: m.item,
        eventDate: m.date,
        manual: true,
        reason: m.reason,
        verifiedBy: m.verifiedBy,
        isOnboarding: false,
        isInPersonEvent: false,
      }));
    const edu = [...lumaEdu, ...manualEdu].sort(
      (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
    );

    // Mentor sessions: Approved SessionReview rows plus manual overrides, same
    // de-duplication by date.
    const approved = sessionsBySlug[f.slug] || [];
    const approvedDates = new Set(approved.map((x) => (x.date || "").slice(0, 10)));
    const manualMentor = manual
      .filter((m) => m.type === "mentor" && !approvedDates.has((m.date || "").slice(0, 10)))
      .map((m) => ({
        date: m.date,
        sixtyMin: null, // unknown for an override; never assumed to be 60
        takeaways: m.item,
        manual: true,
        reason: m.reason,
        verifiedBy: m.verifiedBy,
      }));
    const sessions = [...approved, ...manualMentor].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const inPerson = (attendanceBySlug[f.slug] || []).some((r) => r.isInPersonEvent)
      || manual.some((m) => m.type === "edu" && IN_PERSON_EVENT.match.test(m.item || ""));

    return {
      slug: f.slug,
      name: `${f.first} ${f.last}`.trim(),
      title: f.application?.title || "",
      company: f.company || "",
      linkedin: f.linkedin || "",
      cohort: deriveCohort(f.slug, attendanceBySlug),
      matched: !!match,
      mentorName: match?.mentorName || "",
      mentorTitle: mentor?.title || "",
      mentorCompany: mentor?.company || "",

      eduSessions: edu,
      eduCount: edu.length,
      eduComplete: edu.length >= EDU_SESSIONS_REQUIRED,

      mentorSessions: sessions,
      mentorCount: sessions.length,
      mentorComplete: sessions.length >= MENTOR_SESSIONS_REQUIRED,

      attendedInPerson: inPerson,

      // How much of this founder's record rests on an override rather than on
      // evidence. Surfaced so the team can see it, not hidden.
      manualCount: manualEdu.length + manualMentor.length,
    };
  });
}

// Load everything and assemble, in one call. Individual source failures
// degrade to empty rather than taking the whole page down: a form that renders
// with pending markers is useful, a 500 is not.
export async function loadReportingData(typeformToken = process.env.TYPEFORM_TOKEN) {
  const [matches, mentorsById, attendance, sessionsBySlug, manualBySlug] = await Promise.all([
    readMatches().catch((e) => {
      console.error("[njeda-reporting] readMatches failed:", e.message);
      return [];
    }),
    readMentorsById(typeformToken),
    readAttendance().catch((e) => {
      console.error("[njeda-reporting] readAttendance failed:", e.message);
      return { bySlug: {}, byEvent: {} };
    }),
    readApprovedSessions().catch((e) => {
      console.error("[njeda-reporting] readApprovedSessions failed:", e.message);
      return {};
    }),
    readManualVerifications().catch(() => ({})), // tab may not exist yet
  ]);

  const matchByMenteeId = {};
  for (const m of matches) if (m.menteeId) matchByMenteeId[m.menteeId] = m;

  const participants = buildParticipants({
    matchByMenteeId,
    mentorsById,
    attendanceBySlug: attendance.bySlug,
    sessionsBySlug,
    manualBySlug,
  });

  return { participants, attendance, matchByMenteeId, mentorsById, manualBySlug };
}

// ── Headline metrics ────────────────────────────────────────────────────────

// The numbers that gate the money, per the Exhibit A milestone language.
// Scope to a cohort by passing its name, or omit for the whole program.
export function metricsForPool(pool, label) {
  const eduDone = pool.filter(p => p.eduComplete);
  const mentorDone = pool.filter(p => p.mentorComplete);
  // A verified completer needs BOTH requirements, which is what the milestone
  // counts. Either one alone is progress, not completion.
  const completers = pool.filter(p => p.eduComplete && p.mentorComplete);
  const inPerson = pool.filter(p => p.attendedInPerson);

  const pct = (n) => (pool.length ? n / pool.length : 0);

  return {
    cohort: label,
    total: pool.length,

    eduComplete: eduDone.length,
    eduCompletePct: pct(eduDone.length),
    eduRequired: EDU_SESSIONS_REQUIRED,

    mentorComplete: mentorDone.length,
    mentorCompletePct: pct(mentorDone.length),
    mentorRequired: MENTOR_SESSIONS_REQUIRED,

    verifiedCompleters: completers.length,
    completersRequired: MILESTONE_COMPLETERS_REQUIRED,
    completersGapToMilestone: Math.max(0, MILESTONE_COMPLETERS_REQUIRED - completers.length),
    milestoneCompletersMet: completers.length >= MILESTONE_COMPLETERS_REQUIRED,

    inPersonAttended: inPerson.length,
    inPersonPct: pct(inPerson.length),
    inPersonThreshold: IN_PERSON_THRESHOLD,
    inPersonThresholdMet: pct(inPerson.length) >= IN_PERSON_THRESHOLD,
  };
}

// The numbers that gate the money, per the Exhibit A milestone language.
// Pass a cohort name to scope, or omit for the whole program.
export function headlineMetrics(participants, cohort = null) {
  const pool = cohort ? participants.filter(p => p.cohort === cohort) : participants;
  return {
    ...metricsForPool(pool, cohort || "All cohorts"),
    unassigned: participants.filter(p => !p.cohort).length,
  };
}

export function cohortBreakdown(participants) {
  // metricsForPool, not headlineMetrics: the latter attaches a program-wide
  // `unassigned` count, which on a per-cohort row reads as though that cohort
  // has them.
  const rows = FALL_COHORTS.map(c =>
    metricsForPool(participants.filter(p => p.cohort === c), c)
  );
  const unassigned = participants.filter(p => !p.cohort);
  if (unassigned.length) rows.push(metricsForPool(unassigned, "Unassigned"));
  return rows;
}
