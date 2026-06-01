// GET /api/portal-activity
// Returns portal visit data: who visited in the last 5 days vs who hasn't.

import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

const TAB = "PortalActivity";
const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];
const DAYS = 5;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));

  if (!hasSheets) {
    return res.status(200).json({
      active: [], inactive: [], neverVisited: [],
      counts: { active: 0, inactive: realMentees.length, neverVisited: realMentees.length, total: realMentees.length },
    });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    let rows = [];
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A:C` });
      rows = r.data.values || [];
    } catch (_) {
      // Tab doesn't exist yet
    }

    // Build map: slug → lastSeen string
    const activityMap = {};
    for (let i = 1; i < rows.length; i++) {
      const [slug, , lastSeen] = rows[i];
      if (slug && lastSeen) activityMap[slug] = lastSeen;
    }

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - DAYS);

    const active      = [];
    const inactive    = [];
    const neverVisited = [];

    for (const m of realMentees) {
      const lastSeen = activityMap[m.slug] || null;
      const entry = {
        slug:     m.slug,
        name:     `${m.first} ${m.last}`,
        cohort:   m.cohort,
        lastSeen,
      };

      if (!lastSeen) {
        neverVisited.push(entry);
      } else {
        const d = new Date(lastSeen);
        if (!isNaN(d.getTime()) && d >= threshold) {
          active.push(entry);
        } else {
          inactive.push(entry);
        }
      }
    }

    // Sort: active = most recent first; inactive = least recent first (oldest first for outreach priority)
    active.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    inactive.sort((a, b) => new Date(a.lastSeen) - new Date(b.lastSeen));

    return res.status(200).json({
      active,
      inactive,
      neverVisited,
      counts: {
        active:       active.length,
        inactive:     inactive.length,
        neverVisited: neverVisited.length,
        total:        realMentees.length,
      },
      days: DAYS,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("portal-activity error:", err.message);
    return res.status(200).json({
      active: [], inactive: [], neverVisited: [],
      counts: { active: 0, inactive: 0, neverVisited: 0, total: realMentees.length },
    });
  }
}
