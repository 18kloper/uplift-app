// One-shot: add Annalyce Dagostino-Gavin to Mentor Confirmations as needs-match
// She is an active, onboarded mentee with no mentor row at all.
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";

  // Check if she already has a row
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });
  const rows = result.data.values || [];
  const exists = rows.some(r => r[4]?.trim() === "annalyce-dagostino-gavin");

  if (exists) {
    return res.status(200).json({ ok: true, log: ["Row already exists — skipped"] });
  }

  const now = new Date().toISOString();
  const newRow = [
    "admin-match-annalyce-dagostino-gavin",
    "",
    "",
    "Annalyce Dagostino-Gavin",
    "annalyce-dagostino-gavin",
    "needs-match",
    now,
    "active mentee — no mentor assigned yet",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB}!A:H`,
    valueInputOption: "RAW",
    requestBody: { values: [newRow] },
  });

  return res.status(200).json({ ok: true, log: ["Added Annalyce Dagostino-Gavin as needs-match"] });
}
