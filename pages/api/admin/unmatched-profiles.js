// One-shot: pull full prompt responses for the 7 unmatched mentees
import { getSheetsClient } from "../../../lib/sheets-helper";
import { MENTEES } from "../../../lib/mentees";

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
  if (req.method !== "GET") return res.status(405).end();
  if (req.query.token !== process.env.ADMIN_SECRET) return res.status(401).end();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = new Set(meta.data.sheets?.map(s => s.properties.title) || []);

  const profiles = [];

  for (const slug of SLUGS) {
    const mentee = MENTEES.find(m => m.slug === slug);
    if (!mentee) continue;

    const profile = {
      slug,
      name: `${mentee.first} ${mentee.last}`,
      company: mentee.company,
      stage: mentee.stage,
      industry: mentee.industry,
      primaryFocus: mentee.primaryFocus,
      secondaryFoci: mentee.secondaryFoci || [],
      linkedin: mentee.linkedin || null,
      responses: {},
    };

    if (existingTabs.has(slug)) {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${slug}!A:D`,
      });
      const rows = result.data.values || [];
      for (let i = 1; i < rows.length; i++) {
        const week = rows[i][0];
        const key = rows[i][1] || "";
        const question = rows[i][2] || "";
        const value = (rows[i][3] || "").trim();
        if (key && value) {
          profile.responses[`w${week}_${key}`] = { question, value };
        }
      }
    }

    profiles.push(profile);
  }

  return res.status(200).json({ profiles });
}
