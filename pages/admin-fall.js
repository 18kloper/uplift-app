import { useState, useEffect, useCallback } from "react";
import Head from "next/head";


// ─── Match scoring ────────────────────────────────────────────────────────────
// Transparent heuristic, session commitment weighted heaviest: pairs only work
// when both sides expect the same amount of time together. Every suggestion
// shows its grade and reasons so the human stays the decision-maker.
const FOCUS_KEYWORDS = ["go-to-market", "customer", "pitch", "narrative", "hiring", "leadership", "fundraising", "investor", "operational", "operations", "scaling", "product", "priorities", "strategy", "sounding board", "inflection", "brand", "marketing"];
const STOPWORDS = new Set(["that", "this", "with", "have", "from", "they", "them", "will", "want", "hope", "hoping", "their", "would", "about", "more", "some", "what", "when", "your", "like", "just", "very", "into", "then", "than", "been", "being", "over", "also", "help", "make", "take"]);

function keywordsOf(list) {
  const text = (Array.isArray(list) ? list : [list]).filter(Boolean).join(" ").toLowerCase();
  return FOCUS_KEYWORDS.filter(k => text.includes(k));
}

function tierBand(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("7-10")) return 3;
  if (t.includes("4-6")) return 2;
  if (t.includes("minimum") || t.includes("3")) return 1;
  return 0;
}

