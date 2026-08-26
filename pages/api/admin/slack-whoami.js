// Temporary: identify the Slack bot behind SLACK_BOT_TOKEN. Remove after use.
export default async function handler(req, res) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return res.status(200).json({ ok: false, error: "no token" });
  const r = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${token}` },
  }).then(x => x.json());
  return res.status(200).json({ ok: r.ok, bot_user: r.user, team: r.team });
}
