// One-shot: sync ALL mentees.js assignments into Mentor Confirmations sheet
// Reads existing rows first, skips duplicates, appends missing ones as "confirmed"
import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const TAB = "Mentor Confirmations";

// All real mentees with confirmed mentor assignments from mentees.js
const SKIP_SLUGS = new Set(["aaron", "jackie", "mj", "kennedy", "radha-ratnala"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();

  // Read existing rows
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });
  const existingRows = existing.data.values || [];

  // Build set of already-confirmed slugs
  const confirmedSlugs = new Set(
    existingRows
      .filter(r => (r[5] || "").toLowerCase() === "confirmed")
      .map(r => (r[4] || "").trim())
      .filter(Boolean)
  );

  // Build list of all mentees.js assignments
  const allAssignments = MENTEES.filter(m =>
    m.mentor?.name && m.mentor?.email && !SKIP_SLUGS.has(m.slug)
  );

  const toAdd = allAssignments.filter(m => !confirmedSlugs.has(m.slug));
  const log = [];
  const newRows = [];

  for (const m of toAdd) {
    newRows.push([
      `admin-sync-${m.slug}`,
      m.mentor.name,
      m.mentor.email,
      `${m.first} ${m.last}`.trim(),
      m.slug,
      "confirmed",
      now,
      "Synced from mentees.js bulk sync",
    ]);
    log.push(`Added: ${m.mentor.name} → ${m.slug}`);
  }

  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:H`,
      valueInputOption: "RAW",
      requestBody: { values: newRows },
    });
  }

  return res.status(200).json({
    ok: true,
    alreadyConfirmed: confirmedSlugs.size,
    added: newRows.length,
    log,
  });
}
