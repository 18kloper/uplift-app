// GET /api/milestones?slug=pearl-gabel
//
// Reads the Dashboard tab and returns live milestone status for one mentee.
// The admin checks/unchecks boxes in the Dashboard tab → portal reflects it instantly.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ milestones: null });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Start with all milestones false
    const milestones = Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));

    // ── 1. Read Participation tab — source of truth for participation ──────────
    try {
      const partRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Participation!A6:E500",
      });
      const partRows = partRes.data.values || [];
      for (const row of partRows) {
        if (row[0]?.trim() === slug && row[4]?.trim() === "Accepted") {
          milestones.participation = true;
          break;
        }
      }
    } catch (_) {}

    // ── 2. Read Milestone Dashboard for all other milestones ──────────────────
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Milestone Dashboard!A:Z",
    });

    const rows = response.data.values || [];
    const headerRow = rows[0] || [];
    const menteeRow = rows.find((row, i) => i > 0 && row[0] === slug);

    if (menteeRow) {
      MILESTONE_KEYS.forEach((key, idx) => {
        const byLabel = headerRow.findIndex(h => h === MILESTONE_LABELS[key]);
        const colIdx  = byLabel !== -1 ? byLabel : 6 + idx;
        const val     = menteeRow[colIdx];
        // Only set to true — never override participation=true from step 1 with false
        if (val === "TRUE" || val === true) milestones[key] = true;
      });
    }

    // If we found no row at all and participation is still false, return null
    // so the portal falls back to localStorage
    if (!menteeRow && !milestones.participation) {
      return res.status(200).json({ milestones: null });
    }

    return res.status(200).json({ milestones });
  } catch (err) {
    console.error("Milestones read failed:", err.message);
    return res.status(200).json({ milestones: null });
  }
}
