// GET /api/admin/list-tf-forms
export default async function handler(req, res) {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "no token" });
  const r = await fetch("https://api.typeform.com/forms?page_size=25", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const d = await r.json();
  return res.status(200).json(d.items?.map(f => ({ id: f.id, title: f.title })) || []);
}
