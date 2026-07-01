// Luma integration helpers shared across API routes

import { getSheetsClient } from "./sheets-helper";
import { MENTEES, MENTEE_EMAILS } from "./mentees";

const LUMA_ATTENDANCE_SHEET = "LumaAttendance";
const LUMA_ATTENDANCE_HEADERS = [
  "timestamp",
  "hookType",
  "eventName",
  "eventId",
  "eventDate",
  "menteeName",
  "menteeSlug",
  "email",
  "status",
  "matchedBy",
  "rawStatus",
  "joinedAt",
  "reviewStatus",
  "reviewedAt",
];

// Classify event by name
export function classifyEvent(eventName = "") {
  const lower = eventName.toLowerCase();
  if (lower.includes("onboarding")) return "onboarding";
  if (lower.includes("midpoint") || lower.includes("mid-point")) return "midpoint";
  if (lower.includes("summit") || lower.includes("graduation")) return "other";
  // Everything else counts as an educational session
  if (eventName) return "edu";
  return "other";
}

// Minimum full-name similarity (0–1) to accept a fuzzy name match.
// 0.82 catches typos/spacing/middle-name variants while staying strict
// enough not to match a mentor to a different mentee.
const NAME_SIMILARITY_THRESHOLD = 0.82;

// Strip to alphanumerics so apostrophes/hyphens/spaces don't block a match.
function normalizeName(str = "") {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

// Levenshtein similarity: 0–1 where 1 = identical.
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return 1 - dp[m][n] / Math.max(m, n);
}

// Match a guest (email, name) to a mentee slug
export function matchMentee(email, name) {
  // 1. Match by email (most reliable)
  if (email) {
    const normalEmail = email.toLowerCase();
    for (const [slug, menteeEmail] of Object.entries(MENTEE_EMAILS)) {
      if (menteeEmail.toLowerCase() === normalEmail) {
        return { slug, matchedBy: "email" };
      }
    }
  }

  if (!name) return { slug: null, matchedBy: null };

  const normalName = name.trim().toLowerCase();
  const normName   = normalizeName(name);
  const parts      = normalName.split(/\s+/).filter(Boolean);
  const firstTok   = parts[0] || "";
  const lastTok    = parts.length > 1 ? parts[parts.length - 1] : "";

  // 2. Exact full-name match (raw or normalized — handles D'Anjou vs danjou)
  for (const mentee of MENTEES) {
    const fullName  = `${mentee.first} ${mentee.last}`.toLowerCase();
    const fullNorm  = normalizeName(`${mentee.first}${mentee.last}`);
    if (fullName === normalName || (normName && fullNorm && normName === fullNorm)) {
      return { slug: mentee.slug, matchedBy: "name" };
    }
  }

  // 3. First name exact + last-name initial (catches "Gunjan a" -> Gunjan Aggarwal).
  //    Requires exactly one mentee to match, so it won't pick between duplicates
  //    or match a mentor whose last initial differs (e.g. "Mark Nelson" != Kallback).
  if (firstTok && lastTok) {
    const hits = MENTEES.filter(m =>
      normalizeName(m.first) === normalizeName(firstTok) &&
      normalizeName(m.last).startsWith(normalizeName(lastTok))
    );
    if (hits.length === 1) {
      return { slug: hits[0].slug, matchedBy: "name-initial" };
    }
  }

  // 4. Fuzzy full-name similarity above threshold — take the single best match.
  let best = null, bestScore = 0;
  for (const mentee of MENTEES) {
    const fullNorm = normalizeName(`${mentee.first}${mentee.last}`);
    const score = similarity(normName, fullNorm);
    if (score > bestScore) { bestScore = score; best = mentee; }
  }
  if (best && bestScore >= NAME_SIMILARITY_THRESHOLD) {
    return { slug: best.slug, matchedBy: "name-fuzzy" };
  }

  return { slug: null, matchedBy: null };
}

