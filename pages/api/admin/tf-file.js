// GET /api/admin/tf-file?u=<typeform file url>
//
// Typeform file-upload answers (application headshots) live behind URLs that
// require the API token, so a plain <img src> can never render them. This
// proxies the bytes with the token attached. Locked to Typeform's file host
// so it can't be used to proxy arbitrary URLs.

export default async function handler(req, res) {
  const { u } = req.query;
  if (!u || !/^https:\/\/api\.typeform\.com\/forms\//.test(u)) {
    return res.status(400).json({ error: "Invalid file url" });
  }
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(500).json({ error: "TYPEFORM_TOKEN not configured" });

  try {
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" });
    if (!r.ok) return res.status(r.status).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
