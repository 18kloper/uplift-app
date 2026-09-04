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
// order people are approved. This is what founders/mentors enter on the
// meeting Typeform going forward, alongside the hidden-slug fix for founders
// already using their personalized portal link.
//
// THE RULE, enforced in issueId() below: an Uplift ID names exactly one
// person for good, and one person carries exactly one Uplift ID. It is a
// portal password, so a shared ID would let one founder into another's
// portal. Google Sheets has no unique constraint to lean on, so the three
// ways a duplicate could happen are each closed here:
//
//   1. One person, two IDs. The same human can apply as both a founder and a
//      mentor (Sanjeev Wadhwa did), which is two applicant ids and used to
//      earn two IDs. Identity is now the email, not the applicant id, so the
//      second approval reuses the ID the first one issued.
//   2. A number reissued. Candidates come from the high-water mark over every
//      ID that has ever appeared in either tab, so a number is never handed
//      out twice even if its row was edited or deleted by hand.
//   3. Two approvals racing. Picking a number is a read then a write, and
//      nothing locks the sheet in between, so two approvals inside the same
//      half-second (two admins, or one admin in two tabs) both read the same
//      max and both write max+1. The claim is verified after the write, and
//      whoever wrote second stands down and takes a fresh number.
//
// An ID that should no longer be anybody's is retired rather than blanked
// (see retireMarker in lib/uplift-id.js): a blank cell says "never had one"
// and would let the number be issued again, while a retired one stays spent
// and stops being a login everywhere it is read.

import { getSheetsClient } from "../../../lib/sheets-helper";
import { ID_PREFIX, isUpliftId, upliftIdNum, isRetiredMarker, retiredNum } from "../../../lib/uplift-id";

const TABS = { mentee: "FallMentees", mentor: "FallMentors" };
const HEADERS = ["Decided At", "Applicant Id", "Name", "Email", "Decision", "Uplift ID"];

// How many times a losing claim will re-pick before giving up. Two admins
// colliding is already unlikely; colliding four times running is not a thing
// that happens, so this bound exists to keep a bug from looping forever.
const MAX_CLAIM_ATTEMPTS = 4;

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

// A person is one human, not one application. Every email that appears on two
// application records in the live sheet belongs to the same person, and no two
// people share an inbox, so the email is the identity. Applicant id is the
// fallback for a row with no email at all.
function personKey(email, applicantId) {
  const e = (email || "").trim().toLowerCase();
  return e ? `e:${e}` : `a:${applicantId}`;
}

// Every Uplift ID ever written to either tab, as claims. A claim is one row
// that carries an ID: who wrote it, when, and under which identity.
//
// A retirement marker reads as a claim too, flagged retired. It has to, or it
// could not supersede the row that issued the ID: dropping retirements here
// would leave the original row standing and the retired ID would still have a
// holder. Its number counts as spent either way, so the number never comes
// back around to somebody else even if the issuing row is edited away.
async function readClaims(sheets, spreadsheetId) {
  const r = await withRetry(() => sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: Object.values(TABS).map(TAB => `${TAB}!A:F`),
  }));
  const claims = [];
  const everIssued = new Set();
  for (const vr of r.data.valueRanges || []) {
    const rows = vr.values || [];
    for (let i = 1; i < rows.length; i++) {
      const [at, applicantId, , email, , id] = rows[i];
      if (!applicantId) continue;
      const retired = isRetiredMarker(id);
      const num = retired ? retiredNum(id) : (isUpliftId(id) ? upliftIdNum(id) : null);
      if (num === null) continue;
      everIssued.add(num);
      claims.push({
        id: `${ID_PREFIX}${num}`,
        num,
        at: at || "",
        applicantId,
        key: personKey(email, applicantId),
        retired,
      });
    }
  }
  return { claims, everIssued };
}

