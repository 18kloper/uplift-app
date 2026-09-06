// GET /api/admin/fall-overview
//
// One request powers the entire fall admin. This is the fix for what broke in
// summer: instead of the browser fanning out per-founder API calls (70 founders
// = 70+ requests, stale mirrors, hand-set statuses), everything is aggregated
// server-side from the sources of truth in a handful of bulk reads:
//   1. Dashboard + Participation sheet tabs  → milestones      (1-2 reads)
//   2. Meeting Typeform, one page             → mentor meetings (1 read)
//   3. Per-founder response tabs via batchGet → pulse, Deep Work, wins (1 read)
// Statuses are computed here from the fall rulebook on every request; nothing
// is hand-set. A short in-memory cache keeps it snappy; ?fresh=1 bypasses it.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";
import { matchesMentee } from "../meetings";
import { FALL_SLUGS, FALL_RESPONSES_TAB, PULSE_WINDOWS as PULSE_WEEKS } from "../../../lib/fall-roster";

const MEETING_FORM_ID = "e0L62296";
const FALL_CUTOFF = new Date("2026-08-26"); // ignore summer-era submissions

// Program dates (fall rulebook). Rolling per-match clocks arrive with the
// ingest build; until then deadlines are program-level.
const D = {
  programStart: new Date("2026-09-09"),
  participationDue: new Date("2026-09-10"),
  onboardingDue: new Date("2026-09-14"),
  onboardingHard: new Date("2026-09-21"),
  m1Due: new Date("2026-09-23"),
  m1Hard: new Date("2026-09-30"),
  m2Due: new Date("2026-10-03"),
  edu1Due: new Date("2026-10-02"),
  m3Hard: new Date("2026-10-24"),
  overdrive: new Date("2026-10-27"),
  programEnd: new Date("2026-11-06"),
};

// PULSE_WEEKS now imported from lib/fall-roster.js (as PULSE_WINDOWS) —
// single source of truth shared with the portal, do not redefine it here.

const ACTIVITY_TAB = "PortalActivity";

// Doing the Week 1 work is an acceptance in everything but name: nobody takes
// the onboarding quiz or writes their Deep Work for a program they are turning
// down. That stands as the baseline for anything recorded before 7:51 PM ET on
// Sept 1. After that the explicit answer is the only thing that counts, so this
// never becomes a way of assuming a yes nobody gave.
//
// It earns its keep as a backstop: if a founder's participation write is ever
// lost while their quiz lands, they still show as accepted instead of silently
// joining the chase list.
const WEEK1_ACCEPT_CUTOFF = new Date("2026-09-01T23:51:00Z");

const DEEP_WORK_KEYS = ["five_relationship", "five_clarity", "five_resources", "five_mentor", "five_community", "primary_refine"];

let cache = { at: 0, payload: null };
const CACHE_MS = 60 * 1000;

async function readMilestones(sheets, spreadsheetId) {
  const bySlug = {};
  const ensure = (slug) => {
    if (!bySlug[slug]) {
      bySlug[slug] = { milestones: Object.fromEntries(MILESTONE_KEYS.map(k => [k, false])), churned: false, notes: "" };
    }
    return bySlug[slug];
  };

  try {
    const partRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Participation!A6:F500" });
    for (const row of partRes.data.values || []) {
      const slug = row[0]?.trim();
      if (!slug) continue;
      const rec = ensure(slug);
      const status = row[4]?.trim() || "";
      if (status === "Accepted") rec.milestones.participation = true;
      // Declined is a real answer, not a missing one, and the two must never
      // collapse into the same bucket on the overview.
      if (status) rec.participationStatus = status.toLowerCase();
      if (row[5]) rec.participationAt = row[5];
    }
  } catch (_) {}

  try {
    // The milestone tab's name has drifted historically; try the known set
    const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
    let rows = [];
    for (const name of DASHBOARD_NAMES) {
      try {
        const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
        rows = r.data.values || [];
        if (rows.length > 1) break;
      } catch (_) {}
    }
    if (rows.length > 1) {
      const header = rows[0] || [];
      const churnedIdx = header.findIndex(h => h?.toLowerCase() === "churned");
      const notesIdx = header.findIndex(h => h?.toLowerCase() === "notes");
      const colIdx = {};
      MILESTONE_KEYS.forEach((key, i) => {
        const byLabel = header.findIndex(h => h === MILESTONE_LABELS[key]);
        const byKey = header.findIndex(h => h?.toLowerCase() === key.toLowerCase());
        colIdx[key] = byLabel !== -1 ? byLabel : byKey !== -1 ? byKey : 6 + i;
      });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const slug = row[0]?.trim();
        if (!slug) continue;
        const rec = ensure(slug);
        MILESTONE_KEYS.forEach(key => {
          const val = row[colIdx[key]];
          if (val === "TRUE" || val === true || (typeof val === "string" && val.toUpperCase() === "EXCUSED")) {
            rec.milestones[key] = true;
          }
        });
        if (churnedIdx >= 0) rec.churned = row[churnedIdx] === "TRUE" || row[churnedIdx] === true;
        if (notesIdx >= 0) rec.notes = row[notesIdx] || "";
      }
    }
  } catch (err) {
    console.error("[fall-overview] Dashboard read failed:", err.message);
  }
  return bySlug;
}

