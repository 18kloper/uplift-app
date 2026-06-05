// POST /api/admin/mark-sent-bulk
// Body: { mentorNames: ["Joe Maruschak", ...] }
// Sets all matching "pending" rows for these mentors to "sent"

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { mentorNames } = req.body || {};
  if (!mentorNames?.length) return res.status(400).json({ error: "mentorNames required" });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });

  const rows = result.data.values || [];
  const nameSet = new Set(mentorNames.map(n => n.trim().toLowerCase()));
  const updates = [];

  rows.forEach((row, idx) => {
    const mentor = row[1]?.trim().toLowerCase();
    const status = row[5]?.trim().toLowerCase();
    if (nameSet.has(mentor) && status === "pending") {
      updates.push({ range: `${TAB}!F${idx + 2}`, values: [["sent"]] });
    }
  });

  if (updates.length === 0) return res.status(200).json({ ok: true, updated: 0 });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, updated: updates.length });
}
