// GET /api/get-responses?slug=xxx
// Reads all stored responses for a mentee's sheet tab.
// Used for cross-device sync: seeds localStorage on first login from a new device.
// Returns { responses: { "w1_pulse": "3", "w2_weekly_focus": "...", ... } }

import { getSheetsClient } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ responses: {} });
  }

  try {
    const sheets = getSheetsClient();
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${slug}!A:D`,
    });

    const rows = read.data.values || [];
    const responses = {};

    // Row format: A=week, B=fieldKey, C=question, D=value
    for (let i = 1; i < rows.length; i++) {
      const weekNum = rows[i][0];
      const fieldKey = rows[i][1] || "";
      const value = (rows[i][3] || "").trim();
      if (fieldKey && value && weekNum !== undefined) {
        // Key format matches localStorage: slug_w{week}_{fieldKey}
        responses[`w${weekNum}_${fieldKey}`] = value;
      }
    }

    return res.status(200).json({ responses });
  } catch (err) {
    // Tab might not exist yet (new user) — return empty gracefully
    return res.status(200).json({ responses: {} });
  }
}
