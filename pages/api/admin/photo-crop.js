// GET  /api/admin/photo-crop  -> { crops: { <id>: { posX, posY, zoom, hidden, fit, layout } } }
// POST /api/admin/photo-crop  { id, posX?, posY?, zoom?, hidden?, fit?, layout? }
//
// How each photo sits on its page. Uploads arrive at every distance and angle,
// so one global crop cuts some people off at the chin and leaves others a
// speck in a wide shot.
//
// posX/posY are the focal point in percent, set by dragging the photo on the
// page. Earlier rows stored a preset keyword in the Object Position column;
// those are translated on read, so nothing already saved is lost.
//
// Stored in the PhotoCrops tab, append-only with the latest row per id
// winning, the same pattern as the decision tabs.

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "PhotoCrops";
const HEADERS = ["Updated At", "Application Id", "Object Position", "Zoom", "Hidden", "Fit", "Pos X", "Pos Y", "Layout"];

export const LAYOUTS = ["left-half", "right-half", "bottom-band", "top-band", "full-bleed", "inset", "icon"];

// The preset keywords this used to store, as focal points.
const LEGACY = {
  "center top": [50, 0], "center 20%": [50, 20], "center 30%": [50, 30],
  "center": [50, 50], "center 70%": [50, 70], "center bottom": [50, 100],
  "left center": [0, 50], "right center": [100, 50],
};

const pct = (v, fallback) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
};

export function normalizeCrop(position, zoom, hidden, fit, posX, posY, layout) {
  const legacy = LEGACY[position] || [50, 50];
  return {
    posX: pct(posX, legacy[0]),
    posY: pct(posY, legacy[1]),
    zoom: Math.min(3, Math.max(1, parseFloat(zoom) || 1)),
    hidden: String(hidden).toLowerCase() === "true",
    fit: fit === "contain" ? "contain" : "cover",
    layout: LAYOUTS.includes(layout) ? layout : null,
  };
}

// Two saves landing at once both saw "no tab" and both tried to create it,
// which fails the whole request for one of them. An existing tab is the
// outcome we wanted anyway.
async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  if ((meta.data.sheets || []).some(sh => sh.properties?.title === TAB)) return;
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  } catch (e) {
    if (/already exists/i.test(e.message || "")) return;
    throw e;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${TAB}!A1`, valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
}

export default async function handler(req, res) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  try {
    const sheets = getSheetsClient();

    if (req.method === "GET") {
      let rows = [];
      try {
        const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:I5000` });
        rows = r.data.values || [];
      } catch (e) {
        if ((e?.code || e?.response?.status) !== 400) throw e; // 400 = tab not created yet
      }
      const crops = {};
      for (const [, id, position, zoom, hidden, fit, posX, posY, layout] of rows) {
        if (!id) continue;
        crops[id] = normalizeCrop(position, zoom, hidden, fit, posX, posY, layout);
      }
      return res.status(200).json({ crops });
    }

    if (req.method === "POST") {
      const { id, posX = 50, posY = 50, zoom = 1, hidden = false, fit = "cover", layout = null } = req.body || {};
      if (!id) return res.status(400).json({ error: "Missing id" });
      const saved = normalizeCrop(null, zoom, hidden, fit, posX, posY, layout);
      await ensureTab(sheets, spreadsheetId);
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${TAB}!A:I`, valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            new Date().toISOString(), id, "", saved.zoom, saved.hidden ? "TRUE" : "FALSE",
            saved.fit, saved.posX, saved.posY, saved.layout || "",
          ]],
        },
      });
      return res.status(200).json({ ok: true, id, ...saved });
    }

    return res.status(405).end();
  } catch (err) {
    console.error("[photo-crop] failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
