// GET /api/mentor-portal-data?mentorSlug=ed-sawma
// Returns all mentees assigned to this mentor + their milestones, reflections, sessions.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../lib/sheets-helper";
import { MENTEES, MENTEE_EMAILS } from "../../lib/mentees";

function nameToSlug(name) {
  return name.toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function handler(req, res) {
  const { mentorSlug } = req.query;
  if (!mentorSlug) return res.status(400).json({ error: "mentorSlug required" });

  // Find all mentees assigned to this mentor
  const menteeRecords = MENTEES.filter(m => {
    if (!m.mentor?.name) return false;
    return nameToSlug(m.mentor.name) === mentorSlug;
  });

  if (!menteeRecords.length) return res.status(404).json({ error: "Mentor not found" });

  const mentor = menteeRecords[0].mentor;

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const hasSheets = spreadsheetId && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;

  const mentees = [];

  for (const m of menteeRecords) {
    const menteeData = {
      slug: m.slug,
      first: m.first,
      last: m.last,
      company: m.company || "",
      stage: m.stage || "",
      industry: m.industry || "",
      county: m.county || "",
      cohort: m.cohort || null,
      cohortName: ({ 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" })[m.cohort] || null,
      primaryFocus: m.primaryFocus || "",
      secondaryFoci: m.secondaryFoci || [],
      email: MENTEE_EMAILS[m.slug] || "",
      linkedin: m.linkedin || "",
      milestones: Object.fromEntries(MILESTONE_KEYS.map(k => [k, false])),
      reflections: {},
      sessions: [],
    };

    if (!hasSheets) { mentees.push(menteeData); continue; }

    const sheets = getSheetsClient();

    // 1. Milestones from Dashboard
    try {
      const TABS = ["Milestone Dashboard", "Dashboard", "Master Tracker"];
      for (const tab of TABS) {
        try {
          const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A1:Z500` });
          const rows = r.data.values || [];
          if (rows.length < 2) continue;
          const headers = rows[0].map(h => (h || "").toLowerCase());
          const slugIdx = headers.findIndex(h => h.includes("slug"));
          const milestoneColIdxs = {};
          MILESTONE_KEYS.forEach((key, i) => {
            const byLabel = rows[0].findIndex(h => h === MILESTONE_LABELS[key]);
            const byKey   = rows[0].findIndex(h => h?.toLowerCase() === key.toLowerCase());
            milestoneColIdxs[key] = byLabel !== -1 ? byLabel : byKey !== -1 ? byKey : 6 + i;
          });
          const row = rows.find((r, i) => i > 0 && r[slugIdx]?.trim() === m.slug);
          if (row) {
            MILESTONE_KEYS.forEach(key => {
              const val = row[milestoneColIdxs[key]];
              if (val === "TRUE" || val === true) menteeData.milestones[key] = true;
            });
          }
          break;
        } catch (_) { continue; }
      }
    } catch (_) {}

    // 2. Reflections from mentee's individual sheet tab
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${m.slug}!A:D` });
      const rows = r.data.values || [];
      const map = {};
      for (let i = 1; i < rows.length; i++) {
        const fieldKey  = rows[i][1] || "";
        const question  = rows[i][2] || "";
        const value     = (rows[i][3] || "").trim();
        if (fieldKey && value) map[fieldKey] = { question, value };
      }
      menteeData.reflections = map;
    } catch (_) {}

    // 3. Sessions from SessionReview
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: "SessionReview!A:I" });
      const rows = r.data.values || [];
      // Col B(1)=slug, C(2)=name, D(3)=date, E(4)=60min, F(5)=transcript, G(6)=takeaways, A(0)=approved
      const sessions = rows.slice(1)
        .filter(row => row[1]?.trim() === m.slug)
        .map(row => ({
          approved: row[0] || "Pending",
          date:     row[3] || "",
          sixtyMin: row[4] === "TRUE" || row[4] === true,
          hasTranscript: row[5] === "TRUE" || row[5] === true,
          takeaways: row[6] || "",
        }));
      menteeData.sessions = sessions;
    } catch (_) {}

    mentees.push(menteeData);
  }

  return res.status(200).json({
    mentor,
    mentorSlug,
    mentees,
    generatedAt: new Date().toISOString(),
  });
}
