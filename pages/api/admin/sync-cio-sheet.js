// POST /api/admin/sync-cio-sheet
// Writes two tabs to the Google Sheet for Customer.io importing:
//   "CIO - Mentees"  — one row per mentee with email + profile attributes
//   "CIO - Mentors"  — one row per mentor with email + assigned mentee attributes
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES, MENTEE_EMAILS, MENTOR_EMAILS } from "../../../lib/mentees";

const MENTEE_TAB = "CIO - Mentees";
const MENTOR_TAB = "CIO - Mentors";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

async function ensureTab(sheets, spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === title);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
}

async function writeTab(sheets, spreadsheetId, title, rows) {
  await ensureTab(sheets, spreadsheetId, title);
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${title}!A1:Z2000` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));

    // ── CIO - Mentees ─────────────────────────────────────────────────────
    const menteeHeaders = [
      "email", "first_name", "last_name", "company", "title",
      "industry", "stage", "county", "cohort",
      "primary_focus", "linkedin",
      "mentor_name", "mentor_email", "mentor_company", "mentor_title",
      "needs_invitation",
    ];

    const menteeRows = realMentees.map(m => [
      MENTEE_EMAILS[m.slug] || "",
      m.first || "",
      m.last || "",
      m.company || "",
      m.title || "Founder",
      m.industry || "",
      m.stage || "",
      m.county || "",
      m.cohort || "",
      m.primaryFocus || "",
      m.linkedin || "",
      m.mentor?.name || "",
      m.mentor?.email || "",
      m.mentor?.company || "",
      m.mentor?.title || "",
      m.needsInvitation ? "true" : "false",
    ]);

    await writeTab(sheets, spreadsheetId, MENTEE_TAB, [menteeHeaders, ...menteeRows]);

    // ── CIO - Mentors ─────────────────────────────────────────────────────
    // Build mentor → mentees map from lib/mentees.js
    const mentorMap = {};
    for (const m of realMentees) {
      if (!m.mentor?.email) continue;
      const key = m.mentor.email.toLowerCase();
      if (!mentorMap[key]) {
        mentorMap[key] = {
          name: m.mentor.name,
          email: m.mentor.email,
          company: m.mentor.company || "",
          title: m.mentor.title || "",
          mentees: [],
        };
      }
      mentorMap[key].mentees.push(m);
    }

    const mentorHeaders = [
      "email", "mentor_name", "mentor_company", "mentor_title",
      "match1_name", "match1_company", "match1_industry", "match1_stage", "match1_focus",
      "match2_name", "match2_company", "match2_industry", "match2_stage", "match2_focus",
    ];

    const mentorRows = Object.values(mentorMap).map(g => {
      const [m1, m2] = g.mentees;
      return [
        g.email,
        g.name,
        g.company,
        g.title,
        m1?.company || "",
        m1?.company || "",
        m1?.industry || "",
        m1?.stage || "",
        m1?.primaryFocus || "",
        m2?.company || "",
        m2?.company || "",
        m2?.industry || "",
        m2?.stage || "",
        m2?.primaryFocus || "",
      ];
    });

    // Fix: match1_name / match2_name should be mentee full name not company
    const fixedMentorRows = Object.values(mentorMap).map(g => {
      const [m1, m2] = g.mentees;
      return [
        g.email,
        g.name,
        g.company,
        g.title,
        m1 ? `${m1.first} ${m1.last}`.trim() : "",
        m1?.company || "",
        m1?.industry || "",
        m1?.stage || "",
        m1?.primaryFocus || "",
        m2 ? `${m2.first} ${m2.last}`.trim() : "",
        m2?.company || "",
        m2?.industry || "",
        m2?.stage || "",
        m2?.primaryFocus || "",
      ];
    });

    await writeTab(sheets, spreadsheetId, MENTOR_TAB, [mentorHeaders, ...fixedMentorRows]);

    return res.status(200).json({
      ok: true,
      menteeCount: menteeRows.length,
      mentorCount: fixedMentorRows.length,
    });
  } catch (err) {
    console.error("sync-cio-sheet error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
