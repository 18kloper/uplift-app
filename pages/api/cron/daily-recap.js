// GET /api/cron/daily-recap
// Posts a daily program status recap to Slack.
// Triggered by Vercel cron — see vercel.json.

import { getSheetsClient, MILESTONE_KEYS } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

const TEST_SLUGS    = ["kennedy", "jackie", "aaron", "mj"];
const SLACK_CHANNEL = "C0B3Q7WJF8C";

const PROGRAM_START = new Date("2026-06-01");
const WEEK1_END     = new Date("2026-06-07");
const WEEK2_END     = new Date("2026-06-14");
const WEEK4_END     = new Date("2026-06-28");
const WEEK5_END     = new Date("2026-07-05");
const WEEK7_END     = new Date("2026-07-19");

function computeStatus(milestones, today) {
  const mentorCount = ["mentorSession1", "mentorSession2", "mentorSession3"]
    .filter(k => milestones[k]).length;

  if (today < PROGRAM_START) {
    return milestones.participation
      ? { status: "on-track" }
      : { status: "needs-attention" };
  }

  let status = "on-track";

  if (today >= WEEK4_END && mentorCount === 0)          status = "at-risk";
  else if (today >= WEEK7_END && mentorCount < 3)       status = "needs-attention";
  else if (today >= WEEK5_END && mentorCount < 2)       status = "needs-attention";
  else if (today >= WEEK2_END && mentorCount < 1)       status = "needs-attention";

  if (!milestones.participation && status !== "at-risk") status = "needs-attention";

  return { status };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const userAgent = req.headers["user-agent"] || "";
  const isVercelCron = userAgent.includes("vercel-cron") || req.headers["x-vercel-cron"] === "1";
  if (!isVercelCron && process.env.NODE_ENV !== "development") return res.status(401).json({ error: "Unauthorized" });

  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) return res.status(500).json({ error: "SLACK_BOT_TOKEN not configured" });

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  const realMentees = MENTEES.filter(m => !TEST_SLUGS.includes(m.slug));
  const total       = realMentees.length;

  let confirmed    = 0;
  let notResponded = 0;
  let onboarded    = 0;
  let goalsSet     = 0;
  let promptsFilled = 0;
  let onTrack      = 0;
  let atRisk       = 0;
  let needsAttention = 0;
  let churned      = 0;

  if (hasSheets) {
    try {
      const sheets        = getSheetsClient();
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const today         = new Date();

      // ── 1. Participation tab ───────────────────────────────────────────────
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
        if (s === "Accepted") confirmed++;
        else if (!s)          notResponded++;
      }

      // ── 2. Milestone Dashboard tab ─────────────────────────────────────────
      const DASHBOARD_NAMES = ["Milestone Dashboard", "Dashboard", "Master Tracker", "Milestones", "Tracker"];
      let dashRows = [];
      for (const name of DASHBOARD_NAMES) {
        try {
          const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
          dashRows = r.data.values || [];
          if (dashRows.length > 1) break;
        } catch (_) {}
      }

      const milestonesBySlug = {};
      const churnedSlugs     = new Set();

      if (dashRows.length > 1) {
        const header        = dashRows[0] || [];
        const onboardIdx    = header.findIndex(h => h === "Onboarding Session Attended");
        const churnedIdx    = header.findIndex(h => h?.toLowerCase() === "churned");

        for (let i = 1; i < dashRows.length; i++) {
          const row  = dashRows[i];
          const slug = row[0]?.trim();
          if (!slug || TEST_SLUGS.includes(slug)) continue;

          const milestones = Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));

          // Map milestone columns by exact header label
          MILESTONE_KEYS.forEach((key, idx) => {
            const colIdx = header.findIndex(h => h === key || h === MILESTONE_KEYS[idx]);
            if (colIdx >= 0) milestones[key] = row[colIdx] === "TRUE" || row[colIdx] === true;
          });

          // participation comes from Participation tab
          milestones.participation = statusBySlug[slug] === "Accepted";

          // onboarding by exact header
          if (onboardIdx >= 0) {
            milestones.onboarding = row[onboardIdx] === "TRUE" || row[onboardIdx] === true;
            if (milestones.onboarding) onboarded++;
          }

          if (churnedIdx >= 0 && (row[churnedIdx] === "TRUE" || row[churnedIdx] === true)) {
            churnedSlugs.add(slug);
          }

          milestonesBySlug[slug] = milestones;
        }
      }

      // ── 3. Goals + prompts: scan mentee tabs ───────────────────────────────
      // goals = has primary_refine or secondary_refine response
      // prompts = has any b0_q* response
      const GOAL_KEYS   = ["primary_refine", "secondary_refine"];
      const PROMPT_KEYS = ["b0_q0", "b0_q1", "b0_q2"];
      const CHUNK       = 50;

      const meta         = await sheets.spreadsheets.get({ spreadsheetId });
      const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);
      const menteesWithTabs = realMentees.filter(m => existingTabs.has(m.slug));

      for (let i = 0; i < menteesWithTabs.length; i += CHUNK) {
        const chunk    = menteesWithTabs.slice(i, i + CHUNK);
        const batchRes = await sheets.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges: chunk.map(m => `${m.slug}!A:D`),
        });

        (batchRes.data.valueRanges || []).forEach((vr, idx) => {
          const slug  = chunk[idx].slug;
          const rows  = vr.values || [];
          let hasGoal   = false;
          let hasPrompt = false;
          for (let r = 1; r < rows.length; r++) {
            const fieldKey = rows[r][1] || "";
            const value    = (rows[r][3] || "").trim();
            if (!value) continue;
            if (GOAL_KEYS.includes(fieldKey))   hasGoal   = true;
            if (PROMPT_KEYS.includes(fieldKey)) hasPrompt = true;
          }
          if (hasGoal)   goalsSet++;
          if (hasPrompt) promptsFilled++;
        });
      }

      // ── 4. Compute statuses ────────────────────────────────────────────────
      for (const m of realMentees) {
        if (churnedSlugs.has(m.slug)) { churned++; continue; }
        const milestones = milestonesBySlug[m.slug] || Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));
        const { status } = computeStatus(milestones, today);
        if      (status === "on-track")        onTrack++;
        else if (status === "at-risk")         atRisk++;
        else if (status === "needs-attention") needsAttention++;
      }

    } catch (err) {
      console.error("daily-recap: sheets error:", err.message);
    }
  }

  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

  // ── Build Slack message ───────────────────────────────────────────────────
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `Uplift Daily Recap · ${dateStr}`, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "*Participation*" },
      fields: [
        { type: "mrkdwn", text: `*Total*\n${total}` },
        { type: "mrkdwn", text: `*Confirmed*\n${confirmed}` },
        { type: "mrkdwn", text: `*No response*\n${notResponded}` },
        { type: "mrkdwn", text: `*Onboarded*\n${onboarded}` },
        { type: "mrkdwn", text: `*Goals filled in*\n${goalsSet}` },
        { type: "mrkdwn", text: `*Prompts filled in*\n${promptsFilled}` },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: "*Program Health*" },
      fields: [
        { type: "mrkdwn", text: `✅ *On Track*\n${onTrack}` },
        { type: "mrkdwn", text: `🔴 *At Risk*\n${atRisk}` },
        { type: "mrkdwn", text: `🟡 *Needs Attention*\n${needsAttention}` },
        { type: "mrkdwn", text: `⚫ *Churned*\n${churned}` },
      ],
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Live data · <https://uplift2026.vercel.app/admin|Open admin dashboard>` }],
    },
  ];

  // ── Post to Slack ─────────────────────────────────────────────────────────
  try {
    const slackRes  = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${slackToken}` },
      body:    JSON.stringify({ channel: SLACK_CHANNEL, blocks, text: `Uplift Daily Recap · ${dateStr}` }),
    });
    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("daily-recap: Slack error:", slackData.error);
      return res.status(500).json({ error: slackData.error });
    }
    return res.status(200).json({ ok: true, stats: { total, confirmed, notResponded, onboarded, goalsSet, promptsFilled, onTrack, atRisk, needsAttention, churned } });
  } catch (err) {
    console.error("daily-recap: fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
