// GET /api/admin/njeda-exhibit-d-fall?token=<ADMIN_SECRET>
//
// The Fall 2026 Exhibit D pack, rendered live on every request. One page per
// accepted founder, in roster order, in the same layout as the Summer pack
// (public/njeda-exhibit-d-forms.html) so NJEDA sees a form they recognise.
//
// The Summer pack was a one-shot build: 78 pages of HTML with no generator, so
// it froze the moment it was written. This one reads the live sheets instead,
// which means it starts out mostly blank and fills itself in as the program
// runs. Nothing here ever needs regenerating by hand.
//
// What comes from where:
//   Participant name/title/business/residence  lib/fall-cohort.js (FALL_FOUNDERS)
//   Mentor name                                FallMatches tab
//   Mentor title/business                      Typeform AayoroO1 (parseMentor)
//   Educational events attended                LumaAttendance tab, checked_in only
//   Mentorship sessions                        SessionReview tab, Approved only
//
// Two rules this route holds to, because it feeds a grant certification:
//
//   1. It never invents or rounds. A session logged as under 60 minutes prints
//      as under 60 minutes. An event a founder registered for but did not
//      attend does not print at all. The form asks what was attended.
//   2. Missing data prints as a visible "pending" marker, never as a blank
//      line that reads as complete. A signature block on a page with pending
//      fields is a compliance problem, so each page carries its own status
//      note listing exactly what is still outstanding.
//
// Query params:
//   ?slug=<slug>   just that founder's page
//   ?json=1        completeness summary instead of HTML, for the admin tab

import { FALL_FOUNDERS } from "../../../lib/fall-cohort";
import {
  MENTOR_FORM,
  fetchForm,
  parseMentor,
  readSheet,
  readMatches,
} from "../../../lib/fall-applications";

export const config = { api: { responseLimit: false } };

// Cohort dates as NJEDA should see them.
//
// Nov 20, not Nov 6. public/program-requirements-fall2026.html states the
// shape: "Eight weeks, September 9 to November 6, paperwork through November
// 20." Nov 6 ends the eight weeks of program activity; Nov 20 closes the
// paperwork window, and the paperwork window is part of the cohort period the
// grant certifies. Confirmed by Kennedy 2026-09-03.
//
// So the founder-facing Nov 6 dates (pages/fall/[mentee].js milestones,
// pages/fall/sop.js, the mentor one-screener) are correct as they stand and
// must NOT be changed to match this. They mean a different thing.
const COHORT_START = "September 9, 2026";
const COHORT_END = "November 20, 2026";

// Every accepted founder attested NJ residency to be eligible, so this is a
// program invariant rather than a per-founder lookup.
const STATE_OF_RESIDENCE = "New Jersey";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDate = (raw) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

const truncate = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// A filled value prints blue like the Summer pack. A missing one prints a grey
// pending marker so nobody mistakes an unfinished page for a finished one.
const val = (v, pendingLabel = "Pending") =>
  v
    ? `<span class="prefill">${esc(v)}</span>`
    : `<span class="pending">${esc(pendingLabel)}</span>`;

function field(label, v, pendingLabel) {
  return `<div class="fl"><span class="lab">${esc(label)}</span><span class="val">${val(v, pendingLabel)}</span></div>`;
}

function sigLine(v) {
  return `<div class="line" style="height:22px;display:flex;align-items:flex-end;padding-bottom:2px">${
    v ? `<span class="prefill" style="font-weight:600">${esc(v)}</span>` : ""
  }</div>`;
}

// ── Data assembly ───────────────────────────────────────────────────────────

async function loadMentorsById(token) {
  if (!token) return {};
  try {
    const { titles, items } = await fetchForm(MENTOR_FORM, token);
    const byId = {};
    for (const item of items || []) {
      const m = parseMentor(titles, item);
      if (m?.id) byId[m.id] = m;
    }
    return byId;
  } catch (err) {
    console.error("[exhibit-d-fall] mentor form fetch failed:", err.message);
    return {};
  }
}

