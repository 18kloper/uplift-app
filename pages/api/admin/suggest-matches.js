// POST /api/admin/suggest-matches
// Body: { mentees: [...], mentors: [...] }
// Uses Claude to suggest the best mentor-mentee pairings.
// Auth: ?token=<ADMIN_SECRET>

import Anthropic from "@anthropic-ai/sdk";
import { MENTEES } from "../../../lib/mentees";

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Build rich mentee profiles from MENTEES array
  const { menteeslugs = [], mentors = [], menteePendingMentors = {}, maxPairings } = req.body || {};

  if (!menteeslugs.length || !mentors.length) {
    return res.status(400).json({ error: "Need at least one mentee and one mentor" });
  }
  const targetPairings = maxPairings || mentors.length * 2;
  const menteeProfiles = menteeslugs
    .map(slug => MENTEES.find(m => m.slug === slug))
    .filter(m => m && !TEST_SLUGS.has(m.slug))
    .map(m => ({
      slug: m.slug,
      name: `${m.first} ${m.last}`,
      company: m.company || "",
      industry: m.industry || "",
      stage: m.stage || "",
      county: m.county || "",
      primaryFocus: m.primaryFocus || "",
      secondaryFoci: (m.secondaryFoci || []).join(", "),
      pendingMentor: menteePendingMentors[m.slug] || null,
    }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "No ANTHROPIC_API_KEY" });

  const client = new Anthropic({ apiKey });

  const menteesText = menteeProfiles.map((m, i) =>
    `MENTEE ${i + 1}: ${m.name} (${m.slug})
  Company: ${m.company} | Industry: ${m.industry} | Stage: ${m.stage}
  Primary focus: ${m.primaryFocus}
  Secondary: ${m.secondaryFoci}${m.pendingMentor ? `\n  Note: currently assigned to ${m.pendingMentor} (unconfirmed — suggest alternative if stronger fit exists)` : ""}`
  ).join("\n\n");

  const mentorsText = mentors.map((m, i) =>
    `MENTOR ${i + 1}: ${m.name}
  Company: ${m.company || ""} | Title: ${m.title || ""}
  Industry: ${m.industry || ""}
  Focus areas: ${m.focus || ""}
  Bio: ${(m.bio || "").slice(0, 300)}`
  ).join("\n\n");

  const prompt = `You are helping match startup founders with mentors in a NJ-based accelerator program called Uplift.
Each mentor should be matched with exactly 2 mentees where possible (1 is acceptable if no second strong fit exists).
Target: ${targetPairings} total pairings across ${mentors.length} mentors.

CONFIRMED PROGRAM PARTICIPANTS (choose the best 2 per mentor from this pool):
${menteesText}

AVAILABLE MENTORS (each needs 1-2 mentees assigned):
${mentorsText}

Return ONLY a JSON array of match objects. Each object must have:
- "mentorName": exact mentor name as listed
- "menteeSlugs": array of 1-2 mentee slugs
- "menteeNames": array of corresponding mentee names
- "reason": 2-3 sentences explaining why this pairing works (specific, reference their industries/focus areas)
- "strength": "strong" | "good" | "fair"

Rules:
- Every mentor must appear exactly once
- Each mentor gets 1-2 mentees; aim for 2 per mentor to reach ${targetPairings} total
- A mentee can appear in multiple mentor suggestions (they may benefit from multiple mentors, or you're surfacing alternatives)
- Prioritize: industry alignment → focus area alignment → stage fit → NJ county proximity
- If a mentee already has a pending mentor noted, you may still suggest them to a new mentor if the fit is meaningfully stronger
- Do not invent details not listed above

Return only the JSON array, no other text.`;

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0]?.text?.trim() || "[]";
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const matches = JSON.parse(cleaned);

    return res.status(200).json({ matches });
  } catch (err) {
    console.error("suggest-matches error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
