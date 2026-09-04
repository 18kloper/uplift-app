// GET /api/admin/njeda-edu-verification-fall?token=<ADMIN_SECRET>
//
// The Fall 2026 educational-session evidence pack, rendered live. Three parts,
// modelled on the Summer pack (public/njeda-edu-session-verification-forms.html)
// so NJEDA sees forms they recognise:
//
//   1. Session Reference   every session offered, chronological, with the
//                          verification source for each
//   2. Verification Forms  one signable form per participant, listing the
//                          sessions that participant personally attended
//   3. Attendance Sheets   one roster per session, plus a blank sign-in sheet
//                          for the required in-person event
//
// Today this renders as a complete blank pack: the 22 sessions are scheduled
// but the first is Sept 11, so every attendance table shows its pending state.
// That is the point. The forms exist now, and they fill themselves in as
// check-ins land, so nothing has to be assembled by hand in November.
//
// All counting rules live in lib/njeda-reporting.js. Attendance means a Luma
// check-in, never a registration.
//
// Query params:
//   ?view=reference|forms|sheets   just that part (default: all three)
//   ?cohort=Edison                 scope forms and stats to one cohort
//   ?slug=<slug>                   just that participant's form
//   ?json=1                        machine-readable summary for the admin tab

import { EDU_SESSIONS, sessionLabel } from "../../../lib/edu-sessions";
import {
  COHORT_START,
  COHORT_END,
  EDU_REQUIREMENT,
  EDU_SESSIONS_REQUIRED,
  FALL_COHORTS,
  IN_PERSON_EVENT,
  loadReportingData,
  headlineMetrics,
} from "../../../lib/njeda-reporting";

export const config = { api: { responseLimit: false } };

const SIGNER = { name: "Kennedy Loper", email: "kennedy@techunited.co" };

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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

// ── Session catalogue ───────────────────────────────────────────────────────

