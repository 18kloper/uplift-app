// GET /api/admin/holding-email-preview?slug=xxx&token=xxx
// Renders the "mentor selected, waiting on confirmation" holding email

export const config = { api: { responseLimit: false } };

function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function checkItem(text) {
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:9px">
    <tr>
      <td valign="top" width="26" style="padding-top:2px">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr><td align="center" valign="middle" width="18" height="18" style="width:18px;height:18px;background:#5c4eb5;border-radius:9px;font-size:0;line-height:0">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
          </td></tr>
        </table>
      </td>
      <td valign="top" style="font-size:13.5px;color:#4a4060;line-height:1.5">${text}</td>
    </tr>
  </table>`;
}

function checkItemDark(text) {
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:9px">
    <tr>
      <td valign="top" width="26" style="padding-top:2px">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr><td align="center" valign="middle" width="18" height="18" style="width:18px;height:18px;background:#5c4eb5;border-radius:9px;font-size:0;line-height:0">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
          </td></tr>
        </table>
      </td>
      <td valign="top" style="font-size:13px;color:rgba(232,228,245,0.85);line-height:1.5">${text}</td>
    </tr>
  </table>`;
}

export function renderHoldingHTML(first) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>A Quick Update from Uplift</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f0ecff; font-family:'Inter',sans-serif; color:#1a1733; padding:40px 16px; }
  </style>
</head>
<body>
<div style="max-width:640px;margin:0 auto">

  <!-- Header -->
  <div style="background:#1a1733;border-radius:16px 16px 0 0;padding:24px 40px;text-align:center">
    <img src="https://uplift2026.vercel.app/uplift-logo-white.png" alt="Uplift" style="height:34px;width:auto;display:block;margin:0 auto;" onerror="this.src='https://uplift2026.vercel.app/uplift-logo.png';this.style.filter='brightness(0) invert(1)'"/>
  </div>

  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#5c4eb5 0%,#3d2f8a 100%);padding:46px 40px 40px;text-align:center">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);color:#e8e4f5;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:18px;border:1px solid rgba(255,255,255,0.2)">✦ Match Update</div>
    <h1 style="font-size:30px;font-weight:700;color:#fff;line-height:1.2;letter-spacing:-0.5px;margin-bottom:14px">Your mentor has been selected!</h1>
    <p style="font-size:15px;color:rgba(232,228,245,0.9);line-height:1.65;max-width:460px;margin:0 auto">
      Hi ${esc(first)}, we're just waiting on their final confirmation. Here's what to expect.
    </p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:40px 40px 36px">

    <!-- Main message -->
    <div style="background:#f5f3ff;border:1.5px solid #d4d0e8;border-radius:12px;padding:22px 24px;margin-bottom:24px">
      <p style="font-size:14px;color:#3d2f8a;line-height:1.75;margin-bottom:12px">
        We have found your match and your pairing has been approved — we are simply waiting for them to accept the introduction. We take matching seriously at Uplift, and we want to make sure we get it right. That means finding someone who is not just qualified, but equally engaged and genuinely invested in your success.
      </p>
      <p style="font-size:14px;color:#3d2f8a;line-height:1.75">
        We are aiming to have everything finalized by <strong>end of day tomorrow</strong>. Your meeting cadence will be adjusted in the portal accordingly so you won't lose any time in the program.
      </p>
    </div>

    <!-- Program timeline -->
    <div style="background:#1a1733;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:10px">Program Timeline</div>
      <div style="margin-bottom:8px">
        ${checkItemDark("Minimum <strong style='color:#e8e4f5'>3 one-hour mentoring sessions</strong> required")}
        ${checkItemDark("All sessions completed by <strong style='color:#e8e4f5'>August 4th, 2026</strong>")}
        ${checkItemDark("<strong style='color:#e8e4f5'>At least 1 session</strong> must happen before the midpoint meetup")}
      </div>
      <p style="font-size:12.5px;color:rgba(232,228,245,0.7);line-height:1.6;margin-top:10px">Your timeline starts from when your match is confirmed — you won't be penalized for the delay.</p>
    </div>

    <!-- What to do in the meantime -->
    <div style="font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#9b8fcf;border-bottom:1px solid #e8e4f5;padding-bottom:6px;margin-bottom:14px">In the meantime</div>
    <div style="margin-bottom:28px">
      ${checkItem("Keep attending those <strong>educational sessions</strong> — they count toward your engagement")}
      ${checkItem("Your <strong>meeting cadence will be adjusted</strong> in the portal once your match is confirmed")}
      ${checkItem("Reach out to <a href='mailto:uplift@techunited.co' style='color:#5c4eb5;text-decoration:none'>uplift@techunited.co</a> with any questions")}
    </div>

    <div style="height:1px;background:#e8e4f5;margin-bottom:24px"></div>

    <!-- Sign off -->
    <p style="font-size:14px;color:#3d2f8a;line-height:1.75;margin-bottom:20px">
      We are so excited to have you in this program and can't wait to make this introduction. Thank you for your patience — it means a lot to us.
    </p>
    <p style="font-size:14px;color:#1a1733;line-height:1.6">
      Warm regards,<br/>
      <strong>Kennedy Loper</strong><br/>
      Uplift Program, TechUnited:NJ<br/>
      <a href="mailto:uplift@techunited.co" style="color:#5c4eb5;text-decoration:none">uplift@techunited.co</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="background:#1a1733;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center">
    <p style="font-size:12px;color:#6b6480;line-height:1.7">
      You're receiving this because you're part of the Uplift Summer 2026 Mentorship Program.<br/>
      <a href="#" style="color:#9b8fcf;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { slug } = req.query;
  if (!slug) return res.status(400).send("Missing ?slug=");

  // Import mentees to get first name
  const { MENTEES } = await import("../../../lib/mentees");
  const mentee = MENTEES.find(m => m.slug === slug);
  if (!mentee) return res.status(404).send("Mentee not found");

  const html = renderHoldingHTML(mentee.first);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
