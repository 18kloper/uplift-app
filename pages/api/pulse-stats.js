// GET /api/pulse-stats
// Reads all mentee tabs and returns pulse check-in responses
// { pulses: [{ slug, name, cohort, responses: { weekNum: value } }] }

import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];
const CHUNK = 100;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ pulses: [] });

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Find which slug tabs exist
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    const pulseData = {};
    for (const m of menteesWithTabs) {
      pulseData[m.slug] = {
        name: `${m.first} ${m.last}`,
        cohort: m.cohort,
        responses: {},
      };
    }

    // Batch-read all tabs (cols A:D = week, fieldKey, question, value)
    for (let i = 0; i < menteesWithTabs.length; i += CHUNK) {
      const chunk = menteesWithTabs.slice(i, i + CHUNK);
      const batchRes = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: chunk.map(m => `${m.slug}!A:D`),
      });

      (batchRes.data.valueRanges || []).forEach((vr, idx) => {
        const slug = chunk[idx].slug;
        const rows = vr.values || [];
        for (let r = 1; r < rows.length; r++) {
          const weekNum = parseInt(rows[r][0]);
          const fieldKey = rows[r][1] || "";
          const value = (rows[r][3] || "").trim();
          if (fieldKey === "pulse" && !isNaN(weekNum) && value) {
            pulseData[slug].responses[weekNum] = parseInt(value, 10);
          }
        }
      });
    }

    return res.status(200).json({
      pulses: Object.entries(pulseData).map(([slug, d]) => ({ slug, ...d })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("pulse-stats error:", err.message);
    return res.status(200).json({ pulses: [], error: err.message });
  }
}
