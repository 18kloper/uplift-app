// Temporary debug endpoint — tests SessionReview sheet tab creation and write
// GET /api/debug-session-review

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  const results = {};

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  results.hasSheets = hasSheets;
  if (!hasSheets) return res.status(200).json({ results });

  try {
    const sheets = getSheetsClient();
    results.clientCreated = true;

    // Step 1: Get spreadsheet metadata
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
      const sheetTitles = meta.data.sheets?.map(s => s.properties.title) || [];
      results.existingTabs = sheetTitles;
      results.sessionReviewExists = sheetTitles.includes("SessionReview");
    } catch (err) {
      results.metaError = err.message;
    }

    // Step 2: Create tab if missing
    if (!results.sessionReviewExists && !results.metaError) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: "SessionReview" } } }] },
        });
        results.tabCreated = true;

        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: "SessionReview!A1:I1",
          valueInputOption: "RAW",
          requestBody: { values: [["Approved", "Slug", "Mentee Name", "Date", "60+ Min", "Has Transcript", "Key Takeaways", "Session ID", "Submitted At"]] },
        });
        results.headersWritten = true;
      } catch (err) {
        results.createTabError = err.message;
      }
    }

    // Step 3: Try writing a test row
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "SessionReview!A:I",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [["FALSE", "debug-test", "Debug Test", "2026-05-30", "No", "No", "test takeaway", "debug-session-id-001", new Date().toISOString()]] },
      });
      results.testRowWritten = true;
    } catch (err) {
      results.writeError = err.message;
    }

  } catch (err) {
    results.topLevelError = err.message;
  }

  return res.status(200).json({ results });
}