// The canonical 22 educational sessions, joined to whatever Luma has recorded
// against them. Sessions with no check-ins yet are listed with their scheduled
// date and an explicit pending source, never omitted: NJEDA is being shown
// everything that was offered, not only what has happened.
// Canonical day strings are authored like "Fri Sept 11". Date.parse does not
// know "Sept", so map it explicitly rather than letting a silent NaN
// mis-attribute a session on a compliance document.
const MONTHS = { Sept: 8, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function canonicalDayToISO(day) {
  const m = /([A-Za-z]+)\s+(\d{1,2})$/.exec(day.trim());
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  return new Date(Date.UTC(2026, month, parseInt(m[2], 10))).toISOString().slice(0, 10);
}

function buildCatalogue(byEvent) {
  // Educational events with attendance, keyed by the date they happened.
  const eventsByISO = {};
  for (const ev of Object.values(byEvent)) {
    if (/onboard/i.test(ev.name)) continue;
    if (IN_PERSON_EVENT.match.test(ev.name)) continue;
    const iso = (ev.date || "").slice(0, 10);
    if (!iso) continue;
    (eventsByISO[iso] ||= []).push(ev);
  }

  const claimed = new Set();

  const rows = EDU_SESSIONS.map((s) => {
    const iso = canonicalDayToISO(s.day);
    const pool = iso ? eventsByISO[iso] || [] : [];
    const ev = pool.find((e) => !claimed.has(e.name)) || null;
    if (ev) claimed.add(ev.name);

    return {
      n: s.n,
      label: sessionLabel(s),
      day: s.day,
      time: s.time,
      topic: ev?.name || "",
      date: ev?.date || iso || "",
      attendees: ev?.attendees?.length || 0,
      format: "Virtual",
      source: ev
        ? "Virtual · verified via Luma event check-in"
        : "Virtual · Luma check-in — attendance capture pending",
    };
  });

  // An educational event with attendance that matched no canonical slot must
  // still appear: it happened, and NJEDA is shown everything that happened.
  for (const [iso, evs] of Object.entries(eventsByISO)) {
    for (const ev of evs) {
      if (claimed.has(ev.name)) continue;
      rows.push({
        n: rows.length + 1,
        label: ev.name,
        day: fmtDate(iso),
        time: "",
        topic: ev.name,
        date: ev.date,
        attendees: ev.attendees.length,
        format: "Virtual",
        source: "Virtual · verified via Luma event check-in (unscheduled addition)",
      });
    }
  }

  const inPersonEv = Object.values(byEvent).find((e) => IN_PERSON_EVENT.match.test(e.name)) || null;
  rows.push({
    n: EDU_SESSIONS.length + 1,
    label: `${IN_PERSON_EVENT.name} · ${IN_PERSON_EVENT.day}`,
    day: IN_PERSON_EVENT.day,
    time: "",
    topic: inPersonEv?.name || IN_PERSON_EVENT.name,
    date: inPersonEv?.date || "",
    attendees: inPersonEv?.attendees?.length || 0,
    format: "In-Person",
    source: inPersonEv
      ? "In-person · verified via Luma check-in and signed sign-in sheet"
      : "In-person · signed sign-in sheet — event not yet held",
  });

  return rows;
}

// ── Shared chrome ───────────────────────────────────────────────────────────

function pageHead(right) {
  return `<div class="hdr"><span>Uplift Mentorship Program &middot; TechUnited:NJ &middot; Fall 2026 Cohorts &middot; Prepared for NJEDA</span><span class="tag">${esc(right)}</span></div>`;
}

function pageFoot(right) {
  return `<div class="foot"><span>TechUnited:NJ &middot; Uplift Mentorship Program &middot; Fall 2026</span><span>${esc(right)}</span><span>${esc(SIGNER.name)} &middot; ${esc(SIGNER.email)}</span></div>`;
}

function requirementBox() {
  return `<div class="req"><div class="rl">Grant Requirement &mdash; Milestone 2 (Cohort Completion), Participant Requirement</div>
<div class="rq">&ldquo;${esc(EDU_REQUIREMENT)}&rdquo;</div></div>`;
}

// ── Part 1: Session Reference ───────────────────────────────────────────────

function renderReference(catalogue, metrics, generatedOn) {
  const rows = catalogue
    .map(
      (s) => `<tr>
<td>${s.n}</td>
<td>${esc(s.date ? fmtDate(s.date) : s.day)}</td>
<td>${s.topic ? esc(s.topic) : '<span class="pending">Speaker and topic to be confirmed</span>'}</td>
<td class="srccell">${esc(s.source)}</td>
<td style="text-align:center">${s.attendees || '<span class="pending">0</span>'}</td>
</tr>`
    )
    .join("");

  return `<div class="form">
${pageHead("Educational Session Reference")}
<div class="ftitle">Educational Session Topics &mdash; Program Reference</div>
<div class="sub">The table below lists every educational session offered to the Fall 2026 cohorts, in chronological order. The individual verification forms that follow reference these same sessions by date and topic to show which ones each participant personally attended.</div>
${requirementBox()}
<div class="stats">
<div class="stat"><div class="sn">${catalogue.length}</div><div class="sl">Sessions offered</div></div>
<div class="stat"><div class="sn">${metrics.eduComplete} <span class="of">of ${metrics.total}</span></div><div class="sl">Participants meeting the ${EDU_SESSIONS_REQUIRED}-session requirement</div></div>
<div class="stat"><div class="sn">${metrics.total - metrics.eduComplete} <span class="of">of ${metrics.total}</span></div><div class="sl">Participants still in progress</div></div>
</div>
<table>
<tr><th style="width:34px">#</th><th style="width:96px">Date</th><th>Session Topic</th><th style="width:240px">Format &amp; Verification Source</th><th style="width:64px">Checked in</th></tr>
${rows}
</table>
<div class="note">Verification for virtual sessions is confirmed through Luma event check-in, matched to the individual name and email each participant registered under. ${esc(IN_PERSON_EVENT.name)} (in-person, ${esc(IN_PERSON_EVENT.day)}) is additionally verified against signed on-site sign-in sheets. Cohort period: ${esc(COHORT_START)} through ${esc(COHORT_END)}. Generated ${esc(generatedOn)}.</div>
${pageFoot("Session Reference")}
</div>`;
}

// ── Part 2: Participant verification forms ──────────────────────────────────

function renderParticipantForm(p, idx, total) {
  const attended = p.eduSessions;
  const n = attended.length;
  const complete = n >= EDU_SESSIONS_REQUIRED;

  // Always show at least three rows, plus two blanks for hand additions, the
  // way the Summer forms did.
  const rowCount = Math.max(EDU_SESSIONS_REQUIRED, n) + 2;
  const rows = Array.from({ length: rowCount }, (_, i) => {
    const a = attended[i];
    if (!a) return `<tr><td>${i + 1}</td><td></td><td></td><td></td></tr>`;
    const inPerson = IN_PERSON_EVENT.match.test(a.eventName);
    return `<tr>
<td>${i + 1}</td>
<td>${esc(fmtDate(a.eventDate))}</td>
<td>${esc(a.eventName)}</td>
<td class="srccell">${inPerson ? "In-person &middot; signed sign-in sheet" : "Virtual &middot; Luma check-in"}</td>
</tr>`;
  }).join("");

  const attestation = complete
    ? `I, <strong>${esc(p.name)}</strong>, a participant in the Uplift Mentorship Program, verify that I attended <strong>${n} educational session${n === 1 ? "" : "s"}</strong>${
        n > EDU_SESSIONS_REQUIRED ? ` &mdash; greater than the required minimum of three (3) &mdash;` : ","
      } totaling <strong>${
        n > EDU_SESSIONS_REQUIRED ? "greater than 90 minutes (1.5 hours)" : "at least 90 minutes (1.5 hours)"
      }</strong> of educational programming provided to my Cohort. I attended sessions on the dates below, covering the following topics:`
    : `I, <strong>${esc(p.name)}</strong>, a participant in the Uplift Mentorship Program, verify that I attended the educational sessions listed below, provided to my Cohort. <span class="pending">This form is not yet complete: ${
        EDU_SESSIONS_REQUIRED - n
      } more session${EDU_SESSIONS_REQUIRED - n === 1 ? "" : "s"} required before signature.</span>`;

  return `<div class="form">
${pageHead(`Educational Session Verification Form · ${idx} of ${total}`)}
<div class="ftitle">Participant Verification of Educational Session Attendance</div>
<div class="mrow">
<div class="mbox"><div class="l">Participant</div><div class="v">${esc(p.name)}</div></div>
<div class="mbox"><div class="l">Cohort</div><div class="v">${p.cohort ? esc(p.cohort) : '<span class="pending">Unassigned</span>'}</div></div>
<div class="mbox"><div class="l">Sessions Attended</div><div class="v">${n} of ${EDU_SESSIONS_REQUIRED} required</div></div>
<div class="mbox"><div class="l">Status</div><div class="v">${
    complete ? '<span class="ok">Complete</span>' : '<span class="gap">In progress</span>'
  }</div></div>
</div>
${requirementBox()}
<div class="certify">${attestation}</div>
<table>
<tr><th style="width:34px">#</th><th style="width:96px">Session Date</th><th>Topic Covered</th><th style="width:210px">Verification Source</th></tr>
${rows}
</table>
<div class="note">Prefilled dates and topics are drawn from Luma event check-in records, or signed sign-in sheets for the in-person event. Additional sessions may be added in the blank rows.</div>
<div class="certify">By signing below, I certify that the information above is true and accurate to the best of my knowledge, and that this record accurately reflects my attendance at educational programming provided under the Uplift Mentorship Program in fulfillment of the NJEDA grant Milestone 2 participant requirement.</div>
<div class="sigrow">
<div class="sig"><div class="line"></div><div class="cap">Participant Signature</div></div>
<div class="sig"><div class="line named">${esc(p.name)}</div><div class="cap">Printed Name</div></div>
<div class="sig"><div class="line"></div><div class="cap">Date</div></div>
</div>
<div class="internal"><span class="il">INTERNAL &mdash; NOT PRINTED</span> Final verification approved &nbsp;<span class="ibox"></span>&nbsp; Initials: <span class="iline"></span></div>
${pageFoot(`Form ${idx} of ${total}`)}
</div>`;
}

// ── Part 3: Attendance sheets ───────────────────────────────────────────────

function renderAttendanceSheet(session, byEvent, cohortOf) {
  const ev = session.topic ? byEvent[session.topic] : null;
  const attendees = ev?.attendees || [];

  const rows = attendees.length
    ? attendees
        .map(
          (a, i) => `<tr>
<td>${i + 1}</td>
<td>${esc(a.name)}</td>
<td>${esc(cohortOf(a.slug) || "Unassigned")}</td>
<td>${esc(a.email)}</td>
<td class="srccell">Luma check-in</td>
</tr>`
        )
        .join("")
    : Array.from({ length: 12 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join("");

  const isInPerson = session.format === "In-Person";

  return `<div class="form">
${pageHead(`Attendance Sheet · Session ${session.n}`)}
<div class="ftitle">${isInPerson ? "In-Person Sign-In Sheet" : "Session Attendance Record"}</div>
<div class="mrow">
<div class="mbox"><div class="l">Session</div><div class="v">${esc(session.topic || session.label)}</div></div>
<div class="mbox"><div class="l">Date</div><div class="v">${esc(session.date ? fmtDate(session.date) : session.day)}</div></div>
<div class="mbox"><div class="l">Format</div><div class="v">${esc(session.format)}</div></div>
<div class="mbox"><div class="l">Checked in</div><div class="v">${attendees.length || '<span class="pending">0</span>'}</div></div>
</div>
<table>
<tr><th style="width:34px">#</th><th>Participant Name</th><th style="width:100px">Cohort</th><th style="width:200px">Email</th><th style="width:150px">${
    isInPerson ? "Signature" : "Verification"
  }</th></tr>
${rows}
</table>
<div class="note">${
    attendees.length
      ? "Rows are drawn from Luma event check-in records. Registrations without a check-in are deliberately excluded, since the grant requirement asks for sessions attended."
      : "No check-ins recorded for this session yet. Blank rows are provided for on-site sign-in; Luma check-ins will populate this sheet automatically once the session takes place."
  }</div>
${
  isInPerson
    ? `<div class="certify">I certify that the individuals listed above attended ${esc(IN_PERSON_EVENT.name)} in person on the date shown.</div>
<div class="sigrow">
<div class="sig"><div class="line"></div><div class="cap">Program Lead Signature</div></div>
<div class="sig"><div class="line named">${esc(SIGNER.name)}</div><div class="cap">Printed Name</div></div>
<div class="sig"><div class="line"></div><div class="cap">Date</div></div>
</div>`
    : ""
}
${pageFoot(`Attendance · Session ${session.n}`)}
</div>`;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:#111;background:#f3f4f6;font-size:12px;line-height:1.5}
.form{max-width:820px;margin:0 auto 24px;padding:34px 44px;background:#fff;min-height:1040px;position:relative;display:flex;flex-direction:column}
.hdr{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:16px;font-size:9.5px;color:#4B5563;font-weight:600}
.hdr .tag{white-space:nowrap;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#111}
.ftitle{font-size:14px;font-weight:800;margin-bottom:6px}
.sub{font-size:11px;color:#4B5563;margin-bottom:12px;line-height:1.55}
.req{border:1px solid #C7D2E5;background:#F4F7FC;border-radius:5px;padding:10px 13px;margin:12px 0}
.req .rl{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1D4ED8;margin-bottom:4px}
.req .rq{font-size:11.5px;font-style:italic;color:#1F2937;line-height:1.6}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
.stat{border:1px solid #D1D5DB;border-radius:5px;padding:9px 12px}
.stat .sn{font-size:19px;font-weight:800;line-height:1.1}
.stat .sn .of{font-size:11px;font-weight:600;color:#6B7280}
.stat .sl{font-size:9.5px;color:#6B7280;font-weight:600;margin-top:2px;line-height:1.4}
.mrow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}
.mbox{border:1px solid #D1D5DB;border-radius:5px;padding:7px 10px}
.mbox .l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#6B7280}
.mbox .v{font-size:12.5px;font-weight:700;margin-top:2px}
table{width:100%;border-collapse:collapse;margin:8px 0}
th,td{border:1px solid #9CA3AF;padding:5px 8px;font-size:11px;text-align:left;vertical-align:top}
th{background:#EEF2F7;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.3px}
td{height:24px}
.srccell{font-size:10px;color:#4B5563}
.certify{font-size:11px;line-height:1.65;margin:12px 0 4px}
.sigrow{display:grid;grid-template-columns:1.3fr 1fr .7fr;gap:26px;margin-top:22px}
.sig .line{border-bottom:1px solid #333;height:26px;display:flex;align-items:flex-end;padding-bottom:2px}
.sig .line.named{font-weight:700;color:#1D4ED8}
.sig .cap{font-size:9.5px;color:#4B5563;margin-top:3px}
.internal{margin-top:16px;border:1px dashed #9CA3AF;border-radius:4px;padding:7px 10px;font-size:9.5px;color:#6B7280;display:flex;align-items:center;gap:6px}
.internal .il{font-weight:800;letter-spacing:.4px;color:#B45309}
.internal .ibox{display:inline-block;width:12px;height:12px;border:1px solid #6B7280}
.internal .iline{display:inline-block;width:70px;border-bottom:1px solid #6B7280}
.note{font-size:9.5px;color:#6B7280;margin-top:9px;line-height:1.55}
.pending{color:#9CA3AF;font-style:italic}
.ok{color:#15803D}
.gap{color:#B45309}
.foot{margin-top:auto;padding-top:12px;border-top:1px solid #D1D5DB;display:flex;justify-content:space-between;gap:12px;font-size:9px;color:#6B7280;font-weight:600}
@media print{body{background:#fff}.form{max-width:none;margin:0;min-height:auto;page-break-after:always;padding:22px 30px}@page{size:letter portrait;margin:.45in}}`;

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const cohort = req.query.cohort && req.query.cohort !== "all" ? String(req.query.cohort) : null;
  if (cohort && !FALL_COHORTS.includes(cohort) && cohort !== "Unassigned") {
    return res.status(400).json({ error: `Unknown cohort "${cohort}"`, cohorts: FALL_COHORTS });
  }
  const view = String(req.query.view || "all");

  try {
    const { participants, attendance } = await loadReportingData();

    const cohortBySlug = {};
    for (const p of participants) cohortBySlug[p.slug] = p.cohort;
    const cohortOf = (slug) => cohortBySlug[slug] || null;

    let pool = participants;
    if (cohort === "Unassigned") pool = participants.filter((p) => !p.cohort);
    else if (cohort) pool = participants.filter((p) => p.cohort === cohort);
    if (req.query.slug) pool = pool.filter((p) => p.slug === req.query.slug);

    if (req.query.slug && pool.length === 0) {
      return res.status(404).json({ error: `No fall participant with slug "${req.query.slug}"` });
    }

    const metrics = headlineMetrics(participants, cohort === "Unassigned" ? null : cohort);
    const catalogue = buildCatalogue(attendance.byEvent);
    const generatedOn = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    });

    if (req.query.json === "1") {
      return res.status(200).json({
        cohort: cohort || "all",
        generatedOn,
        requirement: EDU_REQUIREMENT,
        sessionsOffered: catalogue.length,
        metrics,
        sessions: catalogue.map((s) => ({
          n: s.n,
          day: s.day,
          topic: s.topic || null,
          format: s.format,
          checkedIn: s.attendees,
        })),
        participants: pool.map((p) => ({
          slug: p.slug,
          name: p.name,
          cohort: p.cohort,
          eduCount: p.eduCount,
          eduComplete: p.eduComplete,
          sessions: p.eduSessions.map((a) => ({ date: a.eventDate, topic: a.eventName })),
        })),
      });
    }

    const parts = [];
    if (view === "all" || view === "reference") {
      parts.push(renderReference(catalogue, metrics, generatedOn));
    }
    if (view === "all" || view === "forms") {
      parts.push(...pool.map((p, i) => renderParticipantForm(p, i + 1, pool.length)));
    }
    if (view === "all" || view === "sheets") {
      parts.push(...catalogue.map((s) => renderAttendanceSheet(s, attendance.byEvent, cohortOf)));
    }

    const scope = cohort ? ` (${cohort})` : "";
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow">
<title>NJEDA Educational Session Verification &mdash; Fall 2026${esc(scope)}</title>
<style>${STYLES}</style></head><body>
${parts.join("\n")}
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);
  } catch (err) {
    console.error("[edu-verification-fall] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