// The claim that currently stands for each applicant record. A correction row
// supersedes the row it fixes, matching readDecisions() in fall-applications.js
// where the latest ID per applicant wins, so a stood-down ID stops counting.
// A retirement is the last word on that record: nobody stands holding it.
function standingClaims(claims) {
  const byApplicant = new Map();
  const firstAt = new Map();
  for (const c of claims) {
    const seen = firstAt.get(c.applicantId);
    if (!seen || c.at.localeCompare(seen) < 0) firstAt.set(c.applicantId, c.at);
    const prev = byApplicant.get(c.applicantId);
    if (!prev || c.at.localeCompare(prev.at) >= 0) byApplicant.set(c.applicantId, c);
  }
  return [...byApplicant.values()]
    .filter(c => !c.retired)
    .map(c => ({ ...c, firstAt: firstAt.get(c.applicantId) }));
}

// The ID this person already holds, from any prior approval in either role.
// If history left them holding more than one, their oldest application record
// wins: that is the ID they were told, and it may already be in their inbox.
function heldBy(standing, applicant) {
  const key = personKey(applicant.email, applicant.id);
  const own = standing.filter(c => c.key === key || c.applicantId === applicant.id);
  if (!own.length) return null;
  own.sort((a, b) => a.firstAt.localeCompare(b.firstAt) || a.num - b.num);
  return own[0].id;
}

// One past the highest number ever issued. Deliberately not the lowest unused
// number: a gap means an ID was issued and its row later edited away, and the
// person may still be holding it.
function nextNum(everIssued) {
  let max = 0;
  for (const n of everIssued) if (n > max) max = n;
  return max + 1;
}

// Of everyone currently claiming this number, the one who got there first, by
// write timestamp. Applicant id breaks a same-millisecond tie so that both
// sides of a race agree on who won.
function winnerOf(standing, num) {
  const rivals = standing.filter(c => c.num === num);
  if (!rivals.length) return null;
  rivals.sort((a, b) => a.at.localeCompare(b.at) || a.applicantId.localeCompare(b.applicantId));
  return rivals[0];
}

async function appendDecision(sheets, spreadsheetId, TAB, applicant, decision, upliftId) {
  const at = new Date().toISOString();
  await withRetry(() => sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB}!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[at, applicant.id, applicant.name || "", applicant.email || "", decision, upliftId || ""]],
    },
  }));
  return at;
}

// Writes the approval and returns the ID that ended up sticking to it.
//
// Reusing an ID the person already holds is settled by the read alone and
// cannot collide, so it writes once and returns. A brand new number is a
// claim: written, then read back, and surrendered if someone else's write got
// in first. Surrendering appends a correction row rather than editing the
// original, keeping both the append-only shape of the tab and a visible trail
// of what happened.
async function issueId(sheets, spreadsheetId, TAB, applicant) {
  let { claims, everIssued } = await readClaims(sheets, spreadsheetId);

  const held = heldBy(standingClaims(claims), applicant);
  if (held) {
    await appendDecision(sheets, spreadsheetId, TAB, applicant, "approved", held);
    return { upliftId: held, reused: true, corrected: false };
  }

  let num = nextNum(everIssued);
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    await appendDecision(sheets, spreadsheetId, TAB, applicant, "approved", `${ID_PREFIX}${num}`);

    ({ claims, everIssued } = await readClaims(sheets, spreadsheetId));
    // The number was unissued a moment ago, so any standing claim on it under
    // our own applicant id is the row we just wrote.
    const winner = winnerOf(standingClaims(claims), num);
    if (!winner || winner.applicantId === applicant.id) {
      return { upliftId: `${ID_PREFIX}${num}`, reused: false, corrected: attempt > 0 };
    }

    console.warn(
      `[fall-decide] ${ID_PREFIX}${num} was claimed by ${winner.applicantId} at ${winner.at}; ` +
      `${applicant.id} stands down and re-picks`
    );
    num = nextNum(everIssued);
  }
  throw new Error(
    `Could not issue a unique Uplift ID after ${MAX_CLAIM_ATTEMPTS} attempts. ` +
    `The approval is recorded; re-approve to try again.`
  );
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

    if (decision !== "approved") {
      await appendDecision(sheets, spreadsheetId, TAB, applicant, decision, "");
      return res.status(200).json({ ok: true, decision });
    }

    const { upliftId, reused, corrected } = await issueId(sheets, spreadsheetId, TAB, applicant);
    return res.status(200).json({ ok: true, decision, upliftId, reused, corrected });
  } catch (err) {
    console.error("[fall-decide] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
