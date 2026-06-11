// One-shot: mark Sharon Joseph as churned
// 1. Sets status override = "churned" in Milestone Dashboard
// 2. Sets Joe Spivack → sharon-joseph row in Mentor Confirmations to "needs-match"
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();
  const log = [];

  // 1. Update Mentor Confirmations: find Joe Spivack → sharon-joseph and set needs-match
  const confResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Mentor Confirmations!A2:H500`,
  });
  const rows = confResult.data.values || [];
  const confUpdates = [];
  rows.forEach((row, idx) => {
    if (row[4]?.trim() === "sharon-joseph") {
      const sheetRow = idx + 2;
      confUpdates.push({ range: `Mentor Confirmations!F${sheetRow}`, values: [["needs-match"]] });
      confUpdates.push({ range: `Mentor Confirmations!G${sheetRow}`, values: [[now]] });
      confUpdates.push({ range: `Mentor Confirmations!H${sheetRow}`, values: [["mentee churned — never onboarded"]] });
      log.push(`Mentor Confirmations row ${sheetRow}: sharon-joseph → needs-match`);
    }
  });

  if (confUpdates.length === 0) {
    log.push("No sharon-joseph row found in Mentor Confirmations");
  } else {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: confUpdates },
    });
  }

  // 2. Update Milestone Dashboard: set Status Override = "churned" for sharon-joseph
  const dashResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Milestone Dashboard!1:500`,
  });
  const dashRows = dashResult.data.values || [];
  const headers = dashRows[0] || [];
  const slugIdx = headers.findIndex(h => (h || "").toLowerCase().includes("slug"));
  let overrideIdx = headers.findIndex(h => (h || "").toLowerCase().includes("status override"));

  // Add column if missing
  if (overrideIdx === -1) {
    overrideIdx = headers.length;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Milestone Dashboard!${colLetter(overrideIdx)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Status Override"]] },
    });
    log.push("Added 'Status Override' column to Milestone Dashboard");
  }

  for (let i = 1; i < dashRows.length; i++) {
    if (dashRows[i][slugIdx]?.trim() === "sharon-joseph") {
      const sheetRow = i + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Milestone Dashboard!${colLetter(overrideIdx)}${sheetRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [["churned"]] },
      });
      log.push(`Milestone Dashboard row ${sheetRow}: sharon-joseph → churned`);
      break;
    }
  }

  return res.status(200).json({ ok: true, log });
}

function colLetter(idx) {
  let r = "";
  let n = idx + 1;
  while (n > 0) { const rem = (n - 1) % 26; r = String.fromCharCode(65 + rem) + r; n = Math.floor((n - 1) / 26); }
  return r;
}
