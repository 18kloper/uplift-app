// GET /api/admin-data
// Returns live milestone + status data for all mentees, used by /admin dashboard.
// Uses MENTEES array as the guaranteed source of all people;
// overlays live milestone data from Google Sheets on top.

import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../lib/sheets-helper";
import { MENTEES, MENTEE_EMAILS, MENTOR_EMAILS } from "../../lib/mentees";

const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

// Mentees whose mentor match was delayed — session 1 due Jun 23 instead of Jun 13
const HOLDING_SLUGS = new Set([
  "gifty-anane", "annalyce-dagostino-gavin", "lina-escobar",
  "favio-jasso", "mark-kallback", "alina-okun", "alisha-sharma",
]);
// Late-matched mentees get an additional +7 days on top of holding dates
const LATE_MATCH_SLUGS = new Set(["lina-escobar"]);

// Week deadline thresholds derived from My Journey program timeline
const PROGRAM_START       = new Date("2026-06-01");
const WEEK1_END           = new Date("2026-06-07");
const WEEK2_END           = new Date("2026-06-14"); // session 1 deadline — normal
const WEEK3_END           = new Date("2026-06-24"); // session 1 deadline — holding (due Jun 23)
const LATE_SESSION1_END   = new Date("2026-07-01"); // session 1 deadline — late match (due Jun 30)
const WEEK4_END           = new Date("2026-06-28");
const WEEK5_END           = new Date("2026-07-05");
const WEEK7_END           = new Date("2026-07-19");

