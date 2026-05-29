// GET /api/admin-data
// Returns live milestone + status data for all mentees, used by /admin dashboard.

import { getSheetsClient, MILESTONE_KEYS } from "../../lib/sheets-helper";

// Week deadline thresholds derived from My Journey program timeline
const THRESHOLDS = [
  { after: new Date("2026-06-14"), mentorRequired: 1, level: "needs-attention", reason: "No mentor session by end of Week 2" },
  { after: new Date("2026-06-28"), mentorRequired: 1, level: "at-risk",         reason: "No mentor session past Week 4 deadline" },
  { after: new Date("2026-07-05"), mentorRequired: 2, level: "needs-attention", reason: "Fewer than 2 mentor sessions by end of Week 5" },
  { after: new Date("2026-07-19"), mentorRequired: 3, level: "needs-attention", reason: "Fewer than 3 mentor sessions by end of Week 7" },
];

function computeStatus(milestones, today) {
  const mentorCount = ["mentorSession1", "mentorSession2", "mentorSession3"]
    .filter(k => milestones[k]).length;

  let status = "on-track";
  let flags = [];

  for (const t of THRESHOLDS) {
    if (today >= t.after && mentorCount < t.mentorRequired) {
      if (t.level === "at-risk") {
        status = "at-risk";
        flags.push(t.reason);
      } else if (status !== "at-risk") {
        status = "needs-attention";
        flags.push(t.reason);
      }
    }
  }

  // Additional flags regardless of status
  if (!milestones.participation)  flags.push("Participation not confirmed");
  if (!milestones.mentorMatched)  flags.push("Mentor not yet matched");
  if (!milestones.onboarding)     flags.push("Onboarding not attended");

  return { status, flags: [...new Set(flags)] };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ error: "Google Sheets not configured", mentees: [] });
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Dashboard!A:Z",
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return res.status(200).json({ mentees: [] });

    const today = new Date();
    const mentees = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;

      const slug       = row[0] || "";
      const first      = row[1] || "";
      const last       = row[2] || "";
      const cohort     = row[3] || "";
      const company    = row[4] || "";
      const lastActive = row[5] || "";

      const milestones = {};
      MILESTONE_KEYS.forEach((key, idx) => {
        const val = row[6 + idx];
        milestones[key] = val === "TRUE" || val === true;
      });

      const milestoneCount = Object.values(milestones).filter(Boolean).length;
      const mentorCount    = ["mentorSession1", "mentorSession2", "mentorSession3"].filter(k => milestones[k]).length;
      const eduCount       = ["edu1", "edu2", "edu3"].filter(k => milestones[k]).length;

      const { status, flags } = computeStatus(milestones, today);

      mentees.push({
        slug, first, last, cohort, company, lastActive,
        milestones, milestoneCount, mentorCount, eduCount,
        status, flags,
      });
    }

    // Sort: at-risk first, then needs-attention, then on-track; alpha within group
    const order = { "at-risk": 0, "needs-attention": 1, "on-track": 2 };
    mentees.sort((a, b) =>
      order[a.status] - order[b.status] ||
      a.last.localeCompare(b.last)
    );

    return res.status(200).json({ mentees, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Admin data fetch failed:", err.message);
    return res.status(500).json({ error: err.message, mentees: [] });
  }
}
