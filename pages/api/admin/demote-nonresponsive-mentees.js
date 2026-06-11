// One-shot: mark mentees of non-responsive mentors as needs-match
// Rikin Diwan → lina-escobar, alisha-sharma (non-responsive)
// Tom Oser    → gifty-anane, alina-okun (non-responsive)
// Adrienne Rosenthal → evan-peneiras (needs new match)
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const targets = [
    { threadId: "no-reply-rikin-diwan",   mentorName: "Rikin Diwan",          mentorEmail: "rikin@lowercaseb2b.com",   menteeName: "Lina Escobar",   slug: "lina-escobar",   note: "Mentor non-responsive — needs new match" },
    { threadId: "no-reply-rikin-diwan",   mentorName: "Rikin Diwan",          mentorEmail: "rikin@lowercaseb2b.com",   menteeName: "Alisha Sharma",  slug: "alisha-sharma",  note: "Mentor non-responsive — needs new match" },
    { threadId: "no-reply-tom-oser",      mentorName: "Tom Oser",             mentorEmail: "tomoser@pipeline-strategies.com", menteeName: "Gifty Anane",    slug: "gifty-anane",    note: "Mentor non-responsive — needs new match" },
    { threadId: "no-reply-tom-oser",      mentorName: "Tom Oser",             mentorEmail: "tomoser@pipeline-strategies.com", menteeName: "Alina Okun",     slug: "alina-okun",     note: "Mentor non-responsive — needs new match" },
    { threadId: "no-reply-adrienne-evan", mentorName: "Adrienne Rosenthal",   mentorEmail: "ajerud@gmail.com",         menteeName: "Evan Peneiras",  slug: "evan-peneiras",  note: "Needs new match" },
  ];

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const updates = [];
  const toAppend = [];
  const log = [];

  for (const t of targets) {
    let found = false;
    rows.forEach((row, idx) => {
      const rowThread = (row[0] || "").trim();
      const rowSlug   = (row[4] || "").trim();
      if (rowThread === t.threadId && rowSlug === t.slug) {
        const sheetRow = idx + 2;
        updates.push({ range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] });
        updates.push({ range: `${TAB}!G${sheetRow}`, values: [[now]] });
        updates.push({ range: `${TAB}!H${sheetRow}`, values: [[t.note]] });
        log.push(`Updated row ${sheetRow}: ${t.mentorName} → ${t.slug} = needs-match`);
        found = true;
      }
    });
    if (!found) {
      toAppend.push([t.threadId, t.mentorName, t.mentorEmail, t.menteeName, t.slug, "needs-match", now, t.note]);
      log.push(`Appended: ${t.mentorName} → ${t.slug} = needs-match`);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: updates } });
  }
  if (toAppend.length > 0) {
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW", requestBody: { values: toAppend } });
  }

  return res.status(200).json({ ok: true, log });
}
