// POST /api/support-ticket
// Emails uplift@techunited.co when a mentor submits a support request from the mentor preview portal.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { topic, message, mentorSlug, name, email } = req.body || {};
  if (!topic) return res.status(400).json({ error: "topic required" });

  try {
    await resend.emails.send({
      from: "Uplift Portal <noreply@techunited.co>",
      to: "uplift@techunited.co",
      subject: `[Mentor Support] ${topic}${name ? ` — ${name}` : mentorSlug ? ` — ${mentorSlug}` : ""}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px;font-size:18px;color:#1a1733">New Mentor Support Request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px 12px;background:#f7f6fb;border-radius:6px 6px 0 0;font-weight:600;font-size:13px;color:#555;width:120px">Topic</td>
              <td style="padding:8px 12px;background:#f7f6fb;border-radius:6px 6px 0 0;font-size:13px;color:#111">${topic}</td>
            </tr>
            ${name ? `<tr>
              <td style="padding:8px 12px;font-weight:600;font-size:13px;color:#555;border-top:1px solid #ece9f4">Name</td>
              <td style="padding:8px 12px;font-size:13px;color:#111;border-top:1px solid #ece9f4">${name}</td>
            </tr>` : ""}
            ${email ? `<tr>
              <td style="padding:8px 12px;font-weight:600;font-size:13px;color:#555;border-top:1px solid #ece9f4">Email</td>
              <td style="padding:8px 12px;font-size:13px;color:#111;border-top:1px solid #ece9f4"><a href="mailto:${email}">${email}</a></td>
            </tr>` : ""}
            ${mentorSlug && !name ? `<tr>
              <td style="padding:8px 12px;font-weight:600;font-size:13px;color:#555;border-top:1px solid #ece9f4">Mentor</td>
              <td style="padding:8px 12px;font-size:13px;color:#111;border-top:1px solid #ece9f4">${mentorSlug}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:8px 12px;font-weight:600;font-size:13px;color:#555;border-top:1px solid #ece9f4;vertical-align:top">Message</td>
              <td style="padding:8px 12px;font-size:13px;color:#111;border-top:1px solid #ece9f4;line-height:1.6">${message ? message.replace(/\n/g, "<br>") : "<em style='color:#888'>No message provided</em>"}</td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#aaa">Sent from the Uplift Mentor Portal · uplift2026.vercel.app</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("support-ticket error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
