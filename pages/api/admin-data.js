// GET /api/admin-data
// Returns live milestone + status data for all mentees, used by /admin dashboard.

import { getSheetsClient, MILESTONE_KEYS } from "../../lib/sheets-helper";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

// Week deadline thresholds derived from My Journey program timeline
const PROGRAM_START  = new Date("2026-06-01");
const WEEK1_END      = new Date("2026-06-07");
const WEEK2_END      = new Date("2026-06-14");
const WEEK4_END      = new Date("2026-06-28");
const WEEK5_END      = new Date("2026-07-05");
const WEEK7_END      = new Date("2026-07-19");

function computeStatus(milestones, today) {
  const mentorCount = ["mentorSession1", "mentorSession2", "mentorSession3"]
    .filter(k => milestones[k]).length;

  // Before the program starts: on track if participation confirmed, otherwise just flag participation
  if (today < PROGRAM_START) {
    const flags = milestones.participation ? [] : ["Participation not yet confirmed"];
    return { status: "on-track", flags };
  }

  let status = "on-track";
  let flags = [];

  // Session-based thresholds (only apply after their respective deadlines)
  if (today >= WEEK4_END && mentorCount === 0) {
    status = "at-risk";
    flags.push("No mentor session — past Week 4 removal deadline");
  } else if (today >= WEEK7_END && mentorCount < 3) {
    if (status !== "at-risk") status = "needs-attention";
    flags.push(`Only ${mentorCount}/3 mentor sessions by end of Week 7`);
  } else if (today >= WEEK5_END && mentorCount < 2) {
    if (status !== "at-risk") status = "needs-attention";
    flags.push(`Only ${mentorCount}/2 mentor sessions by end of Week 5`);
  } else if (today >= WEEK2_END && mentorCount < 1) {
    if (status !== "at-risk") status = "needs-attention";
    flags.push("No mentor session logged by end of Week 2");
  }

  // Participation — flag always once program has started
  if (!milestones.participation) flags.push("Participation not confirmed");

  // Onboarding — only flag after Week 1 ends
  if (today >= WEEK1_END && !milestones.onboarding) flags.push("Onboarding not attended");

  // Mentor match — only flag after Week 2 (should be matched by then)
  if (today >= WEEK2_END && !milestones.mentorMatched) flags.push("Mentor not yet matched");

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
        isTest: TEST_SLUGS.includes(slug),
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
