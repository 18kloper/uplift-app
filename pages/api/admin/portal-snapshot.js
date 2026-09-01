// POST /api/admin/portal-snapshot?token=<ADMIN_SECRET>
//
// Rebuilds the "PortalSnapshot" tab: one row per founder, one column per thing
// the portal has ever recorded, newest value in each cell.
//
// FallResponses is the source of truth and it is append-shaped — one row per
// answer, thousands of rows, unreadable by a human scanning for whether a
// founder did the work. This pivots it into the grid you would have drawn by
// hand. It writes nothing back into FallResponses and computes no rules, so a
// bug here can lose exactly nothing: worst case the tab is stale and you press
// the button again.
//
// It also answers the question that matters more than the tab: is anything
// falling on the floor? The response carries a per-founder cell count and
// names anyone who has logged into their portal but has no recorded answers,
// which is the shape a silent write failure would take.

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";
import { FALL_SLUGS, TEST_SLUGS, FALL_RESPONSES_TAB } from "../../../lib/fall-roster";

const SNAPSHOT_TAB = "PortalSnapshot";
const ACTIVITY_TAB = "PortalActivity";

async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.find(s => s.properties.title === SNAPSHOT_TAB);
  if (existing) return existing.properties.sheetId;
  const add = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: SNAPSHOT_TAB } } }] },
  });
  return add.data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(500).json({ error: "Sheets env not configured" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const roster = FALL_SLUGS
      .filter(slug => !TEST_SLUGS.includes(slug))
      .map(slug => MENTEES.find(m => m.slug === slug))
      .filter(Boolean);
    const rosterSlugs = new Set(roster.map(m => m.slug));

    const [respRes, actRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${FALL_RESPONSES_TAB}!A:F` }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${ACTIVITY_TAB}!A:D` }).catch(() => ({ data: {} })),
    ]);

    // Latest value per (slug, week, field). The tab upserts, so duplicates
    // should not exist, but the later row wins if one ever does.
    const values = {};           // slug -> colKey -> value
    const questions = {};        // colKey -> the question as the founder saw it
    const columnMeta = new Map(); // colKey -> { week, fieldKey }
    for (const row of (respRes.data.values || []).slice(1)) {
      const [slug, week, fieldKey, question, value] = row;
      if (!rosterSlugs.has(slug) || !fieldKey) continue;
      const v = (value || "").trim();
      const colKey = `w${week}_${fieldKey}`;
      if (!columnMeta.has(colKey)) columnMeta.set(colKey, { week: Number(week) || 0, fieldKey });
      if (question && !questions[colKey]) questions[colKey] = question;
      if (!v) continue;
      (values[slug] = values[slug] || {})[colKey] = v;
    }

    const activity = {};
    for (const row of (actRes.data?.values || []).slice(1)) {
      const [slug, , lastSeen, firstLogin] = row;
      if (slug) activity[slug] = { lastSeen: lastSeen || "", firstLogin: firstLogin || "" };
    }

    const columns = [...columnMeta.entries()].sort((a, b) =>
      a[1].week - b[1].week || a[1].fieldKey.localeCompare(b[1].fieldKey)
    );

    const header = [
      "Founder", "Company", "Slug", "First Login", "Last Seen", "Answers Recorded",
      ...columns.map(([colKey, meta]) => `W${meta.week} · ${meta.fieldKey}`),
    ];
    const questionRow = [
      "", "", "", "", "", "(the question each column asked)",
      ...columns.map(([colKey]) => questions[colKey] || ""),
    ];

    const perFounder = [];
    const rows = roster.map(m => {
      const mine = values[m.slug] || {};
      const filled = Object.keys(mine).length;
      const act = activity[m.slug] || {};
      perFounder.push({ slug: m.slug, name: `${m.first} ${m.last}`.trim(), answers: filled, firstLogin: act.firstLogin || null });
      return [
        `${m.first} ${m.last}`.trim(),
        m.company || "",
        m.slug,
        act.firstLogin || "",
        act.lastSeen || "",
        filled,
        ...columns.map(([colKey]) => mine[colKey] || ""),
      ];
    });

    await ensureTab(sheets, spreadsheetId);
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SNAPSHOT_TAB}!A:ZZ` });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SNAPSHOT_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header, questionRow, ...rows] },
    });

    // The one anomaly worth shouting about: someone got into their portal and
    // nothing they did came back. That is what a silent write failure looks
    // like from the outside.
    const loggedInButSilent = perFounder
      .filter(f => f.firstLogin && f.answers === 0)
      .map(f => f.name);

    return res.status(200).json({
      ok: true,
      tab: SNAPSHOT_TAB,
      founders: rows.length,
      columns: columns.length,
      answersRecorded: perFounder.reduce((s, f) => s + f.answers, 0),
      withNoAnswers: perFounder.filter(f => f.answers === 0).length,
      loggedInButSilent,
      rebuiltAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[portal-snapshot] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
