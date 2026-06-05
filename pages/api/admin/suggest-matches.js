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
  const targetPairings = maxPairings || Math.min(mentors.length * 2, menteeslugs.length);
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
Produce the globally optimal set of exclusive one-to-one pairings — each mentee assigned to exactly one mentor, each mentor assigned at most 2 mentees.

CONFIRMED PROGRAM PARTICIPANTS (${menteeProfiles.length} total — each must appear AT MOST ONCE across all pairings):
${menteesText}

AVAILABLE MENTORS (${mentors.length} total — each gets 1-2 mentees):
${mentorsText}

Return ONLY a JSON array of match objects. Each object must have:
- "mentorName": exact mentor name as listed
- "menteeSlugs": array of 1-2 mentee slugs
- "menteeNames": array of corresponding mentee names
- "reason": 2-3 sentences explaining why this pairing works (specific, reference their industries/focus areas)
- "strength": "strong" | "good" | "fair"

Rules:
- CRITICAL: Each mentee slug must appear in exactly ONE pairing across the entire output — no mentee can be shared or duplicated across mentors
- Every mentor must appear exactly once in the output
- Each mentor gets 1-2 mentees; aim for 2 where strong fits exist
- Think of this as an assignment problem: find the globally strongest set of non-overlapping pairings
- Prioritize: industry alignment → focus area alignment → stage fit → NJ county proximity
- If a mentee has a pending mentor noted, only reassign them if a meaningfully stronger fit exists
- It is acceptable for a mentor to receive only 1 mentee if no second strong fit is available — do not force weak pairings
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
