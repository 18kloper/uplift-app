// GET /api/speaker-slots
//
// The PUBLIC slot board behind /speak, so a prospective speaker can see which
// of the 22 dates are still open before they rank their five.
//
// Deliberately sanitized: it returns dates and open/booked only. Applicant
// names, emails, bios and decisions live in /api/admin/speaker-applications
// and must never surface here, and a booked speaker's name stays private until
// the Luma event announces them.

import { getSheetsClient } from "../../lib/sheets-helper";
import { EDU_SESSIONS } from "../../lib/edu-sessions";

let cache = { at: 0, payload: null };
const CACHE_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  const now = Date.now();
  if (cache.payload && now - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  // Booked slots come from the decision tab. If it cannot be read, every slot
  // reports open, which is the safe failure: someone may rank a date that is
  // gone (recoverable, you just offer them another) rather than being told a
  // free date is taken and not applying at all.
  let booked = new Set();
  try {
    const sheets = getSheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "FallSpeakers!A2:G2000",
    });
    const latest = {};
    for (const row of r.data.values || []) {
      if (!row[1]) continue;
      latest[row[1]] = { decision: row[4], session: row[5] ? parseInt(row[5], 10) : null };
    }
    booked = new Set(Object.values(latest)
      .filter(v => v.decision === "approved" && v.session)
      .map(v => v.session));
  } catch (err) {
    if (err?.code !== 400) console.error("[speaker-slots] sheet read failed:", err.message);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    openCount: EDU_SESSIONS.filter(s => !booked.has(s.n)).length,
    totalCount: EDU_SESSIONS.length,
    slots: EDU_SESSIONS.map(s => ({ n: s.n, day: s.day, time: s.time, open: !booked.has(s.n) })),
  };
  cache = { at: now, payload };
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({ ...payload, cached: false });
}
