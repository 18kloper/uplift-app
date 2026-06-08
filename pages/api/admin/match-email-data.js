// GET /api/admin/match-email-data?slug=xxx
// Assembles full match-email payload for a mentee by pulling from:
//   1. lib/mentees.js           — primaryFocus, secondaryFoci, photo, company, stage, etc.
//   2. Typeform (hAbo7Jdh)      — mentee bio, linkedin, availability
//   3. Typeform (AayoroO1)      — mentor bio, linkedin, availability
//   4. Google Sheets (slug tab) — in-depth reflections: w1 goal refinements + w2 mentor prep
// Auth: ?token=<ADMIN_SECRET>

import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES, MENTEE_EMAILS, MENTOR_EMAILS } from "../../../lib/mentees";

const MENTEE_FORM_ID = "hAbo7Jdh";
const MENTOR_FORM_ID = "AayoroO1";

function flattenFields(fields) {
  const result = [];
  for (const f of (fields || [])) {
    if (f.type === "group" || f.type === "inline_group") {
      result.push(...flattenFields(f.properties?.fields));
    } else {
      result.push(f);
    }
  }
  return result;
}

function findRef(fields, ...keywords) {
  for (const f of fields) {
    const t = (f.title || "").toLowerCase();
    if (keywords.some(k => t.includes(k.toLowerCase()))) return f.ref || f.id;
  }
  return null;
}

function getVal(answers, ref) {
  if (!ref) return "";
  const a = answers.find(a => a.field?.ref === ref || a.field?.id === ref);
  return (
    a?.text || a?.email || a?.url ||
    a?.choices?.labels?.join(", ") ||
    a?.choice?.label || ""
  ).trim();
}

const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

async function fetchLinkedInPhoto(linkedinUrl) {
  if (!linkedinUrl) return "";
  try {
    // Normalize URL
    const url = linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Try og:image first
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) return ogMatch[1];
    return "";
  } catch {
    return "";
  }
}

async function fetchTypeformProfile(formId, matchName, matchEmail, token) {
  const [formRes, respRes] = await Promise.all([
    fetch(`https://api.typeform.com/forms/${formId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://api.typeform.com/forms/${formId}/responses?page_size=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const formDef  = await formRes.json();
  const respData = await respRes.json();
  const fields   = flattenFields(formDef.fields || []);

  // Field refs
  const refs = {
    first:      findRef(fields, "first name"),
    last:       findRef(fields, "last name"),
    full:       findRef(fields, "full name", "your name"),
    email:      findRef(fields, "email"),
    bio:        findRef(fields, "bio", "about you", "tell us about"),
    linkedin:   findRef(fields, "linkedin"),
    avail:      findRef(fields, "availab", "availability", "best time", "schedule"),
    motivation: findRef(fields, "why do you want to mentor", "why mentor", "motivation", "why are you", "what motivates"),
  };

  const normName  = norm(matchName);
  const normEmail = norm(matchEmail);

  for (const item of (respData.items || [])) {
    const ans = item.answers || [];

    const first  = getVal(ans, refs.first);
    const last   = getVal(ans, refs.last);
    const full   = getVal(ans, refs.full);
    const email  = getVal(ans, refs.email) || ans.find(a => a.type === "email")?.email || "";

    const name = first && last ? `${first} ${last}`.trim() : full;

    const matchByEmail = normEmail && norm(email) === normEmail;
    const matchByName  = normName  && norm(name)  === normName;

    if (!matchByEmail && !matchByName) continue;

    return {
      bio:          getVal(ans, refs.bio),
      linkedin:     getVal(ans, refs.linkedin),
      availability: getVal(ans, refs.avail),
      motivation:   getVal(ans, refs.motivation),
      email:        email || matchEmail,
      name:         name  || matchName,
    };
  }

  return { bio: "", linkedin: "", availability: "", motivation: "", email: matchEmail, name: matchName };
}

async function fetchMatchReason(slug, sheets, spreadsheetId) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Mentor Confirmations!A2:I500`,
    });
    const rows = result.data.values || [];
    // Col E (index 4) = menteeSlug, Col I (index 8) = Match Reason
    const row = rows.find(r => r[4]?.trim() === slug);
    return row?.[8]?.trim() || "";
  } catch {
    return "";
  }
}

