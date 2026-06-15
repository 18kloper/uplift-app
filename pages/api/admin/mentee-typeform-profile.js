// One-shot: pull a mentee's full Typeform application by email
// GET /api/admin/mentee-typeform-profile?token=...&email=sharma.alishaa@gmail.com
import { MENTEE_EMAILS } from "../../../lib/mentees";

const FORM_ID = "hAbo7Jdh";

function flattenFields(fields) {
  const result = [];
  for (const f of (fields || [])) {
    if (f.type === "group" || f.type === "inline_group") {
      result.push(...flattenFields(f.properties?.fields));
    } else {
      result.push(f);
    }
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  const email = MENTEE_EMAILS[slug];
  if (!email) return res.status(404).json({ error: "Slug not found in MENTEE_EMAILS" });

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(500).json({ error: "No TYPEFORM_TOKEN" });

  const [formRes, respRes] = await Promise.all([
    fetch(`https://api.typeform.com/forms/${FORM_ID}`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`, { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  const formDef = await formRes.json();
  const respData = await respRes.json();
  const fields = flattenFields(formDef.fields || []);

  // Find this mentee's response by email
  const item = (respData.items || []).find(r =>
    (r.answers || []).some(a => a.type === "email" && a.email?.toLowerCase() === email.toLowerCase())
  );

  if (!item) return res.status(404).json({ error: "No Typeform response found for " + email });

  // Map answers to questions
  const qa = (item.answers || []).map(a => {
    const field = fields.find(f => f.id === a.field?.id || f.ref === a.field?.ref);
    const question = field?.title || a.field?.id || "Unknown";
    const value = a.text || a.email || a.choice?.label || a.choices?.labels?.join(", ") || String(a.boolean ?? "") || a.number || "";
    return { question, value };
  }).filter(a => a.value);

  return res.status(200).json({ slug, email, submittedAt: item.submitted_at, qa });
}
