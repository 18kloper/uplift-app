// One-shot: confirm Anand Rai → evan-peneiras
// Kennedy already replied confirming him for Evan on June 5
import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const email = row[2]?.trim().toLowerCase();
    const slug  = row[4]?.trim();

    // Anand Rai → evan-peneiras: confirmed (Kennedy confirmed June 5)
    if (email === "arai2@stevens.edu" && slug === "evan-peneiras") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
        { range: `${TAB}!H${rowNum}`, values: [["confirmed June 5 — chose Evan as first pick"]] },
      );
      log.push("Anand Rai → evan-peneiras: confirmed");
    }
  });

  if (updates.length === 0) return res.status(200).json({ ok: true, log: ["No rows matched"] });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, log });
}
