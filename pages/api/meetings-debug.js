// Temporary debug endpoint — remove after fixing
// GET /api/meetings-debug?slug=kennedy

const FORM_ID = "e0L62296";
const FIELDS = {
  first:     "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:      "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:      "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  sixtyMin:  "fcee13e9-5193-4f01-b3b4-aed4f421b933",
  notes:     "719c5b7a-8246-4c7a-be74-a1e71512ee46",
  takeaways: "0d816bc2-6793-4c72-b28d-5b34f48ce5b7",
};

export default async function handler(req, res) {
  const { slug } = req.query;
  const token = process.env.TYPEFORM_TOKEN;

  if (!token) {
    return res.status(200).json({ error: "TYPEFORM_TOKEN is NOT set" });
  }

  try {
    const response = await fetch(
      `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    if (!data.items) {
      return res.status(200).json({ error: "Typeform API error", raw: data });
    }

    const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);
    const parts = (slug || "").split("-");
    const firstName = parts[0].toLowerCase();

    const results = (data.items || []).map(item => {
      const answers = item.answers || [];
      const first   = get(answers, FIELDS.first)?.text?.trim().toLowerCase() || "";
      const last    = get(answers, FIELDS.last)?.text?.trim().toLowerCase()  || "";
      const firstWord = first.split(/\s+/)[0];

      const step1_exact = first === firstName;
      const step1_word  = firstWord === firstName;
      const hasLastInSlug = slug.includes("-")
        ? slug.includes(last.split(" ")[0].replace(/[^a-z]/g, ""))
        : true;

      return {
        raw_first: get(answers, FIELDS.first)?.text || "(empty)",
        raw_last:  get(answers, FIELDS.last)?.text  || "(empty)",
        first_lowered: first,
        firstName_from_slug: firstName,
        step1_exact_match: step1_exact,
        step1_firstword_match: step1_word,
        step2_last_in_slug: hasLastInSlug,
        would_match_current: step1_exact && hasLastInSlug,
        would_match_fixed:   step1_word  && hasLastInSlug,
        submitted_at: item.submitted_at,
      };
    });

    return res.status(200).json({ slug, firstName, results });
  } catch (err) {
    return res.status(200).json({ error: err.message, stack: err.stack });
  }
}
