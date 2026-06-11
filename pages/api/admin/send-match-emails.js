// POST /api/admin/send-match-emails
// Sends match intro emails to all mentees who:
//   1. Have completed onboarding (milestones.onboarding truthy in their sheet tab)
//   2. Have a confirmed mentor (status = "confirmed" in Mentor Confirmations col F)
//
// Body: { dryRun?: boolean, slugs?: string[] }
//   dryRun: true  — returns list of who would be emailed, no sends
//   slugs: []     — if provided, only send to these specific slugs (still checks eligibility)
//
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES, MENTEE_EMAILS, MENTOR_EMAILS } from "../../../lib/mentees";
import { Resend } from "resend";
import { buildMatchEmailPayload } from "./match-email-data";
import { renderHTML } from "./match-email-preview";

const CONF_TAB = "Mentor Confirmations";
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Fetch confirmed slugs from Mentor Confirmations sheet ──────────────────
async function fetchConfirmedSlugs(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CONF_TAB}!A2:F500`,
  });
  const rows = res.data.values || [];
  // Col E (index 4) = menteeSlug, Col F (index 5) = status
  const confirmed = new Set();
  for (const row of rows) {
    if (row[5]?.trim().toLowerCase() === "confirmed") {
      confirmed.add(row[4]?.trim());
    }
  }
  return confirmed;
}

// ── Fetch onboarded slugs from the milestone Dashboard tab ────────────────
async function fetchOnboardedSlugs(sheets, spreadsheetId) {
  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
  const onboarded = new Set();

  for (const tabName of DASHBOARD_NAMES) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A1:Z500`,
      });
      const rows = res.data.values || [];
      if (rows.length < 2) continue;

      const headers = rows[0].map(h => (h || "").toLowerCase());
      const slugIdx = headers.findIndex(h => h.includes("slug"));
      const onboardIdx = headers.findIndex(h => h.includes("onboard"));
      if (slugIdx === -1 || onboardIdx === -1) continue;

      for (let i = 1; i < rows.length; i++) {
        const slug = rows[i][slugIdx]?.trim();
        const val = rows[i][onboardIdx];
        if (slug && (val === "TRUE" || val === true || val === "1")) {
          onboarded.add(slug);
        }
      }
      break; // found and parsed a valid tab
    } catch {
      continue;
    }
  }
  return onboarded;
}

// ── Render email HTML directly (no HTTP calls) ────────────────────────────
async function renderEmail(slug) {
  const data = await buildMatchEmailPayload(slug);
  return renderHTML(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // HARD REQUIREMENT: slugs must be explicitly provided — no bulk sends allowed.
  // Every send must be scoped to specific mentees approved one-by-one.
  const { dryRun = false, slugs: slugFilter, testEmail, cc } = req.body || {};
  if (!dryRun && !testEmail && (!slugFilter || slugFilter.length === 0)) {
    return res.status(403).json({ error: "Bulk send blocked: must provide explicit slugs. No unsolicited bulk emails." });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const hasSheets = spreadsheetId && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return res.status(500).json({ error: "Google Sheets not configured" });

  const sheets = getSheetsClient();

  // 1. Get confirmed slugs from Mentor Confirmations
  const confirmedSlugs = await fetchConfirmedSlugs(sheets, spreadsheetId);

  // 2. Filter mentees — must have mentor assigned + be confirmed
  const candidates = MENTEES.filter(m => {
    if (m.isTest || !m.mentor?.name || !m.mentor?.email) return false;
    if (!confirmedSlugs.has(m.slug)) return false;
    if (slugFilter?.length && !slugFilter.includes(m.slug)) return false;
    return true;
  });

  // 3. Check onboarding milestone from Dashboard tab
  const onboardedSlugs = await fetchOnboardedSlugs(sheets, spreadsheetId);

  // 4. Final eligible list
  const eligible = candidates.filter(m => onboardedSlugs.has(m.slug));

  const { debug } = req.body || {};
  if (debug) {
    return res.status(200).json({
      confirmedSlugs: [...confirmedSlugs],
      onboardedSlugs: [...onboardedSlugs],
      candidateCount: candidates.length,
      candidates: candidates.map(m => ({ slug: m.slug, confirmed: confirmedSlugs.has(m.slug), onboarded: onboardedSlugs.has(m.slug) })),
    });
  }

  if (dryRun) {
    return res.status(200).json({
      dryRun: true,
      count: eligible.length,
      mentees: eligible.map(m => ({
        slug: m.slug,
        mentee: `${m.first} ${m.last}`,
        menteeEmail: MENTEE_EMAILS[m.slug] || "",
        mentor: m.mentor.name,
        mentorEmail: m.mentor.email,
      })),
    });
  }

  // 5. Send emails one by one
  const results = [];

  for (const m of eligible) {
    const menteeEmail = MENTEE_EMAILS[m.slug] || "";
    const mentorEmail = m.mentor.email;

    if (!menteeEmail || !mentorEmail) {
      results.push({ slug: m.slug, status: "skipped", reason: "missing email" });
      continue;
    }

    try {
      const html = await renderEmail(m.slug);

      const to = testEmail ? [testEmail] : [menteeEmail, mentorEmail];
      const subject = testEmail
        ? `[TEST: ${m.slug}] Welcome to Uplift — meet your match`
        : "Welcome to Uplift — meet your match";

      const emailPayload = {
        from: "Uplift by TechUnited:NJ <kennedy@techunited.co>",
        to,
        cc: cc?.length ? cc : ["uplift@techunited.co"],
        reply_to: ["kennedy@techunited.co", "uplift@techunited.co"],
        subject,
        html,
      };

      const { data, error } = await resend.emails.send(emailPayload);

      if (error) throw new Error(error.message);

      // Set mentorMatched = true on the Milestone Dashboard
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "https://uplift-app-mocha.vercel.app";
        await fetch(`${base}/api/update-milestone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_TOKEN || "Q3svTw6xaP7zryAhKiI5PYKRYw2B3QnW",
          },
          body: JSON.stringify({ slug: m.slug, milestone: "mentorMatched", value: true }),
        });
      } catch (_) { /* non-fatal — email already sent */ }

      results.push({ slug: m.slug, status: "sent", id: data.id, mentee: menteeEmail, mentor: mentorEmail });
    } catch (err) {
      results.push({ slug: m.slug, status: "error", reason: err.message });
    }
  }

  const sent  = results.filter(r => r.status === "sent").length;
  const errors = results.filter(r => r.status === "error").length;
  const skipped = results.filter(r => r.status === "skipped").length;

  return res.status(200).json({ sent, errors, skipped, results });
}
