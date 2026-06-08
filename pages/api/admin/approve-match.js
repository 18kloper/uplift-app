// POST /api/admin/approve-match
// Body: { menteeSlug, menteeName, mentorName, mentorEmail }
// Assigns the mentor to the mentee in the "Mentor Selections" sheet.
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";

const SEL_TAB = "Mentor Selections";
const CONF_TAB = "Mentor Confirmations";
const CONF_HEADERS = ["Thread ID", "Mentor Name", "Mentor Email", "Mentee Name", "Mentee Slug", "Status", "Updated At", "Notes", "Match Reason"];

async function ensureConfTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === CONF_TAB);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: CONF_TAB } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CONF_TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [CONF_HEADERS] },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { menteeSlug, menteeName, mentorName, mentorEmail, isRematch, prevMentor } = req.body || {};
  if (!menteeSlug || !mentorName) {
    return res.status(400).json({ error: "menteeSlug and mentorName required" });
  }

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ ok: true, dev: true });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // 1. Update "Mentor Selections" — set assignedMentor (col G = "Selected Mentor") and responded=Yes
    const selRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SEL_TAB}!A2:A500`,
    });
    const selRows = selRes.data.values || [];
    const rowIdx = selRows.findIndex(r => r[0]?.trim() === menteeSlug);
    if (rowIdx !== -1) {
      const sheetRow = rowIdx + 2;
      const today = new Date().toISOString().slice(0, 10);
      const selNote = isRematch
        ? `2nd match — prev mentor non-responsive: ${prevMentor || "unknown"}`
        : "Admin-assigned via suggested matches";
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SEL_TAB}!F${sheetRow}:I${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["Yes", mentorName, today, selNote]] },
      });
    }

    // 2. Upsert into "Mentor Confirmations" with status "pending"
    //    (mentor hasn't responded yet — this just records the assignment)
    await ensureConfTab(sheets, spreadsheetId);
    const confRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CONF_TAB}!A2:E500`,
    });
    const confRows = confRes.data.values || [];
    // Use a synthetic threadId: "admin-match-<slug>"
    const threadId = `admin-match-${menteeSlug}`;
    const existingIdx = confRows.findIndex(r => r[4]?.trim() === menteeSlug);
    const updatedAt = new Date().toISOString().slice(0, 10);

    const confNote = isRematch
      ? `2nd match — prev mentor non-responsive: ${prevMentor || "unknown"}`
      : "Admin-assigned";
    if (existingIdx === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${CONF_TAB}!A:I`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[threadId, mentorName, mentorEmail || "", menteeName || "", menteeSlug, "pending", updatedAt, confNote, ""]],
        },
      });
    } else {
      const sheetRow = existingIdx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CONF_TAB}!A${sheetRow}:I${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[threadId, mentorName, mentorEmail || "", menteeName || "", menteeSlug, "pending", updatedAt, confNote, ""]] },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("approve-match error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
