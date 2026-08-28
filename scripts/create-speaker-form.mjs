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
const choice = (ref, title, description, choices, opts = {}) =>
  ({ ref, title, type: "multiple_choice", properties: {
      ...(description ? { description } : {}),
      choices, allow_multiple_selection: !!opts.multi, allow_other_choice: !!opts.other,
      randomize: false, vertical_alignment: true,
    }, validations: { required: opts.required !== false } });

const form = {
  title: "Speak at Uplift · Fall 2026",
  type: "form",
  settings: {
    is_public: true,
    language: "en",
    progress_bar: "proportion",
    show_progress_bar: true,
    show_typeform_branding: true,
    meta: { allow_indexing: false },
  },
  welcome_screens: [{
    ref: "welcome",
    title: "Speak at Uplift. 30 minutes, a room of New Jersey founders.",
    properties: {
      show_button: true,
      button_text: "Apply to speak",
      description:
        "Uplift is TechUnited:NJ's founder mentorship program. Every founder in it gets matched with a mentor, and three times a week the cohort comes together for a 30 minute virtual session. This fall that is around 70 New Jersey founders in the program and 22 speaking slots between September 11 and November 4.\n\nEvery founder is welcome at every session, and attendance runs around 30 live, depending on the topic and what people are working on that week.\n\nThe topic is wide open. It could be automating a workflow with AI. Defining your ICP. Tricks for pitching yourself. Public speaking, for founders who dread it. The mistakes you made building your company. How you actually built it, including the unglamorous middle years. What your business does every day that theirs should be doing too. If a founder can use it on Monday, it belongs here.\n\nFor the bar, here is what our last two cohorts ran:\n\u2022 How to Pitch an Angel: What Investors Actually Look For, with Joanne Wilson.\n\u2022 Beyond the Logo: Building a Brand Customers Trust and Investors Understand, with Debra Rizzi.\n\u2022 Service as Strategy: How Customer Experience Becomes Your Competitive Edge, with Christina Perla of Makelab.\n\u2022 The Gap Between an Idea and a Customer, with Tom Sauer of Mile Square Labs.\n\u2022 Pitch Without a Deck, run as a peer workshop.\n\nWhat you get:\n• 30 minutes with active, screened founders who chose to be in the room, as a presentation or a fireside chat.\n• Streamed live on LinkedIn and posted to YouTube, so the talk outlives the room.\n• We record it, clip it, and hand you the clips to post on your own channels.\n• Your name, headshot, company, and links on the event page, the stream, and every clip.\n• A clean way to send the elevator back down and share what you know.\n\nWhat we need: a headshot, a short bio, your topic, the takeaways founders leave with, who you are aiming it at, your dates in order of preference, and whether you would want to do a short series.\n\nSet aside about seven minutes. We review every application and reply within one business day.",
    },
  }],
  thankyou_screens: [{
    ref: "thanks",
    title: "Got it. You will hear from us within one business day.",
    properties: {
      show_button: false,
      share_icons: false,
      description:
        "Here is exactly what happens next.\n\n1. Within one business day we review everything and come back to you, either to confirm or with a couple of quick questions.\n2. Based on what is still open, you get your highest available date preference.\n3. We send you a calendar hold for that date.\n4. We set up a short sync call to map out the shape of the session, whether that is a fireside, a straight presentation, or a working session, and what the conversation should actually cover.\n\nAfter that we build the Luma event with your bio and headshot on it, promote it to the cohort, and send you the run of show and the stream details.\n\nQuestions in the meantime: uplift@techunited.co",
    },
  }],
  fields: [
    text("first_name", "First name", null),
    text("last_name", "Last name", null),
    { ref: "email", title: "Email", type: "email", properties: { description: "Where we send the confirmation and the run of show." }, validations: req },
    text("company", "Company or organization", null),
    text("role", "Your title or role", null),
    { ref: "linkedin", title: "LinkedIn profile", type: "website", properties: { description: "We tag you when we promote the session and post the clips." }, validations: { required: false } },
    { ref: "headshot", title: "Headshot", type: "file_upload", properties: { description: "Used on the Luma event page, the live stream, and the clips. Square or head-and-shoulders works best." }, validations: req },
    long("bio", "Short speaker bio", "Third person, about 75 to 100 words. We use this word for word on the event page and to introduce you on the stream."),
    choice("format", "Which format do you want?", "Every session runs 30 minutes on Zoom with time for founder questions. Pick the one that fits your material for now. Once you are booked we get on a short call together and settle the shape of it properly, so this is not binding.", [
      { label: "Presentation. I teach with slides, then take questions." },
      { label: "Fireside chat. You interview me, founders ask questions." },
      { label: "Working session. Founders bring their own work and I coach live." },
      { label: "Not sure yet. Help me pick." },
    ]),
    text("topic_title", "Session title", `How it will appear on the Luma event page and in promotion. Plain and specific beats clever. For the bar, here is what past sessions were called: ${PAST_SESSIONS.slice(0, 3).map(x => `"${x.topic}"`).join(", ")}.`),
    long("topic_summary", "What you would cover", "A paragraph on the substance of the 30 minutes. If you already have a deck, describe it here and attach or link it below."),
    long("takeaways", "Three things founders will walk away with", "Write them as three lines. Concrete and usable beats inspirational."),
    long("why_now", "Why this matters to founders right now", "What makes this the right topic for early stage New Jersey founders in the next few weeks?"),
    choice("audience", "Who is this session aimed at?", "Every session is open to the whole cohort, so nobody gets excluded by your answer. This just tells us who to point the blurb at. The fall group runs from idea stage through seed, pre-revenue through profitable.", [
      { label: "Any founder in the cohort" },
      { label: "Idea stage, still shaping it" },
      { label: "MVP or early build" },
      { label: "Pre-revenue, testing the market" },
      { label: "Already generating revenue" },
      { label: "Raising, or about to" },
      { label: "Founders who want to understand how investors think" },
    ], { multi: true }),
    { ref: "deck_link", title: "Link to your deck, or to a past talk", type: "website", properties: { description: "Optional. A recording of you speaking helps us a lot." }, validations: { required: false } },
    { ref: "deck_file", title: "Attach your deck", type: "file_upload", properties: { description: "Optional, and a rough draft is fine. PDF or slides." }, validations: { required: false } },
    long("resources", "Resources you would share with founders", "Optional. Templates, tools, reading, your own offers. We collect these in the cohort resource library with your name on them.", false),
    choice("dates", "Which dates could you make?", "Check every slot that works. Sessions are 30 minutes at 12:30 PM or 5:30 PM ET, on Zoom and streamed live. You will rank your favorites next.", dateChoices, { multi: true }),
    drop("date_1", "Your first choice date", "Rank your dates from here down, up to five. We work through them in your order, so if your first choice is still open, that is the one you get.", true),
    drop("date_2", "Your second choice", "Rank as many as you can. The more you give us, the faster we can lock you in when two speakers want the same Friday.", false),
    drop("date_3", "Your third choice", "Optional.", false),
    drop("date_4", "Your fourth choice", "Optional.", false),
    drop("date_5", "Your fifth choice", "Optional.", false),
    choice("series", "Interested in making this a series?", "We can have you host up to three sessions across the program. Plenty of speakers have more than one talk in them, and a returning face builds real familiarity with the cohort.", [
      { label: "Yes, I would take up to three sessions" },
      { label: "Maybe, I would want to talk it through first" },
      { label: "No, one session is right for me" },
    ], { required: false }),
    long("series_ideas", "If yes, what would the follow-up sessions be?", "Rough ideas are plenty. We book and prioritize your first session either way, then connect separately about the rest.", false),
    choice("spoken_before", "Have you spoken to a founder audience before?", null, [
      { label: "Often. This is a regular thing for me." },
      { label: "A few times." },
      { label: "This would be my first." },
    ], { required: false }),
    { ref: "consent", title: "We stream sessions live on LinkedIn, post the recording to YouTube, and cut short clips for social. Are you good with being recorded, streamed, and clipped, and with us using your name, headshot, and company to promote the session?", type: "legal", properties: { description: "We share the clips with you to post as well." }, validations: req },
    long("anything_else", "Anything else we should know, or anything you want to ask?", null, false),
    text("referral", "Who invited you, or how did you find Uplift?", null, false),
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
