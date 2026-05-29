// Temporary debug endpoint — remove after fixing
// GET /api/meetings-debug?slug=kennedy

const FORM_ID = "e0L62296";
const FIELDS = {
  first: "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:  "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
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

    const names = (data.items || []).map(item => {
      const answers = item.answers || [];
      const first = get(answers, FIELDS.first)?.text?.trim() || "(no first)";
      const last  = get(answers, FIELDS.last)?.text?.trim()  || "(no last)";
      return { first, last, submitted_at: item.submitted_at };
    });

    const parts     = (slug || "").split("-");
    const firstName = parts[0].toLowerCase();

    return res.status(200).json({
      token_present: true,
      total_responses: data.total_items,
      slug,
      matching_first_name: firstName,
      last_20_submissions: names,
    });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
