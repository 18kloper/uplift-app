// GET /api/get-peer-statuses
// Returns { statuses: { [pairKey]: { status, plannedAt, connectedAt, skippedAt } } }

import { getSheetsClient } from "../../lib/sheets-helper";

const SHEET_NAME = "Peer Connections";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ statuses: {} });
  }

  try {
    const sheets = getSheetsClient();
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:I`,
    });

    const rows = read.data.values || [];
    const statuses = {};

    // Row 0 is header
    // A=pairKey, B=Founder1, C=Founder2, D=Theme, E=Status, F=Updated, G=plannedAt, H=connectedAt, I=skippedAt
    for (let i = 1; i < rows.length; i++) {
      const [pairKey, , , , status, , plannedAt, connectedAt, skippedAt] = rows[i];
      if (pairKey) {
        statuses[pairKey] = {
          status:      status      || null,
          plannedAt:   plannedAt   || null,
          connectedAt: connectedAt || null,
          skippedAt:   skippedAt   || null,
        };
      }
    }

    return res.status(200).json({ statuses });
  } catch (err) {
    console.error("get-peer-statuses error:", err.message);
    return res.status(200).json({ statuses: {} });
  }
}
