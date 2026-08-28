// POST /api/admin/speaker-decide
// Body: { applicant: { id, name, email }, decision: "approved" | "rejected" | "clear",
//         session: <1..22 | null>, note: "" }
//
// The decision layer over speaker applications, stored in FallSpeakers
// (append-only; the latest row per applicant wins), matching fall-decide.js.
// An approval carries the educational-session slot the speaker is booked into,
// so the slot board and the founder-facing schedule have one source of truth.

import { getSheetsClient } from "../../../lib/sheets-helper";
import { EDU_SESSIONS } from "../../../lib/edu-sessions";

const TAB = "FallSpeakers";
const HEADERS = ["Decided At", "Response Id", "Name", "Email", "Decision", "Session", "Note"];

async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      const code = e?.code || e?.response?.status;
      if (![429, 500, 502, 503].includes(code) || i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

let tabEnsured = false;

async function ensureTab(sheets, spreadsheetId) {
  const meta = await withRetry(() => sheets.spreadsheets.get({ spreadsheetId }));
  const exists = (meta.data.sheets || []).some(sh => sh.properties?.title === TAB);
  if (!exists) {
    await withRetry(() => sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    }));
    await withRetry(() => sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    }));
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { applicant, decision, session, note } = req.body || {};
  if (!applicant?.id || !["approved", "rejected", "clear"].includes(decision)) {
    return res.status(400).json({ error: "Missing/invalid applicant.id or decision" });
  }

  let slot = null;
  if (decision === "approved") {
    slot = parseInt(session, 10);
    if (!EDU_SESSIONS.some(s => s.n === slot)) {
      return res.status(400).json({ error: "Approving a speaker needs a session slot between 1 and 22" });
    }
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!tabEnsured) {
      await ensureTab(sheets, spreadsheetId);
      tabEnsured = true;
    }

    // Two speakers in one 30-minute slot is a real scheduling accident, so it
    // is refused here rather than only being flagged in the UI. Latest row per
    // applicant wins, so a re-approval of the same person is fine.
    if (slot) {
      const r = await withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId, range: `${TAB}!A2:G2000`,
      }));
      const latest = {};
      for (const row of r.data.values || []) {
        if (!row[1]) continue;
        latest[row[1]] = { decision: row[4], session: row[5] ? parseInt(row[5], 10) : null, name: row[2] };
      }
      const clash = Object.entries(latest).find(([id, v]) =>
        id !== applicant.id && v.decision === "approved" && v.session === slot);
      if (clash) {
        return res.status(409).json({ error: `Session ${slot} is already booked for ${clash[1].name || "another speaker"}. Clear that booking first or pick another slot.` });
      }
    }

    await withRetry(() => sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB}!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          new Date().toISOString(), applicant.id, applicant.name || "", applicant.email || "",
          decision, slot || "", note || "",
        ]],
      },
    }));
    return res.status(200).json({ ok: true, decision, session: slot });
  } catch (err) {
    console.error("[speaker-decide] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
