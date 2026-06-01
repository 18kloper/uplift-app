// GET /api/resource-stats
// Reads ResourceClicks tab and returns top resources this week + all time.

import { getSheetsClient } from "../../lib/sheets-helper";

const TAB = "ResourceClicks";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (!hasSheets) return res.status(200).json({ allTime: [], thisWeek: [], total: 0 });

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
      // Tab doesn't exist yet — no clicks recorded
      return res.status(200).json({ allTime: [], thisWeek: [], total: 0 });
    }

    // Row 0 is header: Timestamp | Slug | Name | Resource | URL
    const dataRows = rows.slice(1).filter(r => r[3]); // must have resource title

    // Compute start of current week (Monday 00:00 ET)
    const now = new Date();
    const day = now.getDay(); // 0=Sun,1=Mon...
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);

    // Aggregate clicks
    const allTimeCounts  = {};
    const thisWeekCounts = {};

    for (const row of dataRows) {
      const [timestamp, slug, name, title, url] = row;
      if (!title) continue;

      // All time
      if (!allTimeCounts[title]) allTimeCounts[title] = { title, url: url || "", count: 0, uniqueSlugs: new Set() };
      allTimeCounts[title].count++;
      if (slug) allTimeCounts[title].uniqueSlugs.add(slug);

      // This week — parse timestamp (format: "Jun 1, 2026, 2:14 PM")
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

    // Recent clicks feed — last 100 rows, most recent first
    const recent = dataRows
      .slice()
      .reverse()
      .slice(0, 100)
      .map(([timestamp, slug, name, title, url]) => ({ timestamp, slug, name: name || slug, title, url: url || "" }));

    return res.status(200).json({
      allTime:  toRanked(allTimeCounts),
      thisWeek: toRanked(thisWeekCounts),
      total:    dataRows.length,
      recent,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("resource-stats error:", err.message);
    return res.status(200).json({ allTime: [], thisWeek: [], total: 0 });
  }
}
