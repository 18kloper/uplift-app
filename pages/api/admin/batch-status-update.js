// One-shot: batch update statuses in Mentor Confirmations by mentorEmail+menteeSlug pairs
import { getSheetsClient } from "../../../lib/sheets-helper";

const UPDATES = [
  // Jose Gabriel → Jerry Primus: pending → sent
  { mentorEmail: "jgcarrasco@quarksadvantage.com", menteeSlug: "jerry-primus",  newStatus: "sent",      note: "email sent 2026-06-05" },
  // Vishal Goyal → Elaf Mahmoud: already confirmed
  { mentorEmail: "vishal0073@gmail.com",           menteeSlug: "elaf-mahmoud",  newStatus: "confirmed", note: "confirmed by mentor" },
  // Giuseppe Incitti → Favio Jasso: declined
  { mentorEmail: "gincitti@sitetracker.com",       menteeSlug: "favio-jasso",   newStatus: "needs-match", note: "mentor declined: not a nonprofit fit" },
  // Pavan Kumar → Rajesh Ivaturi: confirmed
  { mentorEmail: "pavan@3pmventures.com",          menteeSlug: "rajesh-ivaturi", newStatus: "confirmed", note: "confirmed by mentor" },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const batchData = [];
  const log = [];

  for (const u of UPDATES) {
    let found = false;
    rows.forEach((row, idx) => {
      const mentorEmail = row[2]?.trim().toLowerCase();
      const slug        = row[4]?.trim();
      if (mentorEmail === u.mentorEmail.toLowerCase() && slug === u.menteeSlug) {
        const sheetRow = idx + 2;
        batchData.push({ range: `${TAB}!F${sheetRow}`, values: [[u.newStatus]] });
        if (u.note) batchData.push({ range: `${TAB}!H${sheetRow}`, values: [[u.note]] });
        log.push(`✅ ${u.mentorEmail} → ${u.menteeSlug}: ${u.newStatus}`);
        found = true;
      }
    });
    if (!found) log.push(`❌ NOT FOUND: ${u.mentorEmail} → ${u.menteeSlug}`);
  }

  if (batchData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: batchData },
    });
  }

  return res.status(200).json({ ok: true, log });
}
