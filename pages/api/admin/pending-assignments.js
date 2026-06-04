// GET /api/admin/pending-assignments
// Returns all rows from "Mentor Confirmations" where status = "pending"
// i.e. an admin-approved match that hasn't been sent/confirmed yet.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
      range: `${TAB}!A2:G500`,
    });

    const rows = result.data.values || [];
    // Cols: ThreadID(0), MentorName(1), MentorEmail(2), MenteeName(3), MenteeSlug(4), Status(5), UpdatedAt(6)
    const pending = rows
      .filter(r => r[5]?.trim().toLowerCase() === "pending")
      .map(r => ({
        threadId:    r[0]?.trim() || "",
        mentorName:  r[1]?.trim() || "",
        mentorEmail: r[2]?.trim() || "",
        menteeName:  r[3]?.trim() || "",
        menteeSlug:  r[4]?.trim() || "",
        updatedAt:   r[6]?.trim() || "",
        adminAssigned: (r[0] || "").startsWith("admin-match-"),
      }));

    // Group by mentorName so we can show all mentees per mentor together
    const byMentor = {};
    for (const row of pending) {
      if (!byMentor[row.mentorName]) {
        byMentor[row.mentorName] = {
          mentorName: row.mentorName,
          mentorEmail: row.mentorEmail,
          mentees: [],
          adminAssigned: row.adminAssigned,
        };
      }
      byMentor[row.mentorName].mentees.push({
        name: row.menteeName,
        slug: row.menteeSlug,
        updatedAt: row.updatedAt,
      });
      if (row.adminAssigned) byMentor[row.mentorName].adminAssigned = true;
    }

    return res.status(200).json({ pending: Object.values(byMentor) });
  } catch (err) {
    console.error("pending-assignments error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
