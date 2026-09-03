// /fall/sop — the master one-pager for running Uplift Fall 2026.
//
// Every surface, every password, every source of truth, and the runbook for
// the handful of things we actually do week to week. Deliberately static: no
// fetches, so it renders even when Sheets, Typeform or Luma are down, which
// is exactly when someone is most likely to come looking for it.
//
// When a route, tab, or form id changes, change it here too. This page is the
// index everyone reads first.

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

// Palette: near-monochrome with one accent. Colour earns its place by
// carrying meaning (the per-section markers below), never as decoration.
const INK = "#15141c";
const NAVY = "#110465";
const PURPLE = "#5c4eb5";
const MUTED = "#6e6c7e";
const LINE = "#e9e8ef";
const BG = "#f7f7fa";

// One marker colour per section, muted on purpose. These are wayfinding, so
// the same colour must mean the same section in the nav and in the heading.
const MARK = {
  dates: "#b8823c", admin: "#5c4eb5", surfaces: "#2f6fb0", handouts: "#2c8b7c",
  data: "#4a8a4f", code: "#6b7280", runbook: "#110465", access: "#b0537a",
  gaps: "#bf3d30",
};

// ─── Content ─────────────────────────────────────────────────────────────────

const DATES = [
  ["Sept 9", "Program starts", "Founders onboard Sept 9–11"],
  ["Week of Sept 14", "Matches go out", "Founder reaches out within 72 hours"],
  ["Within 7 days of match", "Meeting 1 · Discover", ""],
  ["Within 10 days of Discover", "Meeting 2 · Act", ""],
  ["Oct 23", "Meeting 3 · Roadmap", "Hard deadline"],
  ["Nov 6", "Program ends", "Wrap-up + exit survey"],
];

const ADMIN_TABS = [
  ["📋 Today", "What needs a decision right now. Start here every morning."],
  ["Overview", "Funnel counts and program-wide stats."],
  ["Roster", "The 36 accepted founders with live milestone status."],
  ["Mentee Apps / Mentor Apps", "Live from Typeform. Approve or reject; approval issues the Uplift ID."],
  ["Accepted Founders / Mentors", "Approved but not yet in the generated roster."],
  ["Matching", "The whole waiting room solved at once, not one click at a time. Three picks per founder ranked by what each does to the rest of the cohort, each stating who it costs. You make the call, it shows its reasoning."],
  ["Matched", "Pairs already made, for tracking."],
  ["Signals", "Parking lot for observations not being acted on yet."],
  ["⏱ Deadlines", "Who is late on which meeting."],
  ["📊 Reporting", "NJEDA-shaped numbers."],
  ["Sessions", "The 22 educational sessions and their Luma registration counts."],
  ["🎤 Speakers", "Speaker applications and slot assignment."],
  ["Pulse & Wins", "Portal check-in responses."],
];

const SURFACES = [
  {
    group: "Admin · code \"admin\"",
    rows: [
      ["/admin-fall", "The fall dashboard. One request, computed live from source. Everything below is a tab on it.", true],
      ["/fall/profiles", "Copy-ready mentor-facing profile links, one per approved founder.", true],
      ["/fallfounderlookbook", "The short, sayable URL for the founder lookbook. Same page as /fall/lookbook.", true],
      ["/fall/lookbook", "The founder lookbook: the cohort as a magazine you click through. Cover, contents, at a glance, the seeking and hiring indexes, a page of faces, then a feature page per founder. Print lays the whole issue out, one letter sheet per page.", true],
    ],
  },
  {
    group: "Founder-facing · gated by Uplift ID",
    rows: [
      ["/fall/<slug>", "The founder portal. Password is their Uplift ID (UF261, UF262, …). 36 founders + 3 test portals.", false],
      ["/fall/kennedy", "Walkthrough portal. Test accounts use their slug as the code.", true],
    ],
  },
  {
    group: "Mentor-facing · ungated links",
    rows: [
      ["/fall/mentor/<slug>", "The mentor one-screener: program arc, the three meetings, their founder's full profile.", false],
      ["/fall/profile/<response-id>", "A founder's one-pager for a prospective mentor. Keyed by Typeform response id, never the Uplift ID.", false],
    ],
  },
  {
    group: "Public",
    rows: [
      ["/ulrike", "Ulrike, the chat bot, in visitor mode. For people considering the program.", true],
      ["/faq", "Public FAQ.", true],
      ["/share-your-expertise", "Speaker invitation. /expert and /speak are aliases.", true],
      ["/resources/mentor-handbook", "Mentor handbook.", true],
      ["/resources/first-meeting", "How to run meeting one.", true],
      ["/resources/feedback-guide", "Giving feedback.", true],
      ["/resources/program-schedule", "The schedule.", true],
      ["/resources/nj-ecosystem", "NJ ecosystem map.", true],
    ],
  },
];

