// One-shot:
// 1. Decline Anand Rai → nina-mladenovski (stale candidate row, Nina matched with Miquel)
// 2. Move mark-kallback to needs-match (Felicia non-responsive)
// 3. Mark Felicia Palmer as non-responsive
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:H500` });
  const rows = result.data.values || [];
  const log = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const slug = row[4]?.trim();
    const mentorEmail = row[2]?.trim().toLowerCase();
    const sheetRow = idx + 2;

    // 1. Decline Anand → nina-mladenovski
    if (mentorEmail === "arai2@stevens.edu" && slug === "nina-mladenovski") {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["declined"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Stale candidate row — Nina matched with Miquel de Quadras"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: Anand → nina-mladenovski → declined`);
    }

    // 2. Mark Kallback → needs-match
    if (slug === "mark-kallback") {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["needs-match"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Felicia Palmer non-responsive — Mark needs new mentor"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: mark-kallback → needs-match`);
    }

    // 3. Felicia Palmer → non-responsive
    if (mentorEmail === "felicia@tapyoca.com") {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: [
          { range: `${TAB}!F${sheetRow}`, values: [["no-reply"]] },
          { range: `${TAB}!G${sheetRow}`, values: [[now]] },
          { range: `${TAB}!H${sheetRow}`, values: [["Non-responsive — no confirmation received"]] },
        ]},
      });
      log.push(`Row ${sheetRow}: Felicia Palmer → no-reply`);
    }
  }

  // Append any not found
  const found = log.map(l => l);
  if (!found.some(l => l.includes("mark-kallback"))) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [["admin-needs-match-mark-kallback", "Felicia Palmer", "felicia@tapyoca.com", "Mark Kallback", "mark-kallback", "needs-match", now, "Felicia Palmer non-responsive — Mark needs new mentor"]] },
    });
    log.push("Appended: mark-kallback → needs-match");
  }
  if (!found.some(l => l.includes("Felicia Palmer → no-reply"))) {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:H`, valueInputOption: "RAW",
      requestBody: { values: [["admin-no-reply-felicia", "Felicia Palmer", "felicia@tapyoca.com", "", "", "no-reply", now, "Non-responsive — no confirmation received"]] },
    });
    log.push("Appended: Felicia Palmer → no-reply");
  }

  return res.status(200).json({ ok: true, log });
}
