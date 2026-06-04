// GET /api/admin/init-dashboard
// Reads the Milestone Dashboard tab, compares against all known mentees,
// and appends a blank row for each mentee that is missing.
// Safe to re-run — skips mentees already present.
// Auth: ?token=<ADMIN_SECRET> (or unset in dev)

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const TAB = "Milestone Dashboard";
const FALSE_COLS = MILESTONE_KEYS.map(() => "FALSE");

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ ok: true, skipped: true, reason: "No sheet credentials" });
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // ── 1. Read full slug column from Dashboard ────────────────────────────────
  let existingSlugs = new Set();
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A:A`,
    });
    const rows = r.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) existingSlugs.add(rows[i][0].trim());
    }
  } catch (err) {
    return res.status(500).json({ error: `Could not read dashboard: ${err.message}` });
  }

  // ── 2. Ensure the tab has a header row ────────────────────────────────────
  if (existingSlugs.size === 0) {
    // Tab is empty — write headers first
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          "Slug", "First", "Last", "Cohort", "Company", "Last Active",
          ...MILESTONE_KEYS.map(k => MILESTONE_LABELS[k]),
        ]],
      },
    });
  }

  // ── 3. Filter to real mentees (cohort 1–5) that are missing ───────────────
  const realMentees = MENTEES.filter(m => m.cohort >= 1 && m.cohort <= 5);
  const missing = realMentees.filter(m => !existingSlugs.has(m.slug));

  if (missing.length === 0) {
    return res.status(200).json({ ok: true, added: 0, skipped: existingSlugs.size, message: "All mentees already in dashboard" });
  }

  // ── 4. Append missing mentees ─────────────────────────────────────────────
  const rows = missing.map(m => [
    m.slug,
    m.first || "",
    m.last || "",
    String(m.cohort || ""),
    m.company || "",
    "", // Last Active — empty
    ...FALSE_COLS,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  return res.status(200).json({
    ok: true,
    added: missing.length,
    skipped: existingSlugs.size,
    addedList: missing.map(m => m.slug),
  });
}
