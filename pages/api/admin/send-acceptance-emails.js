// POST /api/admin/send-acceptance-emails
//
// The Fall 2026 acceptance email to accepted founders, one personalized send
// each, CC'd to uplift@techunited.co.
//
// Body: { dryRun?: boolean, slugs?: string[], skip?: string[] }
//   dryRun: true (DEFAULT)  — returns exactly who would be emailed, sends nothing
//   slugs:  []              — only these slugs
//   skip:   []              — exclude these slugs (three founders were sent by
//                             hand before this endpoint existed; they are in
//                             ALREADY_SENT below and skipped unless overridden)
//
// Auth: ?token=<ADMIN_SECRET>
//
// Three things per founder change: first name, Uplift ID, portal URL. The
// roster (lib/fall-cohort.js) has the name and the slug. It deliberately does
// NOT carry the Uplift ID, because the roster ships to the browser, so the ID
// is read here from the FallMentees tab the same way pages/api/portal-auth.js
// reads it. A founder with no ID in the sheet is REFUSED, never sent a blank
// credential.

import { Resend } from "resend";
import { getSheetsClient } from "../../../lib/sheets-helper";
import { FALL_FOUNDERS } from "../../../lib/fall-cohort";
import {
  acceptanceEmailHTML,
  acceptanceEmailText,
  ACCEPTANCE_SUBJECT,
} from "../../../lib/acceptance-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Uplift by TechUnited:NJ <kennedy@techunited.co>";
const CC = "uplift@techunited.co";
const SITE = "https://uplift2026.vercel.app";

// Everyone who already has their acceptance email, skipped by default so
// nobody gets a second one. The first three went by hand from Gmail; the rest
// went through this endpoint on 2026-09-01.
//
// collin-coke is deliberately NOT in this list. His first send went to the
// address on his application, airgrandson@gnail.con, which is a typo for
// gmail.com and will bounce. Once the FallMentees tab carries the corrected
// address he is the only person a Preview/Send will target.
const ALREADY_SENT = [
  "takeerah-jones", "laura-acosta", "ceana-santori",
  "clevon-brown", "carolina-galvis", "christina-brown", "mayank-doultani",
  "vishruti-mehta", "neha-panwar", "kristen-chin", "ifeanyi-osuji",
  "jairo-contreras", "jt-keitt", "durvish-paliwal", "udbhav-gupta",
  "sameer-dhawan", "ninad-dhoble", "sumayya-tabassum-shaik", "johnny-pillacela",
  "lola-abanum", "tami-brown", "kimberly-butler", "brittany-payton",
  "tamara-fleming", "melinda-rushing", "rachel-khasky-levy", "rosalind-griffie",
  "tammy-hollaway", "megan-fonseca", "suresh-y", "jannie-wolff",
  "david-singletary", "mehul-shah", "naomie-sophia-renarde", "sanjeev-wadhwa",
];

// Uplift IDs and emails live in the decision tab, keyed by the name that was
// on the application. Same exact, case-insensitive full-name match that
// portal-auth.js uses.
async function readMenteeSheet() {
  const sheets = getSheetsClient();
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "FallMentees!A2:F2000",
  });
  const byName = {};
  for (const row of r.data.values || []) {
    const [, , name, email, decision, upliftId] = row;
    if (!name) continue;
    const key = name.trim().toLowerCase();
    const prev = byName[key] || {};
    byName[key] = {
      email: email || prev.email || "",
      decision: decision || prev.decision,
      // an ID is permanent once issued: never let a later blank row clear it
      upliftId: upliftId || prev.upliftId || "",
    };
  }
  return byName;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });
  }

  const { dryRun = true, slugs = null, skip = ALREADY_SENT } = req.body || {};

  try {
    const sheet = await readMenteeSheet();

    const planned = [];
    const refused = [];

    for (const f of FALL_FOUNDERS) {
      if (slugs && !slugs.includes(f.slug)) continue;
      if (!slugs && skip.includes(f.slug)) {
        refused.push({ slug: f.slug, reason: "already sent" });
        continue;
      }
      const rec = sheet[`${f.first} ${f.last}`.trim().toLowerCase()];
      if (!rec) {
        refused.push({ slug: f.slug, reason: "no row in FallMentees" });
        continue;
      }
      if (!rec.upliftId) {
        refused.push({ slug: f.slug, reason: "no Uplift ID issued" });
        continue;
      }
      if (!rec.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rec.email)) {
        refused.push({ slug: f.slug, reason: `bad email: ${rec.email || "(blank)"}` });
        continue;
      }
      planned.push({
        slug: f.slug,
        firstName: f.first,
        email: rec.email,
        upliftId: rec.upliftId,
        portalUrl: `${SITE}/fall/${f.slug}`,
      });
    }

    if (dryRun) {
      return res.status(200).json({
        dryRun: true,
        wouldSend: planned.length,
        refusedCount: refused.length,
        planned,
        refused,
      });
    }

    const sent = [];
    const failed = [];
    for (const p of planned) {
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: p.email,
          cc: CC,
          replyTo: CC,
          subject: ACCEPTANCE_SUBJECT(p.firstName),
          html: acceptanceEmailHTML(p),
          text: acceptanceEmailText(p),
        });
        if (error) throw new Error(error.message || JSON.stringify(error));
        sent.push({ slug: p.slug, email: p.email, id: data?.id });
      } catch (e) {
        failed.push({ slug: p.slug, email: p.email, error: e.message });
      }
      // Resend's default rate limit is 2 requests/second.
      await new Promise((r) => setTimeout(r, 600));
    }

    return res.status(200).json({
      dryRun: false,
      sentCount: sent.length,
      failedCount: failed.length,
      refusedCount: refused.length,
      sent,
      failed,
      refused,
    });
  } catch (err) {
    console.error("[send-acceptance-emails] failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
