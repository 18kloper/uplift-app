// GET /api/event-stats
// Reads EventClicks tab and returns top events this week + all time + recent log.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "EventClicks";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ allTime: [], thisWeek: [], recent: [], total: 0 });

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    let rows = [];
    try {
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TAB}!A:E`,
      });
      rows = r.data.values || [];
    } catch (_) {
      return res.status(200).json({ allTime: [], thisWeek: [], recent: [], total: 0 });
    }

    // Row 0 is header: Timestamp | Slug | Name | Event | URL
    const dataRows = rows.slice(1).filter(r => r[3]);

    // Start of current week (Monday 00:00 ET)
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);

    const allTimeCounts  = {};
    const thisWeekCounts = {};

    for (const row of dataRows) {
      const [timestamp, slug, name, title, url] = row;
      if (!title) continue;

      if (!allTimeCounts[title]) allTimeCounts[title] = { title, url: url || "", count: 0, uniqueSlugs: new Set() };
      allTimeCounts[title].count++;
      if (slug) allTimeCounts[title].uniqueSlugs.add(slug);

      try {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime()) && d >= weekStart) {
          if (!thisWeekCounts[title]) thisWeekCounts[title] = { title, url: url || "", count: 0, uniqueSlugs: new Set() };
          thisWeekCounts[title].count++;
          if (slug) thisWeekCounts[title].uniqueSlugs.add(slug);
        }
      } catch (_) {}
    }

    const toRanked = (counts) =>
      Object.values(counts)
        .map(({ title, url, count, uniqueSlugs }) => ({ title, url, count, uniqueFounders: uniqueSlugs.size }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const recent = dataRows
      .slice()
      .reverse()
      .slice(0, 100)
      .map(([timestamp, slug, name, title, url]) => ({ timestamp, slug, name: name || slug, title, url: url || "" }));

    return res.status(200).json({
      allTime:  toRanked(allTimeCounts),
      thisWeek: toRanked(thisWeekCounts),
      recent,
      total:    dataRows.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("event-stats error:", err.message);
    return res.status(200).json({ allTime: [], thisWeek: [], recent: [], total: 0 });
  }
}
