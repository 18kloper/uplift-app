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
  "reviewStatus",
  "reviewedAt",
];

// Classify event by name
export function classifyEvent(eventName = "") {
  if (eventName.includes("Onboarding")) return "onboarding";
  if (eventName.includes("Expert Session")) return "edu";
  if (eventName.includes("Peer Discussion")) return "peer";
  return "other";
}

// Match a guest (email, name) to a mentee slug
export function matchMentee(email, name) {
  // 1. Match by email
  if (email) {
    const normalEmail = email.toLowerCase();
    for (const [slug, menteeEmail] of Object.entries(MENTEE_EMAILS)) {
      if (menteeEmail.toLowerCase() === normalEmail) {
        return { slug, matchedBy: "email" };
      }
    }
  }

  // 2. Fall back to full name match
  if (name) {
    const normalName = name.trim().toLowerCase();
    for (const mentee of MENTEES) {
      const fullName = `${mentee.first} ${mentee.last}`.toLowerCase();
      if (fullName === normalName) {
        return { slug: mentee.slug, matchedBy: "name" };
      }
    }
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
// row should be the 11-column base array; reviewStatus defaults to "pending"
export async function logLumaAttendance(sheets, spreadsheetId, row, reviewStatus = "pending") {
  await ensureLumaAttendanceSheet(sheets, spreadsheetId);
  const fullRow = [...row, reviewStatus, ""];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${LUMA_ATTENDANCE_SHEET}!A:M`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [fullRow] },
  });
}

// Read all rows from LumaAttendance and return as parsed objects
async function readAttendanceRows(sheets, spreadsheetId) {
  await ensureLumaAttendanceSheet(sheets, spreadsheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${LUMA_ATTENDANCE_SHEET}!A:M`,
  });
  const [headerRow, ...dataRows] = res.data.values || [];
  if (!headerRow) return [];
  return dataRows.map((r, i) => ({
    rowIndex: i + 2, // 1-based sheet row (row 1 = header)
    timestamp: r[0] || "",
    hookType: r[1] || "",
    eventName: r[2] || "",
    eventId: r[3] || "",
    eventDate: r[4] || "",
    menteeName: r[5] || "",
    menteeSlug: r[6] || "",
    email: r[7] || "",
    status: r[8] || "",
    matchedBy: r[9] || "",
    rawStatus: r[10] || "",
    reviewStatus: r[11] || "",
    reviewedAt: r[12] || "",
  }));
}

// Approve or deny an attendance row by eventId + menteeSlug
export async function approveAttendance(sheets, spreadsheetId, eventId, menteeSlug, approve) {
  const rows = await readAttendanceRows(sheets, spreadsheetId);
  const match = rows.find((r) => r.eventId === eventId && r.menteeSlug === menteeSlug);
  if (!match) return { ok: false, row: null };

  const newStatus = approve ? "approved" : "denied";
  const reviewedAt = new Date().toISOString();

  // reviewStatus = col L (index 11, 0-based) → col M is index 12
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${LUMA_ATTENDANCE_SHEET}!L${match.rowIndex}:M${match.rowIndex}`,
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