// Approved sessions only, oldest first, keyed by founder slug.
async function loadSessionsBySlug() {
  const { rows } = await readSheet("SessionReview!A2:I1000");
  const bySlug = {};
  for (const r of rows || []) {
    const status = (r[0] || "").trim().toLowerCase();
    if (status !== "approved") continue;
    const slug = (r[1] || "").trim();
    if (!slug) continue;
    (bySlug[slug] ||= []).push({
      date: (r[3] || "").trim(),
      sixtyMin: (r[4] || "").trim().toLowerCase() === "yes",
      takeaways: (r[6] || "").trim(),
      sessionId: (r[7] || "").trim(),
    });
  }
  for (const slug of Object.keys(bySlug)) {
    bySlug[slug].sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  return bySlug;
}

// Educational events the founder actually attended. Registered-but-no-show is
// deliberately excluded: the form asks for events attended.
async function loadEventsBySlug() {
  const { rows } = await readSheet("LumaAttendance!A2:N2000");
  const bySlug = {};
  const seen = new Set();
  for (const r of rows || []) {
    const status = (r[8] || "").trim().toLowerCase();
    if (status !== "checked_in") continue;
    const slug = (r[6] || "").trim();
    const name = (r[2] || "").trim();
    if (!slug || !name) continue;
    const key = `${slug}|${name}|${(r[4] || "").slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (bySlug[slug] ||= []).push({ name, date: (r[4] || "").trim() });
  }
  for (const slug of Object.keys(bySlug)) {
    bySlug[slug].sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  return bySlug;
}

function buildRecord(f, { matchByMenteeId, mentorsById, sessionsBySlug, eventsBySlug }) {
  const match = matchByMenteeId[f.applicationId] || null;
  const mentor = match?.mentorId ? mentorsById[match.mentorId] || null : null;

  return {
    slug: f.slug,
    participantName: `${f.first} ${f.last}`.trim(),
    participantTitle: f.application?.title || "",
    businessName: f.company || "",
    stateOfResidence: STATE_OF_RESIDENCE,
    mentorName: match?.mentorName || "",
    mentorTitle: mentor?.title || "",
    mentorCompany: mentor?.company || "",
    matched: !!match,
    sessions: sessionsBySlug[f.slug] || [],
    events: eventsBySlug[f.slug] || [],
  };
}

// What is still outstanding on this page, in plain language.
function outstanding(r) {
  const gaps = [];
  if (!r.matched) gaps.push("mentor not yet matched");
  else {
    if (!r.mentorTitle) gaps.push("mentor title missing from application");
    if (!r.mentorCompany) gaps.push("mentor business name missing from application");
  }
  if (!r.participantTitle) gaps.push("participant title missing from application");
  if (r.sessions.length === 0) gaps.push("no mentorship sessions approved yet");
  else if (r.sessions.length < 3)
    gaps.push(`only ${r.sessions.length} of 3 mentorship sessions approved`);
  if (r.events.length === 0) gaps.push("no educational event attendance recorded yet");
  return gaps;
}

// ── Rendering ───────────────────────────────────────────────────────────────

function renderPage(r, generatedOn) {
  const gaps = outstanding(r);
  const complete = gaps.length === 0;

  const eventItems = r.events.length
    ? r.events
        .map(
          (e) =>
            `<li><span class="prefill">${esc(e.name)}${e.date ? ` &mdash; ${esc(fmtDate(e.date))}` : ""}</span></li>`
        )
        .join("")
    : `<li><span class="pending">No attendance recorded yet</span></li>`;

  const sessionItems = r.sessions.length
    ? r.sessions
        .map(
          (s) =>
            `<li><span class="prefill">${esc(fmtDate(s.date))} &middot; ${
              s.sixtyMin ? "60 minutes" : "under 60 minutes"
            }${s.takeaways ? ` &middot; ${esc(truncate(s.takeaways, 170))}` : ""}</span></li>`
        )
        .join("")
    : `<li><span class="pending">No approved sessions yet</span></li>`;

  return `<div class="page">
<div class="tag">Live draft &middot; Fall 2026 cohort &middot; ${esc(generatedOn)}</div>
<h1>Exhibit D to Grant Agreement<br>between The New Jersey Technology Council, Inc.<br>and New Jersey Economic Development Authority (&ldquo;Agreement&rdquo;)</h1>
<h2>Cohort Participant Completion Report Certification</h2>
${field("Cohort Start Date:", COHORT_START)}
${field("Cohort End Date:", COHORT_END)}
<div class="sec">Cohort Participant Information:</div>
${field("Participant Name:", r.participantName)}
${field("Participant Title:", r.participantTitle, "Not on application")}
${field("Business Name:", r.businessName)}
${field("State of Residence:", r.stateOfResidence)}
<div class="sec">Mentor Participant Information:</div>
${field("Mentor Name:", r.mentorName, "Pending match")}
${field("Mentor Title:", r.mentorTitle, "Pending match")}
${field("Business Name:", r.mentorCompany, "Pending match")}
<div class="sec">Educational Event:</div>
<div style="font-size:11px">Please list below the name and date of each educational event attended by the Cohort Participant:</div>
<ol class="evs">${eventItems}</ol>
<div class="sec">Mentorship Sessions:</div>
<div style="font-size:11px">Please list below the date, amount of time, and topic covered for each mentorship session between the Cohort Participant and Mentor:</div>
<ol class="evs">${sessionItems}</ol>
<div style="font-size:11px;margin-top:8px">Please comment in the section below on any additional details about your experience to share (both positive and/or negative).</div>
<div class="blanks"><div></div><div></div></div>
<div class="cert">I hereby certify that the information contained herein, as reported to the NJ Economic Development Authority is true and accurate to the best of my knowledge:</div>
<div class="two">
<div>
<div class="sec">Business Owner Participant</div>
<div class="sig">
<div class="line"></div><div class="cap">(Signature)</div>
${sigLine(r.participantName)}<div class="cap">(Name)</div>
${sigLine(r.participantTitle)}<div class="cap">(Title)</div>
${sigLine(r.businessName)}<div class="cap">(Company)</div>
<div class="line" style="height:22px"></div><div class="cap">(Date)</div>
</div></div>
<div>
<div class="sec">Mentor Participant</div>
<div class="sig">
<div class="line"></div><div class="cap">(Signature)</div>
${sigLine(r.mentorName)}<div class="cap">(Name)</div>
${sigLine(r.mentorTitle)}<div class="cap">(Title)</div>
${sigLine(r.mentorCompany)}<div class="cap">(Company)</div>
<div class="line" style="height:22px"></div><div class="cap">(Date)</div>
</div></div></div>
<div class="note ${complete ? "ok" : "gap"}">${
    complete
      ? "Ready to send for signature. All required fields present."
      : `Not ready to send. Outstanding: ${esc(gaps.join("; "))}.`
  }</div>
</div>`;
}

function renderCover(records, generatedOn) {
  const ready = records.filter((r) => outstanding(r).length === 0);
  const matched = records.filter((r) => r.matched);
  const sessionTotal = records.reduce((n, r) => n + r.sessions.length, 0);
  const withAllThree = records.filter((r) => r.sessions.length >= 3);

  const rows = records
    .map((r) => {
      const gaps = outstanding(r);
      return `<tr>
<td>${esc(r.participantName)}</td>
<td>${esc(r.businessName)}</td>
<td>${r.matched ? esc(r.mentorName) : '<span class="pending">Pending</span>'}</td>
<td style="text-align:center">${r.sessions.length}/3</td>
<td style="text-align:center">${r.events.length}</td>
<td>${gaps.length === 0 ? '<span class="okpill">Ready</span>' : esc(gaps.join("; "))}</td>
</tr>`;
    })
    .join("");

  return `<div class="page">
<div class="tag">Live draft &middot; ${esc(generatedOn)}</div>
<h1>Exhibit D Pack &mdash; Fall 2026 Cohort</h1>
<h2>Completion status, ${records.length} participants</h2>
<div class="subhead">This pack is generated live from the roster, FallMatches, LumaAttendance and SessionReview. It fills itself in as the program runs. Reload for current data.</div>
<table>
<tr><th>Metric</th><th>Count</th></tr>
<tr><td>Participants in pack</td><td>${records.length}</td></tr>
<tr><td>Mentor matched</td><td>${matched.length} of ${records.length}</td></tr>
<tr><td>All three sessions approved</td><td>${withAllThree.length} of ${records.length}</td></tr>
<tr><td>Approved sessions logged, all participants</td><td>${sessionTotal}</td></tr>
<tr><td><strong>Ready to send for signature</strong></td><td><strong>${ready.length} of ${records.length}</strong></td></tr>
</table>
<div class="sec">Per participant</div>
<table>
<tr><th>Participant</th><th>Business</th><th>Mentor</th><th>Sessions</th><th>Events</th><th>Outstanding</th></tr>
${rows}
</table>
<div class="note">Cohort dates on every form: ${esc(COHORT_START)} through ${esc(COHORT_END)}. Sessions count only where SessionReview status is Approved. Educational events count only Luma check-ins, since the form asks for events attended.</div>
</div>`;
}

const STYLES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:#111;background:#f3f4f6;font-size:12px;line-height:1.5}
.page{max-width:820px;margin:0 auto 24px;padding:40px 48px;background:#fff;min-height:1000px;position:relative}
h1{font-size:14px;font-weight:800;text-align:center;text-transform:uppercase;letter-spacing:.3px}
h2{font-size:13px;font-weight:800;text-align:center;margin:2px 0 14px}
.subhead{text-align:center;font-size:11px;color:#444;margin-bottom:14px}
.sec{font-weight:800;font-size:12px;margin:14px 0 6px}
.fl{display:flex;gap:8px;margin:7px 0;align-items:baseline}.fl .lab{white-space:nowrap;font-weight:600}
.fl .val{flex:1;border-bottom:1px solid #333;min-height:15px;padding:0 4px;font-weight:500}
table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #999;padding:5px 8px;font-size:11px;text-align:left;vertical-align:top}
th{background:#EEF2F7;font-weight:700}
ol.evs{margin:6px 0 6px 22px}ol.evs li{margin:4px 0}
.blanks div{border-bottom:1px solid #333;height:20px;margin:10px 0}
.sig{margin-top:18px}.sig .line{border-bottom:1px solid #333;height:26px;margin-top:24px}.sig .cap{font-size:10px;color:#444}
.two{display:grid;grid-template-columns:1fr 1fr;gap:36px}
.cert{margin-top:16px;font-size:11.5px}
.note{font-size:9.5px;color:#6B7280;margin-top:10px;line-height:1.5}
.note.gap{color:#B45309;font-weight:600}
.note.ok{color:#15803D;font-weight:600}
.prefill{color:#1D4ED8}
.pending{color:#9CA3AF;font-style:italic}
.okpill{color:#15803D;font-weight:700}
.tag{position:absolute;top:14px;right:20px;font-size:8.5px;font-weight:700;letter-spacing:.5px;color:#9CA3AF;text-transform:uppercase}
@media print{body{background:#fff}.page{max-width:none;margin:0;min-height:auto;page-break-after:always;padding:24px 32px}.pending{color:#9CA3AF}@page{size:letter portrait;margin:.5in}}`;

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const tfToken = process.env.TYPEFORM_TOKEN;

  try {
    const [matches, mentorsById, sessionsBySlug, eventsBySlug] = await Promise.all([
      readMatches().catch((e) => {
        console.error("[exhibit-d-fall] readMatches failed:", e.message);
        return [];
      }),
      loadMentorsById(tfToken),
      loadSessionsBySlug().catch((e) => {
        console.error("[exhibit-d-fall] SessionReview read failed:", e.message);
        return {};
      }),
      loadEventsBySlug().catch((e) => {
        console.error("[exhibit-d-fall] LumaAttendance read failed:", e.message);
        return {};
      }),
    ]);

    const matchByMenteeId = {};
    for (const m of matches) if (m.menteeId) matchByMenteeId[m.menteeId] = m;

    const ctx = { matchByMenteeId, mentorsById, sessionsBySlug, eventsBySlug };

    const wanted = req.query.slug
      ? FALL_FOUNDERS.filter((f) => f.slug === req.query.slug)
      : FALL_FOUNDERS;

    if (req.query.slug && wanted.length === 0) {
      return res.status(404).json({ error: `No fall founder with slug "${req.query.slug}"` });
    }

    const records = wanted.map((f) => buildRecord(f, ctx));
    const generatedOn = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    });

    if (req.query.json === "1") {
      return res.status(200).json({
        cohortStart: COHORT_START,
        cohortEnd: COHORT_END,
        generatedOn,
        total: records.length,
        readyToSend: records.filter((r) => outstanding(r).length === 0).length,
        matched: records.filter((r) => r.matched).length,
        participants: records.map((r) => ({
          slug: r.slug,
          name: r.participantName,
          business: r.businessName,
          mentor: r.mentorName || null,
          sessions: r.sessions.length,
          events: r.events.length,
          outstanding: outstanding(r),
        })),
      });
    }

    const pages = records.map((r) => renderPage(r, generatedOn)).join("\n");
    const cover = req.query.slug ? "" : renderCover(records, generatedOn);

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow">
<title>Exhibit D &mdash; Fall 2026 Participant Completion Certifications</title>
<style>${STYLES}</style></head><body>
${cover}
${pages}
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);
  } catch (err) {
    console.error("[exhibit-d-fall] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
