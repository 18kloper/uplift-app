// One-shot: confirm Stephen Makinen → andrea-vernengo
// Replied June 8: "I confirm that I can satisfy the two specified requirements. 
// I look forward to supporting this program and my paired mentee, Andrea Vernengo."
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

    if (email === "stephen.makinen@gmail.com" && slug === "andrea-vernengo") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
        { range: `${TAB}!H${rowNum}`, values: [["confirmed June 8 — 'I look forward to supporting my paired mentee, Andrea Vernengo'"]] },
      );
      log.push("Stephen Makinen → andrea-vernengo: confirmed");
    }
  });

  if (updates.length === 0) return res.status(200).json({ ok: true, log: ["No rows matched"] });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, log });
}
