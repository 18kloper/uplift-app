// Posts every portal input (pulse checks, Deep Work, wins, quiz passes, action
// check-offs) to the #uplift-portal-inputs Slack channel, fire-and-forget.
// The channel id is resolved by name once and cached for the lambda's lifetime;
// missing token or channel degrades to a silent no-op so saves never fail.

import { MENTEES } from "./mentees";

const CHANNEL_NAME = "uplift-portal-inputs";
const cachedChannelIds = new Map();

async function resolveChannelId(token, name) {
  if (cachedChannelIds.has(name)) return cachedChannelIds.get(name); // may be null: known-missing
  let cursor = "";
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    });
    const r = await fetch(`https://slack.com/api/conversations.list?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(x => x.json());
    if (!r.ok) return null;
    const hit = (r.channels || []).find(c => c.name === name);
    if (hit) { cachedChannelIds.set(name, hit.id); return hit.id; }
    cursor = r.response_metadata?.next_cursor;
    if (!cursor) break;
  }
  // A channel that does not exist used to fail silently, which is how every
  // portal input went nowhere for the whole of Summer. Still a no-op so saves
  // never break, but never again a quiet one.
  console.error(
    `[slack-portal-inputs] channel #${name} does not exist or the bot is not in it. ` +
    `Input was NOT posted. Create the channel and invite the Uplift app.`
  );
  cachedChannelIds.set(name, null);
  return null;
}

const PULSE_LABELS = { "3": "🟢 A-okay", "2": "🟡 Okay, but a check-in would be nice", "1": "🔴 Not going as planned" };

function formatLine(slug, weekNum, fieldKey, value, question) {
  const m = MENTEES.find(x => x.slug === slug);
  const who = slug === "visitor" ? "🌐 A visitor (Meet Ulrike page)" : m ? `${m.first} ${m.last}`.trim() : slug;
  const testTag = ["kennedy", "jackie", "aaron", "mj", "hana"].includes(slug) ? " (test)" : "";
  if (fieldKey === "bot_chat") {
    const a = String(value ?? "").slice(0, 500);
    return `💬 *${who}*${testTag} asked Ulrike:\n> ${String(question || "").slice(0, 400)}\n🤖 ${a}`;
  }
  const val = String(value ?? "").slice(0, 280);

  if (fieldKey === "pulse") {
    return `🫀 *${who}*${testTag} · Week ${weekNum} pulse: ${PULSE_LABELS[val] || val}`;
  }
  if (fieldKey === "win_of_week") {
    return `🏆 *${who}*${testTag} · Win of the Week: "${val}"`;
  }
  if (fieldKey === "quiz_passed") {
    return `📝 *${who}*${testTag} passed the onboarding quiz (${val})`;
  }
  if (fieldKey === "structure_ack") {
    return `📋 *${who}*${testTag} confirmed the Discover / Act / Roadmap structure`;
  }
  if (fieldKey.startsWith("action_")) {
    if (!val) return null; // unchecking an item is noise
    return `✅ *${who}*${testTag} · Week ${weekNum} checked off: ${question || fieldKey}`;
  }
  if (fieldKey === "participation") {
    return `🤝 *${who}*${testTag} ${val === "accepted" ? "confirmed participation" : `participation: ${val}`}`;
  }
  // Everything else is Deep Work
  const q = question ? `_${String(question).slice(0, 120)}_\n` : "";
  return `🧠 *${who}*${testTag} · Week ${weekNum} Deep Work (${fieldKey})\n${q}"${val}"`;
}

export async function postPortalInput({ slug, weekNum, fieldKey, value, question, channel: channelName }) {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return;
    const text = formatLine(slug, weekNum, fieldKey, value, question);
    if (!text) return;
    const channel = await resolveChannelId(token, channelName || CHANNEL_NAME);
    if (!channel) return;
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text, unfurl_links: false, unfurl_media: false }),
    });
  } catch (_) {
    // Never let Slack problems break a portal save
  }
}

// A save that failed to reach the sheet must not pass in silence. The portal
// queues it and retries, so this is usually a warning rather than a loss, but
// a run of these means Sheets is refusing writes and the team needs to know
// while founders are still typing, not when the reporting looks thin.
export async function postPortalSaveFailure({ slug, weekNum, fieldKey, error }) {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return;
    const m = MENTEES.find(x => x.slug === slug);
    const who = m ? `${m.first} ${m.last}`.trim() : slug;
    const channel = await resolveChannelId(token, CHANNEL_NAME);
    if (!channel) return;
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        channel,
        text: `⚠️ *Sheet write failed* for ${who} · week ${weekNum} · ${fieldKey}\nTheir browser has it queued and will retry. The text above this message is the answer itself, so nothing is lost.\n\`${String(error || "unknown").slice(0, 300)}\``,
        unfurl_links: false,
      }),
    });
  } catch (_) {}
}
