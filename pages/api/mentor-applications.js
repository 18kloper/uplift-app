// GET /api/mentor-applications
// Fetches mentor Typeform submissions (form AayoroO1).
// Returns ONLY mentors not already assigned in MENTEES.
// Add ?debug=1 to see raw field structure — use this to confirm field refs.

import { MENTEES } from "../../lib/mentees";

const FORM_ID = "AayoroO1";

// Normalize a name for comparison: lowercase, trim, collapse whitespace
const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

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

    // Debug mode — return raw field/answer structure so we can confirm refs
    if (req.query.debug === "1") {
      return res.status(200).json({
        totalResponses: items.length,
        fields: fields.map(f => ({ id: f.id, ref: f.ref, title: f.title, type: f.type })),
        sample: (items[0]?.answers || []).map(a => ({
          fieldId: a.field?.id, ref: a.field?.ref, type: a.type,
          value: a.text || a.email || a.choice?.label || a.choices?.labels?.join(", ") || String(a.boolean ?? ""),
        })),
      });
    }

    // Find field refs by matching title keywords — NO fallback to arbitrary text
    const findRef = (...keywords) => {
      for (const f of fields) {
        const t = (f.title || "").toLowerCase();
        if (keywords.some(k => t.includes(k))) return f.ref || f.id;
      }
      return null;
    };

    const firstRef = findRef("first name", "first_name");
    const lastRef  = findRef("last name",  "last_name");
    const fullRef  = !firstRef && !lastRef ? findRef("full name", "your name", "name") : null;
    const emailRef = findRef("email");

    const getVal = (answers, ref) => {
      if (!ref) return "";
      const a = answers.find(a => (a.field?.ref === ref || a.field?.id === ref));
      return a?.text || a?.email || "";
    };

    // Build existing mentor lookup — names AND emails
    const existingNames  = new Set(MENTEES.map(m => norm(m.mentor?.name)).filter(Boolean));
    const existingEmails = new Set(MENTEES.map(m => norm(m.mentor?.email)).filter(Boolean));

    const seen = new Set();
    const newMentors = [];

    for (const item of items) {
      const answers = item.answers || [];

      // Extract name — ONLY from labeled name fields, never from arbitrary text
      const first = getVal(answers, firstRef);
      const last  = getVal(answers, lastRef);
      const full  = getVal(answers, fullRef);

      let name = "";
      if (first || last) name = `${first} ${last}`.trim();
      else if (full)     name = full.trim();
      else continue; // can't identify name — skip

      // Extract email — labeled field first, then any email-type answer
      const email = getVal(answers, emailRef) || answers.find(a => a.type === "email")?.email || "";

      const nameKey  = norm(name);
      const emailKey = norm(email);

      // Skip if already in MENTEES (by name or email)
      if (existingNames.has(nameKey)) continue;
      if (emailKey && existingEmails.has(emailKey)) continue;

      // Dedupe within this batch
      const dedupeKey = emailKey || nameKey;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      newMentors.push({ name, email, submittedAt: item.submitted_at });
    }

    return res.status(200).json({
      mentors: newMentors,
      total: items.length,
      existingCount: existingNames.size,
      newCount: newMentors.length,
      // Include refs found so we can verify in logs
      _refs: { firstRef, lastRef, fullRef, emailRef },
    });
  } catch (err) {
    console.error("mentor-applications error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