// Ensure the LumaAttendance sheet tab exists with headers
export async function ensureLumaAttendanceSheet(sheets, spreadsheetId) {
  // Get list of existing sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets.map((s) => s.properties.title);

  if (!sheetNames.includes(LUMA_ATTENDANCE_SHEET)) {
    // Create the tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: LUMA_ATTENDANCE_SHEET },
            },
          },
        ],
      },
    });

    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${LUMA_ATTENDANCE_SHEET}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [LUMA_ATTENDANCE_HEADERS] },
    });
  } else {
    // Tab exists — check if reviewStatus column is present; append if not
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${LUMA_ATTENDANCE_SHEET}!1:1`,
    });
    const existingHeaders = (headerRes.data.values || [[]])[0] || [];
    if (!existingHeaders.includes("reviewStatus")) {
      // Append missing columns to existing header row
      const nextCol = existingHeaders.length + 1; // 1-based
      const colLetter = colIndexToLetter(existingHeaders.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${LUMA_ATTENDANCE_SHEET}!${colLetter}1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["reviewStatus", "reviewedAt"]] },
      });
    }
  }
}

// Append a row to LumaAttendance
// row should be the 12-column base array (includes joinedAt); reviewStatus appended
export async function logLumaAttendance(sheets, spreadsheetId, row, reviewStatus = "pending") {
  await ensureLumaAttendanceSheet(sheets, spreadsheetId);
  const fullRow = [...row, reviewStatus, ""];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${LUMA_ATTENDANCE_SHEET}!A:N`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [fullRow] },
  });
}

// Read all rows from LumaAttendance and return as parsed objects
// Columns: A=timestamp, B=hookType, C=eventName, D=eventId, E=eventDate,
//          F=menteeName, G=menteeSlug, H=email, I=status, J=matchedBy,
//          K=rawStatus, L=joinedAt, M=reviewStatus, N=reviewedAt
async function readAttendanceRows(sheets, spreadsheetId) {
  await ensureLumaAttendanceSheet(sheets, spreadsheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${LUMA_ATTENDANCE_SHEET}!A:N`,
  });
  const [headerRow, ...dataRows] = res.data.values || [];
  if (!headerRow) return [];
  return dataRows.map((r, i) => ({
    rowIndex: i + 2,
    timestamp:   r[0]  || "",
    hookType:    r[1]  || "",
    eventName:   r[2]  || "",
    eventId:     r[3]  || "",
    eventDate:   r[4]  || "",
    menteeName:  r[5]  || "",
    menteeSlug:  r[6]  || "",
    email:       r[7]  || "",
    status:      r[8]  || "",
    matchedBy:   r[9]  || "",
    rawStatus:   r[10] || "",
    joinedAt:    r[11] || "",
    reviewStatus:r[12] || "",
    reviewedAt:  r[13] || "",
  }));
}

// Approve or deny an attendance row by eventId + menteeSlug
export async function approveAttendance(sheets, spreadsheetId, eventId, menteeSlug, approve) {
  const rows = await readAttendanceRows(sheets, spreadsheetId);
  const match = rows.find((r) => r.eventId === eventId && r.menteeSlug === menteeSlug);
  if (!match) return { ok: false, row: null };

  const newStatus = approve ? "approved" : "denied";
  const reviewedAt = new Date().toISOString();

  // reviewStatus = col M (index 12) → reviewedAt = col N (index 13)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${LUMA_ATTENDANCE_SHEET}!M${match.rowIndex}:N${match.rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newStatus, reviewedAt]] },
  });

  return { ok: true, row: { ...match, reviewStatus: newStatus, reviewedAt } };
}

// Return all rows where reviewStatus is "pending" or empty, filtered to checked_in/registered
export async function getPendingAttendance(sheets, spreadsheetId) {
  const rows = await readAttendanceRows(sheets, spreadsheetId);
  return rows.filter(
    (r) =>
      (r.reviewStatus === "pending" || r.reviewStatus === "") &&
      (r.status === "checked_in" || r.status === "registered")
  );
}

// Return all LumaAttendance rows for a specific menteeSlug
export async function getMenteeAttendance(sheets, spreadsheetId, slug) {
  const rows = await readAttendanceRows(sheets, spreadsheetId);
  return rows.filter((r) => r.menteeSlug === slug);
}

// Return attendance rows for a specific eventId, keyed by menteeSlug
// { [menteeSlug]: { reviewStatus, joinedAt, status } }
export async function getEventAttendanceMap(sheets, spreadsheetId, eventId) {
  const rows = await readAttendanceRows(sheets, spreadsheetId);
  const map = {};
  for (const r of rows) {
    if (r.eventId === eventId && r.menteeSlug) {
      map[r.menteeSlug] = {
        reviewStatus: r.reviewStatus,
        joinedAt: r.joinedAt,
        status: r.status,
      };
    }
  }
  return map;
}

// Read the current Dashboard to find a mentee's edu milestone slots
export async function getMenteeEduMilestones(sheets, spreadsheetId, slug) {
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A1:Z1",
  });
  const headers = (headerRes.data.values || [[]])[0] || [];

  const slugRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A:A",
  });
  const slugCol = slugRes.data.values || [];
  const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);
  if (rowIdx === -1) return null;

  const rowNum = rowIdx + 1; // 1-based
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Milestone Dashboard!A${rowNum}:Z${rowNum}`,
  });
  const rowData = (rowRes.data.values || [[]])[0] || [];

  return { headers, rowData, rowNum };
}

