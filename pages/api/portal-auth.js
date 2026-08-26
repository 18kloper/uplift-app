// POST /api/portal-auth
// Body: { slug, password }
//
// Fall portal access, simplified per Kennedy (Aug 26): your Uplift ID is your
// login, always. No choose-your-own-password flow anymore — the ID is assigned
// on approval (fall-decide.js), it's private to the founder, and it works at
// any time. While a founder has no Uplift ID yet (approved before the ID
// system, or test accounts), the legacy access code (their slug) still works
// so nobody gets locked out. PORTAL_MASTER_PASSWORD (or ADMIN_SECRET) opens
// every portal for the team.
//
// Uplift ID lookup: FallMentees/FallMentors rows are keyed by Typeform
// response id, not slug, so we match on the roster name for the slug. Exact,
// case-insensitive full-name match only — same linkage the test accounts
// already rely on in fall-people.js.

import { getSheetsClient } from "../../lib/sheets-helper";
import { FALL_SLUGS } from "../../lib/fall-roster";
import { MENTEES } from "../../lib/mentees";

const masterPw = () => process.env.PORTAL_MASTER_PASSWORD || process.env.ADMIN_SECRET || "";

async function findUpliftId(sheets, spreadsheetId, slug) {
  const person = MENTEES.find(m => m.slug === slug);
  if (!person) return null;
  const fullName = `${person.first} ${person.last}`.trim().toLowerCase();
  for (const tab of ["FallMentees", "FallMentors"]) {
    let rows = [];
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:F` });
      rows = r.data.values || [];
    } catch (_) { continue; }
    // Latest ID wins, though fall-decide.js never reassigns one anyway.
    let found = null;
    for (let i = 1; i < rows.length; i++) {
      const [, , name, , , id] = rows[i];
      if (id && (name || "").trim().toLowerCase() === fullName) found = id;
    }
    if (found) return found;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { slug, password } = req.body || {};
  if (!FALL_SLUGS.includes(slug) || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Bad request" });
  }

  const entered = password.trim();
  const isMaster = !!masterPw() && entered === masterPw();

  // No Sheets configured (local dev): legacy slug code only.
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    const ok = isMaster || entered.toLowerCase() === slug;
    return res.status(ok ? 200 : 401).json({ ok, degraded: true });
  }

  try {
    const sheets = getSheetsClient();
    const upliftId = await findUpliftId(sheets, process.env.GOOGLE_SHEET_ID, slug);
    const ok = isMaster || (upliftId
      ? entered.toUpperCase() === upliftId.toUpperCase()
      : entered.toLowerCase() === slug); // no ID issued yet: access code = slug
    // The founder's own ID rides back on success so the portal can show it.
    return res.status(ok ? 200 : 401).json(ok ? { ok, master: isMaster || undefined, upliftId: upliftId || null } : { ok });
  } catch (err) {
    console.error("[portal-auth] failed:", err.message);
    return res.status(500).json({ ok: false, error: "Auth unavailable" });
  }
}
