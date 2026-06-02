// GET /api/get-mentor-sessions
// Returns all rows from "Mentor Sessions" sheet as a key→count map.
// Key format: mentorEmail|menteeSlug

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Mentor Sessions";
const HEADERS = ["Mentor Email", "Mentee Slug", "Sessions", "Updated At"];

async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ sessions: {} });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    await ensureTab(sheets, spreadsheetId);

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:D500`,
    });

    const rows = result.data.values || [];
    const sessions = {};
    for (const row of rows) {
      const mentorEmail = row[0]?.trim();
      const menteeSlug  = row[1]?.trim();
      const count       = parseInt(row[2], 10);
      if (mentorEmail && menteeSlug && !isNaN(count)) {
        sessions[`${mentorEmail}|${menteeSlug}`] = count;
      }
    }

    return res.status(200).json({ sessions });
  } catch (err) {
    console.error("get-mentor-sessions error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
