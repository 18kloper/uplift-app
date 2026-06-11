// Diagnostic: show ALL andrea-vernengo rows across ALL ranges, and pending-assignments needsMatch
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Check Mentor Confirmations — full range
  const conf = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Mentor Confirmations!A2:H600" });
  const confRows = (conf.data.values || []).map((r, i) => ({ row: i + 2, threadId: r[0], mentor: r[1], slug: r[4], status: r[5] }))
    .filter(r => (r.slug || "").includes("andrea") || (r.mentor || "").includes("andrea") || (r.mentor || "").includes("Stephen"));

  // Check Mentor Selections tab
  let selRows = [];
  try {
    const sel = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Mentor Selections!A2:I200" });
    selRows = (sel.data.values || []).map((r, i) => ({ row: i + 2, slug: r[0], mentor: r[6] }))
      .filter(r => (r.slug || "").includes("andrea"));
  } catch (_) {}

  return res.status(200).json({ confRows, selRows });
}
