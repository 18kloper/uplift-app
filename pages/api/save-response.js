// POST /api/save-response
// Body: { slug, weekNum, fieldKey, value }
//
// Appends or updates a row in your Google Sheet.
// Each row: [timestamp, slug, weekNum, fieldKey, value]
//
// Required env vars (set in Vercel dashboard or .env.local):
//   GOOGLE_SHEET_ID       — the ID from your sheet URL
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_PRIVATE_KEY    — the full private key (with \n as literal backslash-n)

import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug, weekNum, fieldKey, value } = req.body;

  if (!slug || !weekNum || !fieldKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Skip if Google Sheets is not configured (graceful degradation)
  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    console.warn("Google Sheets env vars not set — skipping sheet write");
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Vercel stores \n as literal \\n — this restores real newlines
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const timestamp = new Date().toISOString();
    const row = [timestamp, slug, `Week ${weekNum}`, fieldKey, value || ""];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Responses!A:E",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Sheet write failed:", err.message);
    // Don't surface errors to the client — localStorage is the source of truth
    return res.status(200).json({ ok: true, sheetError: true });
  }
}
