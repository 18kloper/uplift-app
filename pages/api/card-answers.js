// GET  /api/card-answers        → { answers: [{ ts, name, card, theme, side, text }] }
// POST /api/card-answers        Body: { name?, card, theme, side, text }
//
// Community wall for the Founder Cards page (public/founder-cards.html).
// Answers land in a "Card Answers" tab; the wall shows the most recent ones.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "Card Answers";
const MAX_TEXT = 280;
const MAX_NAME = 40;
const WALL_SIZE = 120;

export default async function handler(req, res) {
  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return req.method === "GET"
      ? res.status(200).json({ answers: [] })
      : res.status(200).json({ ok: true, skipped: true });
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (req.method === "GET") {
    try {
      const read = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TAB}!A2:G`,
      });
      const rows = read.data.values || [];
      const answers = rows
        .filter((r) => r[6])
        .slice(-WALL_SIZE)
        .reverse()
        .map((r) => ({
          ts: r[0] || "",
          name: r[1] || "",
          company: r[2] || "",
          card: r[3] || "",
          theme: r[4] || "",
          side: r[5] === "fwd" ? "fwd" : r[5] === "shout" ? "shout" : "back",
          text: String(r[6]).slice(0, MAX_TEXT),
        }));
      return res.status(200).json({ answers });
    } catch (_) {
      // Tab doesn't exist yet — empty wall
      return res.status(200).json({ answers: [] });
    }
  }

  if (req.method === "POST") {
    const { name, company, card, theme, side, text } = req.body || {};
    const cleanText = String(text || "").trim().slice(0, MAX_TEXT);
    const cleanName = String(name || "").trim().slice(0, MAX_NAME);
    const cleanCompany = String(company || "").trim().slice(0, MAX_NAME);
    const isShout = side === "shout";
    const cardNum = isShout ? 0 : parseInt(card, 10);
    if (!cleanText || (!isShout && (!cardNum || cardNum < 1 || cardNum > 10))) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    try {
      const timestamp = new Date().toISOString();
      const row = [
        timestamp,
        cleanName,
        cleanCompany,
        String(cardNum),
        String(theme || "").slice(0, 30),
        side === "fwd" ? "fwd" : isShout ? "shout" : "back",
        cleanText,
      ];
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${TAB}!A:G`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [row] },
        });
      } catch (_) {
        // Tab missing — create with headers, then retry once
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${TAB}!A1:G1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["Timestamp", "Name", "Company", "Card", "Theme", "Side", "Answer"]],
          },
        });
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${TAB}!A:G`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [row] },
        });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Card answer write failed:", err.message);
      return res.status(200).json({ ok: true, sheetError: true });
    }
  }

  return res.status(405).end();
}
