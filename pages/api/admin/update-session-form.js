// POST /api/admin/update-session-form?token=...
// Updates the Typeform "60 minutes?" yes/no field to a numeric "Estimated minutes" field.

const FORM_ID = "e0L62296";
const SIXTY_MIN_REF = "fcee13e9-5193-4f01-b3b4-aed4f421b933";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(500).json({ error: "TYPEFORM_TOKEN not set" });

  // 1. Fetch current form
  const getRes = await fetch(`https://api.typeform.com/forms/${FORM_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!getRes.ok) return res.status(502).json({ error: "Failed to fetch form", status: getRes.status });
  const form = await getRes.json();

  // 2. Find and replace the yes/no 60-min field (may be nested in groups)
  let updated = false;
  function updateFields(fields) {
    return (fields || []).map(field => {
      // Recurse into any group type
      if (field.properties?.fields) {
        return { ...field, properties: { ...field.properties, fields: updateFields(field.properties.fields) } };
      }
      if (field.ref === SIXTY_MIN_REF || field.id === SIXTY_MIN_REF) {
        updated = true;
        return {
          ...field,
          type: "number",
          title: "Estimated session length (minutes)*",
          properties: {
            description: "* Over the course of a minimum of 3 sessions, you must have completed approximately 180 minutes of direct one-on-one mentorship.",
          },
          validations: { required: false, min_value: 1, max_value: 600 },
        };
      }
      return field;
    });
  }

  // Debug: print all refs to help diagnose if field not found
  function allRefs(fields, acc = []) {
    for (const f of fields || []) {
      acc.push({ id: f.id, ref: f.ref, type: f.type, title: f.title?.slice(0, 60) });
      if (f.properties?.fields) allRefs(f.properties.fields, acc);
    }
    return acc;
  }

  const updatedFields = updateFields(form.fields || []);
  if (!updated) return res.status(404).json({ error: "60-min field not found", allFields: allRefs(form.fields) });

  // 3. PATCH the form
  const patchRes = await fetch(`https://api.typeform.com/forms/${FORM_ID}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...form, fields: updatedFields }),
  });

  const patchData = await patchRes.json();
  if (!patchRes.ok) return res.status(502).json({ error: "Typeform update failed", detail: patchData });

  return res.status(200).json({ ok: true, updated: true });
}
