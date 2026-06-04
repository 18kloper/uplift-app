// GET /api/admin/mentee-applications — fetches all mentee Typeform responses
export default async function handler(req, res) {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "no token" });
  const [formRes, respRes] = await Promise.all([
    fetch("https://api.typeform.com/forms/hAbo7Jdh", { headers: { Authorization: `Bearer ${token}` } }),
    fetch("https://api.typeform.com/forms/hAbo7Jdh/responses?page_size=200", { headers: { Authorization: `Bearer ${token}` } }),
  ]);
  const form = await formRes.json();
  const data = await respRes.json();
  const fields = form.fields || [];
  const flat = [];
  const flattenFields = (fs) => {
    for (const f of (fs || [])) {
      if (f.type === "group" || f.type === "inline_group") flattenFields(f.properties?.fields);
      else flat.push(f);
    }
  };
  flattenFields(fields);

  const getVal = (answers, ref) => {
    const a = (answers || []).find(a => a.field?.ref === ref || a.field?.id === ref);
    return a?.text || a?.email || a?.phone_number || a?.url ||
      (a?.choices?.labels?.join(", ")) || (a?.choice?.label) || "";
  };

  const items = (data.items || []).map(item => {
    const ans = item.answers || [];
    const obj = { submitted: item.submitted_at?.slice(0,10) };
    for (const f of flat) {
      obj[f.title] = getVal(ans, f.ref || f.id);
    }
    return obj;
  });

  // Filter to name keyword if provided
  const q = (req.query.q || "").toLowerCase();
  const filtered = q ? items.filter(i => JSON.stringify(i).toLowerCase().includes(q)) : items;
  return res.status(200).json({ total: items.length, results: filtered });
}