// Set a single milestone to TRUE for a mentee using the same pattern as update-milestone.js
export async function setMilestone(sheets, spreadsheetId, slug, milestone) {
  const { MILESTONE_LABELS, MILESTONE_KEYS } = await import("./sheets-helper");

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A1:Z1",
  });
  const headerRow = (headerRes.data.values || [[]])[0] || [];

  const milestoneLabel = MILESTONE_LABELS[milestone];
  const milestoneIdx = MILESTONE_KEYS.indexOf(milestone);
  let colIndex = headerRow.findIndex((h) => h === milestoneLabel);
  if (colIndex === -1) colIndex = 6 + milestoneIdx;

  const slugRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A:A",
  });
  const slugCol = slugRes.data.values || [];
  const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);
  if (rowIdx === -1) return false;

  const colLetter = colIndexToLetter(colIndex);
  const rowNum = rowIdx + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Milestone Dashboard!${colLetter}${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["TRUE"]] },
  });

  return true;
}

function colIndexToLetter(idx) {
  let letter = "";
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// Find next available edu slot for a mentee and set it TRUE
// Returns the milestone key set, or null if all 3 are filled
export async function setNextEduMilestone(sheets, spreadsheetId, slug) {
  const { MILESTONE_LABELS, MILESTONE_KEYS } = await import("./sheets-helper");

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A1:Z1",
  });
  const headers = (headerRes.data.values || [[]])[0] || [];

  const slugRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Milestone Dashboard!A:A",
  });
  const slugCol = slugRes.data.values || [];
  const rowIdx = slugCol.findIndex((row, i) => i > 0 && row[0] === slug);
  if (rowIdx === -1) return null;

  const rowNum = rowIdx + 1;
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Milestone Dashboard!A${rowNum}:Z${rowNum}`,
  });
  const rowData = (rowRes.data.values || [[]])[0] || [];

  const eduSlots = ["edu1", "edu2", "edu3"];
  for (const slot of eduSlots) {
    const label = MILESTONE_LABELS[slot];
    const milestoneIdx = MILESTONE_KEYS.indexOf(slot);
    let colIndex = headers.findIndex((h) => h === label);
    if (colIndex === -1) colIndex = 6 + milestoneIdx;

    const currentVal = (rowData[colIndex] || "").toUpperCase();
    if (currentVal !== "TRUE") {
      // Set this slot
      const colLetter = colIndexToLetter(colIndex);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Milestone Dashboard!${colLetter}${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["TRUE"]] },
      });
      return slot;
    }
  }

  return null; // all slots filled
}

// Read all milestones from "Milestone Dashboard" sheet.
// Returns a map of { [slug]: { onboarding: bool, edu1: bool, ... } }
export async function getAllMilestones(sheets, spreadsheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Milestone Dashboard!A:Z",
    });
    const [headerRow, ...dataRows] = res.data.values || [];
    if (!headerRow) return {};
    const { MILESTONE_LABELS, MILESTONE_KEYS } = await import("./sheets-helper");
    const milestoneColMap = {}; // milestoneKey → colIndex
    for (const key of MILESTONE_KEYS) {
      const label = MILESTONE_LABELS[key];
      const idx = headerRow.findIndex(h => h === label);
      if (idx !== -1) milestoneColMap[key] = idx;
    }
    const result = {};
    for (const row of dataRows) {
      const slug = row[0];
      if (!slug) continue;
      result[slug] = {};
      for (const [key, idx] of Object.entries(milestoneColMap)) {
        result[slug][key] = (row[idx] || "").toUpperCase() === "TRUE";
      }
    }
    return result;
  } catch {
    return {};
  }
}
