// GET /api/mentor-selections
// Returns mentor selection status for all mentees, reading from the
// "Mentor Selections" sheet tab. Creates the tab with headers if missing.

import { getSheetsClient } from "../../lib/sheets-helper";
import { MENTEES, MENTEE_EMAILS } from "../../lib/mentees";

const TAB = "Mentor Selections";
const HEADERS = ["Slug", "First", "Last", "Cohort", "Company", "Responded", "Selected Mentor", "Response Date", "Notes"];

async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  });

  const rows = [HEADERS, ...MENTEES.map(m => [
    m.slug, m.first, m.last, m.cohort, m.company || "", "No", "", "", "",
  ])];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) {
    const mentorSet = new Map();
    for (const m of MENTEES) {
      if (m.mentor?.name) mentorSet.set(m.mentor.name, m.mentor);
    }
    const mentors = [...mentorSet.values()].sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({
      mentors,
      menteeEmails: MENTEE_EMAILS,
      selections: MENTEES.map(m => ({
        slug: m.slug, first: m.first, last: m.last,
        cohort: m.cohort, company: m.company || "",
        responded: false, selectedMentor: "", responseDate: "", notes: "",
        assignedMentor: m.mentor?.name || "",
      })),
    });
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    await ensureTab(sheets, spreadsheetId);

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:I500`,
    });

    const rows = result.data.values || [];
    const bySlug = {};
    for (const row of rows) {
      const slug = row[0]?.trim();
      if (!slug) continue;
      bySlug[slug] = {
        responded:     (row[5] || "").toLowerCase() === "yes",
        selectedMentor: row[6] || "",
        responseDate:   row[7] || "",
        notes:          row[8] || "",
      };
    }

    const selections = MENTEES.map(m => ({
      slug:           m.slug,
      first:          m.first,
      last:           m.last,
      cohort:         m.cohort,
      company:        m.company || "",
      assignedMentor: m.mentor?.name || "",
      ...(bySlug[m.slug] || { responded: false, selectedMentor: "", responseDate: "", notes: "" }),
    }));

    // Unique mentor list for the dropdown
    const mentorSet = new Map();
    for (const m of MENTEES) {
      if (m.mentor?.name) mentorSet.set(m.mentor.name, m.mentor);
    }
    const mentors = [...mentorSet.values()].sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ selections, mentors, menteeEmails: MENTEE_EMAILS });
  } catch (err) {
    console.error("mentor-selections error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
