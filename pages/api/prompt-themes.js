// GET /api/prompt-themes
// Reads all prompt responses, calls Claude to surface top themes + session ideas.

import Anthropic from "@anthropic-ai/sdk";
import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";
import { PROMPT_SECTIONS } from "./prompt-stats";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];
const CHUNK = 100;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ themes: [], sessionIdeas: [], error: "Sheets not configured" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ themes: [], sessionIdeas: [], error: "ANTHROPIC_API_KEY not configured" });

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Find which slug tabs exist
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    if (menteesWithTabs.length === 0) {
      return res.status(200).json({ themes: [], sessionIdeas: [], note: "No mentee data yet" });
    }

    // sectionKey → array of response strings
    const sectionResponses = Object.fromEntries(PROMPT_SECTIONS.map(s => [s.key, []]));

    // Batch-read all tabs
    for (let i = 0; i < menteesWithTabs.length; i += CHUNK) {
      const chunk = menteesWithTabs.slice(i, i + CHUNK);
      const batchRes = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: chunk.map(m => `${m.slug}!A:D`),
      });

      (batchRes.data.valueRanges || []).forEach((vr) => {
        const rows = vr.values || [];
        for (let r = 1; r < rows.length; r++) {
          const weekNum  = parseInt(rows[r][0]);
          const fieldKey = rows[r][1] || "";
          const value    = (rows[r][3] || "").trim();
          if (isNaN(weekNum) || !value) continue;

          for (const section of PROMPT_SECTIONS) {
            if (section.match(weekNum, fieldKey)) {
              sectionResponses[section.key].push(value);
            }
          }
        }
      });
    }

    // Build the text block to send Claude
    const blocks = [];
    for (const section of PROMPT_SECTIONS) {
      const responses = sectionResponses[section.key];
      if (responses.length === 0) continue;
      blocks.push(`\n## ${section.label} (${responses.length} responses)`);
      // Sample up to 60 per section, truncate long responses
      responses.slice(0, 60).forEach((r, i) => {
        blocks.push(`${i + 1}. ${r.slice(0, 400)}`);
      });
    }

    if (blocks.length === 0) {
      return res.status(200).json({ themes: [], sessionIdeas: [], note: "No responses saved yet" });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are analyzing prompt responses from early-stage startup founders in a 9-week mentorship accelerator program in New Jersey. The founders span industries including AI/ML, SaaS, consumer, and social impact.

Here are their responses, grouped by prompt section:
${blocks.join("\n")}

Based on these responses, identify:

1. The TOP 5 RECURRING THEMES surfacing across founders — what are they most focused on, struggling with, or writing about?
2. 5 SPECIFIC SESSION IDEAS that would directly address these themes — workshops, speakers, or peer formats that would be high-value for this cohort right now.

Return ONLY a JSON object with this exact shape (no markdown, no explanation):
{
  "themes": [
    { "title": "Short theme title", "description": "2 sentences on what you're seeing across responses." },
    ...5 items...
  ],
  "sessionIdeas": [
    { "title": "Session title", "description": "1-2 sentences on what this would cover and why it's timely for this cohort." },
    ...5 items...
  ]
}`,
      }],
    });

    const raw = message.content[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("prompt-themes: could not parse JSON from Claude:", raw.slice(0, 200));
      return res.status(200).json({ themes: [], sessionIdeas: [], error: "Could not parse AI response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      themes:       parsed.themes       || [],
      sessionIdeas: parsed.sessionIdeas || [],
      totalResponses: Object.values(sectionResponses).reduce((s, a) => s + a.length, 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("prompt-themes error:", err.message);
    return res.status(200).json({ themes: [], sessionIdeas: [], error: err.message });
  }
}
