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

// Fall roster: the test slugs for now. The application-ingest build replaces
// this with accepted fall applicants.
const FALL_SLUGS = ["kennedy", "hana", "mj"];

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

// Pulse windows (must mirror pages/fall/[mentee].js)
const PULSE_WEEKS = [
  { week: 2, start: new Date(2026, 8, 14), end: new Date(2026, 8, 20, 23, 59, 59) },
  { week: 3, start: new Date(2026, 8, 21), end: new Date(2026, 8, 27, 23, 59, 59) },
  { week: 4, start: new Date(2026, 8, 28), end: new Date(2026, 9, 4, 23, 59, 59) },
  { week: 5, start: new Date(2026, 9, 5), end: new Date(2026, 9, 11, 23, 59, 59) },
  { week: 6, start: new Date(2026, 9, 12), end: new Date(2026, 9, 25, 23, 59, 59) },
  { week: 7, start: new Date(2026, 9, 26), end: new Date(2026, 10, 1, 23, 59, 59) },
  { week: 8, start: new Date(2026, 10, 2), end: new Date(2026, 10, 6, 23, 59, 59) },
];

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
    const partRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Participation!A6:E500" });
    for (const row of partRes.data.values || []) {
      const slug = row[0]?.trim();
      if (!slug) continue;
      if (row[4]?.trim() === "Accepted") ensure(slug).milestones.participation = true;
    }
  } catch (_) {}

  try {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Dashboard!A:Z" });
    const rows = r.data.values || [];
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
      for (const m of roster) {
        if (matchesMentee(first, last, m.slug)) {
          bySlug[m.slug].push({ submittedAt: item.submitted_at });
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
  const bySlug = Object.fromEntries(roster.map(m => [m.slug, { rows: [] }]));
  try {
    const r = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: roster.map(m => `${m.slug}!A2:E500`),
    });
    (r.data.valueRanges || []).forEach((vr, i) => {
      const slug = roster[i].slug;
      bySlug[slug].rows = (vr.values || []).map(row => ({
        week: Number(row[0]) || 0,
        fieldKey: row[1] || "",
        question: row[2] || "",
        value: row[3] || "",
        updatedAt: row[4] || "",
      })).filter(x => x.fieldKey);
    });
  } catch (err) {
    console.error("[fall-overview] batchGet failed:", err.message);
  }
  return bySlug;
}

function computeFounder(m, sheetRec, meetings, activity, now) {
  const milestones = sheetRec?.milestones || Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));
  const rows = activity?.rows || [];
  const get = (fieldKey, week) => rows.find(x => x.fieldKey === fieldKey && (week == null || x.week === week));

  const quizPassed = !!get("quiz_passed");
  const deepWorkDone = DEEP_WORK_KEYS.every(k => (get(k, 1)?.value || "").trim());
  const structureAck = !!get("structure_ack");
  const gate = { onboarded: !!milestones.onboarding, quizPassed, deepWorkDone };
  const gateComplete = gate.onboarded && gate.quizPassed && gate.deepWorkDone;

  const meetingCount = (meetings || []).length;
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
    if (now >= D.m1Hard && meetingCount < 1) risk("No mentor meeting submitted (M1 hard threshold)");
    else if (now >= D.m1Due && meetingCount < 1) attention("Meeting 1 (Discover) not submitted");
    if (now >= D.m2Due && meetingCount < 2) attention("Meeting 2 (Act) not submitted");
    if (now >= D.m3Hard && meetingCount < 3) risk("Meeting 3 (Roadmap) missed the Oct 23 deadline");
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
    eduCount,
    pulse,
    latestPulse,
    missStreak,
    wins,
    lastActive,
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

    const [milestoneData, meetingData, activityData] = await Promise.all([
      readMilestones(sheets, spreadsheetId),
      readMeetings(roster),
      readPortalActivity(sheets, spreadsheetId, roster),
    ]);

    const founders = roster.map(m =>
      computeFounder(m, milestoneData[m.slug], meetingData[m.slug], activityData[m.slug], today)
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
    });

    const cohorts = {};
    for (const f of active) {
      (cohorts[f.cohort] = cohorts[f.cohort] || []).push(f);
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
