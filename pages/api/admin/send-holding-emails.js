// One-shot: send holding email to all 7 unmatched mentees
import { MENTEES, MENTEE_EMAILS } from "../../../lib/mentees";
import { renderHoldingHTML } from "./holding-email-preview";

const SLUGS = [
  "gifty-anane",
  "annalyce-dagostino-gavin",
  "lina-escobar",
  "favio-jasso",
  "mark-kallback",
  "alina-okun",
  "alisha-sharma",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const log = [];

  for (const slug of SLUGS) {
    const mentee = MENTEES.find(m => m.slug === slug);
    const email = MENTEE_EMAILS[slug];

    if (!mentee || !email) {
      log.push({ slug, status: "skipped", reason: "not found" });
      continue;
    }

    const html = renderHoldingHTML(mentee.first);

    const payload = {
      from: "Kennedy Loper <kennedy@techunited.co>",
      to: [email],
      cc: ["uplift@techunited.co"],
      subject: "Your Match Is Still in Progress — A Note from Uplift",
      html,
    };

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (r.ok) {
      log.push({ slug, email, status: "sent", id: data.id });
    } else {
      log.push({ slug, email, status: "error", error: data });
    }
  }

  return res.status(200).json({ ok: true, log });
}
