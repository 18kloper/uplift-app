// One-shot: mark Shounak Thaker as churned
// 1. Sets Mentor Confirmations: Bruno Bilik → shounak-thaker to needs-match
// 2. Sets Milestone Dashboard: shounak-thaker → churned
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();
  const log = [];

  // 1. Mentor Confirmations
  const confResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Mentor Confirmations!A2:H500`,
  });
  const rows = confResult.data.values || [];
  const updates = [];
  rows.forEach((row, idx) => {
    if (row[4]?.trim() === "shounak-thaker") {
      const sheetRow = idx + 2;
      updates.push({ range: `Mentor Confirmations!F${sheetRow}`, values: [["needs-match"]] });
      updates.push({ range: `Mentor Confirmations!G${sheetRow}`, values: [[now]] });
      updates.push({ range: `Mentor Confirmations!H${sheetRow}`, values: [["mentee churned"]] });
      log.push(`Mentor Confirmations row ${sheetRow}: shounak-thaker → needs-match`);
    }
  });
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  // 2. Milestone Dashboard
  const dashResult = await sheets.spreadsheets.values.get({ spreadsheetId, range: `Milestone Dashboard!1:500` });
  const dashRows = dashResult.data.values || [];
  const headers = dashRows[0] || [];
  const slugIdx = headers.findIndex(h => (h || "").toLowerCase().includes("slug"));
  let overrideIdx = headers.findIndex(h => (h || "").toLowerCase().includes("status override"));
  if (overrideIdx === -1) overrideIdx = headers.length;

  for (let i = 1; i < dashRows.length; i++) {
    if (dashRows[i][slugIdx]?.trim() === "shounak-thaker") {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Milestone Dashboard!${col(overrideIdx)}${i + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [["churned"]] },
      });
      log.push(`Milestone Dashboard row ${i + 1}: shounak-thaker → churned`);
      break;
    }
  }

  return res.status(200).json({ ok: true, log });
}

function col(idx) {
  let r = "", n = idx + 1;
  while (n > 0) { const rem = (n - 1) % 26; r = String.fromCharCode(65 + rem) + r; n = Math.floor((n - 1) / 26); }
  return r;
}