const HANDOUTS = [
  ["/fall2026-launch-guide.html", "Launch guide"],
  ["/portal-guide-fall2026.html", "Portal guide for founders"],
  ["/program-requirements-fall2026.html", "Program requirements"],
  ["/uplift-onboarding-quiz-fall2026.html", "Onboarding quiz"],
  ["/uplift-goal-loop.html", "The Uplift Goal Loop one-pager"],
  ["/uplift-three-meetings-one-pager.html", "The three meetings"],
  ["/uplift-fall-speaker-runbook.html", "Speaker runbook"],
  ["/uplift-matching-logic-one-pager.html", "Matching logic, shareable"],
  ["/uplift-matching-logic-internal.html", "Matching logic, internal"],
  ["/admin-fall-architecture.html", "How the fall backend is put together"],
  ["/fall2026-improvements-onepager.html", "What changed since summer"],
];

const SHEET_TABS = [
  ["FallMentees", "Mentee decisions. Append-only, latest row wins. Carries the Uplift ID."],
  ["FallMentors", "Mentor decisions. Same shape."],
  ["FallMatches", "Live match store. Unmatching flips status, nothing is deleted."],
  ["FallSpeakers", "Speaker decisions plus the educational-session slot they hold."],
  ["FallSignals", "The observation parking lot."],
  ["FallResponses", "Every founder's portal input in one tab. Replaces summer's 70+ per-person tabs."],
  ["Dashboard / Participation", "Milestones, read by the admin overview."],
  ["LumaAttendance", "Event attendance synced from Luma."],
];

const EXTERNAL = [
  ["Typeform · hAbo7Jdh", "Mentee application"],
  ["Typeform · AayoroO1", "Mentor application"],
  ["Typeform · uUjnsoDm", "Speaker application"],
  ["Typeform · e0L62296", "Mentor meeting log. This is what drives meeting counts."],
  ["Luma · cal-wVdcBds3K0Ylw3n", "TechUnited calendar. All 22 sessions live here."],
  ["Slack · #uplift-portal-inputs", "Every portal input, fire-and-forget."],
  ["Google Sheet", "GOOGLE_SHEET_ID. The whole backend."],
  ["Vercel", "Deploys on push to main, about 2 minutes."],
];

const CODE_MAP = [
  ["lib/fall-cohort.js", "GENERATED. The 36 accepted founders. Rebuild, never hand-edit."],
  ["lib/fall-roster.js", "Slugs, test accounts, pulse windows, the responses tab name."],
  ["lib/fall-applications.js", "Typeform fetch and parse, shared by the admin and the profiles."],
  ["lib/fall-mentors.js", "Mentor records behind /fall/mentor/<slug>."],
  ["lib/edu-sessions.js", "The 22 sessions. Canonical dates."],
  ["lib/portal-bot-knowledge.js", "Everything Ulrike is allowed to know."],
  ["lib/program-data.js", "Cohorts, resources, program emails."],
  ["pages/fall/[mentee].js", "The founder portal, including its own copy of the week schedule."],
  ["pages/admin-fall.js", "The dashboard UI and the match scoring heuristic."],
  ["pages/api/admin/fall-overview.js", "The single aggregated payload behind the dashboard."],
];

