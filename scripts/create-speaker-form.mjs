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
import { EDU_SESSIONS, sessionLabel, ANY_DATE_CHOICE } from "../lib/edu-sessions.js";
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

const dateChoices = [
  { label: ANY_DATE_CHOICE },
  ...EDU_SESSIONS.map(s => ({ label: sessionLabel(s) })),
];

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
const group = (ref, title, description, fields) =>
  ({ ref, title, type: "group", properties: {
      ...(description ? { description } : {}),
      show_button: true, button_text: "Continue", fields,
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
  // topic ideas, what past cohorts ran, the trade, what happens next) lives on
  // /speak, which is the link that actually gets distributed. Repeating all of
  // it here made an unreadable wall of text.
  welcome_screens: [{
    ref: "welcome",
    title: "Speak at Uplift. 30 minutes, a room of New Jersey founders.",
    properties: {
      show_button: true,
      button_text: "Apply to speak",
      description:
        "22 speaking slots this fall, September 11 to November 4. Each one is a 30 minute virtual session with New Jersey founders, streamed live on LinkedIn, posted to YouTube, and clipped for you to post on your own channels.\n\nThe full brief, including what past cohorts ran and what happens after you apply: uplift2026.vercel.app/speak\n\nAbout seven minutes. Have a headshot handy. We reply within one business day.",
    },
  }],
  thankyou_screens: [{
    ref: "thanks",
    title: "Got it. You will hear from us within one business day.",
    properties: {
      show_button: false,
      share_icons: false,
      description:
        "1. We review everything and come back to you within one business day, to confirm or to ask a couple of quick questions.\n2. You get your highest available date preference.\n3. We send a calendar hold for that date.\n4. We get on a short sync call to shape the session.\n\nThen we build the Luma event with your bio and headshot on it, promote it to the cohort, and send you the run of show.\n\nQuestions: uplift@techunited.co",
    },
  }],
  fields: [
    group("you", "First, the basics", "Six quick ones, then the interesting part.", [
      text("first_name", "First name", null),
      text("last_name", "Last name", null),
      { ref: "email", title: "Email", type: "email", properties: { description: "Where your confirmation and run of show go." }, validations: req },
      text("company", "Company or organization", null),
      text("role", "Your title or role", null),
      { ref: "linkedin", title: "LinkedIn profile", type: "website", properties: { description: "Optional. We tag you when we promote the session." }, validations: { required: false } },
    ]),
    group("presented", "How you get introduced", "This is what founders see before you speak, so it is worth a minute.", [
      { ref: "headshot", title: "Headshot", type: "file_upload", properties: { description: "Runs on the event page, the stream, and the clips." }, validations: req },
      long("bio", "Short speaker bio", "Third person, 75 to 100 words. We use it word for word."),
    ]),
    choice("format", "Which format fits your material?", "Not binding. Once you are booked we get on a short call and settle the shape properly.", [
      { label: "Presentation. I teach with slides, then take questions." },
      { label: "Fireside chat. You interview me, founders ask questions." },
      { label: "Working session. Founders bring their own work and I coach live." },
      { label: "Not sure yet. Help me pick." },
    ]),
    text("topic_title", "Session title", "How it appears on the event page. Plain and specific beats clever. Repeats of past subjects are welcome, this is a brand new cohort."),
    long("topic_summary", "What would you cover?", "A paragraph is plenty. No deck required."),
    long("takeaways", "Three things founders will walk away with", "Three lines. Concrete beats inspirational."),
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
    group("materials", "Anything to show us?", "All optional. Skip the lot if you would rather.", [
      { ref: "deck_link", title: "Link to a deck, or to you speaking somewhere", type: "website", properties: { description: "A recording of you helps us a lot." }, validations: { required: false } },
      { ref: "deck_file", title: "Or attach a deck", type: "file_upload", properties: { description: "A rough draft is fine." }, validations: { required: false } },
      long("resources", "Resources you would share with founders", "Templates, tools, reading, your own offers. They go in the cohort library with your name on them.", false),
    ]),
    choice("dates", "Which dates could you make?", "Check every slot that works. All 30 minutes, at 12:30 PM or 5:30 PM ET. You rank your favorites next.", dateChoices, { multi: true }),
    group("ranking", "Now rank your top five", "We work through them in your order. If your first choice is still open, that is the one you get. See what is currently open at uplift2026.vercel.app/speak", [
      drop("date_1", "First choice", null, true),
      drop("date_2", "Second choice", null, false),
      drop("date_3", "Third choice", null, false),
      drop("date_4", "Fourth choice", null, false),
      drop("date_5", "Fifth choice", null, false),
    ]),
    group("series_group", "Want to make it a series?", "We can host you up to three times across the program. A returning face builds real familiarity with the cohort.", [
      choice("series", "Interested in more than one session?", null, [
        { label: "Yes, I would take up to three sessions" },
        { label: "Maybe, I would want to talk it through first" },
        { label: "No, one session is right for me" },
      ], { required: false }),
      long("series_ideas", "Rough ideas for the follow-ups", "We book and prioritize your first session either way, then connect separately about the rest.", false),
    ]),
    { ref: "consent", title: "We stream live on LinkedIn, post to YouTube, and cut clips. Are you good with that?", type: "legal", properties: { description: "Includes using your name, headshot, and company to promote the session. We send you the clips too." }, validations: req },
    group("last", "Last few", null, [
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
