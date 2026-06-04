// GET /api/mentor-applications
// Fetches mentor Typeform submissions (form AayoroO1).
// Returns ONLY mentors not already assigned in MENTEES.
// Add ?debug=1 to see raw field structure.

import { MENTEES } from "../../lib/mentees";

const FORM_ID = "AayoroO1";

const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

// Flatten nested group fields — Typeform groups nest sub-fields in properties.fields
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

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ mentors: [], total: 0, note: "no TYPEFORM_TOKEN" });

  try {
    const [formRes, respRes] = await Promise.all([
      fetch(`https://api.typeform.com/forms/${FORM_ID}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const formDef  = await formRes.json();
    const respData = await respRes.json();
    const items    = respData.items || [];

    // Flatten all fields including those nested inside groups
    const fields = flattenFields(formDef.fields || []);

    // Debug mode — shows flattened fields and first response's answers
    if (req.query.debug === "1") {
      return res.status(200).json({
        totalResponses: items.length,
        flattenedFieldCount: fields.length,
        fields: fields.map(f => ({ id: f.id, ref: f.ref, title: f.title, type: f.type })),
        sample: (items[0]?.answers || []).map(a => ({
          fieldId: a.field?.id, ref: a.field?.ref, type: a.type,
          value: a.text || a.email || a.choice?.label || a.choices?.labels?.join(", ") || String(a.boolean ?? ""),
        })),
      });
    }

    // Find a field ref by matching title keywords against flattened fields
    const findRef = (...keywords) => {
      for (const f of fields) {
        const t = (f.title || "").toLowerCase();
        if (keywords.some(k => t.includes(k))) return f.ref || f.id;
      }
      return null;
    };

    const firstRef = findRef("first name", "first_name");
    const lastRef  = findRef("last name", "last_name");
    const fullRef  = (!firstRef && !lastRef) ? findRef("full name", "your name", "name") : null;
    const emailRef = findRef("email");

    const getVal = (answers, ref) => {
      if (!ref) return "";
      const a = answers.find(a => a.field?.ref === ref || a.field?.id === ref);
      return a?.text || a?.email || "";
    };

    // Existing mentor names/emails from MENTEES
    const existingNames  = new Set(MENTEES.map(m => norm(m.mentor?.name)).filter(Boolean));
    const existingEmails = new Set(MENTEES.map(m => norm(m.mentor?.email)).filter(Boolean));

    // Blocklist — fake/invalid applicants to exclude permanently
    const BLOCKED_EMAILS = new Set(["oigynn@example.com"]);
    const BLOCKED_NAMES  = new Set(["isabella richardson"]);

    const seen = new Set();
    const newMentors = [];

    for (const item of items) {
      const answers = item.answers || [];

      const first = getVal(answers, firstRef);
      const last  = getVal(answers, lastRef);
      const full  = getVal(answers, fullRef);

      let name = "";
      if (first || last) name = `${first} ${last}`.trim();
      else if (full)     name = full.trim();
      else continue; // skip if no name found

      const email = getVal(answers, emailRef) || answers.find(a => a.type === "email")?.email || "";

      const nameKey  = norm(name);
      const emailKey = norm(email);

      // ?all=1 returns every submission (for email lookup purposes)
      if (req.query.all !== "1") {
        if (existingNames.has(nameKey)) continue;
        if (emailKey && existingEmails.has(emailKey)) continue;
      }

      if (BLOCKED_EMAILS.has(emailKey) || BLOCKED_NAMES.has(nameKey)) continue;

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
      _refs: { firstRef, lastRef, fullRef, emailRef },
    });
  } catch (err) {
    console.error("mentor-applications error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
