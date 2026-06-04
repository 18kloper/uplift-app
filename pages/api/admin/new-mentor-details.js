// GET /api/admin/new-mentor-details
// Returns full Typeform profiles for mentor applicants not yet in the system.
// Auth: ?token=<ADMIN_SECRET>

import { MENTEES } from "../../../lib/mentees";

const FORM_ID = "AayoroO1";

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

const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "No TYPEFORM_TOKEN" });

  const [formRes, respRes] = await Promise.all([
    fetch(`https://api.typeform.com/forms/${FORM_ID}`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`, { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  const formDef  = await formRes.json();
  const respData = await respRes.json();
  const items    = respData.items || [];
  const fields   = flattenFields(formDef.fields || []);

  const findRef = (...keywords) => {
    for (const f of fields) {
      const t = (f.title || "").toLowerCase();
      if (keywords.some(k => t.includes(k))) return f.ref || f.id;
    }
    return null;
  };

  const refs = {
    first:    findRef("first name"),
    last:     findRef("last name"),
    email:    findRef("email"),
    company:  findRef("company"),
    title:    findRef("title", "role"),
    bio:      findRef("bio"),
    industry: findRef("industry"),
    focus:    findRef("focus area"),
    linkedin: findRef("linkedin"),
  };

  const getVal = (answers, ref) => {
    if (!ref) return "";
    const a = answers.find(a => a.field?.ref === ref || a.field?.id === ref);
    return a?.text || a?.email || a?.url ||
      (a?.choices?.labels?.join(", ")) ||
      (a?.choice?.label) || "";
  };

  const existingEmails = new Set(MENTEES.map(m => norm(m.mentor?.email)).filter(Boolean));
  const existingNames  = new Set(MENTEES.map(m => norm(m.mentor?.name)).filter(Boolean));

  const seen = new Set();
  const newMentors = [];

  for (const item of items) {
    const answers = item.answers || [];
    const email   = norm(getVal(answers, refs.email));
    const first   = getVal(answers, refs.first);
    const last    = getVal(answers, refs.last);
    const name    = `${first} ${last}`.trim();
    const nameKey = norm(name);

    if (!name) continue;
    if (existingEmails.has(email) || existingNames.has(nameKey)) continue;
    const dedupeKey = email || nameKey;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    newMentors.push({
      name,
      email,
      company:   getVal(answers, refs.company),
      title:     getVal(answers, refs.title),
      industry:  getVal(answers, refs.industry),
      focus:     getVal(answers, refs.focus),
      linkedin:  getVal(answers, refs.linkedin),
      bio:       getVal(answers, refs.bio),
      submitted: item.submitted_at?.slice(0, 10),
    });
  }

  return res.status(200).json({ count: newMentors.length, mentors: newMentors });
}
