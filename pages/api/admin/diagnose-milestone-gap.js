// Diagnostic: find mentees who are confirmed in Mentor Confirmations sheet
// AND have onboarding=TRUE in Milestone Dashboard but NOT mentorMatched=TRUE
import { getSheetsClient, MILESTONE_KEYS, MILESTONE_LABELS } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // 1. Get confirmed slugs from Mentor Confirmations
  const confResult = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Mentor Confirmations!A2:H500" });
  const confRows = confResult.data.values || [];
  const confirmedSlugs = new Set(confRows.filter(r => r[5]?.trim() === "confirmed").map(r => r[4]?.trim()).filter(Boolean));

  // 2. Get milestone data from Milestone Dashboard
  const DASHBOARD_NAMES = ["Dashboard", "Milestone Dashboard", "Master Tracker", "Milestones", "Tracker"];
  let dashRows = [], sheetName = null;
  for (const name of DASHBOARD_NAMES) {
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A:Z` });
      if ((r.data.values || []).length > 1) { dashRows = r.data.values; sheetName = name; break; }
    } catch (_) {}
  }

  const headerRow = dashRows[0] || [];
  const onboardingIdx = headerRow.findIndex(h => h === MILESTONE_LABELS["onboarding"]);
  const mentorMatchedIdx = headerRow.findIndex(h => h === MILESTONE_LABELS["mentorMatched"]);

  const milestoneData = {};
  for (let i = 1; i < dashRows.length; i++) {
    const slug = dashRows[i][0]?.trim();
    if (!slug) continue;
    milestoneData[slug] = {
      onboarding: dashRows[i][onboardingIdx] === "TRUE",
      mentorMatched: dashRows[i][mentorMatchedIdx] === "TRUE",
    };
  }

  // 3. Find the gap: confirmed + onboarded but no mentorMatched
  const gap = [...confirmedSlugs].filter(slug => {
    const m = milestoneData[slug];
    return m?.onboarding && !m?.mentorMatched;
  });

  // 4. Also find: has mentorMatched but not confirmed (other direction)
  const revealedNotConfirmed = Object.entries(milestoneData)
    .filter(([slug, m]) => m.mentorMatched && !confirmedSlugs.has(slug))
    .map(([slug]) => slug);

  return res.status(200).json({
    confirmedSlugsCount: confirmedSlugs.size,
    onboardedAndConfirmed: [...confirmedSlugs].filter(s => milestoneData[s]?.onboarding).length,
    mentorMatchedCount: Object.values(milestoneData).filter(m => m.mentorMatched).length,
    gap,
    revealedNotConfirmedCount: revealedNotConfirmed.length,
    headers: { onboardingIdx, mentorMatchedIdx, sheetName },
  });
}