async function fetchSheetReflections(slug, sheets, spreadsheetId) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${slug}!A:D`,
    });
    const rows = result.data.values || [];

    // Build key → value map from sheet rows (format: weekNum, fieldKey, question, value)
    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const fieldKey = rows[i][1] || "";
      const value    = (rows[i][3] || "").trim();
      if (fieldKey && value) map[fieldKey] = value;
    }

    return {
      // Week 1: refined focus goals written in the portal
      primaryGoalRefined:   map["primary_refine"]   || "",
      secondaryGoalRefined: map["secondary_refine"] || "",

      // Week 2: mentor prep prompts (filled before first session)
      mostImportantContext: map["prep_q1"] || "",  // What's the single most important thing you want your mentor to understand about your company?
      currentlyStuckOn:     map["prep_q2"] || "",  // What's one decision you're currently stuck on?
      successFirstMeeting:  map["prep_q3"] || "",  // What would make this first meeting feel like a success to you?
    };
  } catch {
    return {
      primaryGoalRefined: "", secondaryGoalRefined: "",
      mostImportantContext: "", currentlyStuckOn: "", successFirstMeeting: "",
    };
  }
}

// ── Exported builder (used by send-match-emails directly, no HTTP) ────────
export async function buildMatchEmailPayload(slug) {
  const menteeRecord = MENTEES.find(m => m.slug === slug);
  if (!menteeRecord) throw new Error(`No mentee found for slug: ${slug}`);

  const token = process.env.TYPEFORM_TOKEN;
  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  const sheetsClient = hasSheets ? getSheetsClient() : null;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const [menteeTypeform, mentorTypeform, sheetReflections, matchReason] = await Promise.all([
    token
      ? fetchTypeformProfile(MENTEE_FORM_ID, `${menteeRecord.first} ${menteeRecord.last}`.trim(), MENTEE_EMAILS[slug] || "", token)
      : Promise.resolve({ bio: "", linkedin: "", availability: "" }),
    token && menteeRecord.mentor?.name
      ? fetchTypeformProfile(MENTOR_FORM_ID, menteeRecord.mentor.name, menteeRecord.mentor.email || "", token)
      : Promise.resolve({ bio: "", linkedin: "", availability: "" }),
    sheetsClient ? fetchSheetReflections(slug, sheetsClient, spreadsheetId) : Promise.resolve({ primaryGoalRefined: "", secondaryGoalRefined: "", mostImportantContext: "", currentlyStuckOn: "", successFirstMeeting: "" }),
    sheetsClient ? fetchMatchReason(slug, sheetsClient, spreadsheetId) : Promise.resolve(""),
  ]);

  const mentorPhoto = await fetchLinkedInPhoto(mentorTypeform.linkedin || menteeRecord.mentor?.linkedin || "");

  return {
    mentee: {
      name: `${menteeRecord.first} ${menteeRecord.last}`.trim(),
      first: menteeRecord.first, last: menteeRecord.last,
      email: MENTEE_EMAILS[slug] || "",
      photo: menteeRecord.photo || "",
      company: menteeRecord.company || "", stage: menteeRecord.stage || "",
      industry: menteeRecord.industry || "", cohort: menteeRecord.cohort || "",
      primaryFocus: menteeRecord.primaryFocus || "", secondaryFoci: menteeRecord.secondaryFoci || [],
      bio: menteeTypeform.bio, linkedin: menteeRecord.linkedin || menteeTypeform.linkedin,
      availability: menteeTypeform.availability, reflections: sheetReflections,
    },
    mentor: {
      name: menteeRecord.mentor?.name || "", email: menteeRecord.mentor?.email || "",
      company: menteeRecord.mentor?.company || "", title: menteeRecord.mentor?.title || "",
      tags: menteeRecord.mentor?.tags || [],
      bio: mentorTypeform.bio, linkedin: mentorTypeform.linkedin,
      availability: mentorTypeform.availability, motivation: mentorTypeform.motivation,
      photo: mentorPhoto,
    },
    matchReason, slug,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "Missing ?slug=" });

  const menteeRecord = MENTEES.find(m => m.slug === slug);
  if (!menteeRecord) return res.status(404).json({ error: `No mentee found for slug: ${slug}` });

  const token = process.env.TYPEFORM_TOKEN;
  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  // ── Fetch in parallel ────────────────────────────────────────────────────
  const sheetsClient = (hasSheets && process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
    ? getSheetsClient() : null;

  const [menteeTypeform, mentorTypeform, sheetReflections, matchReason] = await Promise.all([
    // 1. Mentee Typeform profile
    token
      ? fetchTypeformProfile(
          MENTEE_FORM_ID,
          `${menteeRecord.first} ${menteeRecord.last}`.trim(),
          MENTEE_EMAILS[slug] || "",
          token
        )
      : Promise.resolve({ bio: "", linkedin: "", availability: "" }),

    // 2. Mentor Typeform profile
    token && menteeRecord.mentor?.name
      ? fetchTypeformProfile(
          MENTOR_FORM_ID,
          menteeRecord.mentor.name,
          menteeRecord.mentor.email || "",
          token
        )
      : Promise.resolve({ bio: "", linkedin: "", availability: "" }),

    // 3. Google Sheet reflections for this mentee
    sheetsClient
      ? fetchSheetReflections(slug, sheetsClient, process.env.GOOGLE_SHEET_ID)
      : Promise.resolve({
          primaryGoalRefined: "", secondaryGoalRefined: "",
          mostImportantContext: "", currentlyStuckOn: "", successFirstMeeting: "",
        }),

    // 4. Match reason from Mentor Confirmations col I
    sheetsClient
      ? fetchMatchReason(slug, sheetsClient, process.env.GOOGLE_SHEET_ID)
      : Promise.resolve(""),
  ]);

  // 5. Fetch mentor LinkedIn photo (needs mentorTypeform.linkedin, so runs after)
  const mentorPhoto = await fetchLinkedInPhoto(mentorTypeform.linkedin || menteeRecord.mentor?.linkedin || "");

  // ── Assemble final payload ───────────────────────────────────────────────
  const payload = {
    mentee: {
      name:         `${menteeRecord.first} ${menteeRecord.last}`.trim(),
      first:        menteeRecord.first,
      last:         menteeRecord.last,
      email:        MENTEE_EMAILS[slug] || "",
      photo:        menteeRecord.photo || "",
      company:      menteeRecord.company || "",
      stage:        menteeRecord.stage || "",
      industry:     menteeRecord.industry || "",
      cohort:       menteeRecord.cohort || "",
      primaryFocus: menteeRecord.primaryFocus || "",
      secondaryFoci: menteeRecord.secondaryFoci || [],
      // Typeform fields
      bio:          menteeTypeform.bio,
      linkedin:     menteeRecord.linkedin || menteeTypeform.linkedin,
      availability: menteeTypeform.availability,
      // Sheet reflections
      reflections:  sheetReflections,
    },
    mentor: {
      name:         menteeRecord.mentor?.name || "",
      email:        menteeRecord.mentor?.email || "",
      company:      menteeRecord.mentor?.company || "",
      title:        menteeRecord.mentor?.title || "",
      tags:         menteeRecord.mentor?.tags || [],
      // Typeform fields
      bio:          mentorTypeform.bio,
      linkedin:     mentorTypeform.linkedin,
      availability: mentorTypeform.availability,
      motivation:   mentorTypeform.motivation,
      // LinkedIn profile photo (scraped from og:image)
      photo:        mentorPhoto,
    },
    // Admin-authored match reason from "Mentor Confirmations" col I
    matchReason,
    slug,
  };

  return res.status(200).json(payload);
}
