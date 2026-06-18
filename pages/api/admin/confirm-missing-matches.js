// One-shot: confirm missing mentor matches in Mentor Confirmations sheet
// Felicia Palmer → Alisha Sharma
// Andrew Jacobs → Gifty Anane
// Basia Walska → Alina Okun
// Kenneth Jones → Radha Ratnala, Rajesh Ivaturi
import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";
const MATCHES = [
  { mentorName: "Felicia Palmer",  mentorEmail: "felicia@tapyoca.com",        menteeName: "Alisha Sharma",    slug: "alisha-sharma" },
  { mentorName: "Andrew Jacobs",   mentorEmail: "andrew@jacobs-ventures.com", menteeName: "Gifty Anane",      slug: "gifty-anane" },
  { mentorName: "Basia Walska",    mentorEmail: "walskab@gmail.com",          menteeName: "Alina Okun",       slug: "alina-okun" },
  { mentorName: "Kenneth Jones",   mentorEmail: "kenjonesnj@gmail.com",       menteeName: "Radha Ratnala",    slug: "radha-ratnala" },
  { mentorName: "Kenneth Jones",   mentorEmail: "kenjonesnj@gmail.com",       menteeName: "Rajesh Ivaturi",   slug: "rajesh-ivaturi" },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const today = new Date().toISOString().split("T")[0];

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];

  for (const m of MATCHES) {
    const exists = rows.some(r =>
      r[4]?.trim() === m.slug &&
      r[1]?.trim() === m.mentorName &&
      r[5]?.trim().toLowerCase() !== "needs-match"
    );
    if (exists) { log.push(`Already exists: ${m.mentorName} → ${m.slug}`); continue; }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:H`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          `admin-confirmed-${m.slug}-${m.mentorEmail.split("@")[0]}`,
          m.mentorName,
          m.mentorEmail,
          m.menteeName,
          m.slug,
          "confirmed",
          today,
          "Admin confirmed match",
        ]],
      },
    });
    log.push(`Confirmed: ${m.mentorName} → ${m.slug}`);
  }

  return res.status(200).json({ ok: true, log });
}
