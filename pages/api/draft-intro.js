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
        content: `Write a warm, personal intro email connecting two founders in the Uplift Summer 2026 mentorship program at TechUnited:NJ.

FOUNDER 1: ${founder1.name} (Cohort ${founder1.cohort} - ${founder1.cohortName})
FOUNDER 2: ${founder2.name} (Cohort ${founder2.cohort} - ${founder2.cohortName})

SHARED THEME: ${sharedTheme}
WHY THEY SHOULD CONNECT: ${reason}

Follow this structure exactly:

1. Open with: "Hey ${f1} and ${f2},"

2. One sentence: From the founder insights you've both been sharing, I noticed you two might have a few things in common - thought I'd intro you.

3. One sentence mentioning they're both mentees in the Uplift mentorship program and briefly noting what cohorts they're in.

4. 2-3 sentences: "Here are some of the patterns I noticed:" then describe the specific shared themes and why this pairing makes sense. Draw directly from the reason provided. Be specific, not generic.

5. Closing line: "Feel free to reply all and take it from here - I think you two might be able to exchange some real insights."

6. Sign off:
"Best,
Kennedy"

Keep the whole email under 130 words. Warm, human, direct. No corporate language.

Subject line format (use a regular hyphen, not em dash):
"You two should meet - ${f1} ↔ ${f2}"

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
