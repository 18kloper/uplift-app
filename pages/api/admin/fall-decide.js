// POST /api/admin/fall-decide
// Body: { kind: "mentee" | "mentor", applicant: { id, name, email }, decision: "approved" | "rejected" | "clear" }
//
// The decision layer over applications, stored in FallMentees / FallMentors
// (append-only; the latest row per applicant wins). Together with FallMatches
// and FallResponses this is the whole fall backend: four tabs, no per-person
// sprawl.

import { getSheetsClient } from "../../../lib/sheets-helper";

const TABS = { mentee: "FallMentees", mentor: "FallMentors" };
const HEADERS = ["Decided At", "Applicant Id", "Name", "Email", "Decision"];

async function ensureTab(sheets, spreadsheetId, TAB) {
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
  const { kind, applicant, decision } = req.body || {};
  const TAB = TABS[kind || "mentee"];
  if (!TAB || !applicant?.id || !["approved", "rejected", "clear"].includes(decision)) {
    return res.status(400).json({ error: "Missing/invalid kind, applicant.id, or decision" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    await ensureTab(sheets, spreadsheetId, TAB);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:E`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[new Date().toISOString(), applicant.id, applicant.name || "", applicant.email || "", decision]],
      },
    });
    return res.status(200).json({ ok: true, decision });
  } catch (err) {
    console.error("[fall-decide] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
