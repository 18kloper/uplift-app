// Regenerate lib/acceptance-email.js from the reviewed HTML.
//
//   node scripts/build-acceptance-email-module.mjs
//
// public/fall-acceptance-email.html is the file you edit and eyeball. This
// turns it into a template function the send endpoint can import, because API
// routes on Vercel cannot reliably read files out of public/ at runtime.
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public/fall-acceptance-email.html");
const OUT = path.join(ROOT, "lib/acceptance-email.js");
const TEXT = path.join(ROOT, "lib/acceptance-email-text.txt");

let html = fs.readFileSync(SRC, "utf8");
html = html.replace(/<!--[\s\S]*?-->\n?/g, "");
html = html.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
html = html
  .replace(/\{\{customer\.first_name \| default:"founder"\}\}/g, "${firstName}")
  .replace(/\{\{customer\.uplift_id\}\}/g, "${upliftId}")
  .replace(/\{\{customer\.portal_url\}\}/g, "${portalUrl}");

const existing = fs.readFileSync(OUT, "utf8");
const textFn = existing.slice(existing.indexOf("export function acceptanceEmailText"));
const header = existing.slice(0, existing.indexOf("export function acceptanceEmailHTML"));

fs.writeFileSync(OUT, `${header}export function acceptanceEmailHTML({ firstName, upliftId, portalUrl }) {
  return \`${html}\`;
}

${textFn}`);
console.log("regenerated lib/acceptance-email.js from public/fall-acceptance-email.html");
