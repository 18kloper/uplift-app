// One-shot: confirm Kenneth Jones → radha-ratnala, Miquel de Quadras → nina-mladenovski
// Also reassign Clare DeNicola → nina-mladenovski (Miquel took her)
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

    // Kenneth Jones → radha-ratnala: confirmed
    if (email === "kenjonesnj@gmail.com" && slug === "radha-ratnala") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Kenneth Jones → radha-ratnala: confirmed");
    }

    // Miquel de Quadras → nina-mladenovski: confirmed
    if (email === "mquadras@atomian.com" && slug === "nina-mladenovski") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Miquel de Quadras → nina-mladenovski: confirmed");
    }

    // Miquel de Quadras → jerry-primus: needs-match (he chose Nina only)
    if (email === "mquadras@atomian.com" && slug === "jerry-primus") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["needs-match"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
        { range: `${TAB}!H${rowNum}`, values: [["mentor chose Nina Mladenovski only"]] },
      );
      log.push("Miquel de Quadras → jerry-primus: needs-match");
    }

    // Clare DeNicola → nina-mladenovski: reassigned (Miquel confirmed Nina)
    if (email === "clare.denicola@the10company.com" && slug === "nina-mladenovski") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["reassigned"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
        { range: `${TAB}!H${rowNum}`, values: [["reassigned — Miquel de Quadras confirmed Nina Mladenovski"]] },
      );
      log.push("Clare DeNicola → nina-mladenovski: reassigned (Miquel took her)");
    }
  });

  if (updates.length === 0) return res.status(200).json({ ok: true, log: ["No rows matched"] });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, log });
}
