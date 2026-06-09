// One-shot: add "sent" rows to Mentor Confirmations for mentors who were emailed but haven't replied
// and have no rows in the sheet yet — so their mentees show up in the admin UI
import { getSheetsClient } from "../../../lib/sheets-helper";

const ROWS_TO_ADD = [
  // Clare DeNicola — the10company
  { mentorName: "Clare DeNicola", mentorEmail: "clare.denicola@the10company.com", menteeName: "Nina Mladenovski", menteeSlug: "nina-mladenovski", note: "email sent via customerio" },
  { mentorName: "Clare DeNicola", mentorEmail: "clare.denicola@the10company.com", menteeName: "Logan Jones", menteeSlug: "logan-jones", note: "email sent via customerio" },
  // Connie Pascal — Rutgers
  { mentorName: "Connie Pascal", mentorEmail: "cpascal@comminfo.rutgers.edu", menteeName: "Alok Rai", menteeSlug: "alok-rai", note: "email sent via customerio" },
  { mentorName: "Connie Pascal", mentorEmail: "cpascal@comminfo.rutgers.edu", menteeName: "Britney Medich", menteeSlug: "britney-medich", note: "email sent via customerio" },
  // Dee Marshall — AI Training Plus
  { mentorName: "Dee Marshall", mentorEmail: "dee.c.marshall@aitrainingplus.com", menteeName: "Stephanie Cwynar", menteeSlug: "stephanie-cwynar", note: "email sent via customerio" },
  { mentorName: "Dee Marshall", mentorEmail: "dee.c.marshall@aitrainingplus.com", menteeName: "Jeremy Ruiz Villavicencio", menteeSlug: "jeremy-ruiz-villavicencio", note: "email sent via customerio" },
  // Dennis Yuscavitch — Accrete Inc.
  { mentorName: "Dennis Yuscavitch", mentorEmail: "dyuscavitch@gmail.com", menteeName: "Abhi Ray", menteeSlug: "abhi-ray", note: "email sent via customerio" },
  { mentorName: "Dennis Yuscavitch", mentorEmail: "dyuscavitch@gmail.com", menteeName: "Kevin Navarro", menteeSlug: "kevin-navarro", note: "email sent via customerio" },
  // Malak Atut — Yalla Now AI
  { mentorName: "Malak Atut", mentorEmail: "malakatut@gmail.com", menteeName: "Angie Tirado", menteeSlug: "angie-tirado", note: "email sent via customerio" },
  { mentorName: "Malak Atut", mentorEmail: "malakatut@gmail.com", menteeName: "Mohammad Saleh Nikoopayan Tak", menteeSlug: "mohammad-saleh-nikoopayan-tak", note: "email sent via customerio" },
  // Rikin Diwan — lowercaseb2b / popform
  { mentorName: "Rikin Diwan", mentorEmail: "rikin@lowercaseb2b.com", menteeName: "Lina Escobar", menteeSlug: "lina-escobar", note: "email sent via customerio" },
  { mentorName: "Rikin Diwan", mentorEmail: "rikin@lowercaseb2b.com", menteeName: "Alisha Sharma", menteeSlug: "alisha-sharma", note: "email sent via customerio" },
  // Sid Nag — Tekonyx (Sarah Inoue now confirmed with Christina Dorando; keeping for record)
  { mentorName: "Sid Nag", mentorEmail: "sid@tekonyx.com", menteeName: "Shippy Singh", menteeSlug: "shippy-singh", note: "email sent via customerio" },
  // Felicia Palmer — tapyoca Inc
  { mentorName: "Felicia Palmer", mentorEmail: "felicia@tapyoca.com", menteeName: "Victoria Hosendorf", menteeSlug: "victoria-hosendorf", note: "email sent via customerio" },
  { mentorName: "Felicia Palmer", mentorEmail: "felicia@tapyoca.com", menteeName: "Mark Kallback", menteeSlug: "mark-kallback", note: "email sent via customerio" },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";

  // Get existing rows to avoid duplicates
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const existing = result.data.values || [];

  const existingKeys = new Set(
    existing.map(r => `${(r[2]||"").trim().toLowerCase()}|${(r[4]||"").trim()}`)
  );

  const newRows = [];
  const log = [];
  const now = new Date().toISOString();

  for (const entry of ROWS_TO_ADD) {
    const key = `${entry.mentorEmail.toLowerCase()}|${entry.menteeSlug}`;
    if (existingKeys.has(key)) {
      log.push(`SKIP (exists): ${entry.mentorName} → ${entry.menteeName}`);
    } else {
      const threadId = `admin-match-${entry.menteeSlug}`;
      newRows.push([threadId, entry.mentorName, entry.mentorEmail, entry.menteeName, entry.menteeSlug, "sent", now, entry.note]);
      log.push(`ADD: ${entry.mentorName} → ${entry.menteeName}`);
    }
  }

  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:H`,
      valueInputOption: "RAW",
      requestBody: { values: newRows },
    });
  }

  return res.status(200).json({ ok: true, added: newRows.length, log });
}
