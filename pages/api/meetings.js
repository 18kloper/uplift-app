// GET /api/meetings?slug=pearl-gabel
// Fetches this mentee's submitted mentor meeting reports from Typeform.

const FORM_ID = "e0L62296";
const FIELDS  = {
  first:      "e9144ae8-bcac-4162-876c-dc9f3918d351",
  last:       "6ae6e72a-24da-4da7-8c2c-da49d0f7df6d",
  date:       "c466ab1d-ee8b-4169-810c-00a6ad9f9570",
  sixtyMin:   "fcee13e9-5193-4f01-b3b4-aed4f421b933",
  notes:      "719c5b7a-8246-4c7a-be74-a1e71512ee46",
  takeaways:  "0d816bc2-6793-4c72-b28d-5b34f48ce5b7",
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ meetings: [] });

  try {
    const response = await fetch(
      `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    // Build name → slug map from the slug itself
    // slug is like "pearl-gabel" → first="pearl" last="gabel"
    const parts     = slug.split("-");
    const firstName = parts[0].toLowerCase();
    // last name may be multi-word (e.g. "machado-jackler") — match on first name + slug contains last
    const get = (answers, ref) => answers?.find(a => a.field?.ref === ref);

    const meetings = [];
    for (const item of data.items || []) {
      const answers  = item.answers || [];
      const first    = get(answers, FIELDS.first)?.text?.trim().toLowerCase()  || "";
      const last     = get(answers, FIELDS.last)?.text?.trim().toLowerCase()   || "";
      const fullSlug = `${first}-${last}`.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      // Match first name: exact OR first word only (handles "Pradeep Kumar" → "pradeep")
      const firstWord = first.split(/\s+/)[0];
      if (firstWord !== firstName) continue;

      // Verify last name appears in slug (skip for single-word slugs like "kennedy")
      const hasLastInSlug = slug.includes("-")
        ? slug.includes(last.split(" ")[0].replace(/[^a-z]/g, ""))
        : true;
      if (!hasLastInSlug) continue;

      meetings.push({
        id:         item.token,
        date:       get(answers, FIELDS.date)?.text      || "",
        sixtyMin:   get(answers, FIELDS.sixtyMin)?.boolean ?? null,
        notes:      get(answers, FIELDS.notes)?.text     || "",
        takeaways:  get(answers, FIELDS.takeaways)?.text || "",
        submittedAt: item.submitted_at,
      });
    }

    // Sort newest first
    meetings.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return res.status(200).json({ meetings });
  } catch (err) {
    console.error("Meetings fetch failed:", err.message);
    return res.status(200).json({ meetings: [] });
  }
}
