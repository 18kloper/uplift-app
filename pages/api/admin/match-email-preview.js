// GET /api/admin/match-email-preview?slug=xxx[&token=xxx]
// Returns a fully-rendered HTML match introduction email for a given mentee slug.
// Auth: ?token=<ADMIN_SECRET>

import { buildMatchEmailPayload } from "./match-email-data";

export const config = { api: { responseLimit: false } };

function esc(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tag(label) {
  return `<span style="display:inline-block;background:#f0ecff;color:#5c4eb5;font-size:11.5px;font-weight:500;padding:4px 10px;border-radius:100px;border:1px solid #d4d0e8;margin:2px 3px 2px 0">${esc(label)}</span>`;
}

function reflectionRow(label, value) {
  if (!value) return "";
  return `
    <div style="padding:14px 20px;border-bottom:1px solid #f0ecff">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:5px">${esc(label)}</div>
      <div style="font-size:13.5px;color:#1a1733;line-height:1.6">${esc(value)}</div>
    </div>`;
}

function profileCard(role, data, isMentor) {
  const roleColor = isMentor ? "#1a1733" : "#5c4eb5";
  const linkedinBtn = data.linkedin
    ? `<a href="${esc(data.linkedin)}" target="_blank" rel="noopener"
         style="display:inline-flex;align-items:center;gap:5px;background:#f0ecff;color:#5c4eb5;font-size:11.5px;font-weight:600;text-decoration:none;padding:4px 11px;border-radius:100px;margin-bottom:14px;border:1px solid #c4b8f0">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="#5c4eb5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
         LinkedIn
       </a>`
    : "";

  const avatarInner = data.photo
    ? `<img src="${esc(data.photo)}" alt="${esc(data.name)}" width="72" height="72" style="width:72px;height:72px;border-radius:36px;display:block;object-fit:cover;border:2px solid #d4d0e8">`
    : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&size=72&background=e8e4f5&color=5c4eb5&bold=true&rounded=true" alt="${esc(data.name)}" width="72" height="72" style="width:72px;height:72px;border-radius:36px;display:block;border:2px solid #d4d0e8">`;

  const subtitle = isMentor
    ? `${esc(data.title)}${data.title && data.company ? " · " : ""}${esc(data.company)}`
    : `${esc(data.company)}${data.company && data.stage ? " · " : ""}${esc(data.stage)}`;

  return `
  <td valign="top" style="border:1.5px solid #e8e4f5;border-radius:14px;padding:24px 18px 20px;text-align:center;background:#fafafa;width:46%">
    <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:4px 14px;border-radius:100px;white-space:nowrap;background:${roleColor};color:#fff;display:inline-block;margin-bottom:14px">${esc(role)}</div><br/>
    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 auto 12px">
      <tr><td align="center" valign="middle" style="padding:0">${avatarInner}</td></tr>
    </table>
    <div style="font-size:15px;font-weight:700;color:#1a1733;margin-bottom:2px">${esc(data.name)}</div>
    <div style="font-size:12px;color:#6b6480;margin-bottom:10px">${subtitle}</div>
    ${linkedinBtn}
    ${data.bio ? `<div style="font-size:12.5px;color:#4a4060;line-height:1.65;text-align:left;margin-bottom:12px">${esc(data.bio)}</div>` : ""}
    ${data.availability ? `
    <div style="background:#f0ecff;border:1px solid #d4d0e8;border-radius:8px;padding:9px 12px;text-align:left">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:4px">Availability</div>
      <div style="font-size:12px;color:#4a4060;line-height:1.5">${esc(data.availability)}</div>
    </div>` : ""}
  </td>`;
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

function sectionLabel(text) {
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:12px">
    <tr>
      <td style="font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#9b8fcf;white-space:nowrap;padding-right:8px">${esc(text)}</td>
      <td width="100%" style="border-top:1px solid #e8e4f5"></td>
    </tr>
  </table>`;
}

// Demo data, injected when ?demo=1 to show fully populated email
function injectDemoData(d) {
  d.mentor.bio = d.mentor.bio || "Eric has spent 15 years building and scaling B2B SaaS companies across the Mid-Atlantic. He co-founded Prospective, an enterprise analytics platform, and previously led go-to-market at two venture-backed startups through Series A. He's passionate about helping early-stage founders avoid the pitfalls he learned the hard way.";
  d.mentor.motivation = d.mentor.motivation || "I've had incredible mentors who shaped how I think about building companies, and I want to pay that forward. I'm specifically excited to work with founders who are navigating the gap between product-market fit and real scale, that's where I learned the most and where I think I can add the most value.";
  d.mentor.availability = d.mentor.availability || "Weekday evenings (6–8pm EST) and Saturday mornings. Flexible on timing, just reach out and we'll find something that works.";
  d.mentor.linkedin = d.mentor.linkedin || "https://linkedin.com/in/ericschmalzbauer";
  d.mentee.bio = d.mentee.bio || "Sonali is the founder of Recky Solutions, an enterprise SaaS platform that streamlines vendor compliance and onboarding for mid-market companies. She previously spent 6 years in product at a Fortune 500 firm before going full-time on Recky in 2024. She's currently focused on closing her first 10 enterprise contracts.";
  d.mentee.linkedin = d.mentee.linkedin || "https://linkedin.com/in/sonalichilupuri";
  d.mentee.availability = d.mentee.availability || "Mornings (9–11am EST) or after 5pm on weekdays. Available most weekends with advance notice.";
  d.mentee.reflections = {
    primaryGoalRefined: "I want to leave this program with a repeatable outbound motion and at least 3 signed enterprise pilots.",
    secondaryGoalRefined: "Get clearer on what a Series A story looks like for a compliance SaaS at my stage.",
    mostImportantContext: "Recky is solving a problem most companies don't realize they have until it's too late, I need my mentor to understand why urgency is hard to create in this space and how to build it.",
    currentlyStuckOn: "Whether to hire a dedicated sales person now or continue founder-led sales until we hit $200k ARR. I've gotten conflicting advice and I'm not sure what the right threshold is.",
    successFirstMeeting: "I want to walk away with clarity on the sales hire question and a clear framework for thinking about when the right time is. If we can also align on how we'll work together going forward, that would be a win.",
  };
  d.matchReason = d.matchReason || "Eric has done exactly what Sonali is trying to do, B2B SaaS, enterprise sales, and the fundraising story that follows. We think he's the right person to help her move faster.";
  return d;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://uplift2026.vercel.app";

function absoluteUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function renderHTML(d) {
  const { mentee, mentor, matchReason } = d;
  const r = mentee.reflections || {};

  // Make sure photo URLs are absolute for email clients
  if (mentee.photo) mentee.photo = absoluteUrl(mentee.photo);
  if (mentor.photo) mentor.photo = absoluteUrl(mentor.photo);

  // Goals section, only show rows that have data
  const goalsRows = [
    mentee.primaryFocus || r.primaryGoalRefined
      ? reflectionRow(
          "Primary focus",
          r.primaryGoalRefined
            ? `${mentee.primaryFocus}${r.primaryGoalRefined !== mentee.primaryFocus ? `, ${r.primaryGoalRefined}` : ""}`
            : mentee.primaryFocus
        )
      : "",
    mentee.secondaryFoci?.length
      ? `<div style="padding:14px 20px;border-bottom:1px solid #f0ecff">
           <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:7px">Secondary focus areas</div>
           <div>${mentee.secondaryFoci.map(tag).join("")}</div>
         </div>`
      : "",
    r.mostImportantContext
      ? reflectionRow("What they most want their mentor to understand", r.mostImportantContext)
      : "",
    r.currentlyStuckOn
      ? reflectionRow("Decision they're currently stuck on", r.currentlyStuckOn)
      : "",
    r.successFirstMeeting
      ? reflectionRow("What success looks like by the first meeting", r.successFirstMeeting)
      : "",
  ].filter(Boolean).join("");

  const hasGoals = goalsRows.length > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>You've Been Matched, Uplift</title>
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
    <div style="display:inline-block;background:rgba(255,255,255,0.15);color:#e8e4f5;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:18px;border:1px solid rgba(255,255,255,0.2)">✦ You've Been Matched</div>
    <h1 style="font-size:34px;font-weight:700;color:#fff;line-height:1.15;letter-spacing:-0.8px;margin-bottom:14px">Welcome to Uplift.</h1>
    <p style="font-size:15px;color:rgba(232,228,245,0.9);line-height:1.65;max-width:460px;margin:0 auto">
      ${esc(mentee.first)} completed onboarding last week and is ready to go.
      We're making the introduction, we'll let you two take it from here.
    </p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:40px 40px 36px">

    <!-- Meet your match -->
    ${sectionLabel("Meet your match")}
    <div style="background:#f5f3ff;border:1.5px solid #d4d0e8;border-radius:12px;padding:20px 22px;margin-bottom:28px">
      <p style="font-size:14px;color:#3d2f8a;line-height:1.7;margin-bottom:10px">
        Uplift is TechUnited NJ's mentorship program focused on lifting women and minority-owned small businesses across New Jersey. We hope to be a small but meaningful part of your journey, and we're so glad you both feel the same. We're looking forward to spending the next nine weeks with you.
      </p>
      <p style="font-size:14px;color:#3d2f8a;line-height:1.7">
        <strong>${esc(mentor.name.split(" ")[0])}, meet ${esc(mentee.first)}. ${esc(mentee.first)}, meet ${esc(mentor.name.split(" ")[0])}.</strong> You're both on this email. ${esc(mentor.name.split(" ")[0])} volunteered their time to show up for this community, and ${esc(mentee.first)} has been putting in the work since day one. We're excited to officially make this introduction.
      </p>
      <p style="font-size:14px;color:#3d2f8a;line-height:1.7">
        <strong>The next step is to get planning on when you'll first meet. We've attached some helpful details and background information below.</strong>
      </p>
    </div>

    <!-- Profile cards -->
    ${sectionLabel("Your match")}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:${mentor.motivation ? "16px" : "28px"}">
      <tr>
        ${profileCard("Mentor", { name: mentor.name, title: mentor.title, company: mentor.company, bio: mentor.bio, linkedin: mentor.linkedin, availability: mentor.availability, photo: mentor.photo }, true)}
        <td align="center" valign="middle" style="width:32px;padding:0 6px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9b8fcf" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </td>
        ${profileCard("Mentee", { name: mentee.name, company: mentee.company, stage: mentee.stage, bio: mentee.bio, linkedin: mentee.linkedin, availability: mentee.availability, photo: mentee.photo }, false)}
      </tr>
    </table>

    <!-- Contact block -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f5f3ff;border:1.5px solid #d4d0e8;border-radius:12px;margin-bottom:16px">
      <tr>
        <td align="center" style="padding:16px 22px">
          <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
            <tr>
              <td style="padding-right:8px;font-size:14px">✉️</td>
              <td style="padding-right:32px">
                <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:2px">Mentor</div>
                <a href="mailto:${esc(mentor.email)}" style="font-size:13px;font-weight:600;color:#5c4eb5;text-decoration:none">${esc(mentor.email)}</a>
              </td>
              <td style="width:1px;background:#d4d0e8;padding:0 16px 0 0">&nbsp;</td>
              <td style="padding-left:16px;padding-right:8px;font-size:14px">✉️</td>
              <td>
                <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:2px">Mentee</div>
                <a href="mailto:${esc(mentee.email)}" style="font-size:13px;font-weight:600;color:#5c4eb5;text-decoration:none">${esc(mentee.email)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${mentor.motivation ? `
    <!-- Mentor motivation -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#1a1733;border-radius:12px;margin-bottom:28px">
      <tr>
        <td valign="top" style="padding:18px 14px 18px 18px;width:44px">
          <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:34px;height:34px;background:#5c4eb5;border-radius:8px">
            <tr><td align="center" valign="middle" style="font-size:15px;width:34px;height:34px">💬</td></tr>
          </table>
        </td>
        <td valign="top" style="padding:18px 18px 18px 0">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9b8fcf;margin-bottom:5px">Why ${esc(mentor.name.split(" ")[0])} wants to mentor</div>
          <div style="font-size:13px;color:rgba(232,228,245,0.88);line-height:1.65;font-style:italic">"${esc(mentor.motivation)}"</div>
        </td>
      </tr>
    </table>` : ""}

    ${hasGoals ? `
    <!-- Mentee goals -->
    ${sectionLabel(`What ${esc(mentee.first)} is working toward`)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1.5px solid #e8e4f5;border-radius:12px;overflow:hidden;margin-bottom:20px">
      <tr><td style="background:#5c4eb5;padding:12px 20px;font-size:12px;font-weight:700;color:#fff;letter-spacing:0.3px">
        ${esc(mentee.first)}'s goals for this program
      </td></tr>
      <tr><td>${goalsRows}</td></tr>
    </table>` : ""}

    <div style="height:1px;background:#e8e4f5;margin:28px 0"></div>

    <!-- Program snapshot -->
    <div style="background:#f5f3ff;border:1.5px solid #d4d0e8;border-radius:12px;padding:22px 24px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#1a1733;margin-bottom:6px">
        <span style="display:inline-block;width:8px;height:8px;background:#5c4eb5;border-radius:50%;margin-right:6px;vertical-align:middle"></span>
        What's happening in the program
      </div>
      <p style="font-size:13px;color:#4a4060;line-height:1.65;margin-bottom:14px">
        While you're meeting, ${esc(mentee.first)} is also attending weekly educational sessions, completing reflections and prompts in the portal, and doing the work to make sure they're getting the most out of your time together.
      </p>
      <div>
        ${checkItem("Minimum <strong>3 one-hour mentoring sessions</strong> required")}
        ${checkItem("All sessions completed by <strong>August 4th, 2026</strong>")}
        ${checkItem("<strong>At least 1 session</strong> must happen before the midpoint meetup")}
        ${checkItem("Mentee is responsible for booking, coordinating &amp; logging all sessions")}
      </div>
    </div>

    <!-- Mentee responsibility -->
    <div style="background:#fff8f0;border:2px solid #f59e0b;border-radius:12px;padding:20px 22px;margin-bottom:16px">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:14px">
        <tr>
          <td valign="top" style="padding-right:10px">
            <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:32px;height:32px;background:#f59e0b;border-radius:8px">
              <tr><td align="center" valign="middle" style="font-size:16px;width:32px;height:32px">📣</td></tr>
            </table>
          </td>
          <td valign="middle">
            <div style="font-size:14px;font-weight:700;color:#92400e">Mentee, this is on you</div>
            <div style="font-size:11.5px;color:#b45309">Your mentor is here to guide you. It's your job to make it happen.</div>
          </td>
        </tr>
      </table>
      <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:12px">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr>
            <td valign="top" style="font-size:18px;padding-right:10px">👋</td>
            <td valign="top" style="font-size:13.5px;font-weight:600;color:#92400e;line-height:1.45">Be proactive. Reach out to your mentor, share additional context, and start coordinating.</td>
          </tr>
        </table>
      </div>
      <div>
        ${checkItem("You are responsible for scheduling, coordinating, and following up on every session")}
        ${checkItem("Log every meeting in the program portal, unlogged sessions do not count toward your 3")}
        ${checkItem("Come prepared to each session with a clear agenda or questions")}
      </div>
    </div>

    <!-- Reply nudge -->
    <div style="text-align:center;margin-bottom:8px">
      <div style="font-size:13px;color:#6b6480">Questions? Reply to this email anytime.</div>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#1a1733;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center">
    <p style="font-size:12px;color:#6b6480;line-height:1.7">
      You're receiving this because you're part of the Uplift Summer 2026 Mentorship Program.<br/>
      <a href="#" style="color:#9b8fcf;text-decoration:underline">Unsubscribe</a> · <a href="#" style="color:#9b8fcf;text-decoration:underline">Program FAQ</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { slug, token } = req.query;
  if (!slug) return res.status(400).send("Missing ?slug=");

  try {
    let data = await buildMatchEmailPayload(slug);
    if (req.query.demo === "1") data = injectDemoData(data);
    const html = renderHTML(data);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (err) {
    console.error("match-email-preview error:", err.message);
    return res.status(500).send(`Server error: ${err.message}`);
  }
}
