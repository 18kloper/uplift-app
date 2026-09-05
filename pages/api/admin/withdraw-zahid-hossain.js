// One-shot: pull Md. Zahid Hossain (mentor dn6au7tg…, UF2630) out of Fall 2026.
//
// He is the only mentor in the fall pool whose application predates
// MENTOR_FALL_CUTOFF (submitted 2026-06-27, cutoff 2026-08-10). He is in the
// pool only because an approve click overrode the era filter in keep().
//
// Two writes, both reversible:
//   FallMatches   — his row with Brittany Payton flips "matched" → "unmatched"
//   FallMentors   — append a "rejected" decision row (keeps him on the board;
//                   "clear" would hide him entirely behind the era cutoff)
//
// POST with {"dryRun": true} to see the exact rows first.
// Auth: ?token=<ADMIN_SECRET>. Already run on 2026-09-05; kept as the record
// of what was changed and so it can be re-read, not because it needs re-running.
import { getSheetsClient } from "../../../lib/sheets-helper";

const MENTOR_ID = "dn6au7tgegldifdn6auvye7fsul4z3aj";
const MENTOR_NAME = "Md. Zahid Hossain";
const REASON = "Withdrawn 2026-09-05: pre-cutoff application, out-of-region, blank give/get.";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const dryRun = req.body?.dryRun !== false;
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();
  const log = [];

  // 1. FallMatches: unmatch. Column H (index 7) is the "matched" status.
  const mr = await sheets.spreadsheets.values.get({ spreadsheetId, range: "FallMatches!A2:I1000" });
  const rows = mr.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][4]?.trim() !== MENTOR_ID) continue;
    const sheetRow = i + 2;
    log.push(`FallMatches row ${sheetRow}: ${rows[i][2]} ↔ ${rows[i][5]} — status "${rows[i][7]}" → "unmatched"`);
    if (!dryRun) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `FallMatches!H${sheetRow}`, values: [["unmatched"]] },
          { range: `FallMatches!I${sheetRow}`, values: [[REASON]] },
        ]},
      });
    }
  }

  // 2. FallMentors: append a rejected decision. Column B is the response id,
  //    E the decision, F the Uplift ID (left blank; findExistingId carries it).
  const dr = await sheets.spreadsheets.values.get({ spreadsheetId, range: "FallMentors!A2:F2000" });
  const drows = dr.data.values || [];
  const existing = drows.filter(r => r[1]?.trim() === MENTOR_ID);
  log.push(`FallMentors: ${existing.length} existing row(s), latest decision "${existing.at(-1)?.[4]}" → appending "rejected"`);
  if (!dryRun) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: "FallMentors!A:F", valueInputOption: "RAW",
      requestBody: { values: [[now, MENTOR_ID, MENTOR_NAME, REASON, "rejected", ""]] },
    });
  }

  return res.status(200).json({ ok: true, dryRun, log });
}
