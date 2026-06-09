// POST /api/submit-resource
// Appends a mentor-submitted resource to the "Resource Submissions" tab in Google Sheets.
// Row format: Timestamp | Status | Type | Title | URL | Note | MentorSlug

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, title, url, note, mentorSlug } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    // No sheets config — still return success so the UI works in dev
    console.log("No Google Sheets config — resource not saved:", { type, title, url, note });
    return res.status(200).json({ ok: true, saved: false });
  }

  try {
    const sheets = getSheetsClient();
    const TAB = "Resource Submissions";

    // Ensure header row exists
    try {
      const check = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TAB}!A1:G1`,
      });
      if (!check.data.values || check.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${TAB}!A1:G1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [["Timestamp", "Status", "Type", "Title", "URL", "Note", "Mentor"]],
          },
        });
      }
    } catch (_) {
      // Tab may not exist yet — append will create rows but not the tab itself
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:G`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          new Date().toISOString(),
          "Pending",
          type || "Other",
          title,
          url || "",
          note || "",
          mentorSlug || "",
        ]],
      },
    });

    return res.status(200).json({ ok: true, saved: true });
  } catch (err) {
    console.error("submit-resource error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
