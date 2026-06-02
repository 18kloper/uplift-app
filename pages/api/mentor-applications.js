// GET /api/mentor-applications
// Fetches all mentor Typeform submissions (form AayoroO1).
// Returns mentors not already assigned in MENTEES so they appear on the Mentors tab.
// Add ?debug=1 to see raw field structure.

import { MENTEES } from "../../lib/mentees";

const FORM_ID = "AayoroO1";

function extractNameEmail(answers, fields) {
  // Build a title-keyed map for quick lookup
  const byTitle = {};
  for (const f of fields) {
    const t = (f.title || "").toLowerCase().trim();
    byTitle[t] = f.ref || f.id;
  }

  // Find field refs by fuzzy title match
  const findRef = (...patterns) => {
    for (const p of patterns) {
      for (const [title, ref] of Object.entries(byTitle)) {
        if (title.includes(p)) return ref;
      }
    }
    return null;
  };

  const getByRef = (ref) => {
    if (!ref) return "";
    const a = answers.find(a => a.field?.ref === ref || a.field?.id === ref);
    if (!a) return "";
    return a.text || a.email || a.phone_number || "";
  };

  const firstRef = findRef("first name", "first_name", "firstname");
  const lastRef  = findRef("last name",  "last_name",  "lastname", "surname");
  const fullRef  = findRef("full name",  "full_name",  "your name", "name");
  const emailRef = findRef("email");

  const first = getByRef(firstRef);
  const last  = getByRef(lastRef);
  const full  = getByRef(fullRef);

  let name = "";
  if (first || last) name = `${first} ${last}`.trim();
  else if (full)     name = full.trim();
  else {
    // Last resort: any text answer ≥2 words with no @
    const t = answers.find(a =>
      (a.type === "text" || a.type === "short_text") &&
      a.text && !a.text.includes("@") && a.text.trim().split(/\s+/).length >= 2
    );
    if (t) name = t.text.trim();
  }

  // Email: field match first, then any email-type answer
  const email = getByRef(emailRef) || answers.find(a => a.type === "email")?.email || "";

  return { name, email };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ mentors: [], total: 0, note: "no TYPEFORM_TOKEN" });

  try {
    const [formRes, respRes] = await Promise.all([
      fetch(`https://api.typeform.com/forms/${FORM_ID}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const formDef  = await formRes.json();
    const respData = await respRes.json();
    const fields   = formDef.fields || [];
    const items    = respData.items || [];

    // Debug mode — return field structure
    if (req.query.debug === "1") {
      return res.status(200).json({
        totalResponses: items.length,
        fields: fields.map(f => ({ id: f.id, ref: f.ref, title: f.title, type: f.type })),
        sampleAnswers: (items[0]?.answers || []).map(a => ({
          fieldId: a.field?.id, fieldRef: a.field?.ref, type: a.type,
          value: a.text || a.email || a.choice?.label || a.choices?.labels || a.boolean,
        })),
      });
    }

    // Build set of existing mentor names/emails from MENTEES
    const existingNames  = new Set();
    const existingEmails = new Set();
    for (const m of MENTEES) {
      if (m.mentor?.name)  existingNames.add(m.mentor.name.toLowerCase().trim());
      if (m.mentor?.email) existingEmails.add(m.mentor.email.toLowerCase().trim());
    }

    const seen = new Set();
    const newMentors = [];

    for (const item of items) {
      const { name, email } = extractNameEmail(item.answers || [], fields);
      if (!name) continue;

      const nameKey  = name.toLowerCase().trim();
      const emailKey = (email || "").toLowerCase().trim();
      const dedupeKey = emailKey || nameKey;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      if (existingNames.has(nameKey)) continue;
      if (emailKey && existingEmails.has(emailKey)) continue;

      newMentors.push({ name, email, submittedAt: item.submitted_at });
    }

    return res.status(200).json({
      mentors: newMentors,
      total: items.length,
      existingCount: existingNames.size,
      newCount: newMentors.length,
    });
  } catch (err) {
    console.error("mentor-applications error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
