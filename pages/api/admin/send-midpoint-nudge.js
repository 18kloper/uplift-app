// One-shot: send midpoint registration nudge to unregistered mentees
// POST /api/admin/send-midpoint-nudge?token=...

const RECIPIENTS = [
  { first: "Gifty",         email: "giftyanane@icloud.com" },
  { first: "Anthony",       email: "anthony.caruso@contextral.com" },
  { first: "Lina",          email: "sweetaurorasoapandcandle@gmail.com" },
  { first: "Favio",         email: "faviojasso@gmail.com" },
  { first: "Soheil",        email: "ssoheil13@gmail.com" },
  { first: "Jerry",         email: "jprimus@pclinkup.com" },
  { first: "Andrea",        email: "vernengo@rowan.edu" },
  { first: "Jedidiah",      email: "jjw252@scarletmail.rutgers.edu" },
  { first: "Hamza",         email: "hamzalizafar@gmail.com" },
  { first: "Sonali",        email: "sonali@reckysolutions.com" },
  { first: "Debbie",        email: "info@3dhrconsulting.com" },
  { first: "Naveen",        email: "naveenk@truxt.ai" },
  { first: "Ahmed",         email: "ahmed@sphinque.com" },
  { first: "Bejan",         email: "bmoers@icloud.com" },
  { first: "Emilia",        email: "emiliasavich@gmail.com" },
  { first: "Angie",         email: "angietcm53@gmail.com" },
  { first: "Adeola",        email: "adeola@localwindow.co" },
  { first: "Angela",        email: "angela.aricatt@gmail.com" },
  { first: "Shell",         email: "Hi@WeDisruptTheGap.com" },
  { first: "Daniel",        email: "j100892@gmail.com" },
  { first: "Paula",         email: "paula@ozzieapp.com" },
  { first: "Eliana",        email: "eliana.antoinette.z@gmail.com" },
  { first: "Ebunoluwa",     email: "e.r.adenekan@gmail.com" },
  { first: "Logan",         email: "logan@tickerapp.io" },
  { first: "Aliya",         email: "aliyalaliwala12@gmail.com" },
  { first: "Priyal",        email: "priyallevine@gmail.com" },
  { first: "Mohammad",      email: "mn552@njit.edu" },
  { first: "Abhaya",        email: "abhaya.pawar@ilikallc.com" },
  { first: "Parminder",     email: "psingh@deepinspect.ai" },
  { first: "Mehul",         email: "mehul@diamondhedge.com" },
  { first: "Han",           email: "han.nguyen@princeton.edu" },
  { first: "Gunjan",        email: "gunjan@virre.ai" },
  { first: "Elisa",         email: "elisa@juego.juegos" },
  { first: "Saurabh",       email: "sgandhe@arya57.com" },
  { first: "Natalie",       email: "nkitts@thezigzagflow.com" },
  { first: "Daniel",        email: "daniel@buildwithdream.ai" },
  { first: "Jeremy",        email: "jeremy.ruiz@rutgers.edu" },
  { first: "Jordan-River",  email: "jr@tapyoca.com" },
  { first: "Chirag",        email: "chirag@crestwood.digital" },
  { first: "Rachel",        email: "rhayes@ravelgenetics.com" },
];

function buildHtml(first) {
  return `<p>Hi ${first},</p>

<p>We're one week out and you haven't registered yet. <strong>Please do this today.</strong></p>

<p><strong>Attendance at this in-person midpoint meetup is a program requirement.</strong> This is your opportunity to connect with fellow founders in your cohort, meet founders from other cohorts, connect with more mentors, and maybe even chat with a few investors who will be in the room. We'll have a fireside chat, networking, food and drinks, and a photographer on site. Come ready to make an impression.</p>

<p><strong>Register here: <a href="https://lu.ma/zfr1e2gt">https://lu.ma/zfr1e2gt</a></strong></p>

<p>
<strong>Midpoint Meetup</strong><br/>
<strong>Tuesday, June 23 - 4:00-7:00pm</strong><br/>
<strong>Antique Lofts, Hoboken, NJ (2 min walk from the PATH)</strong>
</p>

<p>If you have a conflict, reply to this email immediately.</p>

<p>See you there,<br/>TechUnited:NJ</p>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) return res.status(401).end();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY not set" });

  const results = [];
  for (const r of RECIPIENTS) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Kennedy <kennedy@techunited.co>",
          to: [r.email],
          cc: ["uplift@techunited.co"],
          subject: "Uplift Check-In - You Still Haven't Registered for the Midpoint Meetup",
          html: buildHtml(r.first),
        }),
      });
      const data = await resp.json();
      results.push({ email: r.email, ok: resp.ok, id: data.id, error: data.message });
    } catch (e) {
      results.push({ email: r.email, ok: false, error: e.message });
    }
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  return res.status(200).json({ sent, failed, results });
}
