// Run once to initialize the Google Sheet:
//   node scripts/setup-sheet.mjs

import { google } from "googleapis";
import { MENTEES } from "../lib/mentees.js";

const MILESTONE_KEYS = [
  "participation",
  "onboarding", "mentorMatched",
  "edu1", "edu2", "edu3",
  "mentorSession1", "mentorSession2", "mentorSession3",
  "midpoint", "endSurvey", "summit", "certificate",
];
const MILESTONE_LABELS = {
  participation:  "Confirmed Participation",
  onboarding:     "Onboarding Session Attended",
  mentorMatched:  "Matched with a Mentor",
  edu1:           "Educational Session 1",
  edu2:           "Educational Session 2",
  edu3:           "Educational Session 3",
  mentorSession1: "Mentor Session 1",
  mentorSession2: "Mentor Session 2",
  mentorSession3: "Mentor Session 3",
  midpoint:       "Midpoint Meetup Attended",
  endSurvey:      "End of Program Survey Completed",
  summit:         "Summit & Graduation Attended",
  certificate:    "Certificate Received",
};

const SHEET_ID      = "1hjPozUoAO16VxRllJ5GaQIsLoPZMJO7e_4vDud5VPS8";
const CLIENT_EMAIL  = "uplift-sheets@uplift-program-tracker-master.iam.gserviceaccount.com";
// 
const PRIVATE_KEY   = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCd2Wi7lVHMFe3r\nCFRsHaCGcutBPFw87ly2A2PUWR1D4qgr+Ou+JAH7wkQ/9wLx47+sPfjKBqhxBT4s\nJj3ml/2BChE53KFh/APmYaM6hvwQEe3yrKy3s2DafVTXnFqvmNz1sZPiaMlTgxdf\nBaYQsNA9T1tnMz6hD/+Yg7Ys+VN4hRKgup9zmOYE4g7N7RYQlScrK4sQpFaV63pl\nv/UqGOaY+mL6dLg1fDmCXRe18xIWPxuna5sP0NYYZC9YHE0q0+Y1r28O9Zhouq0r\nZsEzd+xIfAZUoma7BG5vCwQ5507VT1t6GDtSBvfXXh0h2rL1SGt2QurvyvPmmJUC\nNwwC2CvxAgMBAAECggEAEcIcy0XAPxKUgqWcQdGPdrDFEMDGq8AxQ/TbrU8dQL7m\nJpRJiUmpw3YWkY+rkCUMMkeCjs/y8Uwis3rV6fRde7/zMixFJ63fjnKbl4EKKJCr\n0WplwAD5O3twKRWZCjpLWYTR213okHGmFnWfOi96LfuYj+KvABW5rqHaw/KE1oEM\n3T7fxbCuLuA+o0WNjNHGjT2M/a65KuPppftpQQPRFN0/EcEM683Cj7dr8rp5AmN/\nU6oAD03QGzxFZLS4DgH8pBnC253IK3NscvKmjmiKJfqLXpdjbE6tgEbWKyAU0xYg\nsorrDzyGPQwjX3nEjeMHjaoHxvOQonOtJD2tGjKzZQKBgQDJxyTd3en4kv1LNoiO\n6nbgKnph4fO+7GGRL+Clz8w5QSiAA6emNv1YHKMqJMoNtyK2woOATB8ZC6K6po3u\nhAnQ+3wd4Vgs5Yn4lUAAkGzkZzCQ9D3FKD0GGtLXqro7247WdZF3Gln0B93wHIHN\nO0PsfkICH/KLEJNHnmKO/CMOIwKBgQDIRErlgGsNQ9adWGbTYkdowFCydlRpoqBb\nYK570N7H6nie10Uc77cmplfaHi72qVPRtH5sLN6ViQt1s4gGKA4mGU4xXEITYbup\n2EHaMJBOc070CPkrFIdjXYw4BMS0JV0V2gGW5p24lZtzwvSNRNAe+Z18sMIHVoxQ\nEP3Ld0fc2wKBgQCAW1iOcs6VvBu5LtWr5Gb+rsbvYWdG+uQOEeDcWdXWTibPWIPb\nbnu3A3CgLIsEMo24qQAyKzpVGlvIVI9RPVlpQbFw6JrI5LPiGD+AnF9I5IO2kkiB\nFNnM+l9JpmeWEFNLBbslgvPaEu8SAXBo99x7os2mwF/wKvklxBF6V9aM9QKBgBIO\nfkZFFuHiTPZw4wyKHvAl7uC4ZJIFtLmodPL6+StDS87ej/+06WmVs/QZpphc2g7d\nXEy6mvMWoS7imhAcCnKK847lx5thw37j3cQjfs9j/ClqqbSlrDNcWukuHOI1QDhZ\nKK2Ha48aBiMg39Xg73brgLSeZ1AsEIijj46J2bPjAoGAQq8syTjQFUQqZWO1aBay\nHlNI8YCaFcgOj51PMmXIzIeAgcW5ZhFGzplsgn5PvalQpcqoLrxuk56TmUYd/xc8\niBLF9aUdIsbJ1Gcte/a4tV+wldMfr6T48B+Hf4aoKlndpHS9Ji9RqtB5wOJsmQZC\nicm2JHXBA4PH8iWboyNMDwY=\n-----END PRIVATE KEY-----\n"`;

