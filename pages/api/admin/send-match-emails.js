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

const CONF_TAB = "Mentor Confirmations";
const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://uplift2026.vercel.app";

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

// ── Check if mentee has completed onboarding via their sheet tab ───────────
async function fetchOnboardedSlugs(sheets, spreadsheetId, slugs) {
  const onboarded = new Set();
  await Promise.all(slugs.map(async (slug) => {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${slug}!A:D`,
      });
      const rows = res.data.values || [];
      const hasOnboarding = rows.some(r => {
        const fieldKey = (r[1] || "").toLowerCase();
        const value = (r[3] || "").trim();
        return (fieldKey.includes("onboard") || fieldKey === "onboarding_block") && value && value !== "false";
      });
      if (hasOnboarding) onboarded.add(slug);
    } catch {
      // tab doesn't exist or error — skip
    }
  }));
  return onboarded;
}

// ── Render email HTML by calling the preview endpoint ─────────────────────
async function renderEmail(slug, port) {
  const res = await fetch(`http://localhost:${port}/api/admin/match-email-preview?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Preview render failed for ${slug}: ${res.status}`);
  return res.text();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { dryRun = false, slugs: slugFilter } = req.body || {};

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

  // 3. Check onboarding milestone for each candidate
  const onboardedSlugs = await fetchOnboardedSlugs(sheets, spreadsheetId, candidates.map(m => m.slug));

  // 4. Final eligible list
  const eligible = candidates.filter(m => onboardedSlugs.has(m.slug));

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
  const port = process.env.PORT || 3000;
  const results = [];

  for (const m of eligible) {
    const menteeEmail = MENTEE_EMAILS[m.slug] || "";
    const mentorEmail = m.mentor.email;

    if (!menteeEmail || !mentorEmail) {
      results.push({ slug: m.slug, status: "skipped", reason: "missing email" });
      continue;
    }

    try {
      const html = await renderEmail(m.slug, port);

      const { data, error } = await resend.emails.send({
        from: "Uplift by TechUnited NJ <kennedy@techunited.co>",
        to: [menteeEmail, mentorEmail],
        reply_to: ["kennedy@techunited.co", "uplift@techunited.co"],
        subject: "Welcome to Uplift — meet your match",
        html,
      });

      if (error) throw new Error(error.message);
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
