// GET  /api/fall-lookbook            -> { founders: [...], crops: {...} }
// POST /api/fall-lookbook { code }   -> { contacts: { <id>: email } }
//
// The public feed behind /fallfounderlookbook. Anyone with the link can read
// the book, so this endpoint is deliberately narrower than the admin one:
//
//   - approved, non-test founders only (no applicants, no rejections)
//   - mentor-safe fields only, so no demographic disclosure and no phone
//   - revenue amounts withheld the same way the profile pages withhold them
//   - EMAIL IS NOT IN THE GET. It comes back only from the POST, and only for
//     someone who has the contact code. Blurring an address in CSS would
//     still ship it in the payload; this does not ship it at all.

import { getFallMentees, approvedFounders } from "../../lib/fall-applications";
import { pickMentorSafe } from "../../components/FounderSheet";
import { getSheetsClient } from "../../lib/sheets-helper";
import { normalizeCrop } from "./admin/photo-crop";

const CONTACT_CODE = process.env.LOOKBOOK_CONTACT_CODE || "uplift26";

async function readCrops() {
  try {
    const sheets = getSheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "PhotoCrops!A2:M5000",
    });
    const crops = {};
    for (const [, id, position, zoom, hidden, fit, posX, posY, layout, order, floatW, floatX, floatY] of r.data.values || []) {
      if (!id) continue;
      crops[id] = normalizeCrop(position, zoom, hidden, fit, posX, posY, layout, order, floatW, floatX, floatY);
    }
    return crops;
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(500).json({ error: "TYPEFORM_TOKEN not configured" });

  try {
    const { mentees } = await getFallMentees(token);
    const founders = approvedFounders(mentees);

    if (req.method === "POST") {
      const code = String(req.body?.code || "").trim().toLowerCase();
      if (code !== CONTACT_CODE.toLowerCase()) return res.status(403).json({ error: "Wrong code" });
      const contacts = {};
      for (const f of founders) if (f.email) contacts[f.id] = f.email;
      return res.status(200).json({ contacts });
    }

    if (req.method !== "GET") return res.status(405).end();

    const safe = founders
      .map(f => pickMentorSafe(f))
      // Email is POST-only; phone never leaves the server for this page, and
      // the revenue key goes with it rather than shipping an empty slot.
      .map(({ email, phone, snapshot, ...rest }) => ({
        ...rest,
        snapshot: snapshot ? (({ revenueRange, ...snap }) => snap)(snapshot) : snapshot,
      }))
      .sort((a, b) => `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`));

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    return res.status(200).json({ founders: safe, crops: await readCrops(), count: safe.length });
  } catch (err) {
    console.error("[fall-lookbook] failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