const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

async function run() {
  console.log("Connecting to Google Sheets…");

  // 1. Get existing tabs
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTitles = new Set(meta.data.sheets.map(s => s.properties.title));
  console.log(`Found ${existingTitles.size} existing tabs`);

  // 2. Create missing tabs
  const toCreate = [];
  if (!existingTitles.has("Dashboard"))
    toCreate.push({ addSheet: { properties: { title: "Dashboard", index: 0 } } });
  if (!existingTitles.has("Participation"))
    toCreate.push({ addSheet: { properties: { title: "Participation", index: 1 } } });
  for (const m of MENTEES)
    if (!existingTitles.has(m.slug))
      toCreate.push({ addSheet: { properties: { title: m.slug } } });

  if (toCreate.length > 0) {
    console.log(`Creating ${toCreate.length} new tabs…`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: toCreate },
    });
  }

  // 3. Re-fetch to get sheetIds
  const updated = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetIdMap = {};
  for (const s of updated.data.sheets)
    sheetIdMap[s.properties.title] = s.properties.sheetId;

  // 4. Write Dashboard headers + mentee rows
  console.log("Writing Dashboard…");
  const headers = ["Slug","First","Last","Cohort","Company","Last Active",
    ...MILESTONE_KEYS.map(k => MILESTONE_LABELS[k])];
  const rows = [headers];
  for (const m of MENTEES)
    rows.push([m.slug, m.first, m.last, m.cohort, m.company||"", "",
      ...MILESTONE_KEYS.map(() => "FALSE")]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "Dashboard!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  // 5. Apply checkboxes to milestone columns
  console.log("Applying checkboxes…");
  const dashId = sheetIdMap["Dashboard"];
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        // Checkboxes on milestone columns
        ...MILESTONE_KEYS.map((_, idx) => ({
          setDataValidation: {
            range: { sheetId: dashId, startRowIndex: 1,
              endRowIndex: MENTEES.length + 1,
              startColumnIndex: 6 + idx, endColumnIndex: 7 + idx },
            rule: { condition: { type: "BOOLEAN" }, strict: true, showCustomUi: true },
          },
        })),
        // Freeze + bold header row
        { updateSheetProperties: {
            properties: { sheetId: dashId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount" } },
        { repeatCell: {
            range: { sheetId: dashId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.22, green: 0.18, blue: 0.54 },
            }},
            fields: "userEnteredFormat(textFormat,backgroundColor)" } },
      ],
    },
  });

  // 6. Write Participation tab
  console.log("Writing Participation tab…");
  const realMentees = [...MENTEES]
    .sort((a, b) => a.cohort - b.cohort || a.last.localeCompare(b.last));

  // Data starts at row 6 (index 5), so formulas reference E6:E500
  const partRows = [
    ["Total Accepted",  `=COUNTIF(E6:E500,"Accepted")`],
    ["Total Declined",  `=COUNTIF(E6:E500,"Declined")`],
    ["No Response",     `=COUNTA(A6:A500)-COUNTIF(E6:E500,"Accepted")-COUNTIF(E6:E500,"Declined")`],
    [],
    ["Slug", "Name", "Company", "Cohort", "Status", "Last Updated"],
    ...realMentees.map(m => [
      m.slug,
      `${m.first} ${m.last}`,
      m.company || "",
      `Cohort ${m.cohort}`,
      "",
      "",
    ]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "Participation!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: partRows },
  });

  // Format the Participation tab
  const partId = sheetIdMap["Participation"];
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        // Bold + purple header on summary rows (1-3)
        { repeatCell: {
            range: { sheetId: partId, startRowIndex: 0, endRowIndex: 3 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.22, green: 0.18, blue: 0.54 } } },
            fields: "userEnteredFormat(textFormat,backgroundColor)" } },
        // White text on summary rows
        { repeatCell: {
            range: { sheetId: partId, startRowIndex: 0, endRowIndex: 3 },
            cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            fields: "userEnteredFormat.textFormat" } },
        // Bold column header row (row 5, index 4)
        { repeatCell: {
            range: { sheetId: partId, startRowIndex: 4, endRowIndex: 5 },
            cell: { userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.94, green: 0.92, blue: 1.0 },
            } },
            fields: "userEnteredFormat(textFormat,backgroundColor)" } },
        // Freeze first 5 rows
        { updateSheetProperties: {
            properties: { sheetId: partId, gridProperties: { frozenRowCount: 5 } },
            fields: "gridProperties.frozenRowCount" } },
      ],
    },
  });

  // 7. Write headers to every mentee tab
  console.log("Writing mentee tab headers…");
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: MENTEES.map(m => ({
        range: `${m.slug}!A1:E1`,
        values: [["Week","Field Key","Question","Response","Last Updated"]],
      })),
    },
  });

  console.log(`\n✅ Done — Dashboard + ${MENTEES.length} mentee tabs initialized!`);
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
