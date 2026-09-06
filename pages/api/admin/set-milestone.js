// POST /api/admin/set-milestone
// Body: { token, slug, milestone, value }
// Sets a single milestone cell to TRUE/FALSE on the Milestone Dashboard tab.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";
import { FALL_RESPONSES_TAB } from "../../../lib/fall-roster";

// The Dashboard milestones are bare TRUE/FALSE with nowhere to put a date, and
// for most of them that is fine. "Matched with a Mentor" is the exception: the
// seven-day Meeting 1 clock is measured from it, so without a date the clock
// falls back to the FallMatches row, which records when we matched somebody
// internally rather than when we told them. Those were days apart for the fall
// cohort and the difference showed up as founders being marked overdue for a
// meeting with a mentor they had never heard of.
//
// So the moment the milestone goes true, the timestamp is written as an
// ordinary FallResponses row. That tab already carries an updatedAt per
// fieldKey and fall-overview already reads it, so this needs no new tab, no
// schema change, and nothing else has to know about it.
const MATCH_TOLD_FIELD = "mentor_matched_at";

async function stampToldDate(sheets, spreadsheetId, slug) {
  const now = new Date().toISOString();
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId, range: `${FALL_RESPONSES_TAB}!A:F`,
    }).catch(() => ({ data: { values: [] } }));
    const rows = existing.data.values || [];
    const at = rows.findIndex((r, i) => i > 0 && r[0] === slug && r[2] === MATCH_TOLD_FIELD);
    // First time wins. Re-flipping the milestone must not restart somebody's
    // clock, or an accidental toggle would hand them another seven days.
    if (at > -1) return rows[at][5] || now;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${FALL_RESPONSES_TAB}!A:F`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[slug, "2", MATCH_TOLD_FIELD, "Told who their mentor is", now, now]] },
    });
    return now;
  } catch (err) {
    // A failed stamp must not fail the milestone write. The clock falls back
    // to the match date, which is the behaviour we already had.
    console.error("[set-milestone] could not stamp told-date:", err.message);
    return null;
  }
}

function colLetter(idx) {
  let s = "", n = idx;
  while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  const { token, slug, milestone, value } = req.body || {};
  if (secret && token !== secret) return res.status(401).json({ error: "unauthorized" });
  if (!slug || !milestone) return res.status(400).json({ error: "slug and milestone required" });
  if (!MILESTONE_KEYS.includes(milestone)) return res.status(400).json({ error: `unknown milestone: ${milestone}` });

  const hasSheets = process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return res.status(500).json({ error: "sheets not configured" });

  try {
    const sheets = getSheetsClient();
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Milestone Dashboard!A1:Z1" });
    const header = (headerRes.data.values || [[]])[0] || [];

    const colIdx = header.findIndex(h => h === MILESTONE_LABELS[milestone]);
    if (colIdx === -1) return res.status(404).json({ error: `column for ${milestone} not found`, header });

    const dataRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "Milestone Dashboard!A:A" });
    const rows = dataRes.data.values || [];
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === slug);
    if (rowIdx === -1) return res.status(404).json({ error: `slug ${slug} not found in sheet` });

    const sheetRow = rowIdx + 1;
    const range = `Milestone Dashboard!${colLetter(colIdx)}${sheetRow}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value === false ? "FALSE" : "TRUE"]] },
    });

    const on = value !== false;
    const toldAt = on && milestone === "mentorMatched"
      ? await stampToldDate(sheets, sheetId, slug)
      : null;

    return res.status(200).json({ ok: true, slug, milestone, range, value: on, toldAt });
  } catch (err) {
    console.error("set-milestone error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
