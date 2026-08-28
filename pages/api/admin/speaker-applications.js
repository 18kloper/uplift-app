// GET /api/admin/speaker-applications
//
// The speaker funnel: live applications from the "Speak at Uplift · Fall 2026"
// Typeform (uUjnsoDm), parsed server-side against the public form definition,
// overlaid with decisions + slot assignments from the FallSpeakers sheet tab.
// Same shape and cache behaviour as fall-people.js. 60s in-memory cache;
// ?fresh=1 bypasses.

import { getSheetsClient } from "../../../lib/sheets-helper";
import { EDU_SESSIONS, sessionNumberFromLabel } from "../../../lib/edu-sessions";

const SPEAKER_FORM = "uUjnsoDm";

let cache = { at: 0, payload: null };
const CACHE_MS = 60 * 1000;

async function fetchForm(formId, token) {
  const [def, resp] = await Promise.all([
    fetch(`https://form.typeform.com/forms/${formId}`).then(r => r.json()),
    fetch(`https://api.typeform.com/forms/${formId}/responses?page_size=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  ]);
  // Answers are keyed by field id; the form definition gives us the refs we
  // named at creation time, which are far more stable than title matching.
  const refs = {};
  (def.fields || []).forEach(function walk(f) {
    // contact_info subfields (first name, last name, email, company) get refs
    // Typeform generates itself, so they are keyed by their subfield_key. Those
    // keys match the ref names the rest of this file already reads.
    refs[f.id] = f.subfield_key || f.ref || "";
    (f.properties?.fields || []).forEach(walk);
  });
  return { refs, items: resp.items || [] };
}

function makeGetter(refs, item) {
  return (ref) => {
    const a = (item.answers || []).find(x => refs[x.field.id] === ref);
    if (!a) return null;
    return a.text ?? a.email ?? a.url ?? a.number ?? a.boolean
      ?? (a.choice ? a.choice.label : null)
      ?? (a.choices ? a.choices.labels : null)
      ?? a.file_url ?? null;
  };
}

function parseSpeaker(refs, item) {
  const get = makeGetter(refs, item);
  const first = get("first_name") || "";
  const last = get("last_name") || "";
  // Up to three dates in the applicant's own order of preference, plus whether
  // they would take a slot outside that list. Typeform cannot enforce that the
  // five dropdowns hold five different dates, so duplicates are collapsed here
  // rather than showing a fake three-deep ranking.
  const ranked = ["date_1", "date_2", "date_3"]
    .map(ref => sessionNumberFromLabel(get(ref)))
    .filter((n, i, arr) => n !== null && arr.indexOf(n) === i);
  const anyDate = /^yes/i.test(get("flexible") || "");
  const requested = ranked;
  return {
    id: item.response_id,
    submittedAt: item.submitted_at,
    first, last,
    name: `${first} ${last}`.trim(),
    email: (get("email") || "").toLowerCase(),
    company: get("company"),
    role: get("role"),
    linkedin: get("linkedin"),
    headshotUrl: get("headshot"),
    bio: get("bio"),
    format: get("format"),
    topicTitle: get("topic_title"),
    topicSummary: get("topic_summary"),
    takeaways: get("takeaways"),
    whyNow: get("why_now"),
    deckLink: get("deck_link"),
    deckFileUrl: get("deck_file"),
    resources: get("resources"),
    // A speaker who checked "any of these work" is available for every slot.
    anyDate,
    requestedSessions: anyDate ? [...ranked, ...EDU_SESSIONS.map(s => s.n).filter(n => !ranked.includes(n))] : requested,
    pickedSpecificDates: requested,
    // Ranked first, so the admin can honour the order they asked for.
    rankedSessions: ranked,
    // Who the speaker is aiming at. Sessions stay open to the whole cohort;
    // this only steers the event blurb.
    audience: (() => { const a = get("audience"); return Array.isArray(a) ? a : a ? [a] : []; })(),
    // Up to three sessions per speaker. The first booking is unaffected; this
    // only flags who to go back to for a second and third.
    series: get("series"),
    seriesIdeas: get("series_ideas"),
    spokenBefore: get("spoken_before"),
    consent: get("consent") === true,
    anythingElse: get("anything_else"),
    referral: get("referral"),
  };
}

export default async function handler(req, res) {
  const fresh = req.query.fresh === "1";
  const now = Date.now();
  if (!fresh && cache.payload && now - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) {
    return res.status(200).json({ error: "TYPEFORM_TOKEN not configured", speakers: [], slots: [] });
  }

  try {
    // Same rule as fall-people.js: a failed sheet read must never be served as
    // "no decisions", or every booked speaker renders back as Undecided and
    // looks exactly like lost work.
    const readDecisions = async () => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const sheets = getSheetsClient();
          const r = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "FallSpeakers!A2:G2000",
          });
          const rows = r.data.values || [];
          const latest = {};
          for (const row of rows) {
            if (!row[1]) continue;
            latest[row[1]] = { decision: row[4], session: row[5] ? parseInt(row[5], 10) : null, note: row[6] || "" };
          }
          return { latest, failed: false };
        } catch (e) {
          const code = e?.code || e?.response?.status;
          if (code === 400) return { latest: {}, failed: false }; // tab not created yet
          lastErr = e;
          if (attempt < 2) await new Promise(r2 => setTimeout(r2, 700 * (attempt + 1)));
        }
      }
      console.error("[speaker-applications] sheet read failed:", lastErr?.message);
      return { latest: {}, failed: true };
    };

    const [form, decisions] = await Promise.all([fetchForm(SPEAKER_FORM, token), readDecisions()]);

    const speakers = form.items
      .map(i => parseSpeaker(form.refs, i))
      // Typeform records partial drop-offs too; a row with no name and no
      // email is nobody worth deciding on.
      .filter(s => s.email || s.first || s.last)
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

    for (const s of speakers) {
      const d = decisions.latest[s.id];
      s.decision = !d || d.decision === "clear" ? null : d.decision || null;
      s.assignedSession = s.decision === "approved" ? d?.session ?? null : null;
      s.note = d?.note || "";
    }

    // Slot board: which of the 22 sessions now have a booked speaker, and who
    // is asking for the ones that don't.
    const booked = {};
    for (const s of speakers) {
      if (s.decision === "approved" && s.assignedSession) booked[s.assignedSession] = s;
    }
    const slots = EDU_SESSIONS.map(sess => {
      const speaker = booked[sess.n] || null;
      return {
        ...sess,
        url: `https://luma.com/${sess.slug}`,
        speaker: speaker && { id: speaker.id, name: speaker.name, company: speaker.company, topicTitle: speaker.topicTitle },
        interestedCount: speakers.filter(s => !s.decision && s.requestedSessions.includes(sess.n)).length,
      };
    });

    const payload = {
      generatedAt: new Date().toISOString(),
      formId: SPEAKER_FORM,
      formUrl: `https://form.typeform.com/to/${SPEAKER_FORM}`,
      sheetReadError: decisions.failed,
      counts: {
        total: speakers.length,
        undecided: speakers.filter(s => !s.decision).length,
        approved: speakers.filter(s => s.decision === "approved").length,
        rejected: speakers.filter(s => s.decision === "rejected").length,
        slotsFilled: Object.keys(booked).length,
        slotsTotal: EDU_SESSIONS.length,
      },
      speakers,
      slots,
    };
    if (!decisions.failed) cache = { at: now, payload };
    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error("[speaker-applications] failed:", err);
    return res.status(500).json({ error: err.message, speakers: [], slots: [] });
  }
}
