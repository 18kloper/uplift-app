// POST /api/admin/backfill-activity
// One-time fix: finds mentees who have answered prompts (have a slug tab)
// but have no PortalActivity entry (never-visited). Writes today's date for them
// so they show as recently active — they clearly visited before the tracker was added.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const ACTIVITY_TAB = "PortalActivity";
const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const realMentees = MENTEES.filter(m => !TEST_SLUGS.has(m.slug));

    // 1. Get existing PortalActivity entries
    let activityRows = [];
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${ACTIVITY_TAB}!A:C` });
      activityRows = r.data.values || [];
    } catch (_) {}

    const alreadyTracked = new Set(
      activityRows.slice(1).map(r => r[0]?.trim()).filter(Boolean)
    );

    // 2. Find which slug tabs exist (= mentee has answered at least one prompt)
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets.map(s => s.properties.title));

    // 3. Backfill: mentees with a slug tab but no activity entry
    const toBackfill = realMentees.filter(
      m => existingTabs.has(m.slug) && !alreadyTracked.has(m.slug)
    );

    if (toBackfill.length === 0) {
      return res.status(200).json({ ok: true, backfilled: 0, message: "Nothing to backfill" });
    }

    // Append rows: slug, "backfilled", today
    const newRows = toBackfill.map(m => [m.slug, "backfilled", today]);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${ACTIVITY_TAB}!A:C`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: newRows },
    });

    return res.status(200).json({
      ok: true,
      backfilled: toBackfill.length,
      slugs: toBackfill.map(m => m.slug),
    });
  } catch (err) {
    console.error("backfill-activity error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
