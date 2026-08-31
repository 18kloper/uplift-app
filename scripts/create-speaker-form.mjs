// Creates (or updates) the "Speak at Uplift" Typeform.
//
//   node scripts/create-speaker-form.mjs            # create, prints the form id + link
//   node scripts/create-speaker-form.mjs <formId>   # overwrite that form with this definition
//
// Date choices come from lib/edu-sessions.js. Re-run with the form id to push
// a schedule change into the live form.
//
// Copy rules: no em dashes anywhere in applicant-facing text.

import fs from "fs";
import path from "path";
import { EDU_SESSIONS, sessionLabel } from "../lib/edu-sessions.js";
import { PAST_SESSIONS } from "../lib/past-sessions.js";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const f of [".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const TOKEN = process.env.TYPEFORM_TOKEN;
if (!TOKEN) { console.error("TYPEFORM_TOKEN not found in .env.local"); process.exit(1); }

const req = { required: true };
const text = (ref, title, description, required = true) =>
  ({ ref, title, type: "short_text", properties: description ? { description } : {}, validations: { required, max_length: 200 } });
const long = (ref, title, description, required = true) =>
  ({ ref, title, type: "long_text", properties: description ? { description } : {}, validations: { required } });
const drop = (ref, title, description, required) =>
  ({ ref, title, type: "dropdown", properties: {
      ...(description ? { description } : {}),
      choices: EDU_SESSIONS.map(s => ({ label: sessionLabel(s) })),
      alphabetical_order: false,
    }, validations: { required } });
// inline_group takes no button properties, unlike the paginating "group" type.
const page = (ref, title, description, fields) =>
  ({ ref, title, type: "inline_group", properties: {
      ...(description ? { description } : {}),
      fields,
    } });
const choice = (ref, title, description, choices, opts = {}) =>
  ({ ref, title, type: "multiple_choice", properties: {
      ...(description ? { description } : {}),
      choices, allow_multiple_selection: !!opts.multi, allow_other_choice: !!opts.other,
      randomize: false, vertical_alignment: true,
    }, validations: { required: opts.required !== false } });

const form = {
  title: "Speak at Uplift · Fall 2026",
  type: "form",
  // Uplift Speaker theme: navy on paper, Avenir Next (the brand print face),
  // left-aligned, roomier type. Created via POST /themes; recreate and swap
  // this href if the palette changes.
  theme: { href: "https://api.typeform.com/themes/H3aJUxM2" },
  settings: {
    is_public: true,
    language: "en",
    progress_bar: "proportion",
    show_progress_bar: true,
    show_typeform_branding: true,
    meta: { allow_indexing: false },
  },
  // Short on purpose. The full brief (what Uplift is, what a session is, the
  // topic ideas, what the last program ran, the trade, what happens next) lives on
  // /speak, which is the link that actually gets distributed. Repeating all of
  // it here made an unreadable wall of text.
  welcome_screens: [{
    ref: "welcome",
    title: "Speak at Uplift. 30 minutes, a room of New Jersey founders.",
    properties: {
      show_button: true,
      button_text: "Share your expertise",
      description:
        "22 speaking slots this fall, September 11 to November 4. Each one is a 30 minute virtual session streamed directly to the founders in our program, then shared on LinkedIn, posted to YouTube, and clipped for you to post on your own channels.\n\nThe full brief, including what our last program ran and what happens after you apply: uplift2026.vercel.app/share-your-expertise\n\nYou can be based anywhere, since every session is virtual. The only requirement is that the time slot works for you.\n\nAbout seven minutes. Have a headshot handy. Mentors and invited speakers have priority, and we come back to everyone within one business day.",
    },
  }],
  thankyou_screens: [{
    ref: "thanks",
    title: "Got it. You will hear from us within one business day.",
    properties: {
      show_button: false,
      share_icons: false,
      description:
        "If you are an Uplift mentor, or we invited you, this is not an audition. You have priority on these slots and we are working out which date, not whether to have you.\n\nWhat happens next:\n1. We email you the date we can give you, along with the title and takeaways we have from this form. Nothing is locked until you reply and confirm it.\n2. Once you confirm, a calendar invite for that date lands in your inbox.\n3. The week before your session we do a 15 minute sync call to square away the details.\n4. The event goes live, we promote it to the cohort with your bio and headshot on it, and you get the run of show.\n\nEither way you hear from us within one business day. If you came to us cold and we are oversubscribed on your dates, we will say so and keep you for the next cohort.\n\nQuestions: uplift@techunited.co",
    },
  }],
  // Every section is an inline_group, so a respondent sees all of that
  // section's questions on one screen. Headshot is standalone because
  // file_upload is not allowed inside an inline_group.
  fields: [
    page("you", "1 of 7 · About you", "All on one screen.", [
      text("first_name", "First name", null),
      text("last_name", "Last name", null),
      { ref: "email", title: "Email", type: "email", properties: { description: "Where your confirmation and run of show go." }, validations: req },
      text("company", "Company or organization", "Exactly as you want it listed on the event page."),
      text("role", "Your title or role", "Exactly as you want it read out when we introduce you."),
      { ref: "linkedin", title: "LinkedIn profile", type: "website", properties: { description: "Optional. This is the account we tag when we promote the session and post the clips." }, validations: { required: false } },
      long("bio", "Short speaker bio", "Write it exactly as you want it published, because we use it word for word. Third person, 75 to 100 words. It goes on the event page, into the promo posts, and gets read aloud when we introduce you."),
    ]),
    { ref: "headshot", title: "2 of 7 · Your headshot", type: "file_upload", properties: { description: "Send the one you want the world to see, because this runs exactly as you upload it: on the event page, in the promo posts, on the stream, and on every clip. Square or head-and-shoulders is best. Please not a group photo or a screenshot." }, validations: req },
    page("session", "3 of 7 · Your session", "Nothing here needs to be finished work. We shape the final version together on a call once you are booked.", [
      choice("format", "Which format are you proposing?", "Pick one, or propose your own and tell us how it works.", [
        { label: "Presentation. I teach with slides, then take questions." },
        { label: "Fireside chat. You interview me, founders ask questions." },
        { label: "Working session. Founders bring their own work and I coach live." },
      ], { other: true }),
      text("topic_title", "Proposed session title", "A working title is all we need. We may tighten it for promotion and will always run any change past you. Repeats of past subjects are welcome, the founders are entirely different this program."),
      long("topic_summary", "What would you cover?", "A paragraph is plenty and no deck is required. This is what we draw the event description from, so write it for a founder deciding whether to show up."),
      long("takeaways", "Three things founders will walk away with", "Three lines. Concrete beats inspirational, and we often quote these in the promo copy, so write them the way you would want them read."),
      long("why_now", "Why does this matter to them right now?"),
      choice("audience", "Who are you aiming it at?", "Every session stays open to the whole cohort. This only tells us who to point the invitation at.", [
        { label: "Any founder in the cohort" },
        { label: "Idea stage, still shaping it" },
        { label: "MVP or early build" },
        { label: "Pre-revenue, testing the market" },
        { label: "Already generating revenue" },
        { label: "Raising, or about to" },
        { label: "Founders who want to understand how investors think" },
      ], { multi: true }),
    ]),
    page("share", "4 of 7 · What you would share with founders", "The part that outlives the 30 minutes. All optional.", [
      long("resources", "Resources or tools you would hand them", "Templates, playbooks, frameworks, tools you swear by, reading, your own offers or discounts. We collect these in the cohort resource library with your name on them.", false),
      { ref: "deck_link", title: "Link to a deck, a past talk, or a file", type: "website", properties: { description: "Optional. A Drive or Dropbox link is fine, and a recording of you speaking helps us a lot." }, validations: { required: false } },
    ]),
    page("dates_section", "5 of 7 · Your dates, ranked", "Pick up to three different dates and put them in order, no repeats. All sessions are 30 minutes, at 12:30 PM or 5:30 PM Eastern. Everything is virtual, so you can join from any state. Just check the time lands for you. See what is currently open at uplift2026.vercel.app/share-your-expertise", [
      drop("date_1", "1. First choice", "We work down your list in order, so if this one is open, it is the one you get. Use a different date on each line.", true),
      drop("date_2", "2. Second choice", "Optional, and it speeds things up when two speakers want the same day.", false),
      drop("date_3", "3. Third choice", "Optional.", false),
      choice("flexible", "If none of those work out, are you open to other dates?", null, [
        { label: "Yes, any open slot works for me" },
        { label: "No, only the ones I listed" },
      ], { required: false }),
    ]),
    page("series_group", "6 of 7 · Want to make it a series?", "We can host you up to three times across the program. A returning face builds real familiarity with the cohort.", [
      choice("series", "Interested in more than one session?", null, [
        { label: "Yes, I would take up to three sessions" },
        { label: "Maybe, I would want to talk it through first" },
        { label: "No, one session is right for me" },
      ], { required: false }),
      long("series_ideas", "Rough ideas for the follow-ups", "We book and prioritize your first session either way, then connect separately about the rest.", false),
    ]),
    page("last", "7 of 7 · Permissions and last bits", null, [
      { ref: "consent", title: "We record the session, share it on LinkedIn, post it to YouTube, and cut clips. Are you good with that?", type: "legal", properties: { description: "Includes using your name, headshot, and company to promote the session. We send you the clips to post yourself." }, validations: req },
      choice("spoken_before", "Have you spoken to a founder audience before?", null, [
        { label: "Often. This is a regular thing for me." },
        { label: "A few times." },
        { label: "This would be my first." },
      ], { required: false }),
      long("anything_else", "Anything else we should know, or want to ask us?", null, false),
      text("referral", "Who invited you, or how did you find Uplift?", null, false),
    ]),
  ],
};

const formId = process.argv[2];
const url = formId ? `https://api.typeform.com/forms/${formId}` : "https://api.typeform.com/forms";
const r = await fetch(url, {
  method: formId ? "PUT" : "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(form),
});
const body = await r.text();
if (!r.ok) { console.error(`Typeform ${r.status}:`, body); process.exit(1); }
const created = JSON.parse(body);
console.log("form id :", created.id);
console.log("live at :", created._links?.display);
console.log("edit at :", `https://admin.typeform.com/form/${created.id}/create`);
console.log("fields  :", (created.fields || []).length);