function computeStatus(milestones, today, slug = "") {
  const isLateMatch = LATE_MATCH_SLUGS.has(slug);
  const isHolding   = HOLDING_SLUGS.has(slug);

  // Session 1 deadline: late match → Jul 1, holding → Jun 24, normal → Jun 14
  const effectiveSession1End = isLateMatch ? LATE_SESSION1_END : isHolding ? WEEK3_END : WEEK2_END;
  const effectiveWeek4End    = isLateMatch ? new Date("2026-07-05") : WEEK4_END;
  const effectiveWeek5End    = isLateMatch ? new Date("2026-07-12") : WEEK5_END;
  const effectiveWeek7End    = isLateMatch ? new Date("2026-07-26") : WEEK7_END;
  const mentorCount = ["mentorSession1", "mentorSession2", "mentorSession3"]
    .filter(k => milestones[k]).length;

  // Before program starts: only confirmed participants are "on track"
  if (today < PROGRAM_START) {
    if (!milestones.participation) {
      return { status: "needs-attention", flags: ["Participation not yet confirmed"] };
    }
    return { status: "on-track", flags: [] };
  }

  let status = "on-track";
  let flags = [];

  // Session-based thresholds
  if (today >= effectiveWeek4End && mentorCount === 0) {
    status = "at-risk";
    flags.push("No mentor session — past Week 4 removal deadline");
  } else if (today >= effectiveWeek7End && mentorCount < 3) {
    if (status !== "at-risk") status = "needs-attention";
    flags.push(`Only ${mentorCount}/3 mentor sessions by end of Week 7`);
  } else if (today >= effectiveWeek5End && mentorCount < 2) {
    if (status !== "at-risk") status = "needs-attention";
    flags.push(`Only ${mentorCount}/2 mentor sessions by end of Week 5`);
  } else if (today >= effectiveSession1End && mentorCount < 1) {
    if (status !== "at-risk") status = "needs-attention";
    flags.push("No mentor session logged");
  }

  if (!milestones.participation) {
    flags.push("Participation not confirmed");
    if (status !== "at-risk") status = "needs-attention";
  }
  if (today >= PROGRAM_START && !milestones.onboarding) {
    flags.push("Onboarding not attended");
    if (status !== "at-risk") status = "needs-attention";
  }
  if (today >= effectiveSession1End && !milestones.mentorMatched) flags.push("Mentor not yet matched");

  return { status, flags: [...new Set(flags)] };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const today = new Date();

  // Fetch live milestone data from Google Sheets (best-effort)
  let sheetData = {}; // slug → { milestones, churned, notes }
  let pendingReviewCount = 0;

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;

  if (hasSheets) {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ── 1. Read Participation tab (source of truth for participation milestone) ──
    // Header is row 5, data starts row 6. Col A = slug, Col E = "Accepted"/"Declined"
    try {
      const partRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Participation!A6:E500",
      });
      const partRows = partRes.data.values || [];
      for (const row of partRows) {
        const slug   = row[0]?.trim();
        const status = row[4]?.trim();
        if (!slug) continue;
        if (!sheetData[slug]) {
          sheetData[slug] = {
            milestones: Object.fromEntries(MILESTONE_KEYS.map(k => [k, false])),
            churned: false, notes: "", email: "", mentorEmail: "",
          };
        }
        if (status === "Accepted") sheetData[slug].milestones.participation = true;
      }
    } catch (err) {
      console.error("Participation tab read failed:", err.message);
    }

    // ── 2. Read milestone Dashboard tab (try several possible names) ───────────
    try {
      const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
      let rows = [];
      for (const name of DASHBOARD_NAMES) {
        try {
          const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
          rows = r.data.values || [];
          if (rows.length > 1) break;
        } catch (_) {}
      }

      if (rows.length > 1) {
        const headerRow = rows[0] || [];
        const churnedIdx        = headerRow.findIndex(h => h?.toLowerCase() === "churned");
        const notesIdx          = headerRow.findIndex(h => h?.toLowerCase() === "notes");
        const emailIdx          = headerRow.findIndex(h => h?.toLowerCase() === "email");
        const mentorEmailIdx    = headerRow.findIndex(h => h?.toLowerCase() === "mentor email");
        const statusOverrideIdx = headerRow.findIndex(h => h?.toLowerCase() === "status override");

        // Find milestone columns by header label; fall back to offset 6
        const milestoneColIdxs = {};
        MILESTONE_KEYS.forEach((key, i) => {
          const byLabel = headerRow.findIndex(h => h === MILESTONE_LABELS[key]);
          const byKey   = headerRow.findIndex(h => h?.toLowerCase() === key.toLowerCase());
          milestoneColIdxs[key] = byLabel !== -1 ? byLabel : byKey !== -1 ? byKey : 6 + i;
        });

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[0]) continue;
          const slug = row[0].trim();
          if (!sheetData[slug]) {
            sheetData[slug] = { milestones: Object.fromEntries(MILESTONE_KEYS.map(k => [k, false])), churned: false, notes: "", email: "", mentorEmail: "" };
          }
          MILESTONE_KEYS.forEach(key => {
            const val = row[milestoneColIdxs[key]];
            if (val === "TRUE" || val === true) sheetData[slug].milestones[key] = true;
            // Don't overwrite participation=true set by Participation tab
          });
          // Participation tab already set this — don't override with FALSE from Dashboard
          // (leave participation as-is from step 1)
          const churned        = churnedIdx >= 0 ? (row[churnedIdx] === "TRUE" || row[churnedIdx] === true) : false;
          const notes          = notesIdx >= 0 ? (row[notesIdx] || "") : "";
          const email          = emailIdx >= 0 ? (row[emailIdx] || "") : "";
          const mentorEmail    = mentorEmailIdx >= 0 ? (row[mentorEmailIdx] || "") : "";
          const statusOverride = statusOverrideIdx >= 0 ? (row[statusOverrideIdx] || "") : "";
          sheetData[slug].churned        = churned;
          sheetData[slug].notes          = notes || sheetData[slug].notes;
          sheetData[slug].email          = email || sheetData[slug].email;
          sheetData[slug].mentorEmail    = mentorEmail || sheetData[slug].mentorEmail;
          sheetData[slug].statusOverride = statusOverride;
        }
      }
    } catch (err) {
      console.error("Dashboard tab read failed:", err.message);
    }

    // ── 3. Read Mentor Confirmations tab for admin-assigned mentor matches ───────
    try {
      const mcRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Mentor Confirmations!A2:H500",
      });
      const mcRows = mcRes.data.values || [];
      for (const row of mcRows) {
        const mentorName  = row[1]?.trim();
        const mentorEmail = row[2]?.trim();
        const slug        = row[4]?.trim();
        const status      = row[5]?.trim().toLowerCase();
        if (!slug || !mentorName || status === "needs-match") continue;
        if (!sheetData[slug]) {
          sheetData[slug] = { milestones: Object.fromEntries(MILESTONE_KEYS.map(k => [k, false])), churned: false, notes: "", email: "", mentorEmail: "" };
        }
        // Only set if not already populated from Dashboard tab
        if (!sheetData[slug].mentorName) sheetData[slug].mentorName  = mentorName;
        if (!sheetData[slug].mentorEmail) sheetData[slug].mentorEmail = mentorEmail;
      }
    } catch (err) {
      console.error("Mentor Confirmations tab read failed:", err.message);
    }

    // ── 4. Read SessionReview tab for pending count ───────────────────────────
    try {
      const srRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "SessionReview!A:A" });
      const srRows = srRes.data.values || [];
      for (let i = 1; i < srRows.length; i++) {
        const val = srRows[i]?.[0];
        if (val !== "TRUE" && val !== "YES" && val !== "DENIED" && val !== "Approved" && val !== "Denied") pendingReviewCount++;
      }
    } catch (_) {}
  }

  // Build mentee list from MENTEES array (always complete)
  const mentees = MENTEES.map(m => {
    const d = sheetData[m.slug] || {};
    const milestones  = d.milestones || Object.fromEntries(MILESTONE_KEYS.map(k => [k, false]));
    const churned     = d.churned || false;
    const notes       = d.notes   || "";
    const email       = d.email       || MENTEE_EMAILS[m.slug]  || "";
    const mentorEmail = d.mentorEmail || MENTOR_EMAILS[m.slug]  || "";
    const mentorName  = d.mentorName  || m.mentor?.name         || "";

    const milestoneCount = Object.values(milestones).filter(Boolean).length;
    const mentorCount    = ["mentorSession1", "mentorSession2", "mentorSession3"].filter(k => milestones[k]).length;
    const eduCount       = ["edu1", "edu2", "edu3"].filter(k => milestones[k]).length;

    const statusOverride = d.statusOverride || "";
    const VALID_OVERRIDES = new Set(["at-risk", "needs-attention", "on-track", "churned"]);
    const { status, flags } = churned
      ? { status: "churned", flags: ["Left program / dropped out"] }
      : (VALID_OVERRIDES.has(statusOverride)
          ? { status: statusOverride, flags: [`Manual override: ${statusOverride}`] }
          : computeStatus(milestones, today, m.slug));

    return {
      slug: m.slug,
      first: m.first,
      last: m.last,
      cohort: m.cohort,
      company: m.company || "",
      milestones,
      milestoneCount,
      mentorCount,
      eduCount,
      status,
      flags,
      churned,
      notes,
      email,
      mentorName,
      mentorEmail,
      isTest: TEST_SLUGS.includes(m.slug),
    };
  });

  // Sort: at-risk first, then needs-attention, then on-track, churned last; alpha within group
  const order = { "at-risk": 0, "needs-attention": 1, "on-track": 2, "churned": 3 };
  mentees.sort((a, b) =>
    (order[a.status] ?? 2) - (order[b.status] ?? 2) ||
    a.last.localeCompare(b.last)
  );

  return res.status(200).json({ mentees, pendingReviewCount, generatedAt: new Date().toISOString() });
}
