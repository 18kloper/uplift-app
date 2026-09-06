// Mentor credibility rubric.
//
// This scores CLAIMS, never people. Every check below asks "did the thing
// they asserted turn out to be true", and a mentor who asserted nothing is
// routed to "already known to us" rather than penalized. That distinction is
// the whole design. A rubric built on web presence would have caught Md.
// Zahid Hossain in Fall 2026, and it would also have flagged a Newark spa
// owner with no LinkedIn and a founder whose footprint is in another
// language, which is the population Uplift exists to serve.
//
// Run it on mentors only. Mentors are being handed unsupervised access to a
// founder; founders are being handed help. The bar belongs on one side.

export const MENTOR_FLAG_WEIGHTS = {
  "outside-region": 4,      // not reachable in the tri-state area
  "non-us-phone": 4,
  "pre-cutoff": 4,          // in the pool only because an approve overrode keep()
  "no-location": 3,
  "both-narratives-blank": 3,
  "generic-title": 2,       // "Mentor" / "Advisor" is a role claim, not a job
  "multi-org-company": 2,   // several institutions stuffed into one field
  "bad-linkedin": 2,        // present but not a linkedin.com/in/ URL
  "linkedin-name-mismatch": 3, // the slug carries somebody else's name
  "thin-why": 2,
  "one-narrative-blank": 1,
  "no-time-pref": 1,
  "all-stages": 1,
  "email-name-mismatch": 1,
};

// Each weight point costs 7 points of the 100. Kept here rather than in the
// admin page so the tooltip that explains the score is generated from the
// same numbers that compute it, and cannot drift away from them.
export const POINTS_PER_WEIGHT = 7;
export const RETURNING_FLOOR = 78;

