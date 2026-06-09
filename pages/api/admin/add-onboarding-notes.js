// One-shot: adds "Notes" header to Milestone Dashboard if missing, then writes
// onboarding check-in notes for 11 mentees (June 8 follow-up).
import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Milestone Dashboard";

const NOTES = {
  "gunjan-aggarwal":  "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "idongesit-obeya":  "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "jasmin-jones":     "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "jimmy-bastien":    "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "justin-savage":    "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "saurabh-gandhe":  "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "sharon-joseph":    "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "shippy-singh":     "Onboarding check-in email sent 2026-06-08 - not yet marked attended. Awaiting reply.",
  "harshil-thakkar":  "Kennedy spoke with directly re: onboarding 2026-06-08 - no email sent.",
  "maab-iqbal":       "Kennedy already connected directly re: onboarding 2026-06-08 - no email sent.",
  "mehul-sompura":    "Kennedy spoke with directly re: onboarding 2026-06-08 - no email sent.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Read header row
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!1:1`,
  });
  let headers = headerRes.data.values?.[0] || [];

  // Add Notes column if missing
  let notesColIdx = headers.findIndex(h => h?.toLowerCase() === "notes");
  if (notesColIdx < 0) {
    notesColIdx = headers.length;
    const col = String.fromCharCode(65 + notesColIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!${col}1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Notes"]] },
    });
  }

  const col = notesColIdx < 26
    ? String.fromCharCode(65 + notesColIdx)
    : "A" + String.fromCharCode(65 + (notesColIdx - 26));

  // Read slug column (A)
  const slugRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A:A`,
  });
  const slugRows = slugRes.data.values || [];

  const updates = [];
  const log = [];

  for (const [slug, note] of Object.entries(NOTES)) {
    const rowIdx = slugRows.findIndex((r, i) => i > 0 && r[0] === slug);
    if (rowIdx < 0) {
      log.push(`${slug}: NOT FOUND in sheet`);
      continue;
    }
    const rowNum = rowIdx + 1;
    updates.push({ range: `${TAB}!${col}${rowNum}`, values: [[note]] });
    log.push(`${slug}: note written`);
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  return res.status(200).json({ ok: true, log });
}
