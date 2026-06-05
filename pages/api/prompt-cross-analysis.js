// GET /api/prompt-cross-analysis
// Reads all prompt responses grouped by cohort, then asks Claude to surface
// key differences, similarities, and standout patterns across cohorts.

export const config = { api: { responseLimit: false }, maxDuration: 60 };

import Anthropic from "@anthropic-ai/sdk";
import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";
import { PROMPT_SECTIONS } from "./prompt-stats";

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);
const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };
const CHUNK = 100;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ error: "Sheets not configured" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ error: "ANTHROPIC_API_KEY not configured" });

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.has(m.slug));
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    if (menteesWithTabs.length === 0) {
      return res.status(200).json({ error: "No mentee data yet" });
    }

    // cohort# → sectionKey → [responses]
    const cohortData = {};
    for (let c = 1; c <= 5; c++) {
      cohortData[c] = Object.fromEntries(PROMPT_SECTIONS.map(s => [s.key, []]));
    }

    // Batch-read all tabs
    for (let i = 0; i < menteesWithTabs.length; i += CHUNK) {
      const chunk = menteesWithTabs.slice(i, i + CHUNK);
      const batchRes = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: chunk.map(m => `${m.slug}!A:D`),
      });

      (batchRes.data.valueRanges || []).forEach((vr, idx) => {
        const mentee = chunk[idx];
        const cohort = mentee.cohort;
        if (!cohortData[cohort]) return;

        const rows = vr.values || [];
        for (let r = 1; r < rows.length; r++) {
          const weekNum  = parseInt(rows[r][0]);
          const fieldKey = rows[r][1] || "";
          const value    = (rows[r][3] || "").trim();
          if (isNaN(weekNum) || !value) continue;

          for (const section of PROMPT_SECTIONS) {
            if (section.match(weekNum, fieldKey)) {
              cohortData[cohort][section.key].push(value);
            }
          }
        }
      });
    }

    // Build a summary block per cohort
    const cohortBlocks = [];
    const responseCounts = {};
    for (let c = 1; c <= 5; c++) {
      const sections = PROMPT_SECTIONS.filter(s => cohortData[c][s.key].length > 0);
      if (sections.length === 0) continue;
      const total = sections.reduce((sum, s) => sum + cohortData[c][s.key].length, 0);
      responseCounts[c] = total;

      const sectionSummaries = sections.map(s => {
        const responses = cohortData[c][s.key];
        const sample = responses.slice(0, 20).map((r, i) => `  ${i + 1}. ${r.slice(0, 250)}`).join("\n");
        return `  [${s.label}] (${responses.length} responses)\n${sample}`;
      }).join("\n\n");

      cohortBlocks.push(`=== COHORT ${c}: ${COHORT_NAMES[c]} (${total} total responses) ===\n${sectionSummaries}`);
    }

    if (cohortBlocks.length < 2) {
      return res.status(200).json({ error: "Need at least 2 cohorts with responses to cross-analyze" });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Retry up to 3 times on overload (529) errors
    let message;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
      messages: [{
        role: "user",
        content: `You are analyzing prompt responses from early-stage startup founders across 5 cohorts in a 9-week NJ-based mentorship accelerator called Uplift. Each cohort is a group of ~15 founders.

Here are the responses grouped by cohort:

${cohortBlocks.join("\n\n")}

Please perform a cross-cohort analysis and return a JSON object with:

1. "differences" — 4-5 notable differences between cohorts. What is one cohort focused on or struggling with that others are not? Be specific about which cohorts.

2. "similarities" — 3-4 strong themes that appear consistently across most or all cohorts.

3. "standouts" — 1-2 cohorts that have a distinctly different profile or voice from the others. What makes them unique?

4. "recommendations" — 3 program-level recommendations based on the cross-cohort patterns. What should the program do differently for specific cohorts vs. all cohorts?

Return ONLY valid JSON, no markdown:
{
  "differences": [
    { "title": "Short title", "description": "2-3 sentences. Name the specific cohorts.", "cohorts": ["Edison", "Hopper"] }
  ],
  "similarities": [
    { "title": "Short title", "description": "2 sentences on what's shared." }
  ],
  "standouts": [
    { "cohort": "Cohort name", "title": "What makes them unique", "description": "2-3 sentences." }
  ],
  "recommendations": [
    { "title": "Recommendation title", "description": "2 sentences. Be specific.", "scope": "all" | "cohort-specific" }
  ]
}`,
        }],
        });
        break; // success — exit retry loop
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        const isOverloaded = err.status === 529 || err.statusCode === 529 || msg.includes("overload") || msg.includes("529");
        if (isOverloaded && attempt < 5) {
          const delay = attempt * 3000; // 3s, 6s, 9s, 12s
          console.warn(`Claude overloaded (attempt ${attempt}), retrying in ${delay}ms…`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    const raw = message.content[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ error: "Could not parse AI response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json({
      ...parsed,
      responseCounts,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("prompt-cross-analysis error:", err.message);
    return res.status(200).json({ error: err.message });
  }
}