const RUNBOOK = [
  ["Accept a founder or mentor", "Admin → Mentee Apps / Mentor Apps → approve. This issues a permanent Uplift ID (UF261, UF262, …), which becomes their portal password. IDs are never reassigned."],
  ["Get a founder a portal", "After approving, run node scripts/build-fall-cohort.mjs, then commit and push. The roster file is generated, so an approval alone does not create the portal."],
  ["Send a founder to a prospective mentor", "/fall/profiles → copy their link. It carries their contact details, so treat it like their email address. It does not expose the demographic block."],
  ["Make a match", "Admin → Matching. The plan solves every waiting founder against every open mentor slot together, so a founder's pairing never depends on where they sit in the queue. Rules it holds to: every mentor gets one founder before anyone gets two, never more than two, never past the sessions they offered, never below three sessions, and never a weak match just to keep a mentor busy. Session depth above three is a preference and loses to fit. The three picks per founder are ranked by the cohort they leave behind and say who they cost. You decide; unmatching preserves history."],
  ["Book a speaker", "Admin → Speakers → assign a session. \"Pending\" holds the slot while you wait on their reply, so a date is never offered twice."],
  ["Move a session date", "Edit lib/edu-sessions.js AND the copy in pages/fall/[mentee].js, then re-run scripts/create-speaker-form.mjs so the Typeform choices still map to slots."],
  ["Change a program rule", "Edit the portal and lib/portal-bot-knowledge.js together, or Ulrike will confidently tell founders the old rule."],
  ["Deploy", "git push to main. Vercel picks it up in about two minutes."],
];

const GAPS = [
  "The admin gate is the literal string \"admin\", checked in the browser. It keeps honest people out of the way; it is not security. Anything genuinely sensitive stays server-side.",
  "The three cron routes say \"see vercel.json\", but vercel.json has no crons block. Nothing is scheduled right now.",
  "There is no pages/index.js, so the bare domain has no page. Every link is a deep link.",
  "lib/fall-mentors.js still holds only the Jeanne test entry, so /fall/mentor/<slug> is not live for real mentors yet.",
];

// ─── Page ────────────────────────────────────────────────────────────────────

function PasswordGate({ onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const attempt = () => {
    if (input.trim().toLowerCase() === "admin") onAuthenticated();
    else setError(true);
  };
  return (
    <div style={{ minHeight: "100vh", background: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sans)" }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: "34px 36px", width: 340 }}>
        <p style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 650, color: INK, letterSpacing: "-0.01em" }}>Uplift Fall 2026 · SOP</p>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: MUTED }}>Enter the admin code</p>
        <input
          type="password" value={input} autoFocus
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: error ? "1px solid #bf3d30" : `1px solid ${LINE}`, fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box" }}
        />
        <button onClick={attempt} style={{ width: "100%", border: "none", borderRadius: 6, padding: "9px 0", background: INK, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Enter
        </button>
      </div>
    </div>
  );
}

const card = { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "18px 20px", marginBottom: 14 };
const body = { fontSize: 12.5, color: MUTED, lineHeight: 1.5 };
const code = { fontFamily: "var(--mono)", fontSize: 11.5, color: NAVY, fontWeight: 500, letterSpacing: "-0.01em" };

function Mark({ color }) {
  return <span style={{ width: 7, height: 7, borderRadius: 1.5, background: color, display: "inline-block", flex: "none" }} />;
}

function Section({ id, title, note, children }) {
  return (
    <section id={id} style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: note ? 3 : 11 }}>
        <Mark color={MARK[id]} />
        <h2 style={{ margin: 0, fontFamily: "var(--display)", fontSize: 14.5, fontWeight: 600, color: INK, letterSpacing: "-0.015em" }}>{title}</h2>
      </div>
      {note && <p style={{ ...body, margin: "0 0 11px", paddingLeft: 15 }}>{note}</p>}
      {children}
    </section>
  );
}

function Row({ left, right, href }) {
  return (
    <div className="sop-row">
      <div>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" style={{ ...code, textDecoration: "none", borderBottom: `1px solid ${LINE}` }}>{left}</a>
          : <span style={code}>{left}</span>}
      </div>
      <div style={body}>{right}</div>
    </div>
  );
}

