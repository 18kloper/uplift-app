// GET /api/admin/pending-assignments
// Returns all rows from "Mentor Confirmations" where status = "pending"
// i.e. an admin-approved match that hasn't been sent/confirmed yet.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const MENTEE_MAP = Object.fromEntries(MENTEES.map(m => [m.slug, m]));

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ pending: [] });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets.some(s => s.properties.title === TAB);
    if (!exists) return res.status(200).json({ pending: [] });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:H500`,
    });

    const rows = result.data.values || [];
    // Cols: ThreadID(0), MentorName(1), MentorEmail(2), MenteeName(3), MenteeSlug(4), Status(5), UpdatedAt(6), Notes(7)
    const mapRow = r => {
      const notes = r[7]?.trim() || "";
      const isRematch = notes.includes("2nd match");
      const prevMentorMatch = notes.match(/prev mentor non-responsive: (.+)$/);
      return {
        threadId:    r[0]?.trim() || "",
        mentorName:  r[1]?.trim() || "",
        mentorEmail: r[2]?.trim() || "",
        menteeName:  r[3]?.trim() || "",
        menteeSlug:  r[4]?.trim() || "",
        updatedAt:   r[6]?.trim() || "",
        adminAssigned: (r[0] || "").startsWith("admin-match-"),
        isRematch,
        prevMentor: prevMentorMatch ? prevMentorMatch[1] : "",
      };
    };

    const pending    = rows.filter(r => r[5]?.trim().toLowerCase() === "pending").map(mapRow);
    // "sent" = emailed but no reply yet (awaiting response)
    const sent       = rows.filter(r => r[5]?.trim().toLowerCase() === "sent").map(mapRow);
    // "confirmed" = mentor has replied and accepted
    const confirmed  = rows.filter(r => r[5]?.trim().toLowerCase() === "confirmed").map(mapRow);
    // "all sent" = sent + confirmed (for history display)
    const allSent    = rows.filter(r => ["sent","confirmed"].includes(r[5]?.trim().toLowerCase())).map(mapRow);
    const confirmedSlugs = new Set(rows.filter(r => r[5]?.trim().toLowerCase() === "confirmed").map(r => r[4]?.trim()));
    const sentSlugs = new Set(rows.filter(r => r[5]?.trim().toLowerCase() === "sent").map(r => r[4]?.trim()));
    const needsMatch = rows
      .filter(r => r[5]?.trim().toLowerCase() === "needs-match")
      .filter(r => !confirmedSlugs.has(r[4]?.trim()) && !sentSlugs.has(r[4]?.trim()))
      .map(mapRow);

    // Group by mentorName
    const groupByMentor = list => {
      const byMentor = {};
      for (const row of list) {
        if (!byMentor[row.mentorName]) {
          byMentor[row.mentorName] = {
            mentorName: row.mentorName,
            mentorEmail: row.mentorEmail,
            mentees: [],
            adminAssigned: row.adminAssigned,
          };
        }
        const menteeData = MENTEE_MAP[row.menteeSlug] || {};
        byMentor[row.mentorName].mentees.push({
          name: row.menteeName,
          slug: row.menteeSlug,
          updatedAt: row.updatedAt,
          isRematch: row.isRematch,
          prevMentor: row.prevMentor,
          company: menteeData.company || "",
          stage: menteeData.stage || "",
          industry: menteeData.industry || "",
          primaryFocus: menteeData.primaryFocus || "",
          secondaryFoci: menteeData.secondaryFoci || [],
          first: menteeData.first || "",
        });
        if (row.adminAssigned) byMentor[row.mentorName].adminAssigned = true;
      }
      return Object.values(byMentor);
    };

    // needsMatch: flat list of mentees (not grouped by mentor — they're unassigned)
    const needsMatchMentees = needsMatch.map(row => {
      const menteeData = MENTEE_MAP[row.menteeSlug] || {};
      return {
        name: row.menteeName,
        slug: row.menteeSlug,
        prevMentor: row.mentorName,
        company: menteeData.company || "",
        stage: menteeData.stage || "",
        industry: menteeData.industry || "",
        primaryFocus: menteeData.primaryFocus || "",
      };
    });

    return res.status(200).json({ pending: groupByMentor(pending), sent: groupByMentor(sent), confirmed: groupByMentor(confirmed), allSent: groupByMentor(allSent), needsMatch: needsMatchMentees });
  } catch (err) {
    console.error("pending-assignments error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