function meaningfulWords(text) {
  return new Set(String(text || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter(w => w.length >= 5 && !STOPWORDS.has(w)));
}

function gradeOf(score) {
  if (score >= 11) return { label: "Perfect match", bg: "#e8f8f0", color: "#1a6e42" };
  if (score >= 8) return { label: "Excellent match", bg: "#e8f8f0", color: "#1a6e42" };
  if (score >= 6) return { label: "Strong match", bg: "#eafaf7", color: "#0e7c6b" };
  if (score >= 3) return { label: "Good match", bg: "#fffbeb", color: "#7a5c00" };
  return { label: "Weak match", bg: "#f0eef8", color: "#9b8fcf" };
}

function scoreMentor(mentee, mentor) {
  const reasons = [];
  let score = 0;

  // Session commitment: the heavy weight
  const mb = tierBand(mentee.tier);
  const rb = tierBand(mentor.tier);
  if (mb && rb) {
    if (mb === rb) { score += 4; reasons.push(`sessions aligned (both ${mb === 1 ? "3" : mb === 2 ? "4-6" : "7-10"})`); }
    else if (rb > mb) { score += 2; reasons.push("mentor offers more sessions than asked"); }
    else { score -= 2; reasons.push("⚠ mentor offers fewer sessions than requested"); }
  }

  // Focus overlap
  const menteeKw = keywordsOf([...(mentee.topics || []), mentee.primaryFocus]);
  const mentorKw = keywordsOf(mentor.focusAreas || []);
  const overlap = menteeKw.filter(k => mentorKw.includes(k));
  if (overlap.length) { score += Math.min(overlap.length, 3) * 2; reasons.push(`focus: ${overlap.join(", ")}`); }

  // Language overlap between what the founder wants and what the mentor offers
  const wants = meaningfulWords(`${mentee.hoping || ""} ${mentee.valueSought || ""}`);
  const offers = meaningfulWords(`${mentor.why || ""} ${mentor.give || ""}`);
  const shared = [...wants].filter(w => offers.has(w));
  if (shared.length >= 2) { score += 2; reasons.push(`shared language: ${shared.slice(0, 3).join(", ")}`); }
  else if (shared.length === 1) { score += 1; reasons.push(`shared language: ${shared[0]}`); }

  // Stage + schedule
  const stageWord = (mentee.stage || "").split(" ")[0].toLowerCase();
  if (stageWord && (mentor.stagePref || []).some(sp => sp.toLowerCase().includes(stageWord))) { score += 2; reasons.push("stage fit"); }
  const mTime = (mentee.timePref || []).join(" ").toLowerCase();
  const rTime = (mentor.timePref || []).join(" ").toLowerCase();
  if (rTime.includes("flexible") || ["morning", "evening", "weekend"].some(k => mTime.includes(k) && rTime.includes(k))) { score += 1; reasons.push("schedule works"); }

  return { score, reasons };
}

// ─── Fall 2026 admin ────────────────────────────────────────────────────────
// One screen, one data request. Everything below renders from a single
// /api/admin/fall-overview payload that is aggregated server-side and
// recomputed from the sources of truth on every load: no hand-set statuses,
// no per-founder fetch storms, no stale mirrors. The freshness bar at the top
// always says exactly how old the data is.

const STATUS = {
  "on-track": { label: "On Track", color: "#1a6e42", bg: "#e8f8f0", dot: "#27ae60" },
  "needs-attention": { label: "Needs Attention", color: "#b35c00", bg: "#fff3e0", dot: "#f39c12" },
  "at-risk": { label: "At Risk", color: "#c0392b", bg: "#fef0f0", dot: "#e74c3c" },
  "churned": { label: "Churned", color: "#6b6480", bg: "#f0eef8", dot: "#9b8fcf" },
};

const PULSE_COLOR = { 3: "#27ae60", 2: "#f5d97a", 1: "#e74c3c" };

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS["on-track"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 12px", background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

function GateDots({ gate }) {
  const items = [
    ["Onboarding", gate.onboarded],
    ["Quiz", gate.quizPassed],
    ["Deep Work", gate.deepWorkDone],
  ];
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {items.map(([label, done]) => (
        <span key={label} title={`${label}: ${done ? "done" : "not done"}`} style={{
          fontSize: 10.5, fontWeight: 700, borderRadius: 4, padding: "2px 7px",
          background: done ? "#e8f8f0" : "#f0eef8", color: done ? "#1a6e42" : "#9b8fcf",
        }}>
          {done ? "✓" : "○"} {label}
        </span>
      ))}
    </span>
  );
}

function PasswordGate({ onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const attempt = () => {
    if (input.trim().toLowerCase() === "admin") onAuthenticated();
    else setError(true);
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0f0729", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", width: 360, textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#1a1733" }}>Uplift Admin · Fall 2026</p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b6480" }}>Enter the admin code to continue</p>
        <input
          type="password" value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: error ? "1.5px solid #e74c3c" : "1.5px solid #e8e4f5", fontSize: 15, outline: "none", fontFamily: "inherit", marginBottom: 12 }}
        />
        <button onClick={attempt} style={{ width: "100%", border: "none", borderRadius: 8, padding: "10px 0", background: "#5c4eb5", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Enter
        </button>
      </div>
    </div>
  );
}

export default function AdminFall() {
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("today");
  const [people, setPeople] = useState(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [appFilter, setAppFilter] = useState("undecided");
  const [profile, setProfile] = useState(null); // { kind, person }
  const [todayState, setTodayState] = useState({});

  useEffect(() => {
    try { setTodayState(JSON.parse(localStorage.getItem("uplift_admin_today_v1") || "{}")); } catch (_) {}
  }, []);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    setErr(null);
    try {
      const d = await fetch(`/api/admin/fall-overview${fresh ? "?fresh=1" : ""}`).then(r => r.json());
      if (d.error) setErr(d.error);
      else setData(d);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("auth_admin_fall");
    if (stored) setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    load();
    const t = setInterval(() => load(), 60 * 1000);
    return () => clearInterval(t);
  }, [authed, load]);

  // Applications + mentor pool load lazily, the first time those tabs open
  useEffect(() => {
    if (!authed || people || peopleLoading) return;
    if (!["overview", "menteeapps", "mentorapps", "acceptedfounders", "acceptedmentors", "matching", "matched", "today", "deadlines", "reporting"].includes(tab)) return;
    setPeopleLoading(true);
    fetch("/api/admin/fall-people")
      .then(r => r.json())
      .then(d => setPeople(d))
      .catch(() => setPeople({ mentees: [], mentors: [], error: "load failed" }))
      .finally(() => setPeopleLoading(false));
  }, [authed, tab, people, peopleLoading]);

  // Session logistics (Luma) load lazily when the Sessions tab opens
  useEffect(() => {
    if (!authed || sessions || sessionsLoading) return;
    if (tab !== "sessions" && tab !== "today") return;
    setSessionsLoading(true);
    fetch("/api/admin/fall-sessions")
      .then(r => r.json())
      .then(d => setSessions(d))
      .catch(() => setSessions({ sessions: [], error: "load failed" }))
      .finally(() => setSessionsLoading(false));
  }, [authed, tab, sessions, sessionsLoading]);

  const doDecide = async (kind, applicant, decision) => {
    setMatchBusy(true);
    try {
      await fetch("/api/admin/fall-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          applicant: { id: applicant.id, name: applicant.name || `${applicant.first} ${applicant.last}`.trim(), email: applicant.email },
          decision,
        }),
      });
      const d = await fetch("/api/admin/fall-people?fresh=1").then(r => r.json());
      setPeople(d);
    } catch (_) {}
    setMatchBusy(false);
  };

  const doMatch = async (action, mentee, mentor) => {
    setMatchBusy(true);
    try {
      await fetch("/api/admin/fall-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mentee: { id: mentee.id, name: `${mentee.first} ${mentee.last}`.trim(), email: mentee.email },
          mentor: { id: mentor.id, name: mentor.name, email: mentor.email },
        }),
      });
      const d = await fetch("/api/admin/fall-people?fresh=1").then(r => r.json());
      setPeople(d);
    } catch (_) {}
    setMatchBusy(false);
  };

  if (!authed) {
    return (
      <>
        <Head>
          <title>Uplift Admin · Fall 2026</title>
          <meta name="robots" content="noindex,nofollow" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <PasswordGate onAuthenticated={() => { sessionStorage.setItem("auth_admin_fall", "1"); setAuthed(true); }} />
      </>
    );
  }

  const founders = (data?.founders || []).filter(f => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (cohortFilter !== "all" && String(f.cohort) !== cohortFilter) return false;
    if (search && !`${f.name} ${f.company}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const p = data?.program;
  const freshness = data ? Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 1000) : null;

  const isNew = (submittedAt) => submittedAt && (Date.now() - new Date(submittedAt).getTime()) < 7 * 24 * 3600 * 1000;
  const needsSessionInfo = (sess) => !sess.lumaName || /educational session|uplift session|tbd|placeholder/i.test(sess.lumaName);
  const card = { background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 16 };
  const kicker = { margin: "0 0 12px", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5c4eb5" };

  return (
    <>
      <Head>
        <title>Uplift Admin · Fall 2026</title>
        <meta name="robots" content="noindex,nofollow" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif", color: "#1a1733" }}>

        {profile && (
          <div onClick={() => setProfile(null)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(16,9,45,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(560px, 96vw)", maxHeight: "90vh", overflowY: "auto", padding: "26px 28px", fontFamily: "'Inter', system-ui, sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
                    {profile.kind === "mentee" ? `${profile.person.first} ${profile.person.last}` : profile.person.name}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b6480" }}>
                    {[profile.person.company, profile.person.title].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button onClick={() => setProfile(null)} style={{ border: "none", background: "#f0ecff", color: "#5c4eb5", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
              </div>
              {profile.kind === "mentee" ? (
                <>
                  {profile.person.bio && <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#55506e", fontStyle: "italic" }}>&ldquo;{profile.person.bio}&rdquo;</p>}
                  <div style={{ border: "1px solid #e8e4f5", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
                    {[["Stage", profile.person.stage], ["Industry", profile.person.industry],
                      ["Revenue", profile.person.snapshot?.revenueRange], ["Raising", profile.person.snapshot?.raising],
                      ["Hiring", profile.person.snapshot?.hiring],
                      ["Looking for customers", profile.person.snapshot?.lookingForCustomers === true ? "Yes" : profile.person.snapshot?.lookingForCustomers === false ? "No" : profile.person.snapshot?.lookingForCustomers],
                      ["Sessions requested", profile.person.tier], ["County", profile.person.county],
                    ].filter(([, v]) => v != null && v !== "").map(([l, v], i) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 14px", borderTop: i > 0 ? "1px solid #f0edf9" : "none", background: i % 2 ? "#fafafa" : "#fff" }}>
                        <span style={{ fontSize: 12.5, color: "#6b6480" }}>{l}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  {profile.person.hoping && <><p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5c4eb5" }}>Hoping to accomplish</p><p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{profile.person.hoping}</p></>}
                  {profile.person.valueSought && <><p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#a37c1f" }}>What they want from mentorship</p><p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{profile.person.valueSought}</p></>}
                  {profile.person.brings && <><p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#1a6e42" }}>What they bring</p><p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{profile.person.brings}</p></>}
                </>
              ) : (
                <>
                  <div style={{ border: "1px solid #e8e4f5", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
                    {[["Focus areas", (profile.person.focusAreas || []).join(", ")], ["Sessions offered", profile.person.tier],
                      ["Stage preference", (profile.person.stagePref || []).join(", ")], ["Schedule", (profile.person.timePref || []).join(", ")],
                      ["Based", profile.person.based], ["Mentees", (profile.person.assignedTo || []).join(", ") || "none yet"],
                    ].filter(([, v]) => v).map(([l, v], i) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 14px", borderTop: i > 0 ? "1px solid #f0edf9" : "none", background: i % 2 ? "#fafafa" : "#fff" }}>
                        <span style={{ fontSize: 12.5, color: "#6b6480", flexShrink: 0 }}>{l}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  {profile.person.give && <><p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#1a6e42" }}>Give</p><p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{profile.person.give}</p></>}
                  {profile.person.getOut && <><p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#a37c1f" }}>Get</p><p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{profile.person.getOut}</p></>}
                  {profile.person.why && <><p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#5c4eb5" }}>Why they're mentoring</p><p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{profile.person.why}</p></>}
                </>
              )}
            </div>
          </div>
        )}

        {/* Header + freshness */}
        <div style={{ background: "#0f0729", color: "#fff", padding: "18px 28px", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1560, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Uplift Admin · Fall 2026</p>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>One request, computed live from the sources of truth. Nothing here is hand-set.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {data && (
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  Data as of {new Date(data.generatedAt).toLocaleTimeString()} ({freshness}s ago{data.cached ? ", cached" : ""})
                </span>
              )}
              <button onClick={() => load(true)} disabled={loading} style={{ border: "none", borderRadius: 8, padding: "8px 16px", background: "#5c4eb5", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Refreshing…" : "↻ Refresh now"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderBottom: "1px solid #e8e4f5" }}>
          <div style={{ maxWidth: 1560, margin: "0 auto", padding: "0 28px", display: "flex", gap: 4 }}>
            {[["today", "📋 Today"], ["overview", "Overview"], ["founders", "Roster"], ["menteeapps", "Mentee Apps"], ["mentorapps", "Mentor Apps"], ["acceptedfounders", "Accepted Founders"], ["acceptedmentors", "Accepted Mentors"], ["matching", "Matching"], ["matched", "Matched"], ["deadlines", "\u23F1 Deadlines"], ["reporting", "\ud83d\udcca Reporting"], ["sessions", "Sessions"], ["pulse", "Pulse & Wins"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                border: "none", background: "none", padding: "12px 16px 10px",
                borderBottom: tab === id ? "3px solid #5c4eb5" : "3px solid transparent",
                color: tab === id ? "#3d2f8a" : "#9b8fcf",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
                {label}
                {id === "menteeapps" && people ? ` (${people.menteeCount})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1560, margin: "0 auto", padding: "24px 28px 80px" }}>
          {err && (
            <div style={{ ...card, borderLeft: "4px solid #e74c3c" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#c0392b", fontWeight: 600 }}>Data load failed: {err}</p>
            </div>
          )}

          {tab === "overview" && (<>
          {/* Pre-program goals: 100 applications each by Sept 3, 80 qualified */}
          <div style={{ ...card, borderLeft: "4px solid #5c4eb5" }}>
            <p style={kicker}>Pre-Program Goals · due Sept 3 · {Math.max(0, Math.ceil((new Date("2026-09-03") - new Date()) / 86400000))} days left</p>
            {!people && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Loading application counts…</p>}
            {people && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  ["Mentee applications", people.menteeCount, 100],
                  ["Mentees meeting requirements", people.mentees.filter(a => a.meetsRequirements).length, 80],
                  ["Mentor applications", people.mentorCount, 100],
                  ["Mentors approved", people.mentors.filter(m2 => m2.decision === "approved").length, 80],
                ].map(([label, val, goal]) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#37324e" }}>{label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: val >= goal ? "#1a6e42" : "#5c4eb5" }}>{val}/{goal}</span>
                    </div>
                    <div style={{ height: 8, background: "#f0ecff", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Math.round((val / goal) * 100))}%`, background: val >= goal ? "#27ae60" : "linear-gradient(90deg, #5c4eb5, #9b8fcf)", borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Program health */}
          <div style={card}>
            <p style={kicker}>Program Health</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              {p && [
                ["Founders", p.total, "#5c4eb5"],
                ["On Track", p.onTrack, "#1a6e42"],
                ["Needs Attention", p.attention, "#b35c00"],
                ["At Risk", p.atRisk, "#c0392b"],
                ["Week 1 Gate Done", p.gateComplete, "#3d2f8a"],
                ["Avg Meetings", p.avgMeetings, "#5c4eb5"],
                ["Avg Edu Sessions", p.avgEdu, "#5c4eb5"],
                ["Churned", data.churned, "#6b6480"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#fafafa", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "#6b6480" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cohort health */}
          <div style={card}>
            <p style={kicker}>Cohort Health</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {data && Object.entries(data.cohortHealth).sort(([a], [b]) => a - b).map(([c, h]) => (
                <div key={c} style={{ border: "1px solid #e8e4f5", borderRadius: 10, padding: "12px 16px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "#3d2f8a" }}>Cohort {c}</p>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#37324e", lineHeight: 1.7 }}>
                    {h.total} founders · 🟢 {h.onTrack} · 🟡 {h.attention} · 🔴 {h.atRisk}<br />
                    Gate done: {h.gateComplete}/{h.total} · Avg meetings {h.avgMeetings} · Avg edu {h.avgEdu}
                  </p>
                </div>
              ))}
              {data && Object.keys(data.cohortHealth).length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No active founders yet.</p>
              )}
            </div>
          </div>

          </>)}

          {tab === "founders" && (<>
          {/* Founders */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <p style={{ ...kicker, margin: 0 }}>Founders ({founders.length})</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["all", "on-track", "needs-attention", "at-risk", "churned"].map(sf => (
                  <button key={sf} onClick={() => setStatusFilter(sf)} style={{
                    border: "1px solid #e8e4f5", borderRadius: 20, padding: "4px 12px",
                    background: statusFilter === sf ? "#5c4eb5" : "#fff",
                    color: statusFilter === sf ? "#fff" : "#6b6480",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {sf === "all" ? "All" : STATUS[sf].label}
                  </button>
                ))}
                <input
                  value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{ border: "1px solid #e8e4f5", borderRadius: 20, padding: "4px 14px", fontSize: 12.5, outline: "none", fontFamily: "inherit", width: 140 }}
                />
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {["Founder", "Status", "Week 1 Gate", "Meetings", "Edu", "Pulse", "Last Active", "Flags"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {founders.map(f => (
                    <tr key={f.slug} style={{ borderBottom: "1px solid #f0edf9", verticalAlign: "top" }}>
                      <td style={{ padding: "10px" }}>
                        <a href={`/fall/${f.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: "#3d2f8a", textDecoration: "none" }}>{f.name}</a>
                        <div style={{ fontSize: 11.5, color: "#9b8fcf" }}>{f.company} · Cohort {f.cohort}{f.mentor ? ` · ${f.mentor}` : ""}</div>
                      </td>
                      <td style={{ padding: "10px" }}><StatusChip status={f.status} /></td>
                      <td style={{ padding: "10px" }}><GateDots gate={f.gate} /></td>
                      <td style={{ padding: "10px", fontWeight: 700, color: f.meetingCount >= 3 ? "#1a6e42" : "#1a1733" }}>{f.meetingCount}/3</td>
                      <td style={{ padding: "10px", fontWeight: 700, color: f.eduCount >= 3 ? "#1a6e42" : "#1a1733" }}>{f.eduCount}/3</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ display: "inline-flex", gap: 3 }}>
                          {(data?.pulseWeeks || []).map(w => (
                            <span key={w} title={`Week ${w}`} style={{
                              width: 12, height: 12, borderRadius: 3,
                              background: f.pulse[w] ? PULSE_COLOR[f.pulse[w]] || "#c8bfef" : "#f0eef8",
                              border: f.pulse[w] ? "none" : "1px dashed #d4d0e8",
                            }} />
                          ))}
                        </span>
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#6b6480", whiteSpace: "nowrap" }}>
                        {f.lastActive ? new Date(f.lastActive).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#b35c00", maxWidth: 260 }}>
                        {f.flags.length ? f.flags.join(" · ") : <span style={{ color: "#c8bfef" }}>none</span>}
                      </td>
                    </tr>
                  ))}
                  {founders.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#9b8fcf" }}>No founders match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          </>)}

          {tab === "pulse" && (<>
          {/* Pulse grid */}
          <div style={card}>
            <p style={kicker}>Pulse Grid · 🟢 A-okay · 🟡 check in · 🔴 not going as planned · dashed = missed</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 6, fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, paddingRight: 10 }}>Founder</th>
                    {(data?.pulseWeeks || []).map(w => <th key={w} style={{ color: "#9b8fcf", fontSize: 10, fontWeight: 800 }}>W{w}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(data?.founders || []).map(f => (
                    <tr key={f.slug}>
                      <td style={{ fontWeight: 700, paddingRight: 10, whiteSpace: "nowrap" }}>{f.name}</td>
                      {(data?.pulseWeeks || []).map(w => (
                        <td key={w}>
                          <span title={`Week ${w}`} style={{
                            display: "block", width: 24, height: 24, borderRadius: 6,
                            background: f.pulse[w] ? PULSE_COLOR[f.pulse[w]] || "#c8bfef" : "#f7f5ff",
                            border: f.pulse[w] ? "none" : "1.5px dashed #d4d0e8",
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wins feed */}
          <div style={card}>
            <p style={kicker}>🏆 Wins Feed · for the Tuesday update</p>
            {(data?.wins || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No wins submitted yet.</p>}
            {(data?.wins || []).map((w, i) => (
              <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid #f0edf9" : "none" }}>
                <p style={{ margin: 0, fontSize: 13.5, color: "#1a1733", lineHeight: 1.6 }}>
                  <strong>{w.name}</strong> ({w.company}) · Week {w.week}: &ldquo;{w.value}&rdquo;
                </p>
              </div>
            ))}
            {(data?.wins || []).length > 0 && (
              <button
                onClick={() => navigator.clipboard.writeText(data.wins.map(w => `🏆 ${w.name} (${w.company}): ${w.value}`).join("\n"))}
                style={{ marginTop: 12, border: "1px solid #5c4eb5", borderRadius: 8, padding: "7px 16px", background: "#fff", color: "#5c4eb5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Copy all for Tuesday update
              </button>
            )}
          </div>

          <p style={{ fontSize: 11.5, color: "#9b8fcf", lineHeight: 1.6 }}>
            Roster is the fall test slugs until the application ingest lands. Deadlines are program-level dates; per-match rolling clocks arrive with the ingest build. Auto-refreshes every 60 seconds.
          </p>
          </>)}

          {tab === "acceptedfounders" && people && (
            <div style={card}>
              <p style={kicker}>Accepted Founders · {people.mentees.filter(a => a.decision === "approved").length}</p>
              {people.mentees.filter(a => a.decision === "approved").map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f0edf9", flexWrap: "wrap" }}>
                  <button onClick={() => setProfile({ kind: "mentee", person: a })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#3d2f8a", fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{a.first} {a.last}</button>
                  <span style={{ fontSize: 12.5, color: "#9b8fcf" }}>{a.company || "no company"} · {a.tier?.startsWith("Minimum") ? "3 sessions" : a.tier || ""}</span>
                  {a.matchedMentorName
                    ? <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px" }}>MATCHED → {a.matchedMentorName}</span>
                    : <span style={{ fontSize: 11, fontWeight: 800, background: "#fffbeb", color: "#7a5c00", borderRadius: 4, padding: "2px 8px" }}>IN MATCHING QUEUE</span>}
                </div>
              ))}
              {people.mentees.filter(a => a.decision === "approved").length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No approved founders yet. Approve them on the Mentee Apps tab.</p>}
            </div>
          )}

          {tab === "acceptedmentors" && people && (
            <div style={card}>
              <p style={kicker}>Accepted Mentors · {people.mentors.filter(m2 => m2.decision === "approved").length}</p>
              {people.mentors.filter(m2 => m2.decision === "approved").map(m2 => (
                <div key={m2.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f0edf9", flexWrap: "wrap" }}>
                  <button onClick={() => setProfile({ kind: "mentor", person: m2 })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#3d2f8a", fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{m2.name}</button>
                  <span style={{ fontSize: 12.5, color: "#9b8fcf" }}>{[m2.company, m2.tier].filter(Boolean).join(" · ")}</span>
                  {m2.assignedTo.length > 0
                    ? <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px" }}>{m2.assignedTo.length} MENTEE{m2.assignedTo.length > 1 ? "S" : ""}: {m2.assignedTo.join(", ")}</span>
                    : <span style={{ fontSize: 11, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "2px 8px" }}>AVAILABLE</span>}
                </div>
              ))}
              {people.mentors.filter(m2 => m2.decision === "approved").length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No approved mentors yet. Approve them on the Mentor Apps tab.</p>}
            </div>
          )}

          {tab === "matched" && people && (() => {
            const matchedMentees = people.mentees.filter(a => a.matchedMentorId);
            const betterFor = (a) => {
              const current = people.mentors.find(mt => mt.id === a.matchedMentorId);
              if (!current) return null;
              const currentScore = scoreMentor(a, current).score;
              const best = people.mentors.filter(mt => mt.id !== a.matchedMentorId)
                .map(mt => ({ mt, sc: scoreMentor(a, mt).score }))
                .sort((x, y) => y.sc - x.sc)[0];
              return best && best.sc > currentScore ? { name: best.mt.name, score: best.sc, currentScore } : null;
            };
            return (
              <div style={card}>
                <p style={kicker}>Finalized Matches · {matchedMentees.length}</p>
                {matchedMentees.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No matches yet. Make them on the Matching tab; pairs land here to track.</p>}
                {matchedMentees.map(a => {
                  const better = betterFor(a);
                  const current = people.mentors.find(mt => mt.id === a.matchedMentorId);
                  const grade = current ? gradeOf(scoreMentor(a, current).score) : null;
                  const roster = (data?.founders || []).find(f => f.name.toLowerCase() === `${a.first} ${a.last}`.toLowerCase());
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f0edf9", flexWrap: "wrap" }}>
                      <button onClick={() => setProfile({ kind: "mentee", person: a })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#1a1733", fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{a.first} {a.last}</button>
                      <span style={{ color: "#9b8fcf" }}>→</span>
                      <span style={{ fontWeight: 700, color: "#1a6e42" }}>{a.matchedMentorName}</span>
                      {grade && <span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 4, padding: "2px 8px", background: grade.bg, color: grade.color }}>{grade.label}</span>}
                      <span style={{ fontSize: 11.5, color: "#9b8fcf" }}>{a.matchedAt?.slice(0, 10)}</span>
                      {roster && <span style={{ fontSize: 11, color: "#6b6480" }}>portal: {roster.gateComplete ? "gate done ✓" : "gate incomplete"} · {roster.meetingCount}/3 meetings</span>}
                      {better && <span style={{ fontSize: 11, fontWeight: 700, background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "2px 8px" }}>⬆ Better fit: {better.name} ({better.score} vs {better.currentScore})</span>}
                      <button disabled={matchBusy} onClick={() => doMatch("unmatch", a, { id: a.matchedMentorId, name: a.matchedMentorName, email: "" })} style={{ marginLeft: "auto", border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 10px", background: "#fff", color: "#c0392b", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Unmatch</button>
                    </div>
                  );
                })}
                <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                  Once matched, pairs track here: portal gate progress and meeting counts cross-reference automatically for roster founders. Better-fit flags appear when a stronger mentor enters the pool.
                </p>
              </div>
            );
          })()}

          {tab === "deadlines" && people && data && (() => {
            // Rolling per-match meeting clocks. M1 is due 7 days after the
            // match, M2 is due 10 days after the first submitted meeting, M3 is
            // the program-wide Oct 23 hard deadline. Same rulebook the portal
            // and Ulrike quote.
            const DAY = 86400000;
            const M3_DUE = new Date("2026-10-23T23:59:59");
            const fmt = d => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
            const clock = (due, met) => {
              if (met) return { label: "✓ done", bg: "#e8f8f0", fg: "#1a6e42" };
              if (!due) return { label: "—", bg: "#f6f4fc", fg: "#9b8fcf" };
              const days = Math.ceil((due - Date.now()) / DAY);
              if (days < 0) return { label: `${-days}d overdue`, bg: "#fdecec", fg: "#c0392b" };
              if (days <= 3) return { label: `${days}d left`, bg: "#fef7e8", fg: "#9a6200" };
              return { label: `${days}d left`, bg: "#f6f4fc", fg: "#5c4eb5" };
            };
            const rows = data.founders.filter(f => f.status !== "churned").map(f => {
              const app = people.mentees.find(a => a.inRoster === f.slug);
              const matchedAt = app?.matchedAt ? new Date(app.matchedAt) : null;
              const log = f.meetingLog || [];
              const m1Due = matchedAt ? new Date(matchedAt.getTime() + 7 * DAY) : null;
              const m2Due = log[0] ? new Date(new Date(log[0].submittedAt).getTime() + 10 * DAY) : null;
              return {
                f, matchedAt,
                m1: { due: m1Due, ...clock(m1Due, f.meetingCount >= 1) },
                m2: { due: m2Due, ...clock(m2Due, f.meetingCount >= 2) },
                m3: { due: M3_DUE, ...clock(M3_DUE, f.meetingCount >= 3) },
              };
            });
            const pill = c => (
              <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 5, padding: "3px 8px", background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>{c.label}</span>
            );
            return (
              <div style={card}>
                <p style={kicker}>Meeting clocks · M1 within 7 days of match · M2 within 10 days of M1 · M3 by Oct 23 (hard)</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {["Founder", "Matched", "M1 · Discover", "M2 · Act", "M3 · Roadmap", "Minutes"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ f, matchedAt, m1, m2, m3 }) => (
                        <tr key={f.slug} style={{ borderBottom: "1px solid #f0edf9" }}>
                          <td style={{ padding: "10px", fontWeight: 700, color: "#3d2f8a" }}>{f.name}<div style={{ fontSize: 11.5, fontWeight: 400, color: "#9b8fcf" }}>{f.company}</div></td>
                          <td style={{ padding: "10px", fontSize: 12, whiteSpace: "nowrap" }}>{matchedAt ? `${fmt(matchedAt)} · ${f.mentor || ""}` : "not matched"}</td>
                          <td style={{ padding: "10px" }}>{pill(m1)}<div style={{ fontSize: 11, color: "#9b8fcf", marginTop: 2 }}>due {fmt(m1.due)}</div></td>
                          <td style={{ padding: "10px" }}>{pill(m2)}<div style={{ fontSize: 11, color: "#9b8fcf", marginTop: 2 }}>{m2.due ? `due ${fmt(m2.due)}` : "after M1"}</div></td>
                          <td style={{ padding: "10px" }}>{pill(m3)}<div style={{ fontSize: 11, color: "#9b8fcf", marginTop: 2 }}>due Oct 23</div></td>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 800, color: f.meetingMinutes >= 180 ? "#1a6e42" : "#3d2f8a" }}>{f.meetingMinutes || 0}</span>
                            <span style={{ color: "#9b8fcf" }}> / 180 min</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                  Clocks start from the FallMatches timestamp and each founder's submitted meetings. Requirement: 3+ meetings and 180+ minutes.
                </p>
              </div>
            );
          })()}

          {tab === "reporting" && people && data && (() => {
            // Grant-ready evidence table: the same numbers the NJEDA reporting
            // pipeline needs, per founder, exportable as CSV. "midpoint" is the
            // fall in-person milestone (OverdriveAI) and "summit" is the signed
            // BreezeDoc verification, both reusing summer sheet columns.
            const rows = data.founders.filter(f => f.status !== "churned").map(f => {
              const ms = f.milestones || {};
              const verifiedSessions = ["mentorSession1", "mentorSession2", "mentorSession3"].filter(k => ms[k]).length;
              const complete = ms.participation && ms.onboarding && f.gate?.quizPassed && verifiedSessions >= 3 &&
                f.meetingMinutes >= 180 && f.eduCount >= 3 && ms.midpoint && ms.endSurvey && ms.summit;
              return { f, ms, verifiedSessions, complete };
            });
            const csv = () => {
              const header = ["Founder", "Company", "Participation", "Onboarding", "Quiz", "Meetings Submitted", "Minutes Submitted", "Sessions Verified", "Edu Sessions", "OverdriveAI", "Exit Survey", "Signature Signed", "Certificate", "Complete"];
              const lines = rows.map(({ f, ms, verifiedSessions, complete }) => [
                f.name, f.company, ms.participation, ms.onboarding, !!f.gate?.quizPassed, f.meetingCount,
                f.meetingMinutes || 0, verifiedSessions, f.eduCount, !!ms.midpoint, !!ms.endSurvey, !!ms.summit, !!ms.certificate, !!complete,
              ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
              const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `uplift-fall2026-reporting-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            };
            const yn = v => (
              <span style={{ fontSize: 12, fontWeight: 800, color: v ? "#1a6e42" : "#c9c3e0" }}>{v ? "✓" : "—"}</span>
            );
            return (
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ ...kicker, margin: 0 }}>Completion evidence · the numbers grant reporting runs on · verified beats submitted</p>
                  <button onClick={csv} style={{ border: "none", borderRadius: 8, padding: "7px 14px", background: "#5c4eb5", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>⬇ Export CSV</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {["Founder", "Part.", "Onboard", "Quiz", "Meetings", "Verified", "Edu", "OverdriveAI", "Survey", "Signed", "Cert", "Complete"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ f, ms, verifiedSessions, complete }) => (
                        <tr key={f.slug} style={{ borderBottom: "1px solid #f0edf9" }}>
                          <td style={{ padding: "10px", fontWeight: 700, color: "#3d2f8a", whiteSpace: "nowrap" }}>{f.name}<div style={{ fontSize: 11.5, fontWeight: 400, color: "#9b8fcf" }}>{f.company}</div></td>
                          <td style={{ padding: "10px" }}>{yn(ms.participation)}</td>
                          <td style={{ padding: "10px" }}>{yn(ms.onboarding)}</td>
                          <td style={{ padding: "10px" }}>{yn(f.gate?.quizPassed)}</td>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>{f.meetingCount} · {f.meetingMinutes || 0}m</td>
                          <td style={{ padding: "10px", fontWeight: 800, color: verifiedSessions >= 3 ? "#1a6e42" : "#3d2f8a" }}>{verifiedSessions}/3</td>
                          <td style={{ padding: "10px", fontWeight: 800, color: f.eduCount >= 3 ? "#1a6e42" : "#3d2f8a" }}>{f.eduCount}/3</td>
                          <td style={{ padding: "10px" }}>{yn(ms.midpoint)}</td>
                          <td style={{ padding: "10px" }}>{yn(ms.endSurvey)}</td>
                          <td style={{ padding: "10px" }}>{yn(ms.summit)}</td>
                          <td style={{ padding: "10px" }}>{yn(ms.certificate)}</td>
                          <td style={{ padding: "10px" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 5, padding: "3px 8px", background: complete ? "#e8f8f0" : "#f6f4fc", color: complete ? "#1a6e42" : "#9b8fcf" }}>
                              {complete ? "COMPLETE" : "IN PROGRESS"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                  Verified = human-checked milestone columns in the sheet. Meetings/minutes = submitted to the Typeform. Certificates issue Nov 7–20 as founders complete.
                </p>
              </div>
            );
          })()}

          {tab === "sessions" && (
            <div style={card}>
              <p style={kicker}>Educational Sessions · Luma sync</p>
              {sessionsLoading && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Syncing with Luma…</p>}
              {sessions?.error && <p style={{ margin: 0, fontSize: 13, color: "#c0392b" }}>{sessions.error}</p>}
              {sessions?.totals && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    ["On Luma", `${sessions.totals.eduBooked}/${sessions.totals.eduTotal}`, "#1a6e42"],
                    ["Total Registrations", sessions.totals.totalRegistrations, "#5c4eb5"],
                    ["Need Speaker / Title", `${sessions.sessions.filter(needsSessionInfo).length}/${sessions.totals.eduTotal}`, "#c0392b"],
                    ["Onboarding Slots w/ Luma", `${sessions.totals.onboardingWithLuma}/${sessions.totals.onboardingSlots}`, "#b35c00"],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: "#fafafa", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color }}>{value}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "#6b6480" }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {sessions?.sessions?.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {["#", "When", "On Luma", "Event Name", "Registered", "Link"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.sessions.map(sess => (
                        <tr key={sess.n} style={{ borderBottom: "1px solid #f0edf9" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 800, color: "#3d2f8a" }}>{sess.n}</td>
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{sess.day} · {sess.time}</td>
                          <td style={{ padding: "9px 10px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 8px", background: sess.onLuma ? "#e8f8f0" : "#fff5f5", color: sess.onLuma ? "#1a6e42" : "#b32424" }}>
                              {sess.onLuma ? "✓ Live" : "Missing"}
                            </span>
                          </td>
                          <td style={{ padding: "9px 10px", fontSize: 12.5, maxWidth: 280 }}>
                            {sess.lumaName || <span style={{ color: "#c8bfef" }}>untitled</span>}
                            {needsSessionInfo(sess) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "1px 6px" }}>NEEDS SPEAKER / TITLE</span>}
                          </td>
                          <td style={{ padding: "9px 10px", fontWeight: 700 }}>{sess.registered ?? "—"}</td>
                          <td style={{ padding: "9px 10px" }}><a href={sess.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#5c4eb5", fontWeight: 600 }}>Luma →</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                Registration counts sync from Luma every 5 minutes. Onboarding slot links and Uplift at OverdriveAI appear here once their Luma events exist.
              </p>
            </div>
          )}

          {tab === "today" && (() => {
            const todo = [];
            const fs = data?.founders || [];
            const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
            const freshOf = (list) => (list || []).filter(a => a.submittedAt && new Date(a.submittedAt).getTime() > weekAgo);
            const newMenteeApps = freshOf(people?.mentees).filter(a => !a.inRoster);
            const newMentorApps = freshOf(people?.mentors);
            if (newMenteeApps.length) todo.push({ icon: "📥", level: "info", text: `${newMenteeApps.length} new mentee application${newMenteeApps.length === 1 ? "" : "s"} this week awaiting a roster decision`, sub: newMenteeApps.slice(0, 6).map(a => `${a.first} ${a.last} (${a.company || "no company"})`).join(" · ") + (newMenteeApps.length > 6 ? ` · +${newMenteeApps.length - 6} more` : ""), go: "applications" });
            if (newMentorApps.length) todo.push({ icon: "🧑‍🏫", level: "info", text: `${newMentorApps.length} new mentor application${newMentorApps.length === 1 ? "" : "s"} this week to review for the pool`, sub: newMentorApps.slice(0, 6).map(m => `${m.name} (${m.company || "no company"})`).join(" · "), go: "applications" });
            fs.filter(f => f.status === "at-risk").forEach(f => todo.push({ icon: "🚨", level: "risk", text: `${f.name} is at risk`, sub: f.flags.join(" · "), go: "founders" }));
            fs.filter(f => f.status === "needs-attention").forEach(f => todo.push({ icon: "⚠️", level: "warn", text: `${f.name} needs attention`, sub: f.flags.join(" · "), go: "founders" }));
            fs.filter(f => !f.mentor && f.status !== "churned").forEach(f => todo.push({ icon: "🤝", level: "warn", text: `Match ${f.name} with a mentor`, sub: `${f.company} · primary focus in their application`, go: "matching" }));
            (people?.mentees || []).filter(a => a.matchedMentorId).forEach(a => {
              const current = (people?.mentors || []).find(mt => mt.id === a.matchedMentorId);
              if (!current) return;
              const cs = scoreMentor(a, current).score;
              const best = (people?.mentors || []).filter(mt => mt.id !== a.matchedMentorId).map(mt => ({ mt, sc: scoreMentor(a, mt).score })).sort((x, y) => y.sc - x.sc)[0];
              if (best && best.sc > cs) todo.push({ icon: "⬆", level: "info", text: `A stronger mentor fit is available for ${a.first} ${a.last}`, sub: `${best.mt.name} scores ${best.sc} vs current ${cs}`, go: "matching" });
            });
            fs.filter(f => f.mentor && !f.gateComplete && f.status === "on-track").forEach(f => {
              const missing = [!f.gate.onboarded && "onboarding", !f.gate.quizPassed && "quiz", !f.gate.deepWorkDone && "Deep Work"].filter(Boolean).join(", ");
              todo.push({ icon: "🔓", level: "info", text: `${f.name}'s mentor reveal is waiting on their Week 1 gate`, sub: `Missing: ${missing}`, go: "founders" });
            });
            if (people) {
              const daysLeft = Math.max(0, Math.ceil((new Date("2026-09-03") - new Date()) / 86400000));
              if (people.menteeCount < 100) todo.push({ icon: "🎯", level: daysLeft <= 4 ? "warn" : "info", text: `${100 - people.menteeCount} more mentee applications needed by Sept 3 (${daysLeft} days left)`, sub: `${people.menteeCount}/100 received · ${people.mentees.filter(a => a.meetsRequirements).length}/80 meet requirements`, go: "overview" });
              if (people.mentorCount < 100) todo.push({ icon: "🎯", level: daysLeft <= 4 ? "warn" : "info", text: `${100 - people.mentorCount} more mentor applications needed by Sept 3 (${daysLeft} days left)`, sub: `${people.mentorCount}/100 received`, go: "overview" });
            }
            if (sessions?.sessions) {
              const noInfo = sessions.sessions.filter(needsSessionInfo).length;
              if (noInfo > 0) todo.push({ icon: "🎙", level: "warn", text: `${noInfo} of ${sessions.sessions.length} educational sessions need a speaker, title, and description`, sub: "Luma events exist but are unnamed shells", go: "sessions" });
            }
            if (sessions?.totals) {
              const missing = sessions.totals.eduTotal - sessions.totals.eduBooked;
              if (missing > 0) todo.push({ icon: "📅", level: "warn", text: `${missing} of ${sessions.totals.eduTotal} educational sessions missing on Luma`, sub: "Check the Sessions tab for which ones", go: "sessions" });
              if (sessions.totals.onboardingWithLuma < sessions.totals.onboardingSlots) todo.push({ icon: "🗓", level: "warn", text: `Create Luma events for the ${sessions.totals.onboardingSlots - sessions.totals.onboardingWithLuma} onboarding slots`, sub: "Sept 9-11 · links then land in the portal automatically", go: "sessions" });
            }
            const winCount = (data?.wins || []).length;
            if (winCount) todo.push({ icon: "🏆", level: "info", text: `${winCount} win${winCount === 1 ? "" : "s"} ready for Tuesday's update`, sub: "Copy the batch from Pulse & Wins", go: "pulse" });
            const levelStyle = { risk: "#c0392b", warn: "#b35c00", info: "#3d2f8a" };
            // Track first-seen dates + check-offs (persisted locally)
            const dayKey = (d) => d.toISOString().slice(0, 10);
            const today = dayKey(new Date());
            const state = { ...todayState };
            let stateChanged = false;
            for (const item of todo) {
              const k = item.text;
              if (!state[k]) { state[k] = { firstSeen: today }; stateChanged = true; }
            }
            if (stateChanged) {
              localStorage.setItem("uplift_admin_today_v1", JSON.stringify(state));
              setTimeout(() => setTodayState(state), 0);
            }
            const ageOf = (k) => {
              const first = state[k]?.firstSeen || today;
              const days = Math.round((new Date(today) - new Date(first)) / 86400000);
              if (days <= 0) return { label: "Today", bg: "#f5f3ff", color: "#5c4eb5" };
              if (days === 1) return { label: "Yesterday", bg: "#fffbeb", color: "#7a5c00" };
              return { label: `${days} days overdue`, bg: "#fef0f0", color: "#c0392b" };
            };
            const toggleDone = (k) => {
              const next = { ...state, [k]: { ...state[k], doneAt: state[k]?.doneAt ? null : new Date().toISOString() } };
              localStorage.setItem("uplift_admin_today_v1", JSON.stringify(next));
              setTodayState(next);
            };
            // Urgency sort: at-risk items first, then warnings, then info;
            // within a level, whatever has been sitting longest rises.
            const LEVEL_RANK = { risk: 0, warn: 1, info: 2 };
            const ageDays = (k) => Math.round((new Date(today) - new Date(state[k]?.firstSeen || today)) / 86400000);
            const byUrgency = (a, b) => (LEVEL_RANK[a.level] - LEVEL_RANK[b.level]) || (ageDays(b.text) - ageDays(a.text));
            const open = todo.filter(i => !state[i.text]?.doneAt).sort(byUrgency);
            const done = todo.filter(i => state[i.text]?.doneAt);
            const Row = ({ item }) => {
              const checked = !!state[item.text]?.doneAt;
              const age = ageOf(item.text);
              return (
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid #f0edf9" }}>
                  <button onClick={() => toggleDone(item.text)} style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, cursor: "pointer",
                    border: checked ? "none" : "2px solid #c8bfef",
                    background: checked ? "#22a366" : "#fff", color: "#fff", fontSize: 12, fontWeight: 800,
                  }}>{checked ? "✓" : ""}</button>
                  <span style={{ fontSize: 18, flexShrink: 0, opacity: checked ? 0.5 : 1 }}>{item.icon}</span>
                  <div style={{ flex: 1, opacity: checked ? 0.55 : 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: levelStyle[item.level], textDecoration: checked ? "line-through" : "none" }}>{item.text}</p>
                    {item.sub && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#6b6480", lineHeight: 1.5 }}>{item.sub}</p>}
                  </div>
                  {!checked && <span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 4, padding: "3px 8px", background: age.bg, color: age.color, flexShrink: 0, whiteSpace: "nowrap" }}>{age.label}</span>}
                  <button onClick={() => setTab(item.go)} style={{ border: "none", background: "none", fontSize: 12, color: "#9b8fcf", flexShrink: 0, marginTop: 3, cursor: "pointer", fontFamily: "inherit" }}>→</button>
                </div>
              );
            };
            return (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <p style={kicker}>What needs you today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                  <span style={{ fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>Sorted by urgency: 🚨 risk, then ⚠️ warnings, then info; oldest first within each.</span>
                </div>
                {peopleLoading && <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#9b8fcf" }}>Checking applications…</p>}
                {open.length === 0 && <p style={{ margin: 0, fontSize: 14, color: "#1a6e42", fontWeight: 600 }}>🎉 All clear. Nothing is waiting on you right now.</p>}
                {open.map((item) => <Row key={item.text} item={item} />)}
                {done.length > 0 && (
                  <>
                    <p style={{ ...kicker, marginTop: 20 }}>Completed</p>
                    {done.map((item) => <Row key={item.text} item={item} />)}
                  </>
                )}
              </div>
            );
          })()}

          {(tab === "applications" || tab === "matching") && peopleLoading && (
            <div style={card}><p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Loading applications from Typeform…</p></div>
          )}

          {tab === "menteeapps" && people && (
            <div style={card}>
              <p style={kicker}>Mentee Applications · {people.menteeCount} received · live from the original Typeform</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {[["undecided", "Undecided"], ["approved", "Approved"], ["rejected", "Rejected"], ["noreqs", "Doesn't meet reqs"], ["test", "Test accounts"], ["all", "All"]].map(([id, label]) => (
                  <button key={id} onClick={() => setAppFilter(id)} style={{
                    border: "1px solid #e8e4f5", borderRadius: 20, padding: "4px 12px",
                    background: appFilter === id ? "#5c4eb5" : "#fff",
                    color: appFilter === id ? "#fff" : "#6b6480",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {["Applicant", "Decision", "Company", "Stage · Industry", "NJ", "Disclosure", "Tier", "Oct 27", "Submitted"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {people.mentees.filter(a => {
                      const test = !!a.inRoster;
                      if (appFilter === "test") return test;
                      if (test && appFilter !== "all") return false;
                      if (appFilter === "undecided") return !a.decision;
                      if (appFilter === "approved") return a.decision === "approved";
                      if (appFilter === "rejected") return a.decision === "rejected";
                      if (appFilter === "noreqs") return !a.meetsRequirements;
                      return true;
                    }).map(a => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f0edf9", verticalAlign: "top" }}>
                        <td style={{ padding: "10px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {a.headshotUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/admin/tf-file?u=${encodeURIComponent(a.headshotUrl)}`} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "#f0eef8" }} />
                            ) : (
                              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0eef8", color: "#9b8fcf", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{(a.first || "?")[0]}{(a.last || "")[0] || ""}</span>
                            )}
                            <button onClick={() => setProfile({ kind: "mentee", person: a })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#3d2f8a", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{a.first} {a.last}</button>
                          </span>
                          {isNew(a.submittedAt) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f5f3ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px" }}>NEW</span>}
                          {a.inRoster && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "1px 6px" }}>IN ROSTER</span>}
                          <div style={{ fontSize: 11.5, color: "#9b8fcf" }}>{a.email}</div>
                        </td>
                        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                          {a.decision === "approved" && <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px", marginRight: 6 }}>APPROVED</span>}
                          {a.decision === "rejected" && <span style={{ fontSize: 11, fontWeight: 800, background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "2px 8px", marginRight: 6 }}>REJECTED</span>}
                          {a.summerAlum && <span style={{ fontSize: 10, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "2px 6px", marginRight: 6 }}>SUMMER ALUM</span>}
                          {!a.decision ? (
                            <>
                              <button disabled={matchBusy} onClick={() => doDecide("mentee", a, "approved")} style={{ border: "none", borderRadius: 6, padding: "4px 10px", background: "#1a6e42", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 4 }}>✓ Approve</button>
                              <button disabled={matchBusy} onClick={() => doDecide("mentee", a, "rejected")} style={{ border: "none", borderRadius: 6, padding: "4px 10px", background: "#fef0f0", color: "#c0392b", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✗ Reject</button>
                            </>
                          ) : (
                            <button disabled={matchBusy} onClick={() => doDecide("mentee", a, "clear")} style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 8px", background: "#fff", color: "#9b8fcf", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>undo</button>
                          )}
                        </td>
                        <td style={{ padding: "10px", maxWidth: 220 }}>
                          <span style={{ fontWeight: 600 }}>{a.company || "—"}</span>
                          <div style={{ fontSize: 11.5, color: "#6b6480" }}>{(a.bio || "").slice(0, 90)}</div>
                        </td>
                        <td style={{ padding: "10px", fontSize: 12 }}>{a.stage || "—"}<div style={{ color: "#9b8fcf" }}>{a.industry || ""}</div></td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 7px", background: a.njResident ? "#e8f8f0" : "#fef0f0", color: a.njResident ? "#1a6e42" : "#c0392b" }}>
                            {a.njResident ? `NJ ✓${a.county ? " · " + a.county : ""}` : "Not NJ"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", fontSize: 11.5, color: "#6b6480", whiteSpace: "nowrap" }}>
                          {[a.disclosure.gender, a.disclosure.ethnicity, a.disclosure.age].filter(Boolean).join(" · ") || "Undisclosed"}
                        </td>
                        <td style={{ padding: "10px", fontSize: 11.5 }}>{(a.tier || "—").replace("Minimum program commitment (3 one-hour sessions)", "Minimum · 3")}</td>
                        <td style={{ padding: "10px" }}>{a.oct27 ? "✓" : "✗"}</td>
                        <td style={{ padding: "10px", fontSize: 11.5, color: "#6b6480", whiteSpace: "nowrap" }}>{a.submittedAt?.slice(0, 10)}</td>
                        
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                Approve moves an applicant into the Matching tab and they stay approved. Decisions save to the FallMentees sheet tab.
              </p>
            </div>
          )}

          {tab === "mentorapps" && people && (
            <div style={card}>
              <p style={kicker}>Mentor Applications · {people.mentorCount} received · live from the original Typeform</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {["Mentor", "Decision", "Company · Title", "Focus Areas", "Availability", "Based", "Submitted"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {people.mentors.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f0edf9", verticalAlign: "top" }}>
                        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                          <button onClick={() => setProfile({ kind: "mentor", person: m })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#3d2f8a", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{m.name}</button>
                          {isNew(m.submittedAt) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f5f3ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px" }}>NEW</span>}
                          {m.assignedTo.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "1px 6px" }}>MATCHED</span>}
                          <div style={{ fontSize: 11.5, color: "#9b8fcf" }}>{m.email}</div>
                        </td>
                        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                          {m.decision === "approved" && <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px", marginRight: 6 }}>APPROVED</span>}
                          {m.decision === "rejected" && <span style={{ fontSize: 11, fontWeight: 800, background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "2px 8px", marginRight: 6 }}>REJECTED</span>}
                          {!m.decision ? (
                            <>
                              <button disabled={matchBusy} onClick={() => doDecide("mentor", m, "approved")} style={{ border: "none", borderRadius: 6, padding: "4px 10px", background: "#1a6e42", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 4 }}>✓ Approve</button>
                              <button disabled={matchBusy} onClick={() => doDecide("mentor", m, "rejected")} style={{ border: "none", borderRadius: 6, padding: "4px 10px", background: "#fef0f0", color: "#c0392b", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✗ Reject</button>
                            </>
                          ) : (
                            <button disabled={matchBusy} onClick={() => doDecide("mentor", m, "clear")} style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 8px", background: "#fff", color: "#9b8fcf", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>undo</button>
                          )}
                        </td>
                        <td style={{ padding: "10px", fontSize: 12, maxWidth: 200 }}>{[m.company, m.title].filter(Boolean).join(" · ") || "—"}</td>
                        <td style={{ padding: "10px", fontSize: 12 }}>{(Array.isArray(m.focusAreas) ? m.focusAreas : []).join(", ") || "—"}</td>
                        <td style={{ padding: "10px", fontSize: 12, whiteSpace: "nowrap" }}>{m.tier || "—"}</td>
                        <td style={{ padding: "10px", fontSize: 12, whiteSpace: "nowrap" }}>{m.based || "—"}</td>
                        <td style={{ padding: "10px", fontSize: 11.5, color: "#6b6480", whiteSpace: "nowrap" }}>{m.submittedAt?.slice(0, 10)}</td>
                        
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "matching" && people && (() => {
            const unmatchedMentees = people.mentees.filter(a => !a.matchedMentorId && a.decision === "approved");
            const matchedMentees = people.mentees.filter(a => a.matchedMentorId);
            const sel = people.mentees.find(a => a.id === selectedMentee) || null;
            const scored = sel ? people.mentors.map(mt => ({ ...mt, ...scoreMentor(sel, mt) })).sort((a, b) => b.score - a.score) : [];
            const betterFor = (a) => {
              const current = people.mentors.find(mt => mt.id === a.matchedMentorId);
              if (!current) return null;
              const currentScore = scoreMentor(a, current).score;
              const best = people.mentors.filter(mt => mt.id !== a.matchedMentorId)
                .map(mt => ({ mt, sc: scoreMentor(a, mt).score }))
                .sort((x, y) => y.sc - x.sc)[0];
              return best && best.sc > currentScore ? { name: best.mt.name, score: best.sc, currentScore } : null;
            };
            return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <div style={card}>
                  <p style={kicker}>Awaiting Match · {unmatchedMentees.length} approved · newest first</p>
                  {unmatchedMentees.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No approved applicants waiting. Approve founders on the Applications tab and they land here.</p>}
                  {unmatchedMentees.map(a => (
                    <div key={a.id} onClick={() => setSelectedMentee(a.id)} style={{
                      padding: "10px 12px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
                      border: selectedMentee === a.id ? "2px solid #5c4eb5" : "1px solid #f0edf9",
                      background: selectedMentee === a.id ? "#f5f3ff" : "#fff",
                    }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                        <button onClick={(e) => { e.stopPropagation(); setProfile({ kind: "mentee", person: a }); }} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#1a1733", fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{a.first} {a.last}</button> <span style={{ fontWeight: 400, color: "#9b8fcf" }}>· {a.company || "no company"}</span>
                        {isNew(a.submittedAt) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f5f3ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px" }}>NEW</span>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b6480" }}>
                        {[a.primaryFocus, a.stage, a.tier?.startsWith("Minimum") ? "3 sessions" : a.tier].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  {!sel && <><p style={kicker}>Mentor Pool · {people.mentorCount}</p><p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Select a founder on the left to see mentors ranked for them, strongest first.</p></>}
                  {sel && (
                    <>
                      <p style={kicker}>Best mentors for {sel.first} {sel.last}</p>
                      {scored.slice(0, 12).map(mt => (
                        <div key={mt.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #f0edf9" }}>
                          <span style={{
                            minWidth: 96, borderRadius: 6, flexShrink: 0, padding: "4px 8px",
                            background: gradeOf(mt.score).bg, color: gradeOf(mt.score).color,
                            textAlign: "center", fontSize: 11, fontWeight: 800, lineHeight: 1.3,
                          }}>{gradeOf(mt.score).label}<br /><span style={{ fontWeight: 600, opacity: 0.7 }}>score {mt.score}</span></span>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                              <button onClick={() => setProfile({ kind: "mentor", person: mt })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#1a1733", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{mt.name}</button> <span style={{ fontWeight: 400, color: "#9b8fcf" }}>· {mt.company || ""}</span>
                              {mt.assignedTo.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "1px 6px" }}>{mt.assignedTo.length} MENTEE{mt.assignedTo.length > 1 ? "S" : ""}</span>}
                            </p>
                            <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "#6b6480" }}>
                              {mt.reasons.length ? mt.reasons.join(" · ") : "no signal overlap"}{mt.tier ? ` · ${mt.tier}` : ""}
                            </p>
                          </div>
                          <button disabled={matchBusy} onClick={() => doMatch("match", sel, mt)} style={{
                            border: "none", borderRadius: 6, padding: "6px 14px", flexShrink: 0,
                            background: "#5c4eb5", color: "#fff", fontSize: 12, fontWeight: 700,
                            cursor: "pointer", fontFamily: "inherit", opacity: matchBusy ? 0.6 : 1,
                          }}>
                            {matchBusy ? "…" : "Match"}
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "#9b8fcf", lineHeight: 1.6 }}>
                Matches save to the FallMatches sheet tab instantly and survive new applications arriving; nothing is imported or frozen. Portal mentor reveals still come from the roster file until the ingest wires these matches through automatically.
              </p>
            </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
