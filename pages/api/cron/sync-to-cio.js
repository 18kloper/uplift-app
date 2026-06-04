// GET /api/cron/sync-to-cio
// Syncs mentee + mentor data from Google Sheets into Customer.io as person attributes.
// Also syncs upcoming week's events from the program schedule.
// Triggered by Vercel cron — see vercel.json.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

// Full program schedule — mirrors [mentee].js WEEKS
const PROGRAM_START = new Date("2026-06-01T00:00:00-04:00"); // June 1 ET

const WEEKS = [
  { num: 1, dateRange: "Jun 1–6", events: [
    { name: "Onboarding — Edison",   day: "Mon Jun 1",  time: "12:30–1:15pm", format: "Virtual",   url: "https://lu.ma/q2hlxrhu" },
    { name: "Onboarding — Hopper",   day: "Tue Jun 2",  time: "5:30–6:15pm",  format: "Virtual",   url: "https://lu.ma/boqqrwg2" },
    { name: "Onboarding — Bardeen",  day: "Wed Jun 3",  time: "12:30–1:15pm", format: "Virtual",   url: "https://lu.ma/ddusqg24" },
    { name: "Onboarding — Lawrence", day: "Thu Jun 4",  time: "12:30–1:15pm", format: "Virtual",   url: "https://lu.ma/dg4muvxk" },
    { name: "Onboarding — Morrison", day: "Sat Jun 6",  time: "10:00–10:45am",format: "Virtual",   url: "https://lu.ma/p9zkhdle" },
  ]},
  { num: 2, dateRange: "Jun 8–13", events: [
    { name: "Expert Insight — Edison",   day: "Mon Jun 8",  time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/vxnzwket", speaker: "Aerica Shimizu Banks" },
    { name: "Industry Q&A — Edison",     day: "Fri Jun 12", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/0dh6bt4o" },
  ]},
  { num: 3, dateRange: "Jun 15–20", events: [
    { name: "Expert Insight — Hopper",   day: "Mon Jun 15", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/nj4xfgv6", speaker: "Marc Saint-Ulysse" },
    { name: "Peer Development — Edison", day: "Tue Jun 16", time: "5:30–6:00pm",  format: "Virtual", url: "https://lu.ma/h9vhfsb2" },
  ]},
  { num: 4, dateRange: "Jun 22–27", events: [
    { name: "Midpoint Meetup",           day: "Tue Jun 23", time: "4:00–7:00pm",  format: "In-Person", url: "https://lu.ma/zfr1e2gt", required: true },
    { name: "Industry Q&A — Hopper",     day: "Fri Jun 26", time: "12:30–1:00pm", format: "Virtual",   url: "https://lu.ma/e0sayfyh", speaker: "Joanne Wilson" },
  ]},
  { num: 5, dateRange: "Jun 29–Jul 4", events: [
    { name: "Expert Insight — Bardeen",  day: "Mon Jun 29", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/mvcaeaiu", speaker: "Christina Perla" },
    { name: "Peer Development — Hopper", day: "Tue Jun 30", time: "5:30–6:00pm",  format: "Virtual", url: "https://lu.ma/ycu81x75" },
    { name: "Industry Q&A — Bardeen",    day: "Fri Jul 3",  time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/zs1dqfeq" },
  ]},
  { num: 6, dateRange: "Jul 6–11", events: [
    { name: "Expert Insight — Lawrence",  day: "Mon Jul 6",  time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/o20rkult" },
    { name: "Peer Development — Bardeen", day: "Tue Jul 7",  time: "5:30–6:00pm",  format: "Virtual", url: "https://lu.ma/sesem19h" },
  ]},
  { num: 7, dateRange: "Jul 13–18", events: [
    { name: "Expert Insight — Morrison",  day: "Mon Jul 13", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/oh01c8fi", speaker: "Crissy Buteas" },
    { name: "Peer Development — Lawrence",day: "Tue Jul 14", time: "5:30–6:00pm",  format: "Virtual", url: "https://lu.ma/jgqgpyvx" },
    { name: "Industry Q&A — Lawrence",    day: "Fri Jul 17", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/ekk5ycbt", speaker: "Jie Li" },
  ]},
  { num: 8, dateRange: "Jul 19–25", events: [
    { name: "Expert Session — Edison",    day: "Mon Jul 20", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/9slfqpvz", speaker: "Tony Triumph" },
  ]},
  { num: 9, dateRange: "Jul 27–Aug 4", events: [
    { name: "Peer Development — Morrison",day: "Tue Jul 28", time: "5:30–6:00pm",  format: "Virtual",   url: "https://lu.ma/uy7rs79a" },
    { name: "Uplift Summit & Graduation", day: "Tue Aug 4",  time: "TBD",          format: "In-Person", url: "https://lu.ma/c8we4c2b", required: true },
  ]},
];

function getProgramWeekNum() {
  const now         = new Date();
  const msPerWeek   = 7 * 24 * 60 * 60 * 1000;
  const elapsed     = now - PROGRAM_START;
  if (elapsed < 0) return 0;
  return Math.min(Math.floor(elapsed / msPerWeek) + 1, 9);
}

function getUpcomingEvents() {
  const nextWeekNum = getProgramWeekNum() + 1;
  const week        = WEEKS.find(w => w.num === nextWeekNum);
  return week ? week.events : [];
}


const TEST_SLUGS    = ["kennedy", "jackie", "aaron", "mj"];
const CIO_TRACK_URL = "https://track.customer.io/api/v1/customers";

function cioBearerHeader() {
  const siteId = process.env.CIO_SITE_ID;
  const apiKey  = process.env.CIO_API_KEY;
  if (!siteId || !apiKey) throw new Error("CIO_SITE_ID or CIO_API_KEY not configured");
  return "Basic " + Buffer.from(`${siteId}:${apiKey}`).toString("base64");
}

async function upsertCIOPerson(id, attributes) {
  const auth = cioBearerHeader();
  const res  = await fetch(`${CIO_TRACK_URL}/${encodeURIComponent(id)}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body:    JSON.stringify(attributes),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CIO upsert failed for ${id}: ${res.status} ${text}`);
  }
}


const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const userAgent    = req.headers["user-agent"] || "";
  const isVercelCron = userAgent.includes("vercel-cron") || req.headers["x-vercel-cron"] === "1";
  if (!isVercelCron && process.env.NODE_ENV !== "development") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(500).json({ error: "Google Sheets env vars not configured" });

  try { cioBearerHeader(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // ── Upcoming events for next week ─────────────────────────────────────────
  const upcomingEvents = getUpcomingEvents();
  const nextWeekNum   = getProgramWeekNum() + 1;
  const nextWeek      = WEEKS.find(w => w.num === nextWeekNum);
  const weekDateRange = nextWeek ? nextWeek.dateRange : "";

  const eventAttrs = {};
  upcomingEvents.slice(0, 3).forEach((evt, i) => {
    const n = i + 1;
    eventAttrs[`upcoming_event_${n}_name`]    = evt.name;
    eventAttrs[`upcoming_event_${n}_day`]     = evt.day;
    eventAttrs[`upcoming_event_${n}_time`]    = evt.time || "TBD";
    eventAttrs[`upcoming_event_${n}_format`]  = evt.format;
    eventAttrs[`upcoming_event_${n}_url`]     = evt.url;
    eventAttrs[`upcoming_event_${n}_speaker`] = evt.speaker || "";
    eventAttrs[`upcoming_event_${n}_required`]= evt.required || false;
  });
  // Clear any leftover slots if fewer than 3 events
  for (let i = upcomingEvents.length + 1; i <= 3; i++) {
    eventAttrs[`upcoming_event_${i}_name`]    = "";
    eventAttrs[`upcoming_event_${i}_day`]     = "";
    eventAttrs[`upcoming_event_${i}_time`]    = "";
    eventAttrs[`upcoming_event_${i}_format`]  = "";
    eventAttrs[`upcoming_event_${i}_url`]     = "";
    eventAttrs[`upcoming_event_${i}_speaker`] = "";
    eventAttrs[`upcoming_event_${i}_required`]= false;
  }
  eventAttrs.upcoming_week_num        = nextWeekNum;
  eventAttrs.upcoming_week_date_range = weekDateRange;

  const sheets        = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const realMentees   = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));

  let synced = 0, errors = 0;
  const failed = [];

  try {
    // ── Participation ────────────────────────────────────────────────────────
    const partRes  = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Participation!A6:E500" });
    const partRows = partRes.data.values || [];
    const statusBySlug = {};
    for (const row of partRows) {
      const slug = row[0]?.trim(); const status = row[4]?.trim();
      if (slug) statusBySlug[slug] = status || "";
    }

    // ── Milestone Dashboard ──────────────────────────────────────────────────
    const dashRes    = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Milestone Dashboard!A:Z" });
    const dashRows   = dashRes.data.values || [];
    const dashHeader = dashRows[0] || [];
    const milestonesBySlug = {};
    for (let i = 1; i < dashRows.length; i++) {
      const row = dashRows[i]; const slug = row[0]?.trim();
      if (!slug || TEST_SLUGS.includes(slug)) continue;
      const ms = {};
      MILESTONE_KEYS.forEach(key => {
        const label  = MILESTONE_LABELS[key];
        const colIdx = dashHeader.findIndex(h => h === label);
        ms[key] = colIdx >= 0 ? (row[colIdx] === "TRUE" || row[colIdx] === true) : false;
      });
      milestonesBySlug[slug] = ms;
    }

    // ── Mentor Confirmations ─────────────────────────────────────────────────
    const mentorRes  = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Mentor Confirmations!A2:G500" });
    const mentorRows = mentorRes.data.values || [];
    const mentorByMentee = {};
    for (const row of mentorRows) {
      const mentorName = row[1]?.trim(), mentorEmail = row[2]?.trim();
      const menteeSlug = row[4]?.trim(), status = row[5]?.trim();
      if (menteeSlug && (status === "confirmed" || status === "sent")) {
        mentorByMentee[menteeSlug] = { name: mentorName || "", email: mentorEmail || "" };
      }
    }

    // ── Sync mentees ─────────────────────────────────────────────────────────
    for (const mentee of realMentees) {
      try {
        const ms     = milestonesBySlug[mentee.slug] || {};
        const mentor = mentorByMentee[mentee.slug]   || {};
        const email  = mentee.email || null;
        const cioId  = email || mentee.slug;

        const attributes = {
          ...(email ? { email } : {}),
          first_name:  mentee.first,
          last_name:   mentee.last,
          company:     mentee.company,
          cohort:      mentee.cohort,
          cohort_name: COHORT_NAMES[mentee.cohort] || `Cohort ${mentee.cohort}`,
          stage:       mentee.stage,
          industry:    mentee.industry,
          county:      mentee.county || "",
          uplift_role: "mentee",
          uplift_cohort_year: "2026",

          participation_status: statusBySlug[mentee.slug] || "pending",
          portal_url:           `https://uplift2026.vercel.app/${mentee.slug}`,

          mentor_name:  mentor.name  || "",
          mentor_email: mentor.email || "",

          onboarding_completed:  ms.onboarding     || false,
          mentor_matched:        ms.mentorMatched   || false,
          edu1_completed:        ms.edu1            || false,
          edu2_completed:        ms.edu2            || false,
          edu3_completed:        ms.edu3            || false,
          mentor_session_1:      ms.mentorSession1  || false,
          mentor_session_2:      ms.mentorSession2  || false,
          mentor_session_3:      ms.mentorSession3  || false,
          midpoint_attended:     ms.midpoint        || false,
          end_survey_completed:  ms.endSurvey       || false,
          summit_attended:       ms.summit          || false,
          certificate_received:  ms.certificate     || false,

          // Upcoming week events (same for all mentees)
          ...eventAttrs,

          last_synced_at: new Date().toISOString(),
        };

        await upsertCIOPerson(cioId, attributes);
        synced++;
      } catch (err) {
        console.error(`sync-to-cio: error for ${mentee.slug}:`, err.message);
        errors++; failed.push(mentee.slug);
      }
    }

    // ── Sync confirmed mentors ────────────────────────────────────────────────
    const seenMentors = new Set();
    for (const row of mentorRows) {
      const mentorName = row[1]?.trim(), mentorEmail = row[2]?.trim();
      const status = row[5]?.trim();
      if (!mentorEmail || seenMentors.has(mentorEmail)) continue;
      if (status !== "confirmed" && status !== "sent") continue;
      seenMentors.add(mentorEmail);
      try {
        const nameParts = (mentorName || "").split(" ");
        await upsertCIOPerson(mentorEmail, {
          email:              mentorEmail,
          first_name:         nameParts[0] || "",
          last_name:          nameParts.slice(1).join(" ") || "",
          uplift_role:        "mentor",
          uplift_cohort_year: "2026",
          ...eventAttrs,
          last_synced_at:     new Date().toISOString(),
        });
        synced++;
      } catch (err) {
        console.error(`sync-to-cio: error for mentor ${mentorEmail}:`, err.message);
        errors++; failed.push(mentorEmail);
      }
    }

    return res.status(200).json({ ok: true, synced, errors, failed, nextWeekNum, upcomingEventCount: upcomingEvents.length });
  } catch (err) {
    console.error("sync-to-cio: fatal error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
