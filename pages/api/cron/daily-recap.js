// GET /api/cron/daily-recap
// Posts a daily program status recap to Slack.
// Triggered by Vercel cron — see vercel.json.

import { getSheetsClient, MILESTONE_KEYS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const TEST_SLUGS    = ["kennedy", "jackie", "aaron", "mj"];
const SLACK_CHANNEL = "C0B3Q7WJF8C";

const PROGRAM_START = new Date("2026-06-01");

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Vercel cron requests include this header; skip auth in dev for easy testing
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const isDev        = process.env.NODE_ENV === "development";
  if (!isVercelCron && !isDev) return res.status(401).json({ error: "Unauthorized" });

  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) return res.status(500).json({ error: "SLACK_BOT_TOKEN not configured" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  // ── Pull data from Sheets ───────────────────────────────────────────────────
  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const total       = realMentees.length;

  let confirmed       = 0;
  let notResponded    = 0;
  let onboarded       = 0;
  let goalsSet        = 0;
  let promptsFilled   = 0;

  if (hasSheets) {
    try {
      const sheets         = getSheetsClient();
      const spreadsheetId  = process.env.GOOGLE_SHEET_ID;

      // Participation tab: col A = slug, col E = Accepted/Declined/blank
      const partRes  = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Participation!A6:E500" });
      const partRows = partRes.data.values || [];

      const statusBySlug = {};
      for (const row of partRows) {
        const slug   = row[0]?.trim();
        const status = row[4]?.trim();
        if (slug) statusBySlug[slug] = status || "";
      }

      for (const m of realMentees) {
        const s = statusBySlug[m.slug] || "";
        if (s === "Accepted")              confirmed++;
        else if (!s || s === "")           notResponded++;
      }

      // Dashboard tab: milestones
      const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
      let dashRows = [];
      for (const name of DASHBOARD_NAMES) {
        try {
          const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
          dashRows = r.data.values || [];
          if (dashRows.length > 1) break;
        } catch (_) {}
      }

      if (dashRows.length > 1) {
        const header      = dashRows[0] || [];
        const onboardIdx  = header.findIndex(h => h === "Onboarding Session Attended");
        const goalIdx     = header.findIndex(h => h?.toLowerCase().includes("goal"));
        const promptIdx   = header.findIndex(h => h?.toLowerCase().includes("prompt"));

        for (let i = 1; i < dashRows.length; i++) {
          const row  = dashRows[i];
          const slug = row[0]?.trim();
          if (!slug || TEST_SLUGS.includes(slug)) continue;
          if (onboardIdx >= 0 && (row[onboardIdx] === "TRUE" || row[onboardIdx] === true)) onboarded++;
          if (goalIdx    >= 0 && (row[goalIdx]    === "TRUE" || row[goalIdx]    === true)) goalsSet++;
          if (promptIdx  >= 0 && (row[promptIdx]  === "TRUE" || row[promptIdx]  === true)) promptsFilled++;
        }
      }
    } catch (err) {
      console.error("daily-recap: sheets error:", err.message);
    }
  }

  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

  // ── Build Slack message ─────────────────────────────────────────────────────
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `Uplift Daily Recap · ${dateStr}`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total participants*\n${total}` },
        { type: "mrkdwn", text: `*Confirmed*\n${confirmed}` },
        { type: "mrkdwn", text: `*No response yet*\n${notResponded}` },
        { type: "mrkdwn", text: `*Completed onboarding*\n${onboarded}` },
        { type: "mrkdwn", text: `*Goals filled in*\n${goalsSet}` },
        { type: "mrkdwn", text: `*Onboarding prompts done*\n${promptsFilled}` },
      ],
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Live data · <https://uplift.techunited.co/admin|Open admin dashboard>` }],
    },
  ];

  // ── Post to Slack ───────────────────────────────────────────────────────────
  try {
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${slackToken}` },
      body:    JSON.stringify({ channel: SLACK_CHANNEL, blocks, text: `Uplift Daily Recap · ${dateStr}` }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("daily-recap: Slack error:", slackData.error);
      return res.status(500).json({ error: slackData.error });
    }

    return res.status(200).json({ ok: true, stats: { total, confirmed, notResponded, onboarded, goalsSet, promptsFilled } });
  } catch (err) {
    console.error("daily-recap: fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
