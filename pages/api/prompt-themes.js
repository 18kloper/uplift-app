// GET /api/prompt-themes
// Reads all prompt responses, calls Claude to surface:

export const config = { api: { responseLimit: false }, maxDuration: 60 };
//   - Top 5 overall themes
//   - Top 5 session ideas
//   - Top 3 themes per prompt section (week-by-week)

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

  if (!hasSheets) return res.status(200).json({ themes: [], sessionIdeas: [], weeklyThemes: {}, error: "Sheets not configured" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ themes: [], sessionIdeas: [], weeklyThemes: {}, error: "ANTHROPIC_API_KEY not configured" });

  const cohortParam = req.query.cohort ? parseInt(req.query.cohort) : null;
  const realMentees = MENTEES.filter(m =>
    !TEST_SLUGS.includes(m.slug) && (!cohortParam || m.cohort === cohortParam)
  );
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Find which slug tabs exist
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    if (menteesWithTabs.length === 0) {
      return res.status(200).json({ themes: [], sessionIdeas: [], weeklyThemes: {}, note: "No mentee data yet" });
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

    // Build text blocks — one per section, labeled with the section key
    const sectionsWithData = PROMPT_SECTIONS.filter(s => sectionResponses[s.key].length > 0);

    if (sectionsWithData.length === 0) {
      return res.status(200).json({ themes: [], sessionIdeas: [], weeklyThemes: {}, note: "No responses saved yet" });
    }

    const blocks = sectionsWithData.map(section => {
      const responses = sectionResponses[section.key];
      const sample = responses.slice(0, 50).map((r, i) => `  ${i + 1}. ${r.slice(0, 350)}`).join("\n");
      return `### SECTION KEY: ${section.key}\n### SECTION LABEL: ${section.label} (${responses.length} responses)\n${sample}`;
    }).join("\n\n");

    const sectionKeyList = sectionsWithData.map(s => `"${s.key}"`).join(", ");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let message;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 3000,
          messages: [{
            role: "user",
            content: `You are analyzing prompt responses from early-stage startup founders in a 9-week mentorship accelerator in New Jersey. Founders span AI/ML, SaaS, consumer, and social impact.

Here are their responses organized by prompt section:

${blocks}

Please analyze and return a JSON object with THREE things:

1. "themes" — Top 5 recurring themes across ALL sections combined. What are founders most focused on, struggling with, or gravitating toward overall?

2. "sessionIdeas" — 5 specific session ideas that would directly address the overall themes. Be concrete: a workshop format, speaker type, or peer activity.

3. "weeklyThemes" — For each section that has responses, the top 3 themes specific to THAT section's responses. Only include sections with enough data to be meaningful.

The section keys to include in weeklyThemes are: ${sectionKeyList}

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "themes": [
    { "title": "Short theme title", "description": "2 sentences on what you're seeing." }
  ],
  "sessionIdeas": [
    { "title": "Session title", "description": "1-2 sentences on what this covers and why it's timely." }
  ],
  "weeklyThemes": {
    "section_key": [
      { "title": "Theme title", "description": "1-2 sentences." }
    ]
  }
}`,
          }],
        });
        break;
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
      console.error("prompt-themes: could not parse JSON:", raw.slice(0, 300));
      return res.status(200).json({ themes: [], sessionIdeas: [], weeklyThemes: {}, error: "Could not parse AI response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const totalResponses = Object.values(sectionResponses).reduce((s, a) => s + a.length, 0);

    // Attach section labels to weeklyThemes for easy rendering
    const weeklyThemesWithLabels = {};
    for (const section of sectionsWithData) {
      const themes = parsed.weeklyThemes?.[section.key];
      if (themes && themes.length > 0) {
        weeklyThemesWithLabels[section.key] = {
          label: section.label,
          themes: themes.slice(0, 3),
          count: sectionResponses[section.key].length,
        };
      }
    }

    return res.status(200).json({
      themes:        parsed.themes        || [],
      sessionIdeas:  parsed.sessionIdeas  || [],
      weeklyThemes:  weeklyThemesWithLabels,
      totalResponses,
      generatedAt:   new Date().toISOString(),
    });
  } catch (err) {
    console.error("prompt-themes error:", err.message);
    return res.status(200).json({ themes: [], sessionIdeas: [], weeklyThemes: {}, error: err.message });
  }
}
