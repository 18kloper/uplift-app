// One-shot: audit edu attendance vs milestones for all mentees, fix gaps
// Counts approved edu attendance rows per mentee, compares to edu1/edu2/edu3 set in Dashboard,
// and sets any missing milestones.
import { getSheetsClient } from "../../../lib/sheets-helper";
import { setNextEduMilestone } from "../../../lib/luma-helper";
import { MENTEES } from "../../../lib/mentees";

const NON_EDU_KEYWORDS = ["onboarding", "midpoint", "meetup", "summit", "graduation"];

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

function isEduEvent(eventName) {
  const lower = (eventName || "").toLowerCase();
  // Blank event name — treat as edu (manually approved)
  if (!lower) return true;
  // Everything is edu EXCEPT onboarding, midpoint meetup, summit, graduation
  return !NON_EDU_KEYWORDS.some(k => lower.includes(k));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Read all Luma Attendance rows
  const attRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Luma Attendance!A:L",
  });
  const attRows = attRes.data.values || [];
  const attHeaders = attRows[0] || [];
  const col = (name) => attHeaders.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));

  const statusCol = col("status");
  const reviewCol = col("review");
  const slugCol = col("slug");
  const nameCol = col("event name") !== -1 ? col("event name") : col("eventname");

  // Count approved edu sessions per mentee
  const eduCounts = {}; // slug -> count
  for (let i = 1; i < attRows.length; i++) {
    const row = attRows[i];
    const slug = (row[slugCol] || "").trim();
    if (!slug || TEST_SLUGS.has(slug)) continue;
    const review = (row[reviewCol] || "").toLowerCase();
    const status = (row[statusCol] || "").toLowerCase();
    const eventName = row[nameCol] || "";
    if (review === "approved" && (status === "checked_in" || status === "") && isEduEvent(eventName)) {
      eduCounts[slug] = (eduCounts[slug] || 0) + 1;
    }
  }

  // Read current milestones from Dashboard
  const dashRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A1:Z200",
  });
  const dashRows = dashRes.data.values || [];
  const dashHeaders = dashRows[0] || [];

  const edu1Col = dashHeaders.findIndex(h => (h||"").toLowerCase().includes("edu1") || (h||"").toLowerCase().includes("educational session 1"));
  const edu2Col = dashHeaders.findIndex(h => (h||"").toLowerCase().includes("edu2") || (h||"").toLowerCase().includes("educational session 2"));
  const edu3Col = dashHeaders.findIndex(h => (h||"").toLowerCase().includes("edu3") || (h||"").toLowerCase().includes("educational session 3"));
  const dashSlugCol = dashHeaders.findIndex(h => (h||"").toLowerCase() === "slug");

  const dashMilestones = {};
  for (let i = 1; i < dashRows.length; i++) {
    const row = dashRows[i];
    const slug = (row[dashSlugCol] || "").trim();
    if (!slug) continue;
    dashMilestones[slug] = {
      edu1: (row[edu1Col] || "").toUpperCase() === "TRUE",
      edu2: (row[edu2Col] || "").toUpperCase() === "TRUE",
      edu3: (row[edu3Col] || "").toUpperCase() === "TRUE",
    };
  }

  const log = [];
  const fixed = [];

  for (const slug of Object.keys(eduCounts)) {
    if (TEST_SLUGS.has(slug)) continue;
    const count = eduCounts[slug];
    const current = dashMilestones[slug] || { edu1: false, edu2: false, edu3: false };
    const currentCount = [current.edu1, current.edu2, current.edu3].filter(Boolean).length;

    if (count > currentCount) {
      const needed = count - currentCount;
      log.push({ slug, attendedCount: count, milestoneCount: currentCount, toFix: needed });
      for (let n = 0; n < needed; n++) {
        const milestone = await setNextEduMilestone(sheets, spreadsheetId, slug);
        if (milestone) fixed.push({ slug, milestone });
      }
    } else {
      log.push({ slug, attendedCount: count, milestoneCount: currentCount, toFix: 0, ok: true });
    }
  }

  return res.status(200).json({ ok: true, fixed, log });
}
