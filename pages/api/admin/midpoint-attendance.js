// GET /api/admin/midpoint-attendance
// Returns midpoint-meetup attendance for the full cohort:
//   - attendees with a Luma record (checked_in / registered) + their review status
//   - mentees with NO record at all (so admin can see who's missing)
// Used by the Midpoint Attendance panel on /admin.

import { getSheetsClient } from "../../../lib/sheets-helper";
import { classifyEvent, getAllMilestones } from "../../../lib/luma-helper";
import { MENTEES } from "../../../lib/mentees";

const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);
const LUMA_ATTENDANCE_SHEET = "LumaAttendance";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(500).json({ error: "Google Sheets not configured" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read all LumaAttendance rows directly
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${LUMA_ATTENDANCE_SHEET}!A:N`,
    });
    const [header, ...rows] = r.data.values || [];

    const milestones = await getAllMilestones(sheets, spreadsheetId);

    // Cols: A=timestamp,B=hookType,C=eventName,D=eventId,E=eventDate,
    //       F=menteeName,G=menteeSlug,H=email,I=status,J=matchedBy,
    //       K=rawStatus,L=joinedAt,M=reviewStatus,N=reviewedAt
    const midpointRows = (rows || [])
      .map(row => ({
        eventName:    row[2] || "",
        eventId:      row[3] || "",
        eventDate:    row[4] || "",
        menteeName:   row[5] || "",
        menteeSlug:   row[6] || "",
        status:       row[8] || "",
        joinedAt:     row[11] || "",
        reviewStatus: row[12] || "",
      }))
      .filter(x => classifyEvent(x.eventName) === "midpoint")
      .filter(x => x.menteeSlug && !TEST_SLUGS.has(x.menteeSlug));

    // Dedup by slug (keep best record: checked_in > registered, approved > pending)
    const bySlug = {};
    for (const row of midpointRows) {
      const existing = bySlug[row.menteeSlug];
      if (!existing) { bySlug[row.menteeSlug] = row; continue; }
      const rank = s => (s.reviewStatus === "approved" ? 3 : s.status === "checked_in" ? 2 : 1);
      if (rank(row) > rank(existing)) bySlug[row.menteeSlug] = row;
    }

    // Build a row per non-churned mentee
    const records = MENTEES
      .filter(m => !TEST_SLUGS.has(m.slug))
      .map(m => {
        const rec = bySlug[m.slug];
        const milestoneSet = milestones[m.slug]?.midpoint === true;
        return {
          slug: m.slug,
          name: `${m.first} ${m.last}`.trim(),
          cohort: m.cohort,
          eventName:    rec?.eventName || "",
          eventId:      rec?.eventId || "",
          eventDate:    rec?.eventDate || "",
          status:       rec?.status || "none",        // checked_in | registered | none
          joinedAt:     rec?.joinedAt || "",
          reviewStatus: rec?.reviewStatus || "",      // approved | denied | pending | ""
          milestoneSet,
        };
      });

    const attended  = records.filter(r => r.status === "checked_in");
    const registered = records.filter(r => r.status === "registered");
    const noRecord  = records.filter(r => r.status === "none");
    const eventId = midpointRows[0]?.eventId || "";
    const eventName = midpointRows[0]?.eventName || "";

    return res.status(200).json({
      eventId, eventName,
      records, attended, registered, noRecord,
      counts: {
        attended: attended.length,
        registered: registered.length,
        noRecord: noRecord.length,
        approved: records.filter(r => r.reviewStatus === "approved" || r.milestoneSet).length,
      },
    });
  } catch (err) {
    console.error("[midpoint-attendance] error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
