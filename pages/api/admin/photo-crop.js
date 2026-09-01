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
const HEADERS = ["Updated At", "Application Id", "Object Position", "Zoom", "Hidden", "Fit", "Pos X", "Pos Y", "Layout", "Order", "Float W", "Float X", "Float Y"];

const EDIT_CODE = process.env.LOOKBOOK_EDIT_CODE || "uplift-edit";

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

export function normalizeCrop(position, zoom, hidden, fit, posX, posY, layout, order, floatW, floatX, floatY) {
  const legacy = LEGACY[position] || [50, 50];
  return {
    posX: pct(posX, legacy[0]),
    posY: pct(posY, legacy[1]),
    zoom: Math.min(3, Math.max(1, parseFloat(zoom) || 1)),
    hidden: String(hidden).toLowerCase() === "true",
    fit: fit === "contain" ? "contain" : "cover",
    layout: LAYOUTS.includes(layout) ? layout : null,
    // Where this founder sits in the running order. Blank means "wherever
    // the alphabet puts them".
    order: Number.isFinite(parseFloat(order)) ? parseFloat(order) : null,
    // The floating photo: how wide it is, in inches, and where its top left
    // corner sits as a percentage of the page. Null means the default spot.
    floatW: Math.min(5, Math.max(1, parseFloat(floatW) || 1.6)),
    floatX: Number.isFinite(parseFloat(floatX)) ? Math.min(92, Math.max(0, parseFloat(floatX))) : null,
    floatY: Number.isFinite(parseFloat(floatY)) ? Math.min(92, Math.max(0, parseFloat(floatY))) : null,
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

// The whole tab, cached briefly. Saves merge against this; a save updates it
// in place so the next merge sees the new value without another read.
let cropCache = { at: 0, crops: null };
const CROP_CACHE_MS = 20 * 1000;

async function readAllCrops(sheets, spreadsheetId, { fresh = false } = {}) {
  if (!fresh && cropCache.crops && Date.now() - cropCache.at < CROP_CACHE_MS) return cropCache.crops;
  let rows = [];
  try {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A2:M5000` });
    rows = r.data.values || [];
  } catch (e) {
    if ((e?.code || e?.response?.status) !== 400) {
      // On a quota trip, stale beats failing the save outright.
      if (cropCache.crops) return cropCache.crops;
      throw e;
    }
  }
  const crops = {};
  for (const [, id, position, zoom, hidden, fit, posX, posY, layout, order, floatW, floatX, floatY] of rows) {
    if (!id) continue;
    crops[id] = normalizeCrop(position, zoom, hidden, fit, posX, posY, layout, order, floatW, floatX, floatY);
  }
  cropCache = { at: Date.now(), crops };
  return crops;
}

export default async function handler(req, res) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  try {
    const sheets = getSheetsClient();

    if (req.method === "GET") {
      return res.status(200).json({ crops: await readAllCrops(sheets, spreadsheetId, { fresh: req.query.fresh === "1" }) });
    }

    if (req.method === "POST") {
      // The deployed book is read-only. Photo and order changes are made on
      // the local copy and pushed with the code, so nothing on the live site
      // can rewrite them.
      if (process.env.NODE_ENV === "production" && process.env.LOOKBOOK_ALLOW_EDITS !== "1") {
        return res.status(403).json({ error: "The published lookbook is read-only" });
      }

      // The lookbook is public, so the write path needs its own key. Without
      // this, anyone who worked out the ?edit=1 trick could re-crop, reorder,
      // or hide photos in the live book.
      const code = String(req.body?.code || req.headers["x-edit-code"] || "").trim();
      if (code.toLowerCase() !== EDIT_CODE.toLowerCase()) {
        return res.status(403).json({ error: "Wrong or missing edit code" });
      }

      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "Missing id" });

      // Merge onto whatever is already stored for this photo rather than
      // replacing it. Two people adjusting the same book (or the same person
      // in two tabs) would otherwise wipe each other's settings, which reads
      // as "it reverted".
      //
      // The merge reads from a short-lived cache of the sheet. Reading the
      // whole tab on every save ran into the Sheets per-minute read quota
      // the moment anyone dragged a slider.
      const current = (await readAllCrops(sheets, spreadsheetId))[id] || {};

      const merged = { ...current, ...req.body };
      const saved = normalizeCrop(
        null, merged.zoom, merged.hidden, merged.fit, merged.posX, merged.posY,
        merged.layout, merged.order, merged.floatW, merged.floatX, merged.floatY,
      );
      await ensureTab(sheets, spreadsheetId);
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${TAB}!A:M`, valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            new Date().toISOString(), id, "", saved.zoom, saved.hidden ? "TRUE" : "FALSE",
            saved.fit, saved.posX, saved.posY, saved.layout || "",
            saved.order == null ? "" : saved.order,
            saved.floatW, saved.floatX == null ? "" : saved.floatX, saved.floatY == null ? "" : saved.floatY,
          ]],
        },
      });
      // Keep the cache in step so the next merge does not need a read.
      if (cropCache.crops) cropCache.crops[id] = saved;
      return res.status(200).json({ ok: true, id, ...saved });
    }

    return res.status(405).end();
  } catch (err) {
    console.error("[photo-crop] failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
