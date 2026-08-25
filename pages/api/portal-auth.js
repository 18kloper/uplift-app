// POST /api/portal-auth
// Body: { slug, password, action: "check" | "set", newPassword? }
//
// Fall portal access. Founders pick their own password on first login (the
// access code from their welcome email, their slug, only works until one is
// set). Passwords are stored as SHA-256 hashes in FallResponses (week 0,
// fieldKey portal_password), never plaintext, and never posted to Slack.
// PORTAL_MASTER_PASSWORD (or ADMIN_SECRET) opens every portal for the team.

import crypto from "crypto";
import { getSheetsClient } from "../../lib/sheets-helper";
import { FALL_SLUGS, FALL_RESPONSES_TAB, FALL_RESPONSES_HEADERS } from "../../lib/fall-roster";

const FIELD = "portal_password";
const hashPw = (slug, pw) => crypto.createHash("sha256").update(`${slug}:${pw}`).digest("hex");
const masterPw = () => process.env.PORTAL_MASTER_PASSWORD || process.env.ADMIN_SECRET || "";

async function readStored(sheets, spreadsheetId, slug) {
  const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${FALL_RESPONSES_TAB}!A:E` });
  const rows = read.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === slug && String(rows[i][1]) === "0" && rows[i][2] === FIELD) {
      return { rowNum: i + 1, hash: rows[i][4] || "" };
    }
  }
  return { rowNum: -1, hash: "" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { slug, password, action, newPassword } = req.body || {};
  if (!FALL_SLUGS.includes(slug) || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Bad request" });
  }

  // No Sheets configured (local dev): fall back to the legacy slug code.
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    const ok = password.toLowerCase().trim() === slug || (masterPw() && password === masterPw());
    return res.status(ok ? 200 : 401).json({ ok, needsSetup: false, degraded: true });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const stored = await readStored(sheets, spreadsheetId, slug);

    const isMaster = !!masterPw() && password === masterPw();
    const isCurrent = stored.hash
      ? hashPw(slug, password) === stored.hash
      : password.toLowerCase().trim() === slug; // first login: access code = slug

    if ((action || "check") === "check") {
      if (isMaster) return res.status(200).json({ ok: true, master: true, needsSetup: false });
      if (!isCurrent) return res.status(401).json({ ok: false });
      return res.status(200).json({ ok: true, needsSetup: !stored.hash });
    }

    // action === "set": verify the current credential, then store the new hash
    if (!isMaster && !isCurrent) return res.status(401).json({ ok: false });
    const pw = String(newPassword || "");
    if (pw.length < 8) return res.status(400).json({ ok: false, error: "Password must be at least 8 characters" });

    const value = hashPw(slug, pw);
    const timestamp = new Date().toISOString();
    if (stored.rowNum > -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${FALL_RESPONSES_TAB}!D${stored.rowNum}:F${stored.rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["Portal password (SHA-256)", value, timestamp]] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${FALL_RESPONSES_TAB}!A:F`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [[slug, "0", FIELD, "Portal password (SHA-256)", value, timestamp]] },
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[portal-auth] failed:", err.message);
    return res.status(500).json({ ok: false, error: "Auth unavailable" });
  }
}
