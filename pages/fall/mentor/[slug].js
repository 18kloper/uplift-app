// The mentor one-screener: everything a mentor needs on one ungated page.
// The program arc, how to structure the three meetings, what they said they
// would give and get, and their founder(s) with full application profiles.

import Head from "next/head";
import { FALL_MENTORS, getFallMentorBySlug } from "../../../lib/fall-mentors";
import { getMenteeBySlug } from "../../../lib/mentees";

const FONT = "'Inter', system-ui, sans-serif";

const TIMELINE = [
  { date: "Sept 9", label: "Program starts", note: "Founders onboard Sept 9-11" },
  { date: "Week of Sept 14", label: "You're matched", note: "Founder reaches out within 72 hours" },
  { date: "Within 7 days of match", label: "Meeting 1 · Discover", note: "" },
  { date: "Within 10 days of Discover", label: "Meeting 2 · Act", note: "" },
  { date: "By Oct 23", label: "Meeting 3 · Roadmap", note: "Hard deadline" },
  { date: "Nov 6", label: "Program ends", note: "Wrap-up + exit survey" },
];

const MEETINGS = [
  {
    name: "Discover",
    tag: "Meeting 1 · within 7 days of your match",
    color: "#1a6e50",
    body: "Get to know each other. Their company, their goals for the 8 weeks, and where they're stuck. Leave with one clear priority to work on together.",
  },
  {
    name: "Act",
    tag: "Meeting 2 · within 10 days of Discover",
    color: "#9a6200",
    body: "Work the problem. Dig into the priority from Discover: pressure-test the plan, share what you've seen work, and agree on concrete next steps.",
  },
  {
    name: "Roadmap",
    tag: "Meeting 3 · by October 23",
    color: "#c0006e",
    body: "Zoom out. Help them leave the program with a plan for what comes after it: what to do, what to avoid, and where you can still open doors.",
  },
];

function Chip({ children }) {
  return (
    <span style={{
      display: "inline-block", background: "#efeafd", color: "#4a3d99", borderRadius: 20,
      padding: "4px 12px", fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 6,
    }}>{children}</span>
  );
}

