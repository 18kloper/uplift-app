// GET /api/debug-fetch-meetings?slug=kima-danjou
// TEMPORARY diagnostic. Reproduces fetchMeetings() phase-by-phase WITHOUT the
// outer catch that swallows errors, so we can see exactly where/why a mentee's
// sessions come back empty. Read-only: it does NOT append rows to SessionReview.

import { getSheetsClient } from "../../lib/sheets-helper";
import { fetchTypeformResponses } from "./meetings";

const FIELDS = {
  first:     "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:      "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:      "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  sixtyMin:  "fcee13e9-5193-4f01-b3b4-aed4f421b933",
  notes:     "719c5b7a-8246-4c7a-be74-a1e71512ee46",
  takeaways: "0d816bc2-6793-4c72-b28d-5b34f48ce5b7",
};

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  const dbg = { slug, phase: "start", env: {} };
  try {
    dbg.env = {
      hasTypeformToken: !!process.env.TYPEFORM_TOKEN,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasServiceEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    };

    // Phase 1 — Typeform fetch
    dbg.phase = "typeform-fetch";
    const data = await fetchTypeformResponses();
    dbg.typeform = {
      ok: !!data,
      isError: !!(data && (data.code || data.error)),
      code: data?.code,
      total_items: data?.total_items,
      itemCount: Array.isArray(data?.items) ? data.items.length : null,
    };
    if (!data) return res.status(200).json({ ...dbg, result: "fetchTypeformResponses returned null (no token?)" });

    // Phase 2 — name matching (exact copy of meetings.js logic)
    dbg.phase = "matching";
    const parts     = slug.split("-");
    const firstName = parts[0].toLowerCase();
    const lastName  = parts.slice(1).join("-").toLowerCase();
    const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);

    function similarity(a, b) {
      if (!a || !b) return 0;
      if (a === b) return 1;
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
          dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      return 1 - dp[m][n] / Math.max(m, n);
    }
    function normalize(str) { return str.toLowerCase().trim().replace(/[^a-z0-9]/g, ""); }
    function fuzzyMatch(submitted, fromSlug) {
      const s = submitted.toLowerCase().trim();
      const t = fromSlug.toLowerCase().trim();
      if (!s || !t) return false;
      if (s === t) return true;
      if (normalize(s) === normalize(t)) return true;
      const firstWord = s.split(/\s+/)[0];
      if (firstWord === t) return true;
      if (normalize(firstWord) === normalize(t)) return true;
      if (similarity(firstWord, t) >= 0.7) return true;
      if (similarity(normalize(firstWord), normalize(t)) >= 0.7) return true;
      return false;
    }

    let menteeName = "";
    const meetings = [];
    for (const item of data.items || []) {
      const answers = item.answers || [];
      const first   = get(answers, FIELDS.first)?.text?.trim() || "";
      const last    = get(answers, FIELDS.last)?.text?.trim()  || "";
      if (!first && last && lastName && fuzzyMatch(last, lastName)) {
        // last-name-only fallback
      } else if (!fuzzyMatch(first, firstName)) {
        continue;
      } else if (lastName && !fuzzyMatch(last, lastName)) {
        continue;
      }
      if (!menteeName) menteeName = `${first} ${last}`.trim();
      const rawAnswer = get(answers, FIELDS.sixtyMin);
      let minutes = null;
      if (rawAnswer?.number != null) minutes = rawAnswer.number;
      else if (rawAnswer?.boolean === true) minutes = 60;
      meetings.push({ id: item.token, first, last, minutes, notes: get(answers, FIELDS.notes)?.text || "", submittedAt: item.submitted_at });
    }
    dbg.matching = { firstName, lastName, menteeName, matchedCount: meetings.length, matched: meetings.map(m => ({ id: m.id?.slice(0,10), first: m.first, last: m.last, minutes: m.minutes })) };

    // Phase 3 — SessionReview read (read-only; no append)
    dbg.phase = "session-review-read";
    const hasSheets = process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
    if (hasSheets) {
      const sheets = getSheetsClient();
      const readRes = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: "SessionReview!A:I" });
      const rows = readRes.data.values || [];
      const forSlug = rows.slice(1).filter(r => (r[1] || "").trim().toLowerCase() === slug.toLowerCase())
        .map(r => ({ approved: r[0], date: r[3], sixtyMin: r[4], sessionId: (r[7] || "").slice(0,10) }));
      dbg.sessionReview = { totalRows: rows.length, rowsForSlug: forSlug };
    } else {
      dbg.sessionReview = "skipped (no sheet creds)";
    }

    dbg.phase = "done";
    return res.status(200).json(dbg);
  } catch (err) {
    return res.status(200).json({ ...dbg, failedAtPhase: dbg.phase, error: err.message, stack: (err.stack || "").split("\n").slice(0, 6) });
  }
}
