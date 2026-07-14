// GET /api/admin/audit-unmatched-sessions?token=...
// Read-only reconciliation: pulls EVERY mentor-meeting Typeform response and
// reports which ones do NOT match any mentee in the roster (by the same
// matcher used by /api/meetings). Also flags responses that match MORE THAN
// ONE mentee, which would double-credit. Surfaces orphaned submissions that
// are invisible to the portal because their name doesn't resolve to a slug.

import { MENTEES } from "../../../lib/mentees";
import { fetchTypeformResponses, matchesMentee } from "../meetings";

const FIELDS = {
  first:     "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:      "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:      "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  sixtyMin:  "fcee13e9-5193-4f01-b3b4-aed4f421b933",
};

export default async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const data = await fetchTypeformResponses();
  if (!data) return res.status(500).json({ error: "No Typeform data (missing TYPEFORM_TOKEN?)" });

  const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);
  const slugs = MENTEES.map(m => m.slug);

  const items = data.items || [];
  const unmatched = [];
  const multiMatched = [];
  const matchedCounts = {};
  const allSubs = [];

  for (const item of items) {
    const answers = item.answers || [];
    const first = get(answers, FIELDS.first)?.text?.trim() || "";
    const last  = get(answers, FIELDS.last)?.text?.trim()  || "";
    const hits = slugs.filter(s => matchesMentee(first, last, s));
    const rawMin = get(answers, FIELDS.sixtyMin);
    const rec = {
      first, last,
      name: `${first} ${last}`.trim(),
      date: get(answers, FIELDS.date)?.text || get(answers, FIELDS.date)?.date || "",
      minutes: rawMin?.number ?? (rawMin?.boolean === true ? 60 : null),
      submittedAt: item.submitted_at,
      token: item.token,
    };
    allSubs.push({ ...rec, matchedSlug: hits[0] || null, matchCount: hits.length });
    if (hits.length === 0) {
      unmatched.push(rec);
    } else if (hits.length > 1) {
      multiMatched.push({ ...rec, matchedSlugs: hits });
      hits.forEach(s => { matchedCounts[s] = (matchedCounts[s] || 0) + 1; });
    } else {
      matchedCounts[hits[0]] = (matchedCounts[hits[0]] || 0) + 1;
    }
  }

  const recent = [...allSubs]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 10);

  const matchedTotal = items.length - unmatched.length;
  return res.status(200).json({
    ok: true,
    totalResponses: data.total_items ?? items.length,
    fetchedItems: items.length,
    matchedTotal,
    matchedMentees: Object.keys(matchedCounts).length,
    unmatchedCount: unmatched.length,
    multiMatchedCount: multiMatched.length,
    multiMatched,
    unmatched,
    recent,
  });
}
