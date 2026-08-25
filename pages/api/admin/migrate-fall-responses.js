// POST /api/admin/migrate-fall-responses
// One-time: copies the fall test founders' rows out of their legacy per-person
// tabs into the shared FallResponses tab. Idempotent: skips rows already there.

import { getSheetsClient } from "../../../lib/sheets-helper";
import { FALL_SLUGS, FALL_RESPONSES_TAB, FALL_RESPONSES_HEADERS } from "../../../lib/fall-roster";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Ensure target tab
    let existing = [];
    try {
      const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${FALL_RESPONSES_TAB}!A:C` });
      existing = read.data.values || [];
    } catch (_) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: FALL_RESPONSES_TAB } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${FALL_RESPONSES_TAB}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [FALL_RESPONSES_HEADERS] },
      });
    }
    const seen = new Set(existing.slice(1).map(r => `${r[0]}|${r[1]}|${r[2]}`));

    const toAppend = [];
    for (const slug of FALL_SLUGS) {
      try {
        const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${slug}!A2:E500` });
        for (const row of r.data.values || []) {
          const key = `${slug}|${row[0]}|${row[1]}`;
          if (!row[1] || seen.has(key)) continue;
          seen.add(key);
          toAppend.push([slug, row[0] || "", row[1] || "", row[2] || "", row[3] || "", row[4] || ""]);
        }
      } catch (_) {} // no legacy tab for this slug
    }

    if (toAppend.length) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${FALL_RESPONSES_TAB}!A:F`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: toAppend },
      });
    }
    return res.status(200).json({ ok: true, migrated: toAppend.length });
  } catch (err) {
    console.error("[migrate-fall-responses] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
