// POST /api/admin/fall-decide
// Body: { kind: "mentee" | "mentor", applicant: { id, name, email }, decision: "approved" | "rejected" | "clear" }
//
// The decision layer over applications, stored in FallMentees / FallMentors
// (append-only; the latest row per applicant wins). Together with FallMatches
// and FallResponses this is the whole fall backend: four tabs, no per-person
// sprawl.
//
// On "approved", also assigns a permanent Uplift ID (format UF261, UF262,
// UF263, ...), shared across mentees and mentors as one sequence, in the
// order people are approved. If this applicant already has one from a prior
// approve (even if later rejected/cleared), that same ID is reused, it is
// never reassigned. This is what founders/mentors enter on the meeting
// Typeform going forward, alongside the hidden-slug fix for founders already
// using their personalized portal link.

import { getSheetsClient } from "../../../lib/sheets-helper";

const TABS = { mentee: "FallMentees", mentor: "FallMentors" };
const HEADERS = ["Decided At", "Applicant Id", "Name", "Email", "Decision", "Uplift ID"];
const ID_PREFIX = "UF26";

// Rapid batch-approving (one click every couple of seconds) can trip Google's
// per-minute Sheets quota; a 429 here must not lose the decision.
async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      const code = e?.code || e?.response?.status;
      if (![429, 500, 502, 503].includes(code) || i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

async function findExistingId(sheets, spreadsheetId, applicantId) {
  // Scan both tabs (an id must stay globally unique across mentees+mentors)
  // for the highest-numbered id already issued, and this applicant's own id
  // if they were ever approved before.
  let maxNum = 0;
  let ownId = null;
  const r = await withRetry(() => sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: Object.values(TABS).map(TAB => `${TAB}!A:F`),
  }));
  for (const vr of r.data.valueRanges || []) {
    const rows = vr.values || [];
    for (let i = 1; i < rows.length; i++) {
      const [, rowApplicantId, , , , id] = rows[i];
      if (!id || !id.startsWith(ID_PREFIX)) continue;
      const num = parseInt(id.slice(ID_PREFIX.length), 10);
      if (Number.isFinite(num) && num > maxNum) maxNum = num;
      if (rowApplicantId === applicantId) ownId = id;
    }
  }
  return { maxNum, ownId };
}

// Both tabs already exist in the live sheet; re-checking on every approve
// costs a metadata read per tab and eats quota during batch approvals, so
// remember the answer per warm lambda (a cold start just re-checks once).
let tabsEnsured = false;

async function ensureTab(sheets, spreadsheetId, TAB) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some(sh => sh.properties?.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { kind, applicant, decision } = req.body || {};
  const TAB = TABS[kind || "mentee"];
  if (!TAB || !applicant?.id || !["approved", "rejected", "clear"].includes(decision)) {
    return res.status(400).json({ error: "Missing/invalid kind, applicant.id, or decision" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!tabsEnsured) {
      await ensureTab(sheets, spreadsheetId, TABS.mentee);
      await ensureTab(sheets, spreadsheetId, TABS.mentor);
      tabsEnsured = true;
    }

    let upliftId = "";
    if (decision === "approved") {
      const { maxNum, ownId } = await findExistingId(sheets, spreadsheetId, applicant.id);
      upliftId = ownId || `${ID_PREFIX}${maxNum + 1}`;
    }

    await withRetry(() => sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:F`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[new Date().toISOString(), applicant.id, applicant.name || "", applicant.email || "", decision, upliftId]],
      },
    }));
    return res.status(200).json({ ok: true, decision, upliftId: upliftId || undefined });
  } catch (err) {
    console.error("[fall-decide] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
