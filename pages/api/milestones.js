// GET /api/milestones?slug=pearl-gabel
//
// Reads the Dashboard tab and returns live milestone status for one mentee.
// The admin checks/unchecks boxes in the Dashboard tab → portal reflects it instantly.

import { getSheetsClient, MILESTONE_KEYS } from "../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ milestones: null });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read full Dashboard — A:Z covers all milestones regardless of count
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Dashboard!A:Z",
    });

    const rows = response.data.values || [];
    // Row 0 = headers, rows 1+ = mentees
    const menteeRow = rows.find((row, i) => i > 0 && row[0] === slug);

    if (!menteeRow) {
      return res.status(200).json({ milestones: null });
    }

    // Columns G onward (index 6+) are the milestone checkboxes
    const milestones = {};
    MILESTONE_KEYS.forEach((key, idx) => {
      const val = menteeRow[6 + idx];
      milestones[key] = val === "TRUE" || val === true;
    });

    return res.status(200).json({ milestones });
  } catch (err) {
    console.error("Milestones read failed:", err.message);
    return res.status(200).json({ milestones: null });
  }
}
