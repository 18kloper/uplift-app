// TEMPORARY one-off: import manually-exported Luma "Guests" CSVs and mark
// checked-in guests as verified attendance. Used when the Luma API export
// isn't available and someone downloads the CSV from the Luma dashboard
// instead. Safe to delete once this backfill is done.
//
// POST body: {
//   dryRun: boolean,
//   events: [{ eventId, eventName, eventDate, guests: [{ name, email, hasJoined }] }]
// }
import { getSheetsClient } from "../../../lib/sheets-helper";
import {
  matchMentee,
  classifyEvent,
  logLumaAttendance,
  setNextEduMilestone,
  approveAttendance,
} from "../../../lib/luma-helper";
import { MENTEES } from "../../../lib/mentees";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const { dryRun, events } = req.body || {};
  if (!Array.isArray(events)) return res.status(400).json({ error: "events array required" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  let sheets, spreadsheetId;
  if (hasSheets && !dryRun) {
    sheets = getSheetsClient();
    spreadsheetId = process.env.GOOGLE_SHEET_ID;
  }

  const timestamp = new Date().toISOString();
  const results = [];

  for (const ev of events) {
    const eventType = classifyEvent(ev.eventName);
    for (const g of ev.guests) {
      const { slug: menteeSlug, matchedBy } = matchMentee(g.email, g.name);
      const mentee = menteeSlug ? MENTEES.find((m) => m.slug === menteeSlug) : null;
      const menteeName = mentee ? `${mentee.first} ${mentee.last}` : g.name || "";
      const status = g.hasJoined ? "checked_in" : "registered";
      const willVerify = g.hasJoined && !!menteeSlug;

      const row = {
        eventName: ev.eventName,
        eventId: ev.eventId,
        guestName: g.name,
        email: g.email,
        menteeSlug,
        matchedBy,
        status,
        willVerify,
      };

      if (!dryRun && hasSheets) {
        try {
          await logLumaAttendance(
            sheets,
            spreadsheetId,
            [
              timestamp,
              "csv-import",
              ev.eventName,
              ev.eventId,
              ev.eventDate || "",
              menteeName,
              menteeSlug || "",
              g.email || "",
              status,
              matchedBy || "",
              "",
              "",
            ],
            "pending"
          );

          if (willVerify) {
            const { ok } = await approveAttendance(sheets, spreadsheetId, ev.eventId, menteeSlug, true);
            row.approved = ok;
            if (ok && eventType === "edu") {
              row.milestone = await setNextEduMilestone(sheets, spreadsheetId, menteeSlug);
            }
          }
        } catch (err) {
          row.error = err.message;
        }
      }

      results.push(row);
    }
  }

  return res.status(200).json({ ok: true, dryRun: !!dryRun, count: results.length, results });
}
