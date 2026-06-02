// GET /api/mentor-applications
// Fetches all mentor Typeform submissions (form AayoroO1) and returns
// mentors not already assigned in MENTEES, so they appear on the Mentors tab.

import { MENTEES } from "../../lib/mentees";

const FORM_ID = "AayoroO1";

// Known field refs from the mentor application form — update if Typeform changes
// These are discovered via /api/debug-mentor-form
const FIELD_HINTS = {
  firstName:  ["first_name", "first-name", "firstName", "name_first"],
  lastName:   ["last_name",  "last-name",  "lastName",  "name_last"],
  email:      ["email", "email_address", "your_email"],
  fullName:   ["full_name", "full-name", "name", "your_name"],
};

function getAnswer(answers, refs) {
  for (const ref of refs) {
    const a = answers.find(a => a.field?.ref === ref || a.field?.id === ref);
    if (a) return a.text || a.email || a.phone_number || a.date || "";
  }
  return "";
}

function extractNameEmail(answers, fieldDefs) {
  // Try first+last separately
  const first = getAnswer(answers, fieldDefs.firstName || FIELD_HINTS.firstName);
  const last  = getAnswer(answers, fieldDefs.lastName  || FIELD_HINTS.lastName);
  const full  = getAnswer(answers, fieldDefs.fullName  || FIELD_HINTS.fullName);
  const email = getAnswer(answers, fieldDefs.email     || FIELD_HINTS.email);

  let name = "";
  if (first || last) name = `${first} ${last}`.trim();
  else if (full) name = full.trim();
  else {
    // Fall back: find any text answer that looks like a name (2+ words, no @)
    const textAns = answers.find(a => a.type === "text" && a.text && !a.text.includes("@") && a.text.split(" ").length >= 2);
    if (textAns) name = textAns.text.trim();
  }

  const emailVal = email || answers.find(a => a.type === "email")?.email || "";

  return { name, email: emailVal };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ mentors: [], total: 0, debug: "no token" });

  try {
    // Fetch form definition to discover field refs
    const formRes = await fetch(`https://api.typeform.com/forms/${FORM_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const formDef = await formRes.json();
    const fields = formDef.fields || [];

    // Build ref map from field titles
    const fieldDefs = { firstName: [], lastName: [], email: [], fullName: [] };
    for (const f of fields) {
      const t = (f.title || "").toLowerCase();
      const ref = f.ref || f.id;
      if (/first.?name/i.test(t))       fieldDefs.firstName.push(ref);
      else if (/last.?name/i.test(t))   fieldDefs.lastName.push(ref);
      else if (/email/i.test(t))        fieldDefs.email.push(ref);
      else if (/full.?name|your name/i.test(t)) fieldDefs.fullName.push(ref);
    }

    // Fetch all responses (up to 1000)
    const respRes = await fetch(
      `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const respData = await respRes.json();
    const items = respData.items || [];

    // Build set of existing mentor names (lowercase) from MENTEES
    const existingMentorNames = new Set();
    const existingMentorEmails = new Set();
    for (const m of MENTEES) {
      if (m.mentor?.name) existingMentorNames.add(m.mentor.name.toLowerCase().trim());
      if (m.mentor?.email) existingMentorEmails.add(m.mentor.email.toLowerCase().trim());
    }

    // Parse each response
    const seen = new Set();
    const newMentors = [];

    for (const item of items) {
      const answers = item.answers || [];
      const { name, email } = extractNameEmail(answers, fieldDefs);
      if (!name) continue;

      const nameKey = name.toLowerCase().trim();
      const emailKey = email.toLowerCase().trim();

      // Skip duplicates within this batch
      const dedupeKey = emailKey || nameKey;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      // Skip if already in MENTEES mentor list
      if (existingMentorNames.has(nameKey)) continue;
      if (emailKey && existingMentorEmails.has(emailKey)) continue;

      newMentors.push({
        name,
        email,
        submittedAt: item.submitted_at,
        // Raw answers for debugging — remove in prod if desired
        _fields: fields.map(f => ({ id: f.id, ref: f.ref, title: f.title })).slice(0, 5),
      });
    }

    return res.status(200).json({
      mentors: newMentors,
      total: items.length,
      existingCount: existingMentorNames.size,
    });
  } catch (err) {
    console.error("mentor-applications error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
