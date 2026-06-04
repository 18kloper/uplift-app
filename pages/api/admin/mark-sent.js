// POST /api/admin/mark-sent
// Marks all "pending" admin-match rows in Mentor Confirmations as "sent"
// so they no longer show as "Needs to Send" on the mentor tab.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A2:H500`,
    });

    const rows = result.data.values || [];
    const today = new Date().toISOString().slice(0, 10);
    const updates = [];

    rows.forEach((r, i) => {
      const threadId = r[0]?.trim() || "";
      const status   = r[5]?.trim().toLowerCase() || "";
      if (threadId.startsWith("admin-match-") && status === "pending") {
        updates.push({ row: i + 2 }); // +2 for header + 0-index
      }
    });

    for (const { row } of updates) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!F${row}:G${row}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["sent", today]] },
      });
    }

    return res.status(200).json({ ok: true, updated: updates.length });
  } catch (err) {
    console.error("mark-sent error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
