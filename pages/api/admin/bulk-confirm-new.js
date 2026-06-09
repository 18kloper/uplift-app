// One-shot: confirm all newly confirmed mentors in the sheet
// Vishal Goyal, Soojin Choung, Stella Alvo (declined Andrea Vernengo),
// Michael Baer, Christina Dorando, Marc Kaufman, Pavan Kumar
// (Anand Rai, Stephen Makinen, Anatole Norland, Kenneth Jones, Miquel de Quadras already done via separate scripts)

import { getSheetsClient } from "../../../lib/sheets-helper";

const TAB = "Mentor Confirmations";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const now = new Date().toISOString();

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB}!A2:H500`,
  });
  const rows = result.data.values || [];

  const updates = [];
  const log = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const email = (row[2] || "").trim().toLowerCase();
    const slug  = (row[4] || "").trim();

    // Vishal Goyal → elaf-mahmoud: confirmed
    if (email === "vishal0073@gmail.com" && slug === "elaf-mahmoud") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Vishal Goyal → elaf-mahmoud: confirmed");
    }

    // Soojin Choung → andrea-ferguson-peterson: confirmed
    if (email === "soojin@witnesspartners.us" && slug === "andrea-ferguson-peterson") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Soojin Choung → andrea-ferguson-peterson: confirmed");
    }

    // Stella Alvo → abhaya-pawar: confirmed
    if (email === "stella.alvo@gmail.com" && slug === "abhaya-pawar") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Stella Alvo → abhaya-pawar: confirmed");
    }

    // Stella Alvo → andrea-vernengo: needs-match (she chose Abhaya only)
    if (email === "stella.alvo@gmail.com" && slug === "andrea-vernengo") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["needs-match"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
        { range: `${TAB}!H${rowNum}`, values: [["Stella chose Abhaya Pawar only"]] },
      );
      log.push("Stella Alvo → andrea-vernengo: needs-match (chose Abhaya only)");
    }

    // Michael Baer → soheil-khosravinejad: confirmed
    if (email === "michael.baer@techcxo.com" && slug === "soheil-khosravinejad") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Michael Baer → soheil-khosravinejad: confirmed");
    }

    // Christina Dorando → sarah-inoue: confirmed
    if (email === "cdorando@cresthillacademy.com" && slug === "sarah-inoue") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Christina Dorando → sarah-inoue: confirmed");
    }

    // Christina Dorando → aliya-laliwala: confirmed
    if (email === "cdorando@cresthillacademy.com" && slug === "aliya-laliwala") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Christina Dorando → aliya-laliwala: confirmed");
    }

    // Marc Kaufman → daniel-lee: confirmed
    if (email === "mkaufman@potomaclaw.com" && slug === "daniel-lee") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Marc Kaufman → daniel-lee: confirmed");
    }

    // Marc Kaufman → han-nguyen: confirmed
    if (email === "mkaufman@potomaclaw.com" && slug === "han-nguyen") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Marc Kaufman → han-nguyen: confirmed");
    }

    // Pavan Kumar → rajesh-ivaturi: confirmed
    if (email === "pavan@3pmventures.com" && slug === "rajesh-ivaturi") {
      updates.push(
        { range: `${TAB}!F${rowNum}`, values: [["confirmed"]] },
        { range: `${TAB}!G${rowNum}`, values: [[now]] },
      );
      log.push("Pavan Kumar → rajesh-ivaturi: confirmed");
    }
  });

  if (updates.length === 0) {
    return res.status(200).json({ ok: true, log: ["No matching rows found - check emails/slugs exist in sheet"] });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: updates },
  });

  return res.status(200).json({ ok: true, log });
}
