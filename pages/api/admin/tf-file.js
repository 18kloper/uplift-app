// GET /api/admin/tf-file?u=<typeform file url>
//
// Typeform file-upload answers (application headshots) live behind URLs that
// require the API token, so a plain <img src> can never render them. This
// proxies the bytes with the token attached. Locked to Typeform's file host
// so it can't be used to proxy arbitrary URLs.
//
// Two things happen on the way through. iPhone uploads arrive as HEIC, which
// no browser renders, so those are decoded to JPEG (three Fall 2026 founders
// uploaded HEIC headshots; without this their photo is a broken-image icon on
// their profile and in the lookbook grid). And originals run to several
// megapixels, so everything is downscaled: a 37-page lookbook pulling 35
// full-resolution camera files is a slow page and a huge PDF.

import convert from "heic-convert";
import { Jimp } from "jimp";

const MAX_WIDTH = 1600;

const isHeic = (url, contentType) =>
  /\.heic$/i.test(new URL(url).pathname) || /image\/hei[cf]/i.test(contentType || "");

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
    let buf = Buffer.from(await r.arrayBuffer());
    let type = r.headers.get("content-type") || "image/jpeg";

    if (isHeic(u, type)) {
      try {
        buf = Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.9 }));
        type = "image/jpeg";
      } catch (e) {
        // A photo that won't decode should not take the whole page down; the
        // profile falls back to initials when the image fails to load.
        console.error("[tf-file] HEIC decode failed:", e.message);
        return res.status(415).end();
      }
    }

    try {
      const img = await Jimp.read(buf);
      if (img.width > MAX_WIDTH) {
        img.resize({ w: MAX_WIDTH });
        buf = Buffer.from(await img.getBuffer("image/jpeg", { quality: 88 }));
        type = "image/jpeg";
      }
    } catch (e) {
      // An image jimp can't parse is still served as-is rather than lost.
      console.error("[tf-file] resize skipped:", e.message);
    }

    res.setHeader("Content-Type", type);
    // A headshot URL is immutable (it carries Typeform's file id), and the
    // fall cohort directory now puts 36 of these on one page, each one a
    // Typeform fetch plus a decode/resize. Let the CDN hold them.
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400");
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
