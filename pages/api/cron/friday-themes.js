// GET /api/cron/friday-themes
// Every Friday: calls prompt-themes, posts top 5 themes + session ideas to Slack.
// Triggered by Vercel cron — see vercel.json.

const SLACK_CHANNEL = "C0B3Q7WJF8C";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const isDev        = process.env.NODE_ENV === "development";
  if (!isVercelCron && !isDev) return res.status(401).json({ error: "Unauthorized" });

  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) return res.status(500).json({ error: "SLACK_BOT_TOKEN not configured" });

  // ── Fetch themes from existing API ─────────────────────────────────────────
  let themes      = [];
  let sessionIdeas = [];

  try {
    const baseUrl    = process.env.NEXT_PUBLIC_BASE_URL || "https://uplift-app-mocha.vercel.app";
    const themesRes  = await fetch(`${baseUrl}/api/prompt-themes`);
    const themesData = await themesRes.json();

    themes       = themesData.themes       || [];
    sessionIdeas = themesData.sessionIdeas || [];

    if (themes.length === 0) {
      return res.status(200).json({ ok: true, skipped: "No themes yet — not enough responses" });
    }
  } catch (err) {
    console.error("friday-themes: could not fetch prompt-themes:", err.message);
    return res.status(500).json({ error: err.message });
  }

  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });
  const ICONS   = ["🔍", "⚡", "🧩", "🎯", "💡"];

  // ── Build Slack blocks ──────────────────────────────────────────────────────
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `Uplift Weekly Themes · ${dateStr}`, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "Top themes from founder responses this week, via the prompts tab." },
    },
    { type: "divider" },
  ];

  // Top 5 themes
  themes.slice(0, 5).forEach((t, i) => {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `${ICONS[i] || "•"} *${t.title}*\n${t.description}` },
    });
  });

  // Session ideas (if any)
  if (sessionIdeas.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Session ideas based on these themes:*" },
    });

    sessionIdeas.slice(0, 5).forEach((idea) => {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `• *${idea.title}*: ${idea.description}` },
      });
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `AI analysis of founder prompt responses · <https://uplift2026.vercel.app/admin|Full breakdown in admin>` }],
  });

  // ── Post to Slack ───────────────────────────────────────────────────────────
  try {
    const slackRes  = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${slackToken}` },
      body:    JSON.stringify({ channel: SLACK_CHANNEL, blocks, text: `Uplift Weekly Themes · ${dateStr}` }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("friday-themes: Slack error:", slackData.error);
      return res.status(500).json({ error: slackData.error });
    }

    return res.status(200).json({ ok: true, themesPosted: themes.length, sessionIdeasPosted: sessionIdeas.length });
  } catch (err) {
    console.error("friday-themes: fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
