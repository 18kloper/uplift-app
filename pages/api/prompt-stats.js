// GET /api/prompt-stats
// Batch-reads all mentee slug tabs and counts founders who completed each named prompt section.

import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

// Named prompt sections — matched by weekNum + fieldKey pattern
export const PROMPT_SECTIONS = [
  {
    key: "goals",
    label: "Let's get specific about your goals",
    match: (wn, fk) => wn === 1 && (fk === "primary_refine" || fk === "secondary_refine"),
  },
  {
    key: "onboarding_block",
    label: "Prompts to think about during onboarding week",
    match: (wn, fk) => wn === 1 && fk && fk.startsWith("b"),
  },
  {
    key: "pre_meeting",
    label: "Before your first meeting",
    match: (wn, fk) => wn === 2 && ["prep_q1", "prep_q2", "prep_q3"].includes(fk),
  },
  {
    key: "week3",
    label: "Week 3 reflection",
    match: (wn, fk) => wn === 3 && ["role_model", "deploy_tactic"].includes(fk),
  },
  {
    key: "week3_win",
    label: "Week 3 — Shared Win",
    match: (wn, fk) => wn === 3 && fk === "week3_win",
  },
  {
    key: "midpoint",
    label: "Midpoint reflection",
    match: (wn, fk) => wn === 4 && ["midpoint_primary", "midpoint_secondary"].includes(fk),
  },
  {
    key: "week5",
    label: "Week 5",
    match: (wn) => wn === 5,
  },
  {
    key: "week6",
    label: "Week 6",
    match: (wn) => wn === 6,
  },
  {
    key: "week7",
    label: "Week 7",
    match: (wn) => wn === 7,
  },
  {
    key: "quote",
    label: "End-of-program quote",
    match: (wn, fk) => wn === 9 && fk === "quote",
  },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ sections: [] });

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Step 1: Find which slug tabs exist
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
    const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

    if (menteesWithTabs.length === 0) {
      return res.status(200).json({
        sections: PROMPT_SECTIONS.map(s => ({ key: s.key, label: s.label, count: 0 })),
        total: realMentees.length,
        generatedAt: new Date().toISOString(),
      });
    }

    // Build slug → mentee lookup for name/cohort
    const menteeBySlug = Object.fromEntries(
      realMentees.map(m => [m.slug, { name: `${m.first} ${m.last}`, cohort: m.cohort }])
    );

    // Step 2: Batch-read all tabs (cols A=weekNum, B=fieldKey, D=value)
    const CHUNK = 100;
    // sectionKey → Set of slugs
    const sectionCompletions = Object.fromEntries(PROMPT_SECTIONS.map(s => [s.key, new Set()]));

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
          const value    = rows[r][3] || "";
          if (isNaN(weekNum) || !String(value).trim()) continue;

          for (const section of PROMPT_SECTIONS) {
            if (section.match(weekNum, fieldKey)) {
              sectionCompletions[section.key].add(slug);
            }
          }
        }
      });
    }

    const sections = PROMPT_SECTIONS.map(s => {
      const slugs = [...sectionCompletions[s.key]];
      return {
        key:     s.key,
        label:   s.label,
        count:   slugs.length,
        mentees: slugs
          .map(slug => ({ slug, ...menteeBySlug[slug] }))
          .filter(m => m.name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    });

    return res.status(200).json({
      sections,
      total: realMentees.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("prompt-stats error:", err.message);
    return res.status(200).json({ sections: [] });
  }
}
