import { useState, useEffect } from "react";
import Head from "next/head";

const MILESTONE_ORDER = [
  { key: "participation",   label: "Confirmed Participation" },
  { key: "onboarding",      label: "Completed Onboarding" },
  { key: "mentorMatched",   label: "Mentor Revealed" },
  { key: "mentorSession1",  label: "Session 1" },
  { key: "mentorSession2",  label: "Session 2" },
  { key: "mentorSession3",  label: "Session 3" },
  { key: "edu1",            label: "Edu Session 1" },
  { key: "edu2",            label: "Edu Session 2" },
  { key: "edu3",            label: "Edu Session 3" },
];

const REFLECTION_GROUPS = [
  {
    label: "Week 1 · Goals",
    keys: ["primary_refine", "secondary_refine"],
    questions: {
      primary_refine:   "What's your primary goal for this program?",
      secondary_refine: "What's your secondary goal?",
    },
  },
  {
    label: "Week 2 · Mentor Prep",
    keys: ["prep_q1", "prep_q2", "prep_q3"],
    questions: {
      prep_q1: "What's the single most important thing you want your mentor to understand about your company?",
      prep_q2: "What's one decision you're currently stuck on?",
      prep_q3: "What would make this first meeting feel like a success to you?",
    },
  },
];

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ mentorSlug, onAuth }) {
  const [input, setInput] = useState("");
  const [error, setError]   = useState(false);
  const password = mentorSlug.split("-")[0];

  const attempt = () => {
    if (input.trim().toLowerCase() === password) {
      sessionStorage.setItem(`mentor_auth_${mentorSlug}`, "1");
      onAuth();
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 36px",
        width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px", fontSize: 24,
        }}>🧑‍🏫</div>
        <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "#1a1733" }}>Mentor Portal</p>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#9b8fcf" }}>Uplift Summer 2026 · TechUnited NJ</p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Enter your password"
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14,
            border: error ? "2px solid #e74c3c" : "2px solid #e8e4f5",
            borderRadius: 8, outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", marginBottom: 12,
            background: error ? "#fff5f5" : "#fff", transition: "border-color 0.2s",
          }}
          autoFocus
        />
        {error && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#e74c3c", fontWeight: 600 }}>Incorrect password</p>}
        <button onClick={attempt} style={{
          width: "100%", padding: "12px", fontSize: 14, fontWeight: 700,
          background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
          color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
        }}>Enter Portal</button>
        <p style={{ margin: "16px 0 0", fontSize: 12, color: "#b8b0d0" }}>
          Your password is your first name, lowercase.
        </p>
      </div>
    </div>
  );
}

// ── Milestone dots ────────────────────────────────────────────────────────────
function MilestoneDot({ done, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        background: done ? "#27ae60" : "#e8e4f5",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, color: "#fff",
      }}>
        {done ? "✓" : ""}
      </div>
      <span style={{ fontSize: 13, color: done ? "#1a6e42" : "#9b8fcf", fontWeight: done ? 600 : 400 }}>{label}</span>
    </div>
  );
}