// Does the LinkedIn URL they pasted actually belong to the name they gave?
//
// LinkedIn returns HTTP 999 behind an authwall for every profile, real or
// invented, so fetching one proves nothing. The slug does: a profile URL
// carries the person's name, and a mentor pasting somebody else's link shows
// up as zero overlap between the name on the form and the name in the URL.
//
// Deliberately generous. LinkedIn truncates ("paulheit" for Paul Heitlinger),
// uses an initial ("jhakakian" for Jonathan Hakakian), and appends a numeric
// id, so ANY name token matching is a pass. Only a complete miss is flagged,
// which across the Fall 2026 pool of 38 produced zero false positives.
export function linkedinNameMatch(name, url) {
  if (!url || !name) return { checked: false };
  const path = String(url).replace(/^https?:\/\//i, "").replace(/^[^/]*/, "");
  const m = /\/in[/.]([^/?#]+)/i.exec(path);
  if (!m) return { checked: false, malformed: true };
  const slug = m[1].toLowerCase().replace(/-[0-9a-f]{6,}$/i, "");
  const tokens = name.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2);
  if (!tokens.length) return { checked: false };
  const matched = tokens.filter(tok => slug.includes(tok));
  return { checked: true, slug, matched, ok: matched.length > 0 };
}


export const CHECKS = [
  { key: "linkedin-resolves", pts: 2, group: "Identity",
    ask: "Does the LinkedIn URL they gave open a real profile with their name on it?",
    fail: "Dead link, wrong name, or a profile with no history." },
  { key: "profile-consistent", pts: 1, group: "Identity",
    ask: "Does that profile roughly match what they wrote on the form?",
    fail: "Profile says something materially different from the application." },
  { key: "employer-exists", pts: 1, group: "Employer",
    ask: "Does the company they named exist and have a findable footprint?",
    fail: "No trace of the organization anywhere." },
  { key: "employer-links-them", pts: 2, group: "Employer",
    ask: "Does the company connect back to them? Team page, LinkedIn employer, press, anything.",
    fail: "Company is real but nothing ties this person to it." },
  { key: "title-corroborated", pts: 2, group: "Role",
    ask: "Is the title corroborated anywhere other than their own application?",
    fail: "Title appears only where they typed it themselves." },
  { key: "reachable-in-region", pts: 1, group: "Reachability",
    ask: "Can a NJ founder actually reach them? Tri-state, or a timezone that supports real sessions.",
    fail: "Timezone or distance makes the committed sessions impractical." },
  { key: "independent-mention", pts: 2, group: "Corroboration",
    ask: "Any third-party mention at all? Press, panel, publication, org roster, podcast.",
    fail: "Nothing exists that they did not write themselves." },
  { key: "known-to-us", pts: 3, group: "Corroboration",
    ask: "Have we worked with them before, or did someone we trust vouch for them?",
    fail: "Nobody at TechUnited can place them.",
    note: "Auto-passes for returning mentors. This is the check that keeps the rubric fair to people with a thin web presence." },
];

export const MAX = CHECKS.reduce((n, c) => n + c.pts, 0); // 14

// The escalation standard. What the score obliges us to actually do.
//
//   Clear   85+     Nothing owed. Approve and match.
//   Check   60-84   We reach out personally and collect what is missing,
//                   then confirm the rest of the application adds up.
//   Review  under 60  A reference. Someone credible vouches for them by name
//                   before they are put in front of a founder.
//
// Written as obligations rather than adjectives on purpose. "Thin application"
// is a description nobody has to act on; "collect what is missing" is a task.
export const STANDARD = [
  { min: 85, key: "clear", label: "Clear",
    action: "All set. Approve and match.",
    detail: "Everything they claimed holds up, or they have mentored for us before." },
  { min: 60, key: "check", label: "Check",
    action: "Reach out personally and collect the missing pieces.",
    detail: "Ask for what the form left blank, confirm the role and the employer, and make sure the rest adds up before approving." },
  { min: 0, key: "review", label: "Review",
    action: "Get a reference before they meet a founder.",
    detail: "Someone credible needs to vouch for them by name. Do not match on the application alone." },
];

export const standardFor = (score) => STANDARD.find(b => score >= b.min) || STANDARD.at(-1);

export const BANDS = [
  { min: 11, band: "verified",   action: "Match them.", tone: "ok" },
  { min: 7,  band: "partial",    action: "Match after a 15-minute intro call.", tone: "warn" },
  { min: 4,  band: "thin",       action: "Do not match yet. One of us calls them first.", tone: "warn" },
  { min: 0,  band: "unverified", action: "Do not match. Nothing they claimed checked out.", tone: "bad" },
];

export const bandFor = (score) => BANDS.find(b => score >= b.min) || BANDS.at(-1);

// Pre-built searches so a check takes seconds instead of inventing queries.
export function searchesFor(m) {
  const q = (s) => `https://www.google.com/search?q=${encodeURIComponent(s)}`;
  const name = m.name || "";
  const co = (m.company || "").split(/[,(]/)[0].trim();
  const out = [
    { label: "Name + company", url: q(`"${name}" ${co}`.trim()) },
    { label: "Name + title", url: q(`"${name}" "${m.title || ""}"`.trim()) },
    { label: "Name alone, exact", url: q(`"${name}"`) },
  ];
  if (co) out.push({ label: "Does the company exist?", url: q(`${co} company`) });
  if (co) out.push({ label: "Company site, does it list them?", url: q(`"${name}" site OR team OR staff ${co}`) });
  if (m.linkedin) out.push({ label: "Open their LinkedIn", url: m.linkedin });
  return out;
}

// Verification result + the form-side risk flags, combined into one call.
// Form risk never overrides verification; it decides how hard to look.
export function verdict({ score, risk = 0, returning = false }) {
  const b = bandFor(score);
  if (returning && score >= 4) return { ...b, band: "returning", action: "Returning mentor. Confirm they still hold the role, then match." };
  if (risk >= 10 && b.band === "verified") return { ...b, band: "verified-but-flagged", tone: "warn",
    action: "Real person, poor fit. Read the form flags before matching." };
  return b;
}

import { servedInSummer } from "./summer-mentors";

// The number that lands on the Mentor Apps tab.
//
// It is a credibility score, so it reads high-is-good, and it is derived from
// the form flags rather than from anything about the person. Serving in a
// previous cohort is worth more than any single flag costs, because a mentor
// we have already watched work with a founder is the most verified thing on
// this page. That floor is deliberate: without it the score punishes exactly
// the reliable, low-web-presence mentors it should be protecting.
export function credibility(m) {
  const risk = m.risk || 0;
  const flags = m.flags || [];
  const known = servedInSummer(m.name);
  let score = Math.max(0, 100 - risk * POINTS_PER_WEIGHT);
  if (known) score = Math.max(score, RETURNING_FLOOR); // never below "check" for a returning mentor
  const band =
    score >= 85 ? { key: "clear",  label: "Clear",  fg: "#1a6e42", bg: "#e8f8f0" }
  : score >= 60 ? { key: "check",  label: "Check",  fg: "#b35c00", bg: "#fff3e0" }
  :               { key: "review", label: "Review", fg: "#c0392b", bg: "#fef0f0" };
  return { score, band, known, flags, risk,
    standard: standardFor(score),
    why: flags.map(f => f.flag + (f.detail ? ` (${f.detail})` : "")) };
}
