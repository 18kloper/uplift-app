// POST /api/draft-intro
// Body: { founder1, founder2, sharedTheme, reason }
// Returns: { subject, body }

import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(200).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { founder1, founder2, sharedTheme, reason } = req.body || {};
  if (!founder1 || !founder2) return res.status(400).json({ error: "Missing founders" });

  const f1 = founder1.name.split(" ")[0];
  const f2 = founder2.name.split(" ")[0];

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `You are writing a warm founder intro email on behalf of the TechUnited:NJ Uplift Summer 2026 team.

You are introducing two founders from the Uplift accelerator to each other because you think they'd benefit from connecting.

FOUNDER 1: ${founder1.name} (Cohort ${founder1.cohort} — ${founder1.cohortName})
FOUNDER 2: ${founder2.name} (Cohort ${founder2.cohort} — ${founder2.cohortName})

SHARED THEME: ${sharedTheme}
WHY THEY SHOULD CONNECT: ${reason}

Write a warm, punchy intro email that:
- Opens with "Hi ${f1} and ${f2},"
- In 2-3 sentences, explains why we're connecting them — pull the specific insight from the reason above, make it feel personal and observed (not generic)
- Ends with something like "Feel free to reply-all and take it from here — we think you two will hit it off."
- Signs off: "— The Uplift Team at TechUnited:NJ"
- Total body under 120 words. Human and warm, not corporate.

Subject line: "${f1} ↔ ${f2} — [5-word hook capturing the shared challenge or theme]"

Return ONLY valid JSON:
{
  "subject": "the subject line",
  "body": "the full email body as plain text with line breaks"
}`,
      }],
    });

    const raw = message.content[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ error: "Could not parse AI response" });
    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      subject: parsed.subject || "",
      body: parsed.body || "",
    });
  } catch (err) {
    console.error("draft-intro error:", err.message);
    return res.status(200).json({ error: err.message });
  }
}
