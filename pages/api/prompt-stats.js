// GET /api/prompt-stats
// Reads every mentee's individual slug tab and counts how many founders
// have saved at least one non-empty response for each week number.

import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ weeks: {} });

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Step 1: Find which slug tabs actually exist (avoid batchGet errors on missing tabs)
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    if (menteesWithTabs.length === 0) {
      return res.status(200).json({ weeks: {}, total: realMentees.length, generatedAt: new Date().toISOString() });
    }

    // Step 2: Batch-read all existing tabs (cols A=weekNum, D=value)
    const CHUNK = 100;
    const weekCompletions = {}; // weekNum (int) → Set of slugs

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
          const weekNum = rows[r][0];
          const value   = rows[r][3]; // col D
          if (weekNum && value && String(value).trim()) {
            const wn = parseInt(weekNum);
            if (!isNaN(wn) && wn > 0) {
              if (!weekCompletions[wn]) weekCompletions[wn] = new Set();
              weekCompletions[wn].add(slug);
            }
          }
        }
      });
    }

    // Convert Sets → counts
    const weeks = {};
    for (const [wn, slugSet] of Object.entries(weekCompletions)) {
      weeks[parseInt(wn)] = slugSet.size;
    }

    return res.status(200).json({
      weeks,
      total: realMentees.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("prompt-stats error:", err.message);
    return res.status(200).json({ weeks: {} });
  }
}