export default function FallSOP() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("auth_admin_fall") === "1") setAuthed(true);
  }, []);

  const head = (
    <Head>
      <title>Uplift Fall 2026 · SOP</title>
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&family=Red+Hat+Text:wght@400;500;600;700&family=Red+Hat+Mono:wght@400;500&display=swap" rel="stylesheet" />
    </Head>
  );

  const styles = (
    <style>{`
      :root {
        --sans: 'Red Hat Text', system-ui, -apple-system, sans-serif;
        --display: 'Red Hat Display', system-ui, sans-serif;
        --mono: 'Red Hat Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .sop-row {
        display: grid;
        grid-template-columns: minmax(104px, 168px) 1fr;
        gap: 12px;
        padding: 6px 0;
        border-top: 1px solid ${LINE};
        align-items: baseline;
      }
      /* Long identifiers (env lists, sheet ids) break rather than push the
         page sideways on a phone. */
      .sop-row > div { min-width: 0; overflow-wrap: anywhere; }
      @media (max-width: 620px) {
        .sop-row { grid-template-columns: 1fr; gap: 2px; }
      }
      /* Masonry so cards of unequal height sit flush instead of leaving the
         ragged gaps a fixed grid would. */
      .sop-grid { column-gap: 14px; }
      @media (min-width: 1000px) { .sop-grid { column-count: 2; } }
      .sop-grid > section { break-inside: avoid; -webkit-column-break-inside: avoid; }
      .sop-chip {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11.5px; font-weight: 500; color: ${INK};
        text-decoration: none; padding: 4px 9px;
        border: 1px solid ${LINE}; border-radius: 5px; background: #fff;
      }
      .sop-chip:hover { border-color: #cfcdda; }
      a { color: ${PURPLE}; }
    `}</style>
  );

  if (!authed) {
    return (
      <>
        {head}
        {styles}
        <PasswordGate onAuthenticated={() => { sessionStorage.setItem("auth_admin_fall", "1"); setAuthed(true); }} />
      </>
    );
  }

  const jump = [
    ["dates", "Dates"], ["admin", "Dashboard"], ["surfaces", "Pages"], ["handouts", "Handouts"],
    ["data", "Data"], ["code", "Code"], ["runbook", "Runbook"],
    ["access", "Access"], ["gaps", "Gaps"],
  ];

  return (
    <>
      {head}
      {styles}
      <div style={{ minHeight: "100vh", background: BG, fontFamily: "var(--sans)", color: INK }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "30px 20px 64px" }}>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontFamily: "var(--display)", fontSize: 23, fontWeight: 700, letterSpacing: "-0.025em", color: INK }}>
              How to run the program
            </h1>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>Uplift Fall 2026</span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: MUTED, lineHeight: 1.55, maxWidth: 620 }}>
            Every surface, every password, every source of truth, and the short list of things we actually do
            week to week. If you are new, read the runbook and bookmark the dashboard.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {jump.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="sop-chip">
                <Mark color={MARK[id]} />{label}
              </a>
            ))}
          </div>

          {/* The two things people open this page to find. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 14 }}>
            <div style={{ ...card, marginBottom: 0, background: INK, border: "none" }}>
              <p style={{ margin: "0 0 7px", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8e8ba6" }}>
                Start here every morning
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 650, letterSpacing: "-0.02em" }}>
                <Link href="/admin-fall" style={{ color: "#fff", textDecoration: "none", borderBottom: "1px solid #55526e" }}>/admin-fall</Link>
                <span style={{ color: "#8e8ba6", fontWeight: 500 }}> → Today</span>
              </p>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#b3b0c4" }}>
                What needs a decision right now. Every number is recomputed from source on each load, so nothing
                is hand-set and nothing goes stale. Add <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>?fresh=1</span> to skip the cache.
              </p>
            </div>

            <div style={{ ...card, marginBottom: 0 }}>
              <p style={{ margin: "0 0 7px", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>
                The cohort in one document
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 650, letterSpacing: "-0.02em", color: INK }}>
                <a href="/fallfounderlookbook" target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: "none", borderBottom: `1px solid ${LINE}` }}>/fallfounderlookbook</a>
              </p>
              <p style={{ ...body, margin: "0 0 7px" }}>
                All 36 founders as a magazine: cover, contents, at a glance, the seeking and hiring indexes, a
                page of faces, then a feature page each. Print lays it out one letter sheet per page.
                <span style={code}> /fall/lookbook</span> is the same page.
              </p>
              <p style={{ ...body, margin: 0 }}>
                Whole cohort, this. One founder to one mentor,{" "}
                <a href="/fall/profiles" target="_blank" rel="noreferrer" style={{ fontWeight: 500 }}>/fall/profiles</a> instead.
              </p>
            </div>
          </div>

          <div className="sop-grid">
            <Section id="dates" title="Dates that matter"
              note="22 educational sessions run Sept 11 through Nov 4. Pulse checks open and close on Fridays, week 2 through week 8, defined once in lib/fall-roster.js.">
              {DATES.map(([when, what, note]) => (
                <Row key={what} left={when} right={<><strong style={{ color: INK, fontWeight: 600 }}>{what}</strong>{note ? ` · ${note}` : ""}</>} />
              ))}
            </Section>

            <Section id="admin" title="The dashboard, tab by tab" note="/admin-fall · code admin">
              {ADMIN_TABS.map(([name, what]) => <Row key={name} left={name} right={what} />)}
            </Section>

            <Section id="surfaces" title="Every page we run">
              {SURFACES.map(({ group, rows }) => (
                <div key={group} style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 1px", fontSize: 11.5, fontWeight: 600, color: INK }}>{group}</p>
                  {rows.map(([path, what, linkable]) => (
                    <Row key={path} left={path} right={what} href={linkable ? path : null} />
                  ))}
                </div>
              ))}
            </Section>

            <Section id="handouts" title="Handouts and decks" note="Static files in public/.">
              {HANDOUTS.map(([path, what]) => <Row key={path} left={path} right={what} href={path} />)}
            </Section>

            <Section id="data" title="Where the data lives">
              <p style={{ margin: "0 0 1px", fontSize: 11.5, fontWeight: 600, color: INK }}>Google Sheet tabs</p>
              {SHEET_TABS.map(([tab, what]) => <Row key={tab} left={tab} right={what} />)}
              <p style={{ margin: "12px 0 1px", fontSize: 11.5, fontWeight: 600, color: INK }}>Outside the sheet</p>
              {EXTERNAL.map(([name, what]) => <Row key={name} left={name} right={what} />)}
            </Section>

            <Section id="code" title="Code map" note="If you need to change something.">
              {CODE_MAP.map(([file, what]) => <Row key={file} left={file} right={what} />)}
            </Section>

            <Section id="runbook" title="Runbook" note="The things we actually do.">
              {RUNBOOK.map(([task, how]) => (
                <div key={task} style={{ padding: "8px 0", borderTop: `1px solid ${LINE}` }}>
                  <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 600, color: INK }}>{task}</p>
                  <p style={{ ...body, margin: 0 }}>{how}</p>
                </div>
              ))}
            </Section>

            <Section id="access" title="Access">
              <Row left="Admin pages" right={<>The code <strong style={{ color: INK, fontWeight: 600 }}>admin</strong>, checked in the browser. Covers /admin-fall, /fall/profiles, the lookbook and this page.</>} />
              <Row left="Founder portal" right="Their Uplift ID. Test portals fall back to their slug. PORTAL_MASTER_PASSWORD or ADMIN_SECRET opens any portal for the team." />
              <Row left="Mentor pages" right="No gate. The URL is the secret, and a profile link carries contact details, so share it like an email address." />
              <Row left="Environment" right="Set in Vercel: GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, TYPEFORM_TOKEN, LUMA_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, SLACK_BOT_TOKEN, ADMIN_SECRET, PORTAL_MASTER_PASSWORD, CIO_SITE_ID, CIO_API_KEY." />
            </Section>

            <Section id="gaps" title="Known gaps" note="Read before you trust it.">
              {GAPS.map((g, i) => (
                <div key={i} style={{ padding: "7px 0", borderTop: `1px solid ${LINE}` }}>
                  <p style={{ ...body, margin: 0 }}>{g}</p>
                </div>
              ))}
            </Section>
          </div>

          <p style={{ ...body, marginTop: 20, fontSize: 12 }}>
            Wrong or missing? Edit <span style={code}>pages/fall/sop.js</span> ·{" "}
            <a href="mailto:uplift@techunited.co" style={{ fontWeight: 500 }}>uplift@techunited.co</a>
          </p>

        </div>
      </div>
    </>
  );
}
