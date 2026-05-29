// GET /api/admin-data
// Returns live milestone + status data for all mentees, used by /admin dashboard.
// Uses MENTEES array as the guaranteed source of all people;
// overlays live milestone data from Google Sheets on top.

import { getSheetsClient, MILESTONE_KEYS } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

// Week deadline thresholds derived from My Journey program timeline
const PROGRAM_START = new Date("2026-06-01");
const WEEK1_END     = new Date("2026-06-07");
const WEEK2_END     = new Date("2026-06-14");
const WEEK4_END     = new Date("2026-06-28");
const WEEK5_END     = new Date("2026-07-05");
const WEEK7_END     = new Date("2026-07-19");

function computeStatus(milestones, today) {
  const mentorCount = ["mentorSession1", "mentorSession2", "mentorSession3"]
    .filter(k => milestones[k]).length;

  // Before program starts: on track; only note missing participation
  if (today < PROGRAM_START) {
    return {
      status: "on-track",
      flags: milestones.participation ? [] : ["Participation not yet confirmed"],
    };
  }

  let status = "on-track";
  let flags = [];

  // Session-based thresholds
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

  if (!milestones.participation)                          flags.push("Participation not confirmed");
  if (today >= WEEK1_END && !milestones.onboarding)       flags.push("Onboarding not attended");
  if (today >= WEEK2_END && !milestones.mentorMatched)    flags.push("Mentor not yet matched");

  return { status, flags: [...new Set(flags)] };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const today = new Date();

  // Fetch live milestone data from Google Sheets (best-effort)
  let sheetMilestones = {}; // slug → milestone object

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (hasSheets) {
    try {
      const sheets = getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Dashboard!A:Z",
      });
      const rows = response.data.values || [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) continue;
        const slug = row[0];
        const milestones = {};
        MILESTONE_KEYS.forEach((key, idx) => {
          const val = row[6 + idx];
          milestones[key] = val === "TRUE" || val === true;
        });
        sheetMilestones[slug] = milestones;
      }
    } catch (err) {
      console.error("Sheet read failed:", err.message);
    }
  }

  // Build mentee list from MENTEES array (always complete)
  const mentees = MENTEES.map(m => {
    const milestones = sheetMilestones[m.slug] || Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));

    const milestoneCount = Object.values(milestones).filter(Boolean).length;
    const mentorCount    = ["mentorSession1", "mentorSession2", "mentorSession3"].filter(k => milestones[k]).length;
    const eduCount       = ["edu1", "edu2", "edu3"].filter(k => milestones[k]).length;

    const { status, flags } = computeStatus(milestones, today);

    return {
      slug: m.slug,
      first: m.first,
      last: m.last,
      cohort: m.cohort,
      company: m.company || "",
      milestones,
      milestoneCount,
      mentorCount,
      eduCount,
      status,
      flags,
      isTest: TEST_SLUGS.includes(m.slug),
    };
  });

  // Sort: at-risk first, then needs-attention, then on-track; alpha within group
  const order = { "at-risk": 0, "needs-attention": 1, "on-track": 2 };
  mentees.sort((a, b) =>
    order[a.status] - order[b.status] ||
    a.last.localeCompare(b.last)
  );

  return res.status(200).json({ mentees, generatedAt: new Date().toISOString() });
}
