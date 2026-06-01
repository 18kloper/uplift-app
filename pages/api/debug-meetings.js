// GET /api/debug-meetings?slug=kennedy
// Shows raw Typeform field extraction for a slug — diagnostic only

const FORM_ID = "e0L62296";
const FIELDS  = {
  first:    "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:     "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:     "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  sixtyMin: "fcee13e9-5193-4f01-b3b4-aed4f421b933",
  notes:    "719c5b7a-8246-4c7a-be74-a1e71512ee46",
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { slug } = req.query;
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "No TYPEFORM_TOKEN" });

  const tfRes  = await fetch(`https://api.typeform.com/forms/${FORM_ID}/responses?page_size=50`,
    { headers: { Authorization: `Bearer ${token}` } });
  const httpStatus = tfRes.status;
  const data   = await tfRes.json();

  // If Typeform returned an error, surface it directly
  if (!tfRes.ok || data.code || data.error) {
    return res.status(200).json({ typeformError: true, httpStatus, response: data });
  }

  const get    = (answers, ref) => answers?.find(a => a.field?.ref === ref);
  const parts  = (slug || "").split("-");
  const target = parts[0].toLowerCase();

  // Return raw extraction for all responses so we can see what names are coming through
  const rows = (data.items || []).map(item => {
    const answers  = item.answers || [];
    const first    = get(answers, FIELDS.first)?.text?.trim() || "";
    const last     = get(answers, FIELDS.last)?.text?.trim()  || "";
    const sixtyMin = get(answers, FIELDS.sixtyMin)?.boolean   ?? null;
    const notes    = get(answers, FIELDS.notes)?.text         || "";
    const firstWord = first.toLowerCase().split(/\s+/)[0];
    const matches   = firstWord === target;
    return { token: item.token.slice(0,8), first, last, firstWord, matches, sixtyMin, hasNotes: !!notes.trim(), submitted: item.submitted_at?.slice(0,10) };
  });

  const matched = rows.filter(r => r.matches);
  return res.status(200).json({ slug, target, total: rows.length, matched: matched.length, matchedRows: matched, allRows: rows });
}
