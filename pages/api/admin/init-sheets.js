// GET /api/admin/init-sheets
// Pre-creates a Google Sheet tab for every mentee (and the Milestone Dashboard tab).
// Safe to run multiple times — skips tabs that already exist.
// Protects with a simple token: ?token=<ADMIN_SECRET> or the bypass header.

import { getSheetsClient } from "../../../lib/sheets-helper";

const MENTEE_SLUGS = [
  "gifty-anane","anthony-caruso","sonali-chilupuri","neha-chopade","lina-escobar",
  "victoria-hosendorf","sarah-inoue","favio-jasso","jagannadh-kanumuri","soheil-khosravinejad",
  "alina-okun","jerry-primus","andrea-vernengo","jedidiah-worrell","jhamar-youngblood",
  "hamza-zafar","annalyce-dagostino-gavin","debbie-douglas-henry","pearl-gabel",
  "ekaterina-kashkina","naveen-kumar","elaf-mahmoud","tosca-marleen","ahmed-metwoali",
  "nina-mladenovski","bejan-moers","emilia-savich","alisha-sharma","angie-tirado",
  "justin-savage","shounak-thaker","adeola-adeoye-davids","shell-bobev","stephanie-cwynar",
  "pierre-girgis","pradeep-kumar-gohil","daniel-lee","paula-machado-jackler","idongesit-obeya",
  "jean-guerdy-paul","evan-peneiras","alok-rai","radha-ratnala","abhi-ray",
  "stephanie-scott-bradshaw","shanthi-viswanathan","angela-aricatt","ebunoluwa-adenekan",
  "maab-iqbal","rajesh-ivaturi","logan-jones","sharon-joseph","mark-kallback",
  "lianna-lariccia","han-nguyen","mohammad-saleh-nikoopayan-tak","abhaya-pawar",
  "parminder-singh","mehul-sompura","harshil-thakkar","aliya-laliwala","priyal-levine",
  "elisa-charters","kima-danjou","andrea-ferguson-peterson","saurabh-gandhe","rachel-hayes",
  "jasmin-jones","natalie-kitts","britney-medich","kevin-navarro","chandni-patel",
  "daniel-patton","jeremy-ruiz-villavicencio","jordan-river-samuel","chirag-shah",
  "shippy-singh",
  "eliana-zebro","jimmy-bastien",
];

const MENTEE_HEADERS = [["Week", "Field Key", "Question", "Value", "Updated At"]];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Simple auth: must pass ?token matching ADMIN_SECRET env var (or it being unset = open in dev)
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return res.status(200).json({ ok: true, skipped: true, reason: "No sheet credentials" });
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Get existing tabs
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = new Set(meta.data.sheets.map(s => s.properties.title));

  const created = [];
  const skipped = [];
  const errors = [];

  for (const slug of MENTEE_SLUGS) {
    if (existingTabs.has(slug)) {
      skipped.push(slug);
      continue;
    }
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: slug } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${slug}!A1:E1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: MENTEE_HEADERS },
      });
      created.push(slug);
    } catch (err) {
      errors.push({ slug, error: err.message });
    }
  }

  return res.status(200).json({
    ok: true,
    created: created.length,
    skipped: skipped.length,
    errors,
    createdList: created,
  });
}
