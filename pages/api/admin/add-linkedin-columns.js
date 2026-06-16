// One-shot: adds LinkedIn column to Participation sheet (col H)
// and creates/updates a Mentors sheet tab with linkedin URLs.
// POST /api/admin/add-linkedin-columns?token=...

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // ── 1. Add LinkedIn column to Participation tab ───────────────────────────
  const PART_TAB = "Participation";
  const slugRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${PART_TAB}!A6:A500`,
  });
  const slugRows = slugRes.data.values || [];

  const menteeLinkedIn = {};
  for (const m of MENTEES) {
    if (m.linkedin) menteeLinkedIn[m.slug] = m.linkedin;
  }

  const partUpdates = [{ range: `${PART_TAB}!H5`, values: [["LinkedIn"]] }];
  slugRows.forEach((row, idx) => {
    const slug = row[0]?.trim();
    if (!slug) return;
    partUpdates.push({
      range: `${PART_TAB}!H${idx + 6}`,
      values: [[menteeLinkedIn[slug] || ""]],
    });
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: partUpdates },
  });

  // ── 2. Create/clear Mentors tab and populate ──────────────────────────────
  const MENTOR_TAB = "Mentors";
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheet = meta.data.sheets?.find(s => s.properties.title === MENTOR_TAB);

  if (!existingSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: MENTOR_TAB } } }] },
    });
  } else {
    // Clear existing content
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${MENTOR_TAB}!A:F` });
  }

  // Collect unique mentors (dedupe by email)
  const seen = new Set();
  const mentors = [];
  for (const m of MENTEES) {
    if (!m.mentor?.email || seen.has(m.mentor.email)) continue;
    seen.add(m.mentor.email);
    mentors.push(m.mentor);
  }
  mentors.sort((a, b) => a.name.localeCompare(b.name));

  const mentorRows = [
    ["Name", "Email", "Company", "Title", "LinkedIn"],
    ...mentors.map(t => [
      t.name || "",
      t.email || "",
      t.company || "",
      t.title || "",
      t.linkedin || "",
    ]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${MENTOR_TAB}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: mentorRows },
  });

  return res.status(200).json({
    ok: true,
    menteeLinkedInUpdated: partUpdates.length - 1,
    mentorsWritten: mentors.length,
  });
}