async function readMeetings(roster) {
  const token = process.env.TYPEFORM_TOKEN;
  const bySlug = Object.fromEntries(roster.map(m => [m.slug, []]));
  if (!token) return bySlug;
  try {
    const r = await fetch(`https://api.typeform.com/forms/${MEETING_FORM_ID}/responses?page_size=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(x => x.json());
    for (const item of r.items || []) {
      const submitted = new Date(item.submitted_at);
      if (submitted < FALL_CUTOFF) continue;
      const answers = item.answers || [];
      const first = answers[0]?.text || "";
      const last = answers[1]?.text || "";
      // Hidden "slug" field (personalized form link) is an exact match — see
      // pages/api/meetings.js for the same logic and why it's preferred.
      const minutes = answers.find(a => a.type === "number")?.number ?? 60;
      const rec = { submittedAt: item.submitted_at, minutes };
      const hiddenSlug = item.hidden?.slug;
      if (hiddenSlug) {
        if (bySlug[hiddenSlug]) bySlug[hiddenSlug].push(rec);
        continue;
      }
      for (const m of roster) {
        if (matchesMentee(first, last, m.slug)) {
          bySlug[m.slug].push(rec);
          break;
        }
      }
    }
  } catch (err) {
    console.error("[fall-overview] Typeform read failed:", err.message);
  }
  return bySlug;
}

async function readPortalActivity(sheets, spreadsheetId, roster) {
  // One tab, one read, however many founders. This replaces the summer
  // pattern of a sheet tab per person.
  const bySlug = Object.fromEntries(roster.map(m => [m.slug, { rows: [] }]));
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${FALL_RESPONSES_TAB}!A2:F5000`,
    });
    for (const row of r.data.values || []) {
      const slug = row[0];
      if (!bySlug[slug]) continue;
      bySlug[slug].rows.push({
        week: Number(row[1]) || 0,
        fieldKey: row[2] || "",
        question: row[3] || "",
        value: row[4] || "",
        updatedAt: row[5] || "",
      });
    }
  } catch (err) {
    console.error("[fall-overview] FallResponses read failed:", err.message);
  }
  return bySlug;
}

