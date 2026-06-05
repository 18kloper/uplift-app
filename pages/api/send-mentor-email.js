// POST /api/send-mentor-email
// Body: { to, subject, body, mentorName }
// Sends from kennedy@techunited.co, CC team@techunited.co via Resend

import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { to, subject, html, text, mentorName } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "Kennedy Loper <kennedy@techunited.co>",
      to: [to],
      cc: ["uplift@techunited.co"],
      reply_to: "kennedy@techunited.co",
      subject,
      html,
      text: text || "",
    });

    if (error) {
      console.error("[send-mentor-email] Resend error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[send-mentor-email] Sent to ${to} (${mentorName}) — id: ${data?.id}`);
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("[send-mentor-email] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
