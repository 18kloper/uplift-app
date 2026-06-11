// One-shot: mark Gifty Anane + Mark Kallback as pending with Basia Walska
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const TAB = "Mentor Confirmations";
  const now = new Date().toISOString();
  const log = [];

  const matches = [
    { mentee: "Gifty Anane", slug: "gifty-anane" },
    { mentee: "Mark Kallback", slug: "mark-kallback" },
  ];

  for (const m of matches) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:H`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          `admin-pending-basia-${m.slug}`,
          "Basia Walska",
          "walskab@gmail.com",
          m.mentee,
          m.slug,
          "pending",
          now,
          "Admin assigned — awaiting Basia confirmation",
        ]],
      },
    });
    log.push(`Appended: Basia Walska → ${m.mentee} (pending)`);
  }

  return res.status(200).json({ ok: true, log });
}