// First portal login per founder — column D of PortalActivity, stamped by
// portal-auth.js the first time someone logs in with their own Uplift ID.
// It is the earliest engagement signal there is: it lands before Confirmed
// Participation, before onboarding, before anything else reporting counts.
//
// Stamping started the day the acceptance emails went out, so a founder who
// logged in during the hours before it shipped has a visit row (column C,
// written by track-visit.js) but no stamp. Reporting that founder as "not yet"
// would be a lie about the fastest movers, so their last recorded visit comes
// back as `approx` and the table marks it as such.
async function readFirstLogins(sheets, spreadsheetId) {
  const bySlug = {};
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ACTIVITY_TAB}!A2:D500`,
    });
    for (const row of r.data.values || []) {
      const slug = (row[0] || "").trim();
      if (!slug) continue;
      const first = (row[3] || "").trim();
      const seen = (row[2] || "").trim();
      if (first) bySlug[slug] = { at: first, approx: false };
      else if (seen) bySlug[slug] = { at: seen, approx: true };
    }
  } catch (err) {
    console.error("[fall-overview] PortalActivity read failed:", err.message);
  }
  return bySlug;
}

function computeFounder(m, sheetRec, meetings, activity, now, firstLogin) {
  const milestones = sheetRec?.milestones || Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));
  const rows = activity?.rows || [];
  const get = (fieldKey, week) => rows.find(x => x.fieldKey === fieldKey && (week == null || x.week === week));

  // Participation has two writers. save-response.js stamps the Participation
  // tab, but only for founders who already have a row there, and the fall
  // cohort was built after that tab was. FallResponses always gets the answer,
  // so it is the one that cannot silently miss someone.
  const partAnswer = (get("participation")?.value || "").trim().toLowerCase();
  const declined = partAnswer === "declined" || sheetRec?.participationStatus === "declined";
  const answeredYes = milestones.participation || partAnswer === "accepted";
  const week1Work = rows.filter(x => x.week === 1 && x.fieldKey !== "participation" && (x.value || "").trim());
  const inferredYes = !declined && !answeredYes &&
    week1Work.some(x => x.updatedAt && new Date(x.updatedAt) < WEEK1_ACCEPT_CUTOFF);
  const accepted = !declined && (answeredYes || inferredYes);
  const participationStatus = accepted ? "accepted" : declined ? "declined" : "waiting";
  const participationSource = !accepted ? null : answeredYes ? "confirmed" : "inferred-week1";
  const participationAt = get("participation")?.updatedAt || sheetRec?.participationAt || null;
  if (accepted) milestones.participation = true;

  const quizPassed = !!get("quiz_passed");
  const deepWorkDone = DEEP_WORK_KEYS.every(k => (get(k, 1)?.value || "").trim());
  const structureAck = !!get("structure_ack");
  const gate = { onboarded: !!milestones.onboarding, quizPassed, deepWorkDone };
  const gateComplete = gate.onboarded && gate.quizPassed && gate.deepWorkDone;

  const meetingCount = (meetings || []).length;
  const meetingLog = (meetings || []).slice().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const meetingMinutes = meetingLog.reduce((s, m) => s + (m.minutes || 0), 0);
  const eduCount = ["edu1", "edu2", "edu3"].filter(k => milestones[k]).length;

  // Pulse by week + miss streak over closed windows
  const pulse = {};
  let missStreak = 0;
  let latestPulse = null;
  for (const w of PULSE_WEEKS) {
    const row = get("pulse", w.week);
    if (row) { pulse[w.week] = Number(row.value) || row.value; latestPulse = pulse[w.week]; }
    if (now > w.end) missStreak = row ? 0 : missStreak + 1;
  }

  const wins = rows.filter(x => x.fieldKey === "win_of_week" && x.value.trim())
    .map(x => ({ week: x.week, value: x.value, updatedAt: x.updatedAt }));

  const lastActive = rows.reduce((acc, x) => (x.updatedAt > acc ? x.updatedAt : acc), "");

  // ── Fall rulebook: status computed fresh every request, never hand-set ──
  let status = "on-track";
  const flags = [];
  const attention = (f) => { if (status !== "at-risk") status = "needs-attention"; flags.push(f); };
  const risk = (f) => { status = "at-risk"; flags.push(f); };

  if (sheetRec?.churned) {
    status = "churned";
  } else {
    if (now >= D.participationDue && !milestones.participation) attention("Participation not confirmed (due Sept 9)");
    if (now >= D.onboardingHard && !milestones.onboarding) risk("No onboarding session 1 week past onboarding week");
    else if (now >= D.onboardingDue && !milestones.onboarding) attention("Onboarding session not attended");
    if (now >= D.onboardingDue && !quizPassed) attention("Onboarding quiz not passed");
    if (now >= D.onboardingDue && !deepWorkDone) attention("Week 1 Deep Work incomplete");
    // A founder cannot be late to meet a mentor they have not been told they
    // have. Matching them in FallMatches is an internal act; the clock starts
    // when the match is actually sent to them, which is what the "Matched with
    // a Mentor" milestone records. Without this gate every meeting deadline
    // fires on its calendar date whether or not anybody ever made the
    // introduction, and blames the founder for our own unsent email.
    const toldAboutMentor = !!milestones.mentorMatched;
    if (!toldAboutMentor && m.mentor?.name) {
      attention("Matched internally but not told yet, so no meeting clock is running");
    }
    if (toldAboutMentor) {
      if (now >= D.m1Hard && meetingCount < 1) risk("No mentor meeting submitted (M1 hard threshold)");
      else if (now >= D.m1Due && meetingCount < 1) attention("Meeting 1 (Discover) not submitted");
      if (now >= D.m2Due && meetingCount < 2) attention("Meeting 2 (Act) not submitted");
      if (now >= D.m3Hard && meetingCount < 3) risk("Meeting 3 (Roadmap) missed the Oct 23 deadline");
    }
    if (now >= D.edu1Due && eduCount < 1) attention("No educational session by Oct 1");
    if (missStreak >= 2) attention(`${missStreak} pulse checks missed in a row`);
    if (latestPulse === 1) attention("Latest pulse is red");
  }

  return {
    slug: m.slug,
    name: `${m.first} ${m.last}`.trim(),
    company: m.company,
    cohort: m.cohort,
    mentor: m.mentor?.name || null,
    status,
    flags,
    gate,
    gateComplete,
    structureAck,
    meetingCount,
    meetingMinutes,
    meetingLog,
    eduCount,
    pulse,
    latestPulse,
    missStreak,
    wins,
    lastActive,
    firstLogin: firstLogin?.at || null,
    participationStatus,
    participationSource,
    participationAt,
    firstLoginApprox: !!firstLogin?.approx,
    milestones,
    notes: sheetRec?.notes || "",
  };
}

export default async function handler(req, res) {
  const fresh = req.query.fresh === "1";
  const now = Date.now();
  if (!fresh && cache.payload && now - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ error: "Sheets env not configured", founders: [] });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const roster = FALL_SLUGS.map(slug => MENTEES.find(m => m.slug === slug)).filter(Boolean);
    const today = new Date();

    const [milestoneData, meetingData, activityData, firstLogins] = await Promise.all([
      readMilestones(sheets, spreadsheetId),
      readMeetings(roster),
      readPortalActivity(sheets, spreadsheetId, roster),
      readFirstLogins(sheets, spreadsheetId),
    ]);

    const founders = roster.map(m =>
      computeFounder(m, milestoneData[m.slug], meetingData[m.slug], activityData[m.slug], today, firstLogins[m.slug])
    );

    const active = founders.filter(f => f.status !== "churned");
    const agg = (list) => ({
      total: list.length,
      onTrack: list.filter(f => f.status === "on-track").length,
      attention: list.filter(f => f.status === "needs-attention").length,
      atRisk: list.filter(f => f.status === "at-risk").length,
      gateComplete: list.filter(f => f.gateComplete).length,
      avgMeetings: list.length ? +(list.reduce((s, f) => s + f.meetingCount, 0) / list.length).toFixed(1) : 0,
      avgEdu: list.length ? +(list.reduce((s, f) => s + f.eduCount, 0) / list.length).toFixed(1) : 0,
      participationAccepted: list.filter(f => f.participationStatus === "accepted").length,
      participationDeclined: list.filter(f => f.participationStatus === "declined").length,
      participationWaiting: list.filter(f => f.participationStatus === "waiting").length,
    });

    // Fall cohort placements are not assigned yet, so most founders have
    // cohort null. They group under "unassigned" rather than a "Cohort null"
    // card, and get their own numbered cards once placements are made.
    const cohorts = {};
    for (const f of active) {
      const key = f.cohort ?? "unassigned";
      (cohorts[key] = cohorts[key] || []).push(f);
    }
    const cohortHealth = Object.fromEntries(Object.entries(cohorts).map(([c, list]) => [c, agg(list)]));

    const wins = founders.flatMap(f => f.wins.map(w => ({ ...w, name: f.name, company: f.company })))
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const payload = {
      generatedAt: new Date().toISOString(),
      roster: FALL_SLUGS,
      program: agg(active),
      churned: founders.length - active.length,
      cohortHealth,
      founders,
      wins,
      pulseWeeks: PULSE_WEEKS.map(w => w.week),
      deadlines: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v.toISOString().slice(0, 10)])),
    };
    cache = { at: now, payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[fall-overview] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
