// POST /api/newsletter
// Body: { weekNum, promptSections, themes, sessionIdeas, portalStats }
// Returns: { subject, body, generatedAt }

import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { weekNum, promptSections, themes, sessionIdeas, portalStats } = req.body || {};

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build context for Claude
    const themesText = (themes || []).map((t, i) => `${i+1}. ${t.title}: ${t.description}`).join("\n");
    const sessionIdeasText = (sessionIdeas || []).map((s, i) => `${i+1}. ${s.title}: ${s.description}`).join("\n");
    const completionText = (promptSections || []).map(s => `- ${s.label}: ${s.count} founders (${s.pct}%)`).join("\n");
    const portalText = portalStats
      ? `${portalStats.active} active last 5 days, ${portalStats.inactive} not visited in 5 days, ${portalStats.neverVisited} never visited`
      : "Portal activity data not available";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are writing the weekly Uplift Summer 2026 newsletter. Uplift is a 9-week startup mentorship accelerator in New Jersey run by TechUnited:NJ. Write a warm, energetic, founder-focused newsletter for Week ${weekNum || "?"}.

Here is the data for this week:

PORTAL ACTIVITY:
${portalText}

PROMPT COMPLETION RATES:
${completionText || "No data yet"}

EMERGING THEMES FROM FOUNDER RESPONSES:
${themesText || "No themes generated yet"}

SESSION IDEAS SURFACING:
${sessionIdeasText || "None yet"}

Write a newsletter with:
1. A warm subject line (format: "Uplift Summer 2026 — Week ${weekNum || "?"} Update 🚀")
2. A brief 2-sentence opening that celebrates the cohort's energy
3. "This Week at a Glance" section: bullet list of key stats (portal visits, prompt completions)
4. "What's on Founders' Minds" section: present the top 3-4 themes in plain, human language (not just a list — write it like you're telling a story about what you're observing)
5. "Coming Up" section: 1-2 lines about what's ahead
6. A warm closing sign-off from "The TechUnited:NJ Team"

Keep it under 400 words. Warm but professional. No markdown headers — use plain text with light formatting. Write it ready to copy and send as an email.

Return ONLY a JSON object:
{
  "subject": "the subject line",
  "body": "the full newsletter body as plain text with line breaks"
}`,
      }],
    });

    const raw = message.content[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ error: "Could not parse response" });
    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      subject: parsed.subject || "",
      body: parsed.body || "",
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("newsletter error:", err.message);
    return res.status(200).json({ error: err.message });
  }
}
