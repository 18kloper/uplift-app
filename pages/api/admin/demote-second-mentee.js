// POST /api/admin/demote-second-mentee
// For every mentor with 2+ mentees in "sent" status,
// sets the second mentee's row to "needs-match" so they re-enter the matching pool.

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });

  const rows = result.data.values || [];

  // Group row indices by mentor, status=sent
  const byMentor = {};
  rows.forEach((row, idx) => {
    const status = row[5]?.trim().toLowerCase();
    if (status !== "sent") return;
    const mentorName = row[1]?.trim();
    if (!mentorName) return;
    if (!byMentor[mentorName]) byMentor[mentorName] = [];
    byMentor[mentorName].push({ idx, row });
  });

  // Find mentors with 2+ mentees — demote all but the first
  const updates = [];
  const demoted = [];

  for (const [mentorName, entries] of Object.entries(byMentor)) {
    if (entries.length < 2) continue;
    // Keep first, demote the rest
    for (let i = 1; i < entries.length; i++) {
      const sheetRow = entries[i].idx + 2; // 1-indexed + header
      updates.push({
        range: `${TAB}!F${sheetRow}`,
        values: [["needs-match"]],
      });
      demoted.push({
        mentor: mentorName,
        mentee: entries[i].row[3]?.trim(),
        menteeSlug: entries[i].row[4]?.trim(),
        sheetRow,
      });
    }
  }

  if (updates.length === 0) {
    return res.status(200).json({ ok: true, demoted: [], message: "No changes needed" });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });

  return res.status(200).json({ ok: true, demoted });
}