// ── Mentee Card ───────────────────────────────────────────────────────────────
function MenteeCard({ mentee }) {
  const [open, setOpen] = useState(true);
  const sessionsDone = ["mentorSession1","mentorSession2","mentorSession3"].filter(k => mentee.milestones[k]).length;
  const eduDone      = ["edu1","edu2","edu3"].filter(k => mentee.milestones[k]).length;

  const reflectionsToShow = REFLECTION_GROUPS.flatMap(g =>
    g.keys
      .filter(k => mentee.reflections[k]?.value)
      .map(k => ({ group: g.label, question: mentee.reflections[k].question || g.questions[k], value: mentee.reflections[k].value }))
  );

  const approvedSessions = mentee.sessions.filter(s => s.approved === "Approved" || s.approved === "YES" || s.approved === "TRUE");

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e8e4f5",
      boxShadow: "0 2px 16px rgba(92,78,181,0.07)", marginBottom: 24, overflow: "hidden",
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "22px 28px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: open ? "1px solid #f0ecff" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 17, flexShrink: 0,
          }}>
            {mentee.first[0]}{mentee.last[0]}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#1a1733" }}>{mentee.first} {mentee.last}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b6480" }}>
              {mentee.company}{mentee.stage ? ` · ${mentee.stage}` : ""}
              {mentee.cohortName && (
                <span style={{ marginLeft: 8, background: "#f0ecff", color: "#7c5cbf",
                  borderRadius: 100, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                  Cohort {mentee.cohort} · {mentee.cohortName}
                </span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Quick stats */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Sessions", val: `${sessionsDone}/3`, done: sessionsDone > 0 },
              { label: "Edu", val: `${eduDone}/3`, done: eduDone > 0 },
            ].map(({ label, val, done }) => (
              <div key={label} style={{
                background: done ? "#e8f8f0" : "#f3f0ff",
                color: done ? "#1a6e42" : "#6b6480",
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
              }}>{label}: {val}</div>
            ))}
          </div>
          <span style={{ fontSize: 18, color: "#9b8fcf", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "24px 28px" }}>

          {/* About */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>About</p>
              {[
                { label: "Industry", value: mentee.industry },
                { label: "Stage", value: mentee.stage },
                { label: "County", value: mentee.county },
                { label: "Primary Focus", value: mentee.primaryFocus },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#b0a8c8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label} </span>
                  <span style={{ fontSize: 13, color: "#3d3558" }}>{value}</span>
                </div>
              ))}
              {mentee.secondaryFoci?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#b0a8c8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Secondary Goals </span>
                  <span style={{ fontSize: 13, color: "#3d3558" }}>{mentee.secondaryFoci.join(", ")}</span>
                </div>
              )}
              {mentee.email && (
                <div style={{ marginTop: 12 }}>
                  <a href={`mailto:${mentee.email}`} style={{ fontSize: 13, color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>{mentee.email}</a>
                </div>
              )}
              {mentee.linkedin && (
                <div style={{ marginTop: 4 }}>
                  <a href={mentee.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>LinkedIn ↗</a>
                </div>
              )}
            </div>

            {/* Milestones */}
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>Milestones</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {MILESTONE_ORDER.map(({ key, label }) => (
                  <MilestoneDot key={key} done={mentee.milestones[key]} label={label} />
                ))}
              </div>
            </div>
          </div>

          {/* Reflections */}
          {reflectionsToShow.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>Goals & Reflections</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reflectionsToShow.map((r, i) => (
                  <div key={i} style={{ background: "#f7f5ff", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid #5c4eb5" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.group}</p>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>{r.question}</p>
                    <p style={{ margin: 0, fontSize: 14, color: "#3d3558", lineHeight: 1.65 }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions */}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Logged Sessions ({approvedSessions.length})
            </p>
            {approvedSessions.length === 0 ? (
              <p style={{ fontSize: 13, color: "#b0a8c8", fontStyle: "italic" }}>No verified sessions yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {approvedSessions.map((s, i) => (
                  <div key={i} style={{
                    background: "#f7f5ff", borderRadius: 10, padding: "14px 16px",
                    display: "flex", alignItems: "flex-start", gap: 14,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: s.takeaways ? 8 : 0 }}>
                        {s.date && <span style={{ fontSize: 12, fontWeight: 600, color: "#3d3558" }}>{s.date}</span>}
                        {s.sixtyMin && <span style={{ fontSize: 11, background: "#e8f8f0", color: "#1a6e42", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>60+ min</span>}
                        {s.hasTranscript && <span style={{ fontSize: 11, background: "#e8f0ff", color: "#1a4fa8", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Transcript</span>}
                      </div>
                      {s.takeaways && <p style={{ margin: 0, fontSize: 13, color: "#3d3558", lineHeight: 1.6 }}>{s.takeaways}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MentorPortal({ mentorSlug }) {
  const [authed, setAuthed]   = useState(false);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(`mentor_auth_${mentorSlug}`)) setAuthed(true);
  }, [mentorSlug]);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch(`/api/mentor-portal-data?mentorSlug=${mentorSlug}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authed, mentorSlug]);

  if (!authed) return <PasswordGate mentorSlug={mentorSlug} onAuth={() => setAuthed(true)} />;

  const mentor  = data?.mentor;
  const mentees = data?.mentees || [];

  return (
    <>
      <Head>
        <title>{mentor ? `${mentor.name} · Mentor Portal` : "Mentor Portal"} · Uplift 2026</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
          padding: "28px 32px 36px",
        }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <img src="/uplift-logo.png" alt="Uplift" style={{ height: 32, marginBottom: 20, display: "block" }} />
            {loading ? (
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Loading…</p>
            ) : mentor ? (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                  Mentor Portal · Uplift Summer 2026
                </p>
                <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#fff" }}>
                  Welcome, {mentor.name.split(" ")[0]}
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                  {mentor.title} · {mentor.company}
                </p>
                <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                  You're mentoring {mentees.length} founder{mentees.length !== 1 ? "s" : ""} this summer. Below is their progress and what they're working on.
                </p>
              </>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9b8fcf", fontSize: 14 }}>Loading mentee data…</div>
          )}
          {!loading && mentees.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9b8fcf", fontSize: 14 }}>No mentees found.</div>
          )}
          {!loading && mentees.map(m => <MenteeCard key={m.slug} mentee={m} />)}

          {/* Footer note */}
          {!loading && mentees.length > 0 && (
            <div style={{
              background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
              padding: "20px 24px", fontSize: 13, color: "#6b6480", lineHeight: 1.7,
            }}>
              <strong style={{ color: "#3d2f8a" }}>Questions?</strong> Reach out to the Uplift team at{" "}
              <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>uplift@techunited.co</a>.
              Session data and milestones update automatically — check back here anytime to see your mentee's progress.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  return { props: { mentorSlug: params.mentor } };
}
