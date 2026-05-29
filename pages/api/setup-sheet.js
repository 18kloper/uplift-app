// POST /api/setup-sheet
// One-time (and safe-to-re-run) script that creates:
//   • A "Dashboard" tab with all mentees + milestone checkboxes
//   • One tab per mentee (named by their slug) with response headers
//
// Call it once after setting env vars:
//   curl -X POST https://uplift2026.vercel.app/api/setup-sheet \
//        -H "x-setup-secret: YOUR_SETUP_SECRET"

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../lib/sheets-helper";
import { MENTEES } from "../../lib/mentees";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (req.headers["x-setup-secret"] !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: "Forbidden — wrong or missing x-setup-secret header" });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) return res.status(500).json({ error: "GOOGLE_SHEET_ID not set" });

  const sheets = getSheetsClient();

  // ── 1. Get existing tabs ─────────────────────────────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(meta.data.sheets.map((s) => s.properties.title));

  // ── 2. Create missing tabs in one batch ──────────────────────────────────────
  const toCreate = [];
  if (!existingTitles.has("Dashboard")) {
    toCreate.push({ addSheet: { properties: { title: "Dashboard", index: 0 } } });
  }
  for (const m of MENTEES) {
    if (!existingTitles.has(m.slug)) {
      toCreate.push({ addSheet: { properties: { title: m.slug } } });
    }
  }
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: toCreate },
    });
  }

  // ── 3. Re-fetch metadata to get sheetIds for formatting ──────────────────────
  const updatedMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIdMap = {};
  for (const s of updatedMeta.data.sheets) {
    sheetIdMap[s.properties.title] = s.properties.sheetId;
  }

  // ── 4. Write Dashboard headers + all mentee rows ─────────────────────────────
  const dashHeaders = [
    "Slug", "First", "Last", "Cohort", "Company", "Last Active",
    ...MILESTONE_KEYS.map((k) => MILESTONE_LABELS[k]),
  ];
  const dashRows = [dashHeaders];
  for (const m of MENTEES) {
    dashRows.push([
      m.slug,
      m.first,
      m.last,
      m.cohort,
      m.company || "",
      "",                                    // Last Active — filled by save-response
      ...MILESTONE_KEYS.map(() => "FALSE"),  // All milestones start unchecked
    ]);
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Dashboard!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: dashRows },
  });

  // ── 5. Apply checkbox formatting to milestone columns in Dashboard ────────────
  const dashboardSheetId = sheetIdMap["Dashboard"];
  const checkboxRequests = MILESTONE_KEYS.map((_, idx) => ({
    setDataValidation: {
      range: {
        sheetId: dashboardSheetId,
        startRowIndex: 1,             // skip header
        endRowIndex: MENTEES.length + 1,
        startColumnIndex: 6 + idx,   // G = 6
        endColumnIndex: 7 + idx,
      },
      rule: {
        condition: { type: "BOOLEAN" },
        strict: true,
        showCustomUi: true,
      },
    },
  }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: checkboxRequests },
  });

  // ── 6. Freeze header row + bold it in Dashboard ───────────────────────────────
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: dashboardSheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: dashboardSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.22, green: 0.18, blue: 0.54 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
      ],
    },
  });

  // ── 7. Write headers to every mentee tab ─────────────────────────────────────
  const menteeHeaderData = MENTEES.map((m) => ({
    range: `${m.slug}!A1:E1`,
    values: [["Week", "Field Key", "Question", "Response", "Last Updated"]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: menteeHeaderData,
    },
  });

  return res.status(200).json({
    ok: true,
    message: `Sheet initialized — Dashboard + ${MENTEES.length} mentee tabs created/updated`,
  });
}
