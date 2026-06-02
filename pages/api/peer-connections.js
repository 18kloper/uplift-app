// GET /api/peer-connections
// Reads all mentee responses, asks Claude to surface pairs of founders
// who are working on similar things and should connect.

import Anthropic from "@anthropic-ai/sdk";
import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";
import { PROMPT_SECTIONS } from "./prompt-stats";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];
const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };
const CHUNK = 100;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ connections: [], error: "Sheets not configured" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ connections: [], error: "ANTHROPIC_API_KEY not configured" });

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Find which slug tabs exist
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    if (menteesWithTabs.length < 2) {
      return res.status(200).json({ connections: [], note: "Not enough mentee data yet" });
    }

    // Build a map: slug → { name, cohort, responses: string[] }
    const founderData = {};
    for (const m of menteesWithTabs) {
      founderData[m.slug] = {
        name: `${m.first} ${m.last}`,
        cohort: m.cohort,
        cohortName: COHORT_NAMES[m.cohort] || m.cohort,
        company: m.company || "",
        stage: m.stage || "",
        industry: m.industry || "",
        county: m.county || "",
        responses: [],
      };
    }

    // Batch-read all tabs
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
          const weekNum  = parseInt(rows[r][0]);
          const fieldKey = rows[r][1] || "";
          const value    = (rows[r][3] || "").trim();
          if (isNaN(weekNum) || !value) continue;

          // Find which section this belongs to for context
          for (const section of PROMPT_SECTIONS) {
            if (section.match(weekNum, fieldKey)) {
              founderData[slug].responses.push(`[${section.label}] ${value.slice(0, 300)}`);
              break;
            }
          }
        }
      });
    }

    // Only include founders who have at least 1 response
    const activeFounders = Object.entries(founderData)
      .filter(([, d]) => d.responses.length > 0)
      .map(([slug, d]) => ({ slug, ...d }));

    if (activeFounders.length < 2) {
      return res.status(200).json({ connections: [], note: "Not enough responses yet to find connections" });
    }

    // Build the founder profile block for Claude
    const profileBlock = activeFounders.map(f => {
      const responseLines = f.responses.slice(0, 8).join("\n  - ");
      return `FOUNDER: ${f.name} | slug:${f.slug} | Cohort ${f.cohort} (${f.cohortName})\n  - ${responseLines}`;
    }).join("\n\n");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2500,
      messages: [{
        role: "user",
        content: `You are a program coordinator for a startup accelerator in New Jersey. Below are prompt responses from ${activeFounders.length} founders. Your job is to identify the most meaningful peer connections — pairs of founders who are working on similar challenges, industries, or goals and would genuinely benefit from meeting each other.

Here are the founder profiles:

${profileBlock}

Identify the top 8–12 most meaningful founder pairings. Focus on:
- Similar industry or customer type
- Similar stage challenges (fundraising, hiring, GTM, product-market fit, etc.)
- Complementary skills that could create value if they collaborated
- Shared struggles they could support each other through

For each pairing, use the exact slug values provided.

Return ONLY valid JSON, no markdown:
{
  "connections": [
    {
      "slug1": "exact-slug-from-above",
      "slug2": "exact-slug-from-above",
      "sharedTheme": "Short shared focus area (5-8 words)",
      "reason": "2-3 sentences on why these two should connect and what they'd get from it."
    }
  ]
}`,
      }],
    });

    const raw = message.content[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("peer-connections: could not parse JSON:", raw.slice(0, 300));
      return res.status(200).json({ connections: [], error: "Could not parse AI response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Enrich connections with full founder info
    const slugIndex = Object.fromEntries(activeFounders.map(f => [f.slug, f]));
    const enriched = (parsed.connections || [])
      .filter(c => slugIndex[c.slug1] && slugIndex[c.slug2])
      .map(c => ({
        sharedTheme: c.sharedTheme,
        reason: c.reason,
        founders: [c.slug1, c.slug2].map(slug => ({
          slug,
          name: slugIndex[slug].name,
          cohort: slugIndex[slug].cohort,
          cohortName: slugIndex[slug].cohortName,
          company: slugIndex[slug].company,
          stage: slugIndex[slug].stage,
          industry: slugIndex[slug].industry,
          county: slugIndex[slug].county,
        })),
      }));

    return res.status(200).json({
      connections: enriched,
      totalFoundersAnalyzed: activeFounders.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("peer-connections error:", err.message);
    return res.status(200).json({ connections: [], error: err.message });
  }
}
