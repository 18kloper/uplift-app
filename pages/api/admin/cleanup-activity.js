// POST /api/admin/cleanup-activity
// Removes PortalActivity entries that have a date-only ISO format (e.g. "2026-06-05")
// and belong to mentees who have NOT actually answered any prompts.
// These were incorrectly written by the backfill-activity endpoint which checked for
// slug tab existence (created by init-sheets for all) rather than actual prompt answers.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const ACTIVITY_TAB = "PortalActivity";
const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);

// Detect if a lastSeen value is a bare ISO date (not a real visit locale string)
function isDateOnly(val) {
  return /^\d{4}-\d{2}-\d{2}$/.test((val || "").trim());
}

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

  try {
    // 1. Get all PortalActivity rows
    const actRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ACTIVITY_TAB}!A:C`,
    });
    const allRows = actRes.data.values || [];
    if (allRows.length < 2) {
      return res.status(200).json({ ok: true, removed: 0, message: "No rows" });
    }

    const header = allRows[0];
    const dataRows = allRows.slice(1); // [slug, source, lastSeen]

    // 2. Find which slug tabs have actual prompt answers (non-empty rows beyond header)
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(meta.data.sheets.map(s => s.properties.title));

    const realMenteeSlugs = new Set(
      MENTEES.filter(m => !TEST_SLUGS.has(m.slug)).map(m => m.slug)
    );

    // Check each real mentee slug tab for actual data rows
    const slugsWithPrompts = new Set();
    for (const slug of realMenteeSlugs) {
      if (!existingTabs.has(slug)) continue;
      try {
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${slug}!A2:E2`, // just need to know if row 2 exists
        });
        const rows = r.data.values || [];
        if (rows.length > 0) {
          slugsWithPrompts.add(slug);
        }
      } catch (_) {}
    }

    // 3. Find rows to remove: date-only lastSeen AND no prompt answers
    const toRemoveIndices = []; // 0-based indices into dataRows
    for (let i = 0; i < dataRows.length; i++) {
      const [slug, , lastSeen] = dataRows[i];
      if (isDateOnly(lastSeen) && !slugsWithPrompts.has(slug)) {
        toRemoveIndices.push(i);
      }
    }

    if (toRemoveIndices.length === 0) {
      return res.status(200).json({ ok: true, removed: 0, message: "Nothing to clean up" });
    }

    const removedSlugs = toRemoveIndices.map(i => dataRows[i][0]);

    // 4. Rebuild the rows without the bad entries and rewrite the tab
    const keepRows = dataRows.filter((_, i) => !toRemoveIndices.includes(i));
    const newValues = [header, ...keepRows];

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${ACTIVITY_TAB}!A1:C2000`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${ACTIVITY_TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: newValues },
    });

    return res.status(200).json({
      ok: true,
      removed: toRemoveIndices.length,
      removedSlugs,
      kept: keepRows.length,
    });
  } catch (err) {
    console.error("cleanup-activity error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
