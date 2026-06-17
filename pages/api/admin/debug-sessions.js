// GET /api/admin/debug-sessions?token=...
// Shows all raw Typeform submissions and whether each matched a mentee slug.

import { MENTEES } from "../../../lib/mentees";

const FORM_ID = "e0L62296";
const FIELDS = {
  first: "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:  "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:  "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  notes: "719c5b7a-8246-4c7a-be74-a1e71512ee46",
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(500).json({ error: "TYPEFORM_TOKEN not set" });

  const tfRes = await fetch(
    `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await tfRes.json();

  // Build a lookup: first name → matching slugs
  const slugsByFirst = {};
  for (const m of MENTEES) {
    const fn = m.slug.split("-")[0];
    if (!slugsByFirst[fn]) slugsByFirst[fn] = [];
    slugsByFirst[fn].push(m.slug);
  }

  const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);

  const results = (data.items || []).map(item => {
    const answers = item.answers || [];
    const rawFirst = get(answers, FIELDS.first)?.text?.trim() || "";
    const rawLast  = get(answers, FIELDS.last)?.text?.trim()  || "";
    const date     = get(answers, FIELDS.date)?.text || get(answers, FIELDS.date)?.date || "";
    const hasNotes = !!(get(answers, FIELDS.notes)?.text?.trim());

    const first = rawFirst.toLowerCase();
    const last  = rawLast.toLowerCase();
    const firstWord = first.split(/\s+/)[0];

    // Try to find a matching slug
    const candidates = slugsByFirst[firstWord] || [];
    const matched = candidates.find(slug =>
      !slug.includes("-") || slug.includes(last.split(" ")[0].replace(/[^a-z]/g, ""))
    );

    return {
      submitted: item.submitted_at?.slice(0, 10),
      name: `${rawFirst} ${rawLast}`,
      date,
      hasNotes,
      matchedSlug: matched || null,
      unmatched: !matched,
    };
  });

  results.sort((a, b) => (a.submitted > b.submitted ? -1 : 1));

  const unmatched = results.filter(r => r.unmatched);
  const matched   = results.filter(r => !r.unmatched);

  return res.status(200).json({
    total: results.length,
    matched: matched.length,
    unmatched: unmatched.length,
    unmatchedSubmissions: unmatched,
    allSubmissions: results,
  });
}