function SectionTitle({ kicker, title }) {
  return (
    <div style={{ margin: "34px 0 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "#9b8fcf", marginBottom: 4 }}>{kicker}</div>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#1a1733" }}>{title}</h2>
    </div>
  );
}

export default function MentorPage({ mentor, mentees }) {
  if (!mentor) return null;
  return (
    <>
      <Head>
        <title>{mentor.first} {mentor.last} · Uplift Fall 2026 Mentor Guide</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/uplift-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: FONT }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", padding: "30px 24px 26px", color: "#fff" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <img src="/uplift-logo-white.png" alt="Uplift" style={{ height: 32, marginBottom: 16, display: "block" }} />
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
              Uplift Fall 2026 · Mentor Guide
            </div>
            <h1 style={{ margin: "0 0 4px", fontSize: 27, fontWeight: 800 }}>{mentor.first} {mentor.last}</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14.5 }}>{mentor.title} · {mentor.company} · {mentor.location}</p>
            <p style={{ margin: "10px 0 0", opacity: 0.75, fontSize: 13 }}>
              You committed to {mentor.tier.toLowerCase()} · {mentor.timePref.toLowerCase()} · {mentor.method.toLowerCase()}
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 24px 60px" }}>

          {/* The plot: 8-week arc */}
          <SectionTitle kicker="The plot" title="Eight weeks, three meetings, one roadmap" />
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e6e2f5", padding: "18px 20px" }}>
            {TIMELINE.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: i < TIMELINE.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.note === "Hard deadline" ? "#c0006e" : "#5c4eb5", marginTop: 5, flexShrink: 0 }} />
                  {i < TIMELINE.length - 1 && <div style={{ width: 2, flex: 1, background: "#e6e2f5", marginTop: 3 }} />}
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: t.note === "Hard deadline" ? "#c0006e" : "#9b8fcf" }}>{t.date}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1733" }}>{t.label}</div>
                  {t.note && <div style={{ fontSize: 13, color: "#6b6480" }}>{t.note}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Meeting structure */}
          <SectionTitle kicker="How to structure your meetings" title="Discover, Act, Roadmap" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {MEETINGS.map(m => (
              <div key={m.name} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e6e2f5", borderTop: `4px solid ${m.color}`, padding: "16px 18px" }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#1a1733", marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: m.color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{m.tag}</div>
                <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{m.body}</p>
              </div>
            ))}
          </div>
          <a href="/uplift-three-meetings-one-pager.html" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", marginTop: 12, fontSize: 13.5, fontWeight: 700, color: "#5c4eb5", textDecoration: "underline", textUnderlineOffset: 3,
          }}>
            Read the full one-pager: what to bring and what to leave with →
          </a>

          {/* Give / get */}
          <SectionTitle kicker="In your own words" title="What you signed up to give, and get" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e6e2f5", padding: "18px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#1a6e50", marginBottom: 8 }}>You said you&apos;d give</div>
              <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.65 }}>&ldquo;{mentor.give}&rdquo;</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e6e2f5", padding: "18px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9a6200", marginBottom: 8 }}>You said you&apos;d get</div>
              <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.65 }}>&ldquo;{mentor.getOut}&rdquo;</p>
            </div>
          </div>

          {/* Mentees */}
          <SectionTitle kicker={mentees.length > 1 ? "Your founders" : "Your founder"} title={mentees.length > 1 ? "Who you're mentoring" : `Meet ${mentees[0]?.first}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mentees.map(m => {
              const app = m.application || {};
              return (
                <div key={m.slug} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e6e2f5", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #3d2f8a, #5c4eb5)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, flexShrink: 0,
                    }}>
                      {m.first[0]}{m.last[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 17.5, fontWeight: 800, color: "#1a1733" }}>{m.first} {m.last}</div>
                      <div style={{ fontSize: 13.5, color: "#6b6480" }}>
                        {m.company}{m.stage ? ` · ${m.stage}` : ""}{m.industry ? ` · ${m.industry}` : ""}
                      </div>
                    </div>
                    {(app.linkedin || m.linkedin) && (
                      <a href={(app.linkedin || m.linkedin).startsWith("http") ? (app.linkedin || m.linkedin) : `https://${app.linkedin || m.linkedin}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: "#5c4eb5", textDecoration: "none", whiteSpace: "nowrap" }}>
                        LinkedIn →
                      </a>
                    )}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    {m.primaryFocus && <Chip>Focus: {m.primaryFocus}</Chip>}
                    {app.sessionTier && <Chip>{app.sessionTier}</Chip>}
                    {app.timePreference && <Chip>{app.timePreference}</Chip>}
                  </div>

                  {app.snapshot && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9b8fcf", marginBottom: 3 }}>Company snapshot</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{app.snapshot}</p>
                    </div>
                  )}
                  {app.hopingToAccomplish && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9b8fcf", marginBottom: 3 }}>Hoping to accomplish in the program</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{app.hopingToAccomplish}</p>
                    </div>
                  )}
                  {app.valueSought && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9b8fcf", marginBottom: 3 }}>What they want from a mentor</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{app.valueSought}</p>
                    </div>
                  )}
                  {app.brings && (
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9b8fcf", marginBottom: 3 }}>What they bring</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{app.brings}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p style={{ margin: "34px 0 0", fontSize: 13, color: "#8a84a3", textAlign: "center" }}>
            Questions, scheduling trouble, anything at all: <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 700 }}>uplift@techunited.co</a>
          </p>
        </div>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  return { paths: FALL_MENTORS.map(m => ({ params: { slug: m.slug } })), fallback: false };
}

// The application stores the company snapshot as structured fields; render it
// as one readable line for the mentor.
function formatSnapshot(s) {
  if (!s) return null;
  if (typeof s === "string") return s;
  const bits = [];
  if (s.snapshotStage) bits.push(`${s.snapshotStage} stage`);
  if (s.revenueRange) bits.push(s.revenueRange);
  bits.push(s.raising === "Yes" ? "Raising" : "Not raising");
  bits.push(s.hiring === "Yes" ? "Hiring" : "Not hiring");
  if (s.lookingForCustomers) bits.push("Looking for customers");
  if (s.seekingPartnerships) bits.push("Seeking partnerships");
  if (s.priorOutsideCapital) bits.push("Has raised outside capital before");
  return bits.join(" · ");
}

export async function getStaticProps({ params }) {
  const mentor = getFallMentorBySlug(params.slug);
  if (!mentor) return { notFound: true };
  const mentees = mentor.menteeSlugs.map(s => getMenteeBySlug(s)).filter(Boolean)
    .map(m => ({
      slug: m.slug, first: m.first, last: m.last, company: m.company,
      stage: m.stage || null, industry: m.industry || null, primaryFocus: m.primaryFocus || null,
      linkedin: m.linkedin || null,
      application: m.application ? {
        snapshot: formatSnapshot(m.application.snapshot),
        hopingToAccomplish: m.application.hopingToAccomplish || null,
        valueSought: m.application.valueSought || null,
        brings: m.application.brings || null,
        sessionTier: m.application.sessionTier || null,
        timePreference: Array.isArray(m.application.timePreference)
          ? m.application.timePreference.join(", ")
          : m.application.timePreference || null,
        linkedin: m.application.linkedin || null,
      } : null,
    }));
  return { props: { mentor, mentees } };
}
