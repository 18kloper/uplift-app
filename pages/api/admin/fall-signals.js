// GET/POST /api/admin/fall-signals
//
// The Signals tab: anything discovered that could be useful but isn't being
// actively acted on — an observation parking lot, so it doesn't get lost and
// doesn't clutter the action tabs. Same append-only latest-row-wins pattern
// as the decision tabs: FallSignals sheet, one row per event, a "dismissed"
// row hides the signal without deleting its history.
//
// GET  -> { signals: [{ id, createdAt, text, source, status }] } (open only unless ?all=1)
// POST { text, source? }        -> logs a new signal
// POST { id, status: "dismissed" } -> dismisses one

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "FallSignals";
const HEADERS = ["Created At", "Id", "Text", "Source", "Status"];

async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some(sh => sh.properties?.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
  }
}

export default async function handler(req, res) {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    await ensureTab(sheets, spreadsheetId);

    if (req.method === "GET") {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:E2000` });
      const latest = {};
      for (const row of r.data.values || []) {
        if (!row[1]) continue;
        latest[row[1]] = { id: row[1], createdAt: latest[row[1]]?.createdAt || row[0], text: row[2] || "", source: row[3] || "", status: row[4] || "open" };
      }
      let signals = Object.values(latest).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      if (req.query.all !== "1") signals = signals.filter(s => s.status === "open");
      return res.status(200).json({ signals });
    }

    if (req.method === "POST") {
      const { text, source, id, status } = req.body || {};
      if (id && status === "dismissed") {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${TAB}!A:E`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[new Date().toISOString(), id, "", "", "dismissed"]] },
        });
        return res.status(200).json({ ok: true });
      }
      const trimmed = String(text || "").trim();
      if (!trimmed) return res.status(400).json({ error: "Missing text" });
      const newId = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:E`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[new Date().toISOString(), newId, trimmed, String(source || "").trim(), "open"]] },
      });
      return res.status(200).json({ ok: true, id: newId });
    }

    return res.status(405).end();
  } catch (err) {
    console.error("[fall-signals] failed:", err);
    return res.status(500).json({ error: err.message, signals: [] });
  }
}
