// POST /api/admin/fall-match
// Body: { action: "match" | "unmatch", mentee: {id, name, email}, mentor: {id, name, email}, note? }
//
// The live match store for fall: one FallMatches sheet tab, append-only with
// status flips. Rolling by design; applicants stream in from Typeform on every
// admin load, matches get recorded here as they're made, and unmatching just
// marks the row unmatched (full history preserved).

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "FallMatches";
const HEADERS = ["Matched At", "Mentee Id", "Mentee Name", "Mentee Email", "Mentor Id", "Mentor Name", "Mentor Email", "Status", "Note"];

async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some(sh => sh.properties?.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { action, mentee, mentor, note } = req.body || {};
  if (!action || !mentee?.id || !mentor?.id) {
    return res.status(400).json({ error: "Missing action, mentee.id, or mentor.id" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    await ensureTab(sheets, spreadsheetId);

    if (action === "match") {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:I`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            new Date().toISOString(),
            mentee.id, mentee.name || "", mentee.email || "",
            mentor.id, mentor.name || "", mentor.email || "",
            "matched", note || "",
          ]],
        },
      });
      return res.status(200).json({ ok: true, action: "match" });
    }

    if (action === "unmatch") {
      const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A:I` });
      const rows = read.data.values || [];
      const updates = [];
      rows.forEach((row, i) => {
        if (i > 0 && row[1] === mentee.id && row[4] === mentor.id && row[7] === "matched") {
          updates.push({ range: `${TAB}!H${i + 1}`, values: [["unmatched"]] });
        }
      });
      if (updates.length) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: "USER_ENTERED", data: updates },
        });
      }
      return res.status(200).json({ ok: true, action: "unmatch", rowsFlipped: updates.length });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("[fall-match] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
