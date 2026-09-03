import { useState, useEffect, useCallback, useMemo } from "react";
import Head from "next/head";
import { TEST_SLUGS } from "../lib/fall-roster";

// Match scoring and the whole-cohort assignment both live in
// lib/cohort-matching.js: the scoring heuristic, and the solver that answers
// "best for this founder" and "best for the whole group of them" separately.
import {
  scoreMentor, gradeOf, buildCohort, cohortPlan, greedyPlan, recommendFor, isEligibleMentor, samePerson,
} from "../lib/cohort-matching";


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
  const [speakers, setSpeakers] = useState(null);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const [speakerFilter, setSpeakerFilter] = useState("undecided");
  const [slotPick, setSlotPick] = useState({}); // applicant id -> session slot chosen in the dropdown
  const [slotFocus, setSlotFocus] = useState(null); // session number the list is filtered to
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [actionErr, setActionErr] = useState(null);
  const [appFilter, setAppFilter] = useState("undecided");
  const [profile, setProfile] = useState(null); // { kind, person }
  const [matchExplain, setMatchExplain] = useState(null); // mentee id with score breakdown expanded
  const [showAllMentors, setShowAllMentors] = useState(false); // full ranked pool under the three picks
  const [showCohortPlan, setShowCohortPlan] = useState(false); // the whole-hive plan, founder by founder
  const [todayState, setTodayState] = useState({});
  const [signals, setSignals] = useState(null);
  const [signalText, setSignalText] = useState("");
  const [signalSource, setSignalSource] = useState("");
  const [signalBusy, setSignalBusy] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(null);
  const [sendState, setSendState] = useState(null);   // { phase, plan, result, error }
  const [sendBusy, setSendBusy] = useState(false);

  // The acceptance send. Always a dry run first: the endpoint returns exactly
  // who would be emailed and who it refuses, and nothing goes out until that
  // list has been looked at and confirmed.
  // Rebuilds the PortalSnapshot tab and reports whether anything is missing.
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const rebuildSnapshot = async () => {
    const token = sessionStorage.getItem("uplift_admin_secret") || window.prompt("Admin secret (from Vercel env ADMIN_SECRET):");
    if (!token) return;
    sessionStorage.setItem("uplift_admin_secret", token);
    setSnapshotBusy(true);
    try {
      const r = await fetch(`/api/admin/portal-snapshot?token=${encodeURIComponent(token)}`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 401) sessionStorage.removeItem("uplift_admin_secret");
        setSnapshot({ error: d.error || `HTTP ${r.status}` });
      } else {
        setSnapshot(d);
      }
    } catch (e) {
      setSnapshot({ error: e.message });
    }
    setSnapshotBusy(false);
  };

  const acceptanceSend = async (dryRun) => {
    const token = sessionStorage.getItem("uplift_admin_secret") || window.prompt("Admin secret (from Vercel env ADMIN_SECRET):");
    if (!token) return;
    sessionStorage.setItem("uplift_admin_secret", token);
    setSendBusy(true);
    try {
      const r = await fetch(`/api/admin/send-acceptance-emails?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 401) sessionStorage.removeItem("uplift_admin_secret");
        setSendState({ phase: "error", error: d.error || `HTTP ${r.status}` });
      } else if (dryRun) {
        setSendState({ phase: "planned", plan: d });
      } else {
        setSendState({ phase: "sent", result: d });
      }
    } catch (e) {
      setSendState({ phase: "error", error: e.message });
    }
    setSendBusy(false);
  };
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // What a founder needs in their welcome email: the portal link and, on its
  // own line, the Uplift ID that opens it. Deliberately two lines rather than
  // a ?code= deep link — the ID is a password and does not belong in a URL
  // that gets forwarded, logged, or pasted into a thread.
  const copyPortal = async (a) => {
    const text = [`${origin}/fall/${a.inRoster}`, a.upliftId ? `Uplift ID: ${a.upliftId}` : null]
      .filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPortal(a.id);
      setTimeout(() => setCopiedPortal(c => (c === a.id ? null : c)), 1600);
    } catch (_) {
      window.prompt("Copy this:", text);
    }
  };

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
    if (!["overview", "founders", "menteeapps", "mentorapps", "acceptedfounders", "acceptedmentors", "matching", "matched", "today", "deadlines", "reporting", "signals"].includes(tab)) return;
    setPeopleLoading(true);
    fetch("/api/admin/fall-people")
      .then(r => r.json())
      .then(d => setPeople(d))
      .catch(() => setPeople({ mentees: [], mentors: [], error: "load failed" }))
      .finally(() => setPeopleLoading(false));
  }, [authed, tab, people, peopleLoading]);

  // Signals load lazily when the Signals tab opens
  useEffect(() => {
    if (!authed || tab !== "signals" || signals) return;
    fetch("/api/admin/fall-signals")
      .then(r => r.json())
      .then(d => setSignals(d.signals || []))
      .catch(() => setSignals([]));
  }, [authed, tab, signals]);

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

  // Speaker applications load lazily when the Speakers tab opens
  useEffect(() => {
    // Today needs the counts too, for the "waiting on a yes or no" nudge.
    if (!authed || !["speakers", "today"].includes(tab) || speakers || speakersLoading) return;
    setSpeakersLoading(true);
    fetch("/api/admin/speaker-applications")
      .then(r => r.json())
      .then(d => setSpeakers(d))
      .catch(() => setSpeakers({ speakers: [], slots: [], error: "load failed" }))
      .finally(() => setSpeakersLoading(false));
  }, [authed, tab, speakers, speakersLoading]);

  // Refresh after a save; the save already succeeded, so a failed refresh is
  // only a stale view — keep the old data rather than surfacing a scary error.
  const refreshPeople = async () => {
    try {
      const d = await fetch("/api/admin/fall-people?fresh=1").then(r => r.json());
      if (d && !d.error) setPeople(d);
    } catch (_) {}
  };

  const doDecide = async (kind, applicant, decision) => {
    setMatchBusy(true);
    setActionErr(null);
    const who = applicant.name || `${applicant.first || ""} ${applicant.last || ""}`.trim() || applicant.email || "applicant";
    try {
      const r = await fetch("/api/admin/fall-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          applicant: { id: applicant.id, name: applicant.name || `${applicant.first} ${applicant.last}`.trim(), email: applicant.email },
          decision,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.error) throw new Error(body.error || `HTTP ${r.status}`);
    } catch (e) {
      setActionErr(`"${decision}" for ${who} was NOT saved (${e.message}). Nothing was recorded — click it again.`);
      setMatchBusy(false);
      return;
    }
    await refreshPeople();
    setMatchBusy(false);
  };

  const refreshSpeakers = async () => {
    try {
      const d = await fetch("/api/admin/speaker-applications?fresh=1").then(r => r.json());
      if (d && !d.error) setSpeakers(d);
    } catch (_) {}
  };

  // Approving a speaker books them into a specific 30-minute slot, so the
  // session number travels with the decision. Same failure contract as
  // doDecide: if the write didn't land, say so loudly instead of showing a
  // decision that isn't saved.
  const doSpeakerDecide = async (applicant, decision, session) => {
    setMatchBusy(true);
    setActionErr(null);
    const who = applicant.name || applicant.email || "speaker";
    try {
      const r = await fetch("/api/admin/speaker-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant: { id: applicant.id, name: applicant.name, email: applicant.email },
          decision,
          session: decision === "approved" ? session : null,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.error) throw new Error(body.error || `HTTP ${r.status}`);
    } catch (e) {
      setActionErr(`"${decision}" for ${who} was NOT saved (${e.message}). Nothing was recorded.`);
      setMatchBusy(false);
      return;
    }
    await refreshSpeakers();
    setMatchBusy(false);
  };

  // ─── Whole-cohort matching ────────────────────────────────────────────────
  // Matching one founder at a time is how the work actually gets done, but a
  // single click is not a local decision: handing this founder their best
  // mentor can be the same as taking somebody else's only good one. So the
  // whole waiting room is solved as one assignment problem here, and every
  // recommendation below is ranked by the cohort it leaves behind rather than
  // by its own score. `bestForCohort` is that plan; `greedyForCohort` is what
  // working down the list newest-first would have produced, kept only so the
  // screen can show the difference.
  const waitingForMatch = useMemo(
    () => (people?.mentees || []).filter(a => a.decision === "approved" && !a.isTest && !a.matchedMentorId),
    [people],
  );
  const cohort = useMemo(
    () => (people ? buildCohort({ mentees: waitingForMatch, mentors: people.mentors }) : null),
    [people, waitingForMatch],
  );
  const bestForCohort = useMemo(() => (cohort ? cohortPlan(cohort) : null), [cohort]);
  const greedyForCohort = useMemo(() => (cohort ? greedyPlan(cohort) : null), [cohort]);
  // Re-solves the cohort once per candidate mentor, so the three picks come
  // with the exact fallout of choosing each one.
  const recs = useMemo(
    () => (cohort && selectedMentee ? recommendFor(cohort, selectedMentee, 3) : null),
    [cohort, selectedMentee],
  );

  const doMatch = async (action, mentee, mentor) => {
    setMatchBusy(true);
    setActionErr(null);
    try {
      const r = await fetch("/api/admin/fall-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mentee: { id: mentee.id, name: `${mentee.first} ${mentee.last}`.trim(), email: mentee.email },
          mentor: { id: mentor.id, name: mentor.name, email: mentor.email },
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.error) throw new Error(body.error || `HTTP ${r.status}`);
    } catch (e) {
      setActionErr(`Match action "${action}" (${`${mentee.first || ""} ${mentee.last || ""}`.trim()} ↔ ${mentor.name}) was NOT saved (${e.message}). Nothing was recorded — try again.`);
      setMatchBusy(false);
      return;
    }
    await refreshPeople();
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

  // What is left to decide. Test portals never count, and neither does anyone
  // already approved or rejected — the tab counter should hit zero when the
  // inbox is clear rather than keep reporting a total nobody has to act on.
  const undecidedMentees = people ? people.mentees.filter(a => !a.decision && !a.isTest).length : 0;
  const undecidedMentors = people ? people.mentors.filter(m2 => !m2.decision && !m2.isTest).length : 0;

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
              {/* The SOP is the page you look for when you do not know where
                  something lives, so it has to be reachable from the screen
                  everyone already opens. Same admin session, no second login. */}
              <a href="/fallsop" style={{ border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                SOP
              </a>
              <a href="/fallfounderlookbook" style={{ border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                Lookbook
              </a>
              <button onClick={() => { load(true); if (["speakers", "today"].includes(tab)) refreshSpeakers(); }} disabled={loading} style={{ border: "none", borderRadius: 8, padding: "8px 16px", background: "#5c4eb5", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Refreshing…" : "↻ Refresh now"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderBottom: "1px solid #e8e4f5" }}>
          <div style={{ maxWidth: 1560, margin: "0 auto", padding: "0 28px", display: "flex", gap: 4 }}>
            {[["today", "📋 Today"], ["overview", "Overview"], ["founders", "Roster"],
              // These two counters are a to-do list, not a scoreboard: the number
              // in the tab is how many applications still need a yes or a no.
              // Once everyone is decided it reads (0) and the useful totals are
              // on the Accepted tabs. Running totals stay on Overview.
              ["menteeapps", `Mentee Apps${people ? ` (${undecidedMentees})` : ""}`],
              ["mentorapps", `Mentor Apps${people ? ` (${undecidedMentors})` : ""}`],
              ["acceptedfounders", `Accepted Founders${people ? ` (${people.mentees.filter(a => a.decision === "approved" && !a.isTest).length})` : ""}`],
              ["acceptedmentors", `Accepted Mentors${people ? ` (${people.mentors.filter(m2 => m2.decision === "approved" && !m2.isTest).length})` : ""}`],
              ["matching", `Matching${people ? ` (${people.mentees.filter(a => a.decision === "approved" && !a.isTest && !a.matchedMentorId).length} waiting)` : ""}`],
              ["matched", `Matched${people ? ` (${people.matchedCount})` : ""}`],
              ["signals", "Signals"],
              ["deadlines", "\u23F1 Deadlines"], ["reporting", "\ud83d\udcca Reporting"], ["sessions", "Sessions"],
              ["speakers", `\ud83c\udfa4 Speakers${speakers?.counts ? ` (${speakers.counts.undecided})` : ""}`],
              ["pulse", "Pulse & Wins"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                border: "none", background: "none", padding: "12px 16px 10px",
                borderBottom: tab === id ? "3px solid #5c4eb5" : "3px solid transparent",
                color: tab === id ? "#3d2f8a" : "#9b8fcf",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
                {label}
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
          {actionErr && (
            <div style={{ ...card, borderLeft: "4px solid #e74c3c", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: "#c0392b", fontWeight: 600 }}>⚠️ {actionErr}</p>
              <button onClick={() => setActionErr(null)} style={{ border: "none", background: "none", color: "#c0392b", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>×</button>
            </div>
          )}
          {people?.sheetReadError && (
            <div style={{ ...card, borderLeft: "4px solid #e67e22" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#b9770e", fontWeight: 600 }}>
                ⚠️ Google Sheets didn&apos;t answer just now, so approvals/matches below may temporarily show as Undecided.
                Every decision already made IS saved in the sheet — refresh in a minute and it will reappear. Don&apos;t re-decide anyone off this view.
              </p>
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
                  ["Eligible mentee applicants (NJ + focus)", people.mentees.filter(a => a.meetsRequirements).length, 80],
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

          {/* Participation: accepted the seat, turned it down, or still silent.
              The three walkthrough accounts are left out — this is a count of
              real founders answering a real question. */}
          {data?.founders && (() => {
            const real = data.founders.filter(f => !TEST_SLUGS.includes(f.slug));
            // Declining marks a founder churned, so declined founders have to
            // be counted before churn is filtered out — otherwise the one
            // number that says someone turned the seat down reads zero forever.
            const declinedList = real.filter(f => f.participationStatus === "declined");
            const live = real.filter(f => f.status !== "churned" && f.participationStatus !== "declined");
            const groups = [
              ["Accepted their seat", live.filter(f => f.participationStatus === "accepted"), "#1a6e42", "#e8f8f0", "Confirmed participation in the portal, or marked Accepted on the Participation tab."],
              ["Declined", declinedList, "#c0392b", "#fdf0ef", "Answered the participation question with a no. A declined founder is not a waiting one."],
              ["Still waiting on", live.filter(f => f.participationStatus === "waiting"), "#b35c00", "#fdf7ee", "Accepted into the program, but has not answered the participation question either way."],
            ];
            return (
              <div style={card}>
                <p style={kicker}>Participation · {real.length} accepted founders · due Sept 10</p>
                {(() => {
                  const inferred = live.filter(f => f.participationSource === "inferred-week1");
                  if (!inferred.length) return null;
                  return (
                    <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#6b6480", lineHeight: 1.5 }}>
                      Counted as accepted from their Week 1 work rather than an explicit answer, which only applies before 7:51 PM Sept 1: {inferred.map(f => f.name).join(" · ")}
                    </p>
                  );
                })()}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {groups.map(([label, list, color, bg, tip]) => (
                    <div key={label} title={tip} style={{ background: bg, borderRadius: 10, padding: "14px 16px", cursor: "help" }}>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{list.length}</p>
                      <p style={{ margin: "2px 0 8px", fontSize: 11.5, fontWeight: 700, color: "#37324e" }}>{label} <span style={{ color: "#b0a8cc" }}>ⓘ</span></p>
                      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "#4a4363" }}>
                        {list.length ? list.map(f => f.name).join(" · ") : "nobody"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Program health */}
          <div style={card}>
            <p style={kicker}>Program Health</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              {p && [
                ["Founders", p.total, "#5c4eb5",
                  "Everyone in the fall portal roster: every accepted founder plus the three walkthrough accounts. Grows when scripts/build-fall-cohort.mjs is re-run after new acceptances."],
                ["On Track", p.onTrack, "#1a6e42",
                  "No warning flags tripped. Status is computed fresh from the rulebook on every load, never hand-set."],
                ["Needs Attention", p.attention, "#b35c00",
                  "At least one soft flag: participation unconfirmed past Sept 9, onboarding/quiz/Deep Work incomplete past onboarding week, Meeting 1 or 2 past its due date, no edu session by Oct 1, 2+ pulse checks missed in a row, or latest pulse is red."],
                ["At Risk", p.atRisk, "#c0392b",
                  "A hard threshold crossed: no onboarding a week past onboarding week, no mentor meeting past the Meeting-1 hard deadline, or Meeting 3 missed Oct 23. Triggers the intervention process (flagged email, then a 30-minute call)."],
                ["Week 1 Gate Done", p.gateComplete, "#3d2f8a",
                  "Founders who finished all three Week 1 requirements: attended onboarding, passed the quiz, and completed the Deep Work prompts. This gate is what reveals their mentor."],
                ["Avg Meetings", p.avgMeetings, "#5c4eb5",
                  "Average submitted mentor meetings per founder. 3 are required (Discover, Act, Roadmap)."],
                ["Avg Edu Sessions", p.avgEdu, "#5c4eb5",
                  "Average educational sessions attended per founder. 3 are required, at least 1 by Oct 1."],
                ["Churned", data.churned, "#6b6480",
                  "Marked churned in the sheet (a human call, the one hand-set status). Overrides all other flags."],
              ].map(([label, value, color, tip]) => (
                <div key={label} title={tip} style={{ background: "#fafafa", borderRadius: 10, padding: "12px 14px", textAlign: "center", cursor: "help" }}>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "#6b6480" }}>{label} <span style={{ color: "#b0a8cc" }}>ⓘ</span></p>
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
                  <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "#3d2f8a" }}>{c === "unassigned" ? "Cohort TBD" : `Cohort ${c}`}</p>
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
                        {(() => {
                          const app = people?.mentees?.find(a => `${a.first} ${a.last}`.trim().toLowerCase() === (f.name || "").trim().toLowerCase());
                          return app?.upliftId ? (
                            <span title="Uplift ID — assigned on approval; this founder's portal login" style={{ marginLeft: 6, fontFamily: "monospace", fontSize: 11, fontWeight: 700, background: "#f0eef8", color: "#5c4eb5", borderRadius: 5, padding: "2px 6px", cursor: "help" }}>{app.upliftId}</span>
                          ) : null;
                        })()}
                        <div style={{ fontSize: 11.5, color: "#9b8fcf" }}>{f.company} · {f.cohort ? `Cohort ${f.cohort}` : "Cohort TBD"}{f.mentor ? ` · ${f.mentor}` : ""}</div>
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

          {tab === "acceptedfounders" && people && (() => {
            const accepted = people.mentees.filter(a => a.decision === "approved" && !a.isTest);
            const noPortal = accepted.filter(a => !a.inRoster);
            const noId = accepted.filter(a => !a.upliftId);
            return (
            <div style={card}>
              <p style={kicker}>Accepted Founders · {accepted.length}</p>
              <div style={{ border: "1px solid #d4d0e8", borderRadius: 12, padding: "16px 18px", marginBottom: 16, background: "#fafaff" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 800, color: "#1a1733" }}>Acceptance email</p>
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#6b6480", lineHeight: 1.6 }}>
                  One personalized email per founder with their own Uplift ID and portal link, from kennedy@techunited.co, CC uplift@techunited.co.
                  Preview first: it lists exactly who would be emailed and who it refuses. Nothing sends until you confirm that list.
                </p>
                <button disabled={sendBusy} onClick={() => acceptanceSend(true)} style={{ border: "1px solid #5c4eb5", borderRadius: 8, padding: "8px 16px", background: "#fff", color: "#5c4eb5", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 8 }}>
                  {sendBusy ? "Working..." : "Preview the send"}
                </button>
                {sendState?.phase === "planned" && sendState.plan.wouldSend > 0 && (
                  <button disabled={sendBusy} onClick={() => {
                    if (window.confirm(`Send the acceptance email to ${sendState.plan.wouldSend} founders now? This cannot be undone.`)) acceptanceSend(false);
                  }} style={{ border: "none", borderRadius: 8, padding: "9px 18px", background: "#1a6e42", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                    Send to {sendState.plan.wouldSend} founders
                  </button>
                )}
                {sendState?.phase === "error" && (
                  <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#b3261e", lineHeight: 1.6 }}>Failed: {sendState.error}</p>
                )}
                {sendState?.phase === "planned" && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: "#37324e", lineHeight: 1.7 }}>
                    <strong>{sendState.plan.wouldSend} would be emailed.</strong>{" "}
                    {sendState.plan.planned.map(p => p.firstName).join(", ")}
                    {sendState.plan.refused.length > 0 && (
                      <div style={{ marginTop: 8, color: "#b35c00" }}>
                        <strong>{sendState.plan.refused.length} refused:</strong>{" "}
                        {sendState.plan.refused.map(r => `${r.slug} (${r.reason})`).join(" · ")}
                      </div>
                    )}
                  </div>
                )}
                {sendState?.phase === "sent" && (
                  <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.7 }}>
                    <strong style={{ color: "#1a6e42" }}>Sent {sendState.result.sentCount}.</strong>
                    {sendState.result.failedCount > 0 && (
                      <div style={{ color: "#b3261e", marginTop: 6 }}>
                        <strong>{sendState.result.failedCount} failed:</strong>{" "}
                        {sendState.result.failed.map(f => `${f.slug} (${f.error})`).join(" · ")}
                      </div>
                    )}
                    {sendState.result.refusedCount > 0 && (
                      <div style={{ color: "#b35c00", marginTop: 6 }}>
                        <strong>{sendState.result.refusedCount} refused:</strong>{" "}
                        {sendState.result.refused.map(r => `${r.slug} (${r.reason})`).join(" · ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#6b6480", lineHeight: 1.6 }}>
                Every accepted founder has a portal at <code style={{ background: "#f5f3ff", borderRadius: 4, padding: "1px 5px" }}>/fall/&lt;slug&gt;</code> and logs in with their Uplift ID.
                <strong> Copy</strong> puts the link and the ID on two lines, ready to paste into a welcome email; the ID never goes in the URL.
              </p>
              {noPortal.length > 0 && (
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#b35c00", background: "#fff8ef", border: "1px solid #f3dcc0", borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 }}>
                  {noPortal.length} accepted founder{noPortal.length === 1 ? " has" : "s have"} no portal yet ({noPortal.map(a => `${a.first} ${a.last}`).join(", ")}).
                  The roster is generated: run <code>node scripts/build-fall-cohort.mjs</code> and deploy to create their pages.
                </p>
              )}
              {noId.length > 0 && (
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#b35c00", background: "#fff8ef", border: "1px solid #f3dcc0", borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 }}>
                  No Uplift ID issued to {noId.map(a => `${a.first} ${a.last}`).join(", ")} — they were approved before IDs existed. Hit <em>undo</em> then <em>Approve</em> on the Mentee Apps tab to issue one.
                </p>
              )}
              {accepted.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #f0edf9", flexWrap: "wrap" }}>
                  <button onClick={() => setProfile({ kind: "mentee", person: a })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#3d2f8a", fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{a.first} {a.last}</button>
                  {a.upliftId && <span title="Uplift ID — their portal password. Private to them." style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "monospace", background: "#f0eef8", color: "#5c4eb5", borderRadius: 4, padding: "2px 7px", cursor: "help" }}>{a.upliftId}</span>}
                  <span style={{ fontSize: 12.5, color: "#9b8fcf" }}>{a.company || "no company"} · {a.tier?.startsWith("Minimum") ? "3 sessions" : a.tier || ""}</span>
                  {a.matchedMentorName
                    ? <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px" }}>MATCHED → {a.matchedMentorName}</span>
                    : <span style={{ fontSize: 11, fontWeight: 800, background: "#fffbeb", color: "#7a5c00", borderRadius: 4, padding: "2px 8px" }}>IN MATCHING QUEUE</span>}
                  <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
                    {a.inRoster ? (
                      <>
                        <code style={{ fontSize: 11.5, color: "#6b6480" }}>/fall/{a.inRoster}</code>
                        <button onClick={() => copyPortal(a)} style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 10px", background: "#fff", color: "#5c4eb5", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minWidth: 60 }}>{copiedPortal === a.id ? "Copied" : "Copy"}</button>
                        <a href={`/fall/${a.inRoster}`} target="_blank" rel="noopener noreferrer" style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 10px", background: "#fff", color: "#5c4eb5", fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>Portal ↗</a>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#fff8ef", color: "#b35c00", borderRadius: 4, padding: "2px 8px" }}>NO PORTAL YET</span>
                    )}
                    <a href={`/fall/profile/${a.id}`} target="_blank" rel="noopener noreferrer" title="The mentor-facing profile — safe to send out" style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 10px", background: "#fff", color: "#6b6480", fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>Profile ↗</a>
                  </span>
                </div>
              ))}
              {accepted.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No approved founders yet. Approve them on the Mentee Apps tab.</p>}
            </div>
            );
          })()}

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
            // Same rule as the Today list: only surface a better fit that is
            // actually spare. A mentor the cohort plan has earmarked for
            // somebody still waiting is not an upgrade, it is a swap that
            // demotes a founder nobody is looking at.
            const spokenFor = new Set((bestForCohort?.pairs || []).map(pr => pr.mentor.id));
            const betterFor = (a) => {
              const current = people.mentors.find(mt => mt.id === a.matchedMentorId);
              if (!current) return null;
              const currentScore = scoreMentor(a, current).score;
              const best = people.mentors
                .filter(mt => mt.id !== a.matchedMentorId && isEligibleMentor(mt) && !samePerson(a, mt) && !spokenFor.has(mt.id))
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
                  const scored = current ? scoreMentor(a, current) : null;
                  const grade = scored ? gradeOf(scored.score) : null;
                  const roster = (data?.founders || []).find(f => f.name.toLowerCase() === `${a.first} ${a.last}`.toLowerCase());
                  const isOpen = matchExplain === a.id;
                  return (
                    <div key={a.id} style={{ borderTop: "1px solid #f0edf9", padding: "10px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <button onClick={() => setProfile({ kind: "mentee", person: a })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#1a1733", fontSize: 14, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{a.first} {a.last}</button>
                        <span style={{ color: "#9b8fcf" }}>→</span>
                        <span style={{ fontWeight: 700, color: "#1a6e42" }}>{a.matchedMentorName}</span>
                        {grade && (
                          <button onClick={() => setMatchExplain(isOpen ? null : a.id)} style={{ border: "none", borderRadius: 4, padding: "2px 8px", background: grade.bg, color: grade.color, fontSize: 10.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                            {grade.label} · {scored.score} pts {isOpen ? "▲" : "▾"}
                          </button>
                        )}
                        <span style={{ fontSize: 11.5, color: "#9b8fcf" }}>{a.matchedAt?.slice(0, 10)}</span>
                        {roster && <span style={{ fontSize: 11, color: "#6b6480" }}>portal: {roster.gateComplete ? "gate done ✓" : "gate incomplete"} · {roster.meetingCount}/3 meetings</span>}
                        {better && <span style={{ fontSize: 11, fontWeight: 700, background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "2px 8px" }}>⬆ Spare better fit: {better.name} ({better.score} vs {better.currentScore})</span>}
                        <button disabled={matchBusy} onClick={() => doMatch("unmatch", a, { id: a.matchedMentorId, name: a.matchedMentorName, email: "" })} style={{ marginLeft: "auto", border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 10px", background: "#fff", color: "#c0392b", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Unmatch</button>
                      </div>
                      {isOpen && scored && (
                        <div style={{ marginTop: 8, marginLeft: 4, padding: "10px 14px", background: "#faf9ff", border: "1px solid #e8e4f5", borderRadius: 8 }}>
                          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#6b6480", textTransform: "uppercase", letterSpacing: "0.05em" }}>Why this scored {scored.score} ({grade.label})</p>
                          {scored.reasons.length === 0 ? (
                            <p style={{ margin: 0, fontSize: 12.5, color: "#9b8fcf" }}>No scoring factors matched — this pair was likely hand-picked outside the algorithm's suggestions.</p>
                          ) : (
                            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                              {scored.reasons.map((r, i) => (
                                <li key={i} style={{ fontSize: 12.5, color: r.startsWith("⚠") ? "#b35c00" : "#37324e", padding: "2px 0" }}>{r.startsWith("⚠") ? r : `• ${r}`}</li>
                              ))}
                            </ul>
                          )}
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>Scored live from current application data via scoreMentor() — see the Matching Logic doc in Resources for the full point breakdown.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                  Once matched, pairs track here: portal gate progress and meeting counts cross-reference automatically for roster founders. Better-fit flags appear when a stronger mentor enters the pool.
                </p>
              </div>
            );
          })()}

          {tab === "signals" && (() => {
            const derived = [];
            if (people) {
              const dupEmails = {};
              people.mentees.forEach(a => { if (a.email) (dupEmails[a.email] = dupEmails[a.email] || []).push(a); });
              Object.values(dupEmails).filter(g => g.length > 1).forEach(g => derived.push({
                text: `${g[0].first} ${g[0].last} (${g[0].email}) submitted the mentee application ${g.length} times`, source: "Duplicate applications",
              }));
              people.mentees.filter(a => a.summerAlum && !a.isTest).forEach(a => derived.push({
                text: `${a.first} ${a.last} is a Summer 2026 alum applying again — auto-marked ineligible, but worth a personal reply (alumni meetup, mentor pool?)`, source: "Alumni re-applying",
              }));
              people.mentees.filter(a => !a.meetsRequirements && !a.summerAlum && !a.isTest && a.decision !== "rejected").forEach(a => derived.push({
                text: `${a.first} ${a.last} doesn't meet requirements (${!a.njResident ? "not NJ-resident" : "program focus"}) and hasn't been formally rejected — they're waiting on an answer`, source: "Undecided ineligible",
              }));
              people.mentors.filter(m2 => m2.decision === "approved" && !m2.isTest && (m2.assignedTo || []).length === 0).forEach(m2 => derived.push({
                text: `Mentor ${m2.name} is approved but has no mentee assigned yet — unused capacity (${m2.tier || "availability unknown"})`, source: "Idle approved mentors",
              }));
            }
            const addSignal = async (e) => {
              e.preventDefault();
              if (signalBusy || !signalText.trim()) return;
              setSignalBusy(true);
              try {
                await fetch("/api/admin/fall-signals", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: signalText.trim(), source: signalSource.trim() }),
                });
                setSignalText(""); setSignalSource(""); setSignals(null); // null -> refetch
              } finally { setSignalBusy(false); }
            };
            const dismiss = async (id) => {
              setSignals(s => (s || []).filter(x => x.id !== id));
              await fetch("/api/admin/fall-signals", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "dismissed" }),
              });
            };
            return (<>
              <div style={{ ...card, borderLeft: "4px solid #c0006e" }}>
                <p style={kicker}>Signals · useful, not urgent</p>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b6480", lineHeight: 1.5 }}>
                  Anything discovered that could be useful that we&apos;re not actively acting on. Logged signals persist (FallSignals sheet tab); auto-detected ones below regenerate from live data.
                </p>
                <form onSubmit={addSignal} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <input value={signalText} onChange={e => setSignalText(e.target.value)} placeholder="What did you notice?"
                    style={{ flex: "2 1 340px", padding: "10px 12px", borderRadius: 8, border: "1px solid #d4d0e8", fontSize: 13.5, fontFamily: "inherit" }} />
                  <input value={signalSource} onChange={e => setSignalSource(e.target.value)} placeholder="Source (optional: call, email, dashboard…)"
                    style={{ flex: "1 1 200px", padding: "10px 12px", borderRadius: 8, border: "1px solid #d4d0e8", fontSize: 13.5, fontFamily: "inherit" }} />
                  <button type="submit" disabled={signalBusy || !signalText.trim()} style={{
                    padding: "10px 20px", borderRadius: 8, border: "none", background: signalBusy ? "#a89ede" : "#5c4eb5",
                    color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
                  }}>{signalBusy ? "Logging…" : "Log signal"}</button>
                </form>
              </div>
              <div style={card}>
                <p style={kicker}>Logged signals</p>
                {!signals && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Loading…</p>}
                {signals && signals.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Nothing logged yet. Anything you notice on a call, in an email, or in the data that isn&apos;t worth acting on today — park it here.</p>}
                {(signals || []).map(s => (
                  <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f0eef8" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.5 }}>{s.text}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#9b8fcf" }}>{s.source ? `${s.source} · ` : ""}{(s.createdAt || "").slice(0, 10)}</p>
                    </div>
                    <button onClick={() => dismiss(s.id)} style={{ border: "1px solid #e8e4f5", borderRadius: 6, background: "#fff", color: "#6b6480", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Dismiss</button>
                  </div>
                ))}
              </div>
              <div style={card}>
                <p style={kicker}>Auto-detected from live data</p>
                {!people && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Loading application data…</p>}
                {people && derived.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Nothing detected right now.</p>}
                {derived.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f0eef8" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#c0006e", background: "#fdeef6", borderRadius: 5, padding: "3px 8px", flexShrink: 0, marginTop: 1 }}>{s.source}</span>
                    <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.5, flex: 1 }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </>);
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
            const rows = data.founders.filter(f => f.status !== "churned" && !TEST_SLUGS.includes(f.slug)).map(f => {
              const ms = f.milestones || {};
              const verifiedSessions = ["mentorSession1", "mentorSession2", "mentorSession3"].filter(k => ms[k]).length;
              const complete = ms.participation && ms.onboarding && f.gate?.quizPassed && verifiedSessions >= 3 &&
                f.meetingMinutes >= 180 && f.eduCount >= 3 && ms.midpoint && ms.endSurvey && ms.summit;
              return { f, ms, verifiedSessions, complete };
            });
            // First portal login: the earliest signal any founder gives off.
            // It lands before Confirmed Participation — before they have done
            // anything at all — so a founder who has not opened their portal
            // days after the acceptance email is the first person to chase.
            const fmtLogin = (iso) => {
              const d = iso ? new Date(iso) : null;
              if (!d || isNaN(d.getTime())) return null;
              const opts = { timeZone: "America/New_York", month: "short", day: "numeric" };
              return {
                day: d.toLocaleString("en-US", opts),
                time: d.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }),
                full: d.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" }),
              };
            };
            // A recorded visit is a login. The ≈ only marks how precise the
            // timestamp is: those came from the visit log, which stores the
            // most recent visit rather than the first, so the founder's real
            // first login was at or before the time shown. Master-password
            // sessions no longer leave a visit behind, so nothing in here is
            // the team looking at a portal.
            const approxTimed = rows.filter(({ f }) => f.firstLogin && f.firstLoginApprox);
            const notLoggedIn = rows.filter(({ f }) => !f.firstLogin);
            const loggedInCount = rows.length - notLoggedIn.length;
            const csv = () => {
              const header = ["Founder", "Company", "First Portal Login", "Participation", "Onboarding", "Quiz", "Meetings Submitted", "Minutes Submitted", "Sessions Verified", "Edu Sessions", "OverdriveAI", "Exit Survey", "Signature Signed", "Certificate", "Complete"];
              const lines = rows.map(({ f, ms, verifiedSessions, complete }) => [
                f.name, f.company, f.firstLogin || "never", ms.participation, ms.onboarding, !!f.gate?.quizPassed, f.meetingCount,
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
              <>
              <div style={card}>
                <p style={{ ...kicker, margin: 0 }}>Portal data · everything the portal has recorded, one row per founder</p>
                <p style={{ margin: "6px 0 10px", fontSize: 12.5, color: "#4a4363", lineHeight: 1.55 }}>
                  FallResponses stores one row per answer, which is right for writing and unreadable for checking.
                  This rebuilds the <strong>PortalSnapshot</strong> tab as a grid: every founder down the side, every question across the top.
                  It only reads, so pressing it can never cost you data.
                </p>
                <button onClick={rebuildSnapshot} disabled={snapshotBusy} style={{ border: "none", borderRadius: 8, padding: "8px 16px", background: snapshotBusy ? "#b9b1e0" : "#5c4eb5", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: snapshotBusy ? "default" : "pointer", fontFamily: "inherit" }}>
                  {snapshotBusy ? "Rebuilding…" : "↻ Rebuild the PortalSnapshot tab"}
                </button>
                {snapshot?.error && (
                  <p style={{ margin: "10px 0 0", fontSize: 12.5, fontWeight: 700, color: "#c0392b" }}>{snapshot.error}</p>
                )}
                {snapshot?.ok && (
                  <div style={{ margin: "10px 0 0", fontSize: 12.5, color: "#37324e", lineHeight: 1.6 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "#1a6e42" }}>
                      Rebuilt · {snapshot.founders} founders · {snapshot.columns} questions · {snapshot.answersRecorded} answers stored
                    </p>
                    {snapshot.loggedInButSilent?.length > 0 ? (
                      <p style={{ margin: "4px 0 0", color: "#c0392b", fontWeight: 700 }}>
                        Logged in but nothing recorded: {snapshot.loggedInButSilent.join(" · ")}. That is the shape a lost write would take, worth a look.
                      </p>
                    ) : (
                      <p style={{ margin: "4px 0 0", color: "#6b6480" }}>
                        Nobody has logged in without their answers landing. {snapshot.withNoAnswers} founders have not started yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ ...kicker, margin: 0 }}>Completion evidence · the numbers grant reporting runs on · verified beats submitted</p>
                  <button onClick={csv} style={{ border: "none", borderRadius: 8, padding: "7px 14px", background: "#5c4eb5", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>⬇ Export CSV</button>
                </div>
                <div style={{ margin: "10px 0 14px", padding: "12px 14px", borderRadius: 10, background: notLoggedIn.length ? "#fdf7ee" : "#e8f8f0", border: `1px solid ${notLoggedIn.length ? "#f0dfc4" : "#c8ecd9"}` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: notLoggedIn.length ? "#b35c00" : "#1a6e42" }}>
                    {loggedInCount} of {rows.length} have logged into their portal
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#6b6480" }}>
                    The first signal, before Confirmed Participation. Only a founder’s own Uplift ID counts, never the team’s master password.
                    {approxTimed.length > 0 && ` ${approxTimed.length} of these show a ≈ time: the visit was logged before login stamping started, and that log keeps the latest visit, so their first login was at or before the time shown.`}
                  </p>
                  {notLoggedIn.length > 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "#3d2f8a" }}>
                      <strong style={{ color: "#b35c00" }}>No sign of them yet:</strong>{" "}
                      {notLoggedIn.map(({ f }) => f.name).join(" · ")}
                    </p>
                  )}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {["Founder", "First login", "Part.", "Onboard", "Quiz", "Meetings", "Verified", "Edu", "OverdriveAI", "Survey", "Signed", "Cert", "Complete"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ f, ms, verifiedSessions, complete }) => (
                        <tr key={f.slug} style={{ borderBottom: "1px solid #f0edf9" }}>
                          <td style={{ padding: "10px", fontWeight: 700, color: "#3d2f8a", whiteSpace: "nowrap" }}>{f.name}<div style={{ fontSize: 11.5, fontWeight: 400, color: "#9b8fcf" }}>{f.company}</div></td>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>{(() => {
                            const l = fmtLogin(f.firstLogin);
                            if (!l) return <span style={{ fontSize: 11, fontWeight: 800, color: "#b35c00" }}>not yet</span>;
                            const approx = f.firstLoginApprox;
                            return (
                              <span title={approx ? `Recorded visit: ${l.full}. Logged in before login stamping started, and the visit log keeps only the latest visit, so their first login was at or before this.` : l.full}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1a6e42" }}>{approx ? "≈ " : ""}{l.day}</span>
                                <div style={{ fontSize: 11, color: "#9b8fcf" }}>{l.time}</div>
                              </span>
                            );
                          })()}</td>
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
              </>
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
                    ["Speaker Confirmed", `${speakers?.slots?.filter(sl => sl.status === "confirmed").length ?? 0}/${sessions.totals.eduTotal}`, "#1a6e42"],
                    ["Speaker Pending", speakers?.slots?.filter(sl => sl.status === "pending").length ?? 0, "#b35c00"],
                    ["Still Needs a Speaker", `${speakers?.slots ? speakers.slots.filter(sl => sl.status === "open").length : sessions.sessions.filter(needsSessionInfo).length}/${sessions.totals.eduTotal}`, "#c0392b"],
                    ["Onboarding Slots w/ Luma", `${sessions.totals.onboardingWithLuma}/${sessions.totals.onboardingSlots}`,
                      sessions.totals.onboardingWithLuma >= sessions.totals.onboardingSlots ? "#1a6e42" : "#b35c00"],
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
                        {["#", "When", "Speaker", "On Luma", "Event Name", "Registered", "Link"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.sessions.map(sess => (
                        <tr key={sess.n} style={{ borderBottom: "1px solid #f0edf9" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 800, color: "#3d2f8a" }}>{sess.n}</td>
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{sess.day} · {sess.time}</td>
                          <td style={{ padding: "9px 10px", fontSize: 12 }}>{(() => {
                            const sl = speakers?.slots?.find(x => x.n === sess.n);
                            if (!sl?.speaker) return <span style={{ color: "#c8bfef" }}>needs a speaker</span>;
                            const pending = sl.status === "pending";
                            return (
                              <>
                                <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 4, padding: "1px 6px", marginRight: 6, background: pending ? "#fdf4e8" : "#e8f8f0", color: pending ? "#b35c00" : "#1a6e42" }}>
                                  {pending ? "PENDING" : "CONFIRMED"}
                                </span>
                                <span style={{ fontWeight: 600, color: "#3d2f8a" }}>{sl.speaker.name}</span>
                              </>
                            );
                          })()}</td>
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
              {/* The onboarding slots used to be a hardcoded 0/7 and a standing
                  to-do. They are read off the same Luma calendar now, so this
                  table is whatever is actually on the calendar. */}
              {sessions?.onboarding?.length > 0 && (() => {
                const when = (iso) => iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
                return (
                <div style={{ marginTop: 22 }}>
                  <p style={kicker}>Onboarding Week · {sessions.onboarding.length} slots live on Luma · {sessions.totals.onboardingRegistrations ?? 0} registered</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "#9b8fcf", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {["#", "When (ET)", "Event Name", "Registered", "Link"].map(h => (
                            <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #e8e4f5", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.onboarding.map(o => (
                          <tr key={o.slug} style={{ borderBottom: "1px solid #f0edf9" }}>
                            <td style={{ padding: "9px 10px", fontWeight: 800, color: "#3d2f8a" }}>{o.n}</td>
                            <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{when(o.startAt)}</td>
                            <td style={{ padding: "9px 10px", fontSize: 12.5, maxWidth: 320 }}>
                              {/* The badge already says it; don't say it twice. */}
                              {o.name.replace(/\s*[-·]?\s*IN-?PERSON\s*$/i, "")}
                              {o.inPerson && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#efeaff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px" }}>IN PERSON</span>}
                            </td>
                            <td style={{ padding: "9px 10px", fontWeight: 700 }}>{o.registered ?? "—"}</td>
                            <td style={{ padding: "9px 10px" }}><a href={o.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#5c4eb5", fontWeight: 600 }}>Luma →</a></td>
                          </tr>
                        ))}
                        {sessions.overdrive?.onLuma && (
                          <tr style={{ borderBottom: "1px solid #f0edf9" }}>
                            <td style={{ padding: "9px 10px", fontWeight: 800, color: "#3d2f8a" }}>★</td>
                            <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{sessions.overdrive.day}</td>
                            <td style={{ padding: "9px 10px", fontSize: 12.5 }}>{sessions.overdrive.lumaName || sessions.overdrive.name}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700 }}>{sessions.overdrive.registered ?? "—"}</td>
                            <td style={{ padding: "9px 10px" }}><a href={sessions.overdrive.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#5c4eb5", fontWeight: 600 }}>Luma →</a></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })()}
              <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                Registration counts sync from Luma every 5 minutes, counted off each event&apos;s guest list. Onboarding slots and Uplift at OverdriveAI are matched by name against the same calendar, so a renamed or added event shows up here on its own.
              </p>
            </div>
          )}

          {tab === "speakers" && (() => {
            const list = speakers?.speakers || [];
            const slots = speakers?.slots || [];
            const openSlots = slots.filter(sl => !sl.speaker);
            const taken = new Set(slots.filter(sl => sl.speaker).map(sl => sl.n));
            const shown = list.filter(sp => {
              if (slotFocus && !sp.requestedSessions.includes(slotFocus)) return false;
              if (speakerFilter === "undecided") return !sp.decision;
              if (speakerFilter === "approved") return sp.decision === "approved";
              if (speakerFilter === "rejected") return sp.decision === "rejected";
              return true;
            });
            // Default dropdown choice: their highest-ranked slot that is still
            // open, falling back to anything else they said they could make, so
            // the common case is one click and it honours their order.
            const defaultSlot = (sp) => sp.assignedSession
              || (sp.rankedSessions || []).find(n => !taken.has(n))
              || sp.requestedSessions.find(n => !taken.has(n))
              || openSlots[0]?.n || "";
            const fmt = (sp) => (sp.format || "").split(".")[0];
            return (
              <>
                <div style={card}>
                  <p style={kicker}>Speaker Applications · live from the Speak at Uplift Typeform</p>
                  {speakersLoading && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Loading applications…</p>}
                  {speakers?.error && <p style={{ margin: 0, fontSize: 13, color: "#c0392b" }}>{speakers.error}</p>}
                  {speakers?.sheetReadError && (
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "#b9770e", fontWeight: 600 }}>
                      ⚠️ Google Sheets didn&apos;t answer just now, so bookings below may temporarily show as Undecided. Every decision already made IS saved. Refresh in a minute rather than re-deciding anyone.
                    </p>
                  )}
                  {speakers?.counts && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 14 }}>
                      {[
                        ["Applications", speakers.counts.total, "#5c4eb5"],
                        ["Waiting on you", speakers.counts.undecided, speakers.counts.undecided ? "#c0392b" : "#1a6e42"],
                        ["Confirmed", `${speakers.counts.slotsFilled}/${speakers.counts.slotsTotal}`, "#1a6e42"],
                        ["Pending reply", speakers.counts.slotsPending ?? 0, "#b35c00"],
                        ["Slots still open", speakers.counts.slotsTotal - speakers.counts.slotsFilled - (speakers.counts.slotsPending ?? 0), "#5c4eb5"],
                      ].map(([label, value, color]) => (
                        <div key={label} style={{ background: "#fafafa", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color }}>{value}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "#6b6480" }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {speakers?.formUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: "#6b6480" }}>
                      <span style={{ fontWeight: 700, color: "#3d2f8a" }}>Application link:</span>
                      <a href={speakers.formUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#5c4eb5", fontWeight: 600 }}>{speakers.formUrl}</a>
                      <button onClick={() => navigator.clipboard?.writeText(speakers.formUrl)} style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "3px 9px", background: "#fff", color: "#5c4eb5", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>copy</button>
                      <span style={{ color: "#9b8fcf" }}>Share this with anyone who wants to speak. Approving here books the slot; the Luma event title and the invite are still yours to send.</span>
                    </div>
                  )}
                </div>

                {slots.length > 0 && (
                  <div style={card}>
                    <p style={kicker}>Slot board · 22 sessions</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 8 }}>
                      {slots.map(sl => {
                        const active = slotFocus === sl.n;
                        return (
                          <button key={sl.n} onClick={() => setSlotFocus(active ? null : sl.n)} style={{
                            textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                            border: active ? "2px solid #5c4eb5" : "1px solid #e8e4f5",
                            borderRadius: 10, padding: "9px 11px",
                            background: sl.status === "confirmed" ? "#f4fbf7" : sl.status === "pending" ? "#fdf7ef" : "#fff",
                          }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#9b8fcf" }}>SESSION {sl.n}</span>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3d2f8a" }}>{sl.day} · {sl.time}</div>
                            {sl.speaker ? (
                              <div style={{ fontSize: 11.5, color: sl.status === "pending" ? "#b35c00" : "#1a6e42", fontWeight: 700, marginTop: 2 }}>
                                {sl.status === "pending" ? "⏳ PENDING · " : "✓ "}{sl.speaker.name}
                                <div style={{ fontWeight: 500, color: "#6b6480" }}>{sl.speaker.topicTitle || sl.speaker.company || ""}</div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11.5, color: sl.interestedCount ? "#b35c00" : "#c8bfef", fontWeight: 700, marginTop: 2 }}>
                                {sl.interestedCount ? `open · ${sl.interestedCount} interested` : "open · nobody yet"}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {slotFocus && (
                      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#5c4eb5", fontWeight: 600 }}>
                        Showing applicants available for Session {slotFocus}.{" "}
                        <button onClick={() => setSlotFocus(null)} style={{ border: "none", background: "none", color: "#9b8fcf", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>show everyone</button>
                      </p>
                    )}
                  </div>
                )}

                <div style={card}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {[["undecided", "Undecided"], ["pending", "Pending reply"], ["approved", "Confirmed"], ["rejected", "Declined"], ["all", "All"]].map(([id, label]) => (
                      <button key={id} onClick={() => setSpeakerFilter(id)} style={{
                        border: "1px solid #e8e4f5", borderRadius: 20, padding: "4px 12px",
                        background: speakerFilter === id ? "#5c4eb5" : "#fff",
                        color: speakerFilter === id ? "#fff" : "#6b6480",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}>{label}</button>
                    ))}
                  </div>

                  {shown.length === 0 && !speakersLoading && (
                    <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>
                      Nothing here yet. Applications appear within a minute of someone submitting the form.
                    </p>
                  )}

                  {shown.map(sp => {
                    const pick = slotPick[sp.id] ?? defaultSlot(sp);
                    const notRequested = pick && !sp.requestedSessions.includes(Number(pick));
                    return (
                      <div key={sp.id} style={{ border: "1px solid #e8e4f5", borderRadius: 12, padding: "16px 18px", marginBottom: 12, background: sp.decision === "rejected" ? "#fcfbff" : "#fff" }}>
                        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                          {sp.headshotUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/admin/tf-file?u=${encodeURIComponent(sp.headshotUrl)}`} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", background: "#f0eef8", flexShrink: 0 }} />
                          ) : (
                            <span style={{ width: 64, height: 64, borderRadius: 12, background: "#f0eef8", color: "#9b8fcf", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{(sp.first || "?")[0]}{(sp.last || "")[0] || ""}</span>
                          )}
                          <div style={{ flex: "1 1 320px", minWidth: 260 }}>
                            <p style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#1a1733" }}>
                              {sp.name || "(no name)"}
                              {isNew(sp.submittedAt) && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, background: "#f5f3ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px", verticalAlign: "middle" }}>NEW</span>}
                              {sp.decision === "approved" && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 7px", verticalAlign: "middle" }}>CONFIRMED · SESSION {sp.assignedSession}</span>}
                              {sp.decision === "pending" && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, background: "#fdf4e8", color: "#b35c00", borderRadius: 4, padding: "2px 7px", verticalAlign: "middle" }}>PENDING · SESSION {sp.assignedSession}</span>}
                              {sp.decision === "rejected" && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "2px 7px", verticalAlign: "middle" }}>DECLINED</span>}
                            </p>
                            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b6480" }}>
                              {[sp.role, sp.company].filter(Boolean).join(" · ") || "—"}
                            </p>
                            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9b8fcf" }}>
                              {sp.email}
                              {sp.linkedin && <> · <a href={sp.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: "#5c4eb5", fontWeight: 600 }}>LinkedIn</a></>}
                              {sp.submittedAt && <> · applied {sp.submittedAt.slice(0, 10)}</>}
                            </p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                              {sp.format && <span style={{ fontSize: 11, fontWeight: 700, background: "#f0eef8", color: "#5c4eb5", borderRadius: 4, padding: "2px 8px" }}>{fmt(sp)}</span>}
                              {sp.spokenBefore && <span style={{ fontSize: 11, fontWeight: 700, background: "#fafafa", color: "#6b6480", borderRadius: 4, padding: "2px 8px" }}>{sp.spokenBefore}</span>}
                              {sp.anyDate && <span style={{ fontSize: 11, fontWeight: 700, background: "#eafaf7", color: "#0e7c6b", borderRadius: 4, padding: "2px 8px" }}>flexible on dates</span>}
                              {/^yes/i.test(sp.series || "") && <span style={{ fontSize: 11, fontWeight: 700, background: "#fff8e6", color: "#8a6300", borderRadius: 4, padding: "2px 8px" }}>★ open to a series</span>}
                              {/^maybe/i.test(sp.series || "") && <span style={{ fontSize: 11, fontWeight: 700, background: "#fafafa", color: "#6b6480", borderRadius: 4, padding: "2px 8px" }}>series: wants to talk</span>}
                              {!sp.consent && <span style={{ fontSize: 11, fontWeight: 800, background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "2px 8px" }}>⚠ no recording consent</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px 22px" }}>
                          {[
                            ["Session title", sp.topicTitle],
                            ["What they would cover", sp.topicSummary],
                            ["Three takeaways", sp.takeaways],
                            ["Why it matters now", sp.whyNow],
                            ["Bio", sp.bio],
                            ["Follow-up session ideas", sp.seriesIdeas],
                            ["Resources they would share", sp.resources],
                            ["Anything else", sp.anythingElse],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label}>
                              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf" }}>{label}</p>
                              <p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.5, color: "#3a3453", whiteSpace: "pre-wrap" }}>{value}</p>
                            </div>
                          ))}
                        </div>

                        {(sp.deckLink || sp.deckFileUrl) && (
                          <p style={{ margin: "12px 0 0", fontSize: 12.5 }}>
                            {sp.deckLink && <a href={sp.deckLink} target="_blank" rel="noopener noreferrer" style={{ color: "#5c4eb5", fontWeight: 700, marginRight: 12 }}>Their link →</a>}
                            {sp.deckFileUrl && <a href={`/api/admin/tf-file?u=${encodeURIComponent(sp.deckFileUrl)}`} target="_blank" rel="noopener noreferrer" style={{ color: "#5c4eb5", fontWeight: 700 }}>Attached deck →</a>}
                          </p>
                        )}

                        {(sp.rankedSessions?.length > 0 || sp.audience?.length > 0) && (
                          <div style={{ marginTop: 12, display: "flex", gap: 22, flexWrap: "wrap" }}>
                            {sp.rankedSessions?.length > 0 && (
                              <div>
                                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf" }}>Ranked choices</p>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                                  {sp.rankedSessions.map((n, i) => {
                                    const sl = slots.find(x => x.n === n);
                                    const isTaken = taken.has(n) && sp.assignedSession !== n;
                                    return (
                                      <span key={n} style={{
                                        fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: "3px 8px",
                                        border: "1px solid #e8e4f5",
                                        background: sp.assignedSession === n ? "#e8f8f0" : isTaken ? "#f4f2fa" : "#f5f3ff",
                                        color: sp.assignedSession === n ? "#1a6e42" : isTaken ? "#b3aacd" : "#3d2f8a",
                                        textDecoration: isTaken ? "line-through" : "none",
                                      }}>
                                        <b>{i + 1}.</b> #{n} {sl ? sl.day : ""}{isTaken ? " (taken)" : ""}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {sp.audience?.length > 0 && (
                              <div>
                                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf" }}>Aimed at</p>
                                <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "#3a3453", maxWidth: 420 }}>{sp.audience.join(" · ")}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ marginTop: 12 }}>
                          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf" }}>
                            Every date they can do {sp.anyDate ? "(any)" : `(${sp.pickedSpecificDates.length})`}
                          </p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                            {(sp.anyDate ? [] : sp.pickedSpecificDates).map(n => {
                              const sl = slots.find(x => x.n === n);
                              const isTaken = taken.has(n) && sp.assignedSession !== n;
                              return (
                                <span key={n} style={{
                                  fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: "3px 8px",
                                  background: sp.assignedSession === n ? "#e8f8f0" : isTaken ? "#f4f2fa" : "#fff",
                                  color: sp.assignedSession === n ? "#1a6e42" : isTaken ? "#b3aacd" : "#5c4eb5",
                                  border: "1px solid #e8e4f5",
                                  textDecoration: isTaken ? "line-through" : "none",
                                }}>
                                  #{n} {sl ? `${sl.day}` : ""}{isTaken ? " (taken)" : ""}
                                </span>
                              );
                            })}
                            {sp.anyDate && <span style={{ fontSize: 12, color: "#0e7c6b", fontWeight: 700 }}>Said any open slot works</span>}
                          </div>
                        </div>

                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0edf9", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {!sp.decision ? (
                            <>
                              <select value={pick} onChange={e => setSlotPick({ ...slotPick, [sp.id]: e.target.value })} style={{ border: "1px solid #e8e4f5", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontFamily: "inherit", color: "#3d2f8a", fontWeight: 600, background: "#fff" }}>
                                <option value="">Pick a slot…</option>
                                {openSlots.map(sl => (
                                  <option key={sl.n} value={sl.n}>
                                    {sp.requestedSessions.includes(sl.n) ? "★ " : ""}Session {sl.n} · {sl.day} · {sl.time}
                                  </option>
                                ))}
                              </select>
                              <button disabled={matchBusy || !pick} onClick={() => doSpeakerDecide(sp, "pending", Number(pick))} style={{ border: "none", borderRadius: 8, padding: "7px 14px", background: pick ? "#b35c00" : "#e0d9c9", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: pick ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                                ⏳ Offer &amp; hold
                              </button>
                              <button disabled={matchBusy || !pick} onClick={() => doSpeakerDecide(sp, "approved", Number(pick))} style={{ border: "none", borderRadius: 8, padding: "7px 14px", background: pick ? "#1a6e42" : "#cfd8d2", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: pick ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                                ✓ Confirm &amp; book
                              </button>
                              <button disabled={matchBusy} onClick={() => doSpeakerDecide(sp, "rejected")} style={{ border: "none", borderRadius: 8, padding: "7px 14px", background: "#fef0f0", color: "#c0392b", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                ✗ Decline
                              </button>
                              {notRequested && <span style={{ fontSize: 11.5, color: "#b35c00", fontWeight: 700 }}>Heads up: they didn&apos;t pick that date, so confirm it with them.</span>}
                              {openSlots.length === 0 && <span style={{ fontSize: 11.5, color: "#c0392b", fontWeight: 700 }}>All 22 slots are booked.</span>}
                            </>
                          ) : (
                            <>
                              <a href={`mailto:${sp.email}?subject=${encodeURIComponent(sp.decision === "approved" ? `You're speaking at Uplift, Session ${sp.assignedSession}` : "Your Uplift speaker application")}`} style={{ border: "1px solid #e8e4f5", borderRadius: 8, padding: "6px 12px", background: "#fff", color: "#5c4eb5", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                                ✉ Email {sp.first || "them"}
                              </a>
                              {sp.decision === "approved" && slots.find(sl => sl.n === sp.assignedSession) && (
                                <a href={slots.find(sl => sl.n === sp.assignedSession).url} target="_blank" rel="noopener noreferrer" style={{ border: "1px solid #e8e4f5", borderRadius: 8, padding: "6px 12px", background: "#fff", color: "#5c4eb5", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                                  Luma event →
                                </a>
                              )}
                              {sp.decision === "pending" && (
                                <button disabled={matchBusy} onClick={() => doSpeakerDecide(sp, "approved", sp.assignedSession)} style={{ border: "none", borderRadius: 8, padding: "6px 12px", background: "#1a6e42", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                  ✓ They replied, confirm Session {sp.assignedSession}
                                </button>
                              )}
                              <button disabled={matchBusy} onClick={() => doSpeakerDecide(sp, "clear")} style={{ border: "1px solid #e8e4f5", borderRadius: 8, padding: "6px 12px", background: "#fff", color: "#9b8fcf", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>undo</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
                    Offer &amp; hold marks the slot pending and holds it while you wait for their reply. Confirm &amp; book marks it confirmed. Either way the date leaves the board for everyone else, and it all saves to the FallSpeakers sheet tab.
                  </p>
                </div>
              </>
            );
          })()}

          {tab === "today" && (() => {
            const todo = [];
            // Kickoff. Same date the deadline engine uses in
            // pages/api/admin/fall-overview.js.
            const PROGRAM_START = new Date("2026-09-09");
            const fs = data?.founders || [];
            const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
            const freshOf = (list) => (list || []).filter(a => a.submittedAt && new Date(a.submittedAt).getTime() > weekAgo);
            const newMenteeApps = freshOf(people?.mentees).filter(a => !a.isTest);
            const newMentorApps = freshOf(people?.mentors);
            if (newMenteeApps.length) todo.push({ icon: "📥", level: "info", text: `${newMenteeApps.length} new mentee application${newMenteeApps.length === 1 ? "" : "s"} this week awaiting a roster decision`, sub: newMenteeApps.slice(0, 6).map(a => `${a.first} ${a.last} (${a.company || "no company"})`).join(" · ") + (newMenteeApps.length > 6 ? ` · +${newMenteeApps.length - 6} more` : ""), go: "applications" });
            if (newMentorApps.length) todo.push({ icon: "🧑‍🏫", level: "info", text: `${newMentorApps.length} new mentor application${newMentorApps.length === 1 ? "" : "s"} this week to review for the pool`, sub: newMentorApps.slice(0, 6).map(m => `${m.name} (${m.company || "no company"})`).join(" · "), go: "applications" });
            // Today is a queue, not a ledger. One line per kind of work with a
            // count that goes up, the way the wins line already reads, instead
            // of a fresh line per person — thirty-nine rows saying the same
            // thing is the same information as one row saying it once. Names
            // still ride along underneath, so nothing is hidden.
            const roll = (list, icon, level, label, go, subOf) => {
              if (!list.length) return;
              todo.push({
                icon, level, go,
                text: label(list.length),
                sub: list.slice(0, 6).map(subOf).join(" · ") + (list.length > 6 ? ` · +${list.length - 6} more` : ""),
              });
            };
            roll(fs.filter(f => f.status === "at-risk"), "🚨", "risk",
              n => `${n} founder${n === 1 ? " is" : "s are"} at risk`, "founders",
              f => `${f.name}${f.flags.length ? ` (${f.flags.join(", ")})` : ""}`);
            roll(fs.filter(f => f.status === "needs-attention"), "⚠️", "warn",
              n => `${n} founder${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} attention`, "founders",
              f => `${f.name}${f.flags.length ? ` (${f.flags.join(", ")})` : ""}`);
            // Nobody is behind on a mentor before the program exists. Until
            // kickoff the waiting room lives on the Matching tab and in its own
            // counter, where it belongs; after Sept 9 an unmatched founder is a
            // real gap — a churned mentor, a rematch — and earns a line here.
            if (new Date() >= PROGRAM_START) {
              roll(fs.filter(f => !f.mentor && f.status !== "churned"), "🤝", "warn",
                n => `${n} founder${n === 1 ? "" : "s"} still need${n === 1 ? "s" : ""} a mentor`, "matching",
                f => `${f.name} (${f.company || "no company"})`);
            }
            // "A stronger fit is available" used to be pure greed: it would push a
            // rematch without noticing that the mentor it wanted is somebody
            // else's only good option, and acting on it would quietly demote a
            // founder nobody was looking at. It now only fires for a mentor the
            // cohort plan leaves unused, so taking the advice costs no one.
            const spokenFor = new Set((bestForCohort?.pairs || []).map(pr => pr.mentor.id));
            const upgrades = (people?.mentees || []).filter(a => a.matchedMentorId && !a.isTest).map(a => {
              const current = (people?.mentors || []).find(mt => mt.id === a.matchedMentorId);
              if (!current) return null;
              const cs = scoreMentor(a, current).score;
              const best = (people?.mentors || [])
                .filter(mt => mt.id !== a.matchedMentorId && isEligibleMentor(mt) && !samePerson(a, mt) && !spokenFor.has(mt.id))
                .map(mt => ({ mt, sc: scoreMentor(a, mt).score })).sort((x, y) => y.sc - x.sc)[0];
              return best && best.sc > cs ? { a, best, cs } : null;
            }).filter(Boolean);
            roll(upgrades, "⬆", "info",
              n => `${n} matched founder${n === 1 ? " has" : "s have"} a stronger mentor available that nobody waiting needs`, "matching",
              u => `${u.a.first} ${u.a.last} → ${u.best.mt.name} (${u.best.sc} vs ${u.cs})`);
            roll(fs.filter(f => f.mentor && !f.gateComplete && f.status === "on-track"), "🔓", "info",
              n => `${n} mentor reveal${n === 1 ? " is" : "s are"} waiting on a Week 1 gate`, "founders",
              f => `${f.name} (missing ${[!f.gate.onboarded && "onboarding", !f.gate.quizPassed && "quiz", !f.gate.deepWorkDone && "Deep Work"].filter(Boolean).join(", ")})`);
            if (people) {
              const daysLeft = Math.max(0, Math.ceil((new Date("2026-09-03") - new Date()) / 86400000));
              if (people.menteeCount < 100) todo.push({ icon: "🎯", level: daysLeft <= 4 ? "warn" : "info", text: `${100 - people.menteeCount} more mentee applications needed by Sept 3 (${daysLeft} days left)`, sub: `${people.menteeCount}/100 received · ${people.mentees.filter(a => a.meetsRequirements).length}/80 meet requirements`, go: "overview" });
              if (people.mentorCount < 100) todo.push({ icon: "🎯", level: daysLeft <= 4 ? "warn" : "info", text: `${100 - people.mentorCount} more mentor applications needed by Sept 3 (${daysLeft} days left)`, sub: `${people.mentorCount}/100 received`, go: "overview" });
            }
            if (sessions?.sessions) {
              const noInfo = sessions.sessions.filter(needsSessionInfo).length;
              if (noInfo > 0) todo.push({ icon: "🎙", level: "warn", text: `${noInfo} of ${sessions.sessions.length} educational sessions need a speaker, title, and description`, sub: "Book them from the Speakers tab, then name the Luma events", go: "speakers" });
            }
            if (speakers?.counts?.undecided > 0) {
              todo.push({ icon: "🎤", level: "warn", text: `${speakers.counts.undecided} speaker application${speakers.counts.undecided === 1 ? "" : "s"} waiting on a yes or no`, sub: `${speakers.counts.slotsFilled}/${speakers.counts.slotsTotal} session slots booked · applicants were promised an answer within one business day`, go: "speakers" });
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
                      const test = !!a.isTest;
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
                          {a.isTest
                            ? <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "1px 6px" }}>TEST ACCOUNT</span>
                            : a.inRoster && <a href={`/fall/${a.inRoster}`} target="_blank" rel="noopener noreferrer" title="Open their portal" style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "1px 6px", textDecoration: "none" }}>PORTAL ↗</a>}
                          <div style={{ fontSize: 11.5, color: "#9b8fcf" }}>{a.email}</div>
                        </td>
                        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                          {a.decision === "approved" && <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px", marginRight: 6 }}>APPROVED</span>}
                          {a.upliftId && <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "monospace", background: "#f0eef8", color: "#5c4eb5", borderRadius: 4, padding: "2px 7px", marginRight: 6 }}>{a.upliftId}</span>}
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
                          {m.isTest && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "1px 6px" }}>TEST ACCOUNT</span>}
                          {m.assignedTo.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "1px 6px" }}>MATCHED</span>}
                          <div style={{ fontSize: 11.5, color: "#9b8fcf" }}>{m.email}</div>
                        </td>
                        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                          {m.decision === "approved" && <span style={{ fontSize: 11, fontWeight: 800, background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "2px 8px", marginRight: 6 }}>APPROVED</span>}
                          {m.upliftId && <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "monospace", background: "#f0eef8", color: "#5c4eb5", borderRadius: 4, padding: "2px 7px", marginRight: 6 }}>{m.upliftId}</span>}
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
            const unmatchedMentees = waitingForMatch;
            const sel = people.mentees.find(a => a.id === selectedMentee) || null;
            const plan = bestForCohort;
            const eligibleMentors = people.mentors.filter(isEligibleMentor);

            // Every mentor ranked for this founder on the pair score alone —
            // the old view, kept underneath the three picks for when the
            // recommendation needs to be overruled by hand.
            const scored = sel ? people.mentors.map(mt => ({ ...mt, ...scoreMentor(sel, mt) })).sort((a, b) => b.score - a.score) : [];

            // How the cohort plan differs from taking each founder's own best.
            const tierOf = (pair) => (pair ? gradeOf(pair.score).tier : -1);
            const lifted = unmatchedMentees.filter(a => tierOf(plan?.byMentee[a.id]) > tierOf(greedyForCohort?.byMentee[a.id])).length;
            const yielded = unmatchedMentees.filter(a => tierOf(plan?.byMentee[a.id]) < tierOf(greedyForCohort?.byMentee[a.id])).length;

            // What a click actually does to everybody else. The cohort cost is
            // the honest headline: a pick that reshuffles five founders and
            // leaves the group exactly as strong is free, and saying otherwise
            // would make the warnings worthless.
            const names = (list) => list.slice(0, 3).map(d => `${d.mentee.first} ${d.mentee.last} ${d.from.short} → ${d.to ? d.to.short : "no mentor"}`).join(" · ")
              + (list.length > 3 ? ` and ${list.length - 3} more` : "");
            const impactOf = (pick) => {
              if (pick.cohortCost > 0.05) {
                return {
                  tone: "warn",
                  text: pick.downgraded.length
                    ? `Costs the group: ${names(pick.downgraded)}`
                    : "Leaves the group slightly weaker overall.",
                };
              }
              if (pick.downgraded.length) {
                return { tone: "ok", text: `Even trade: ${names(pick.downgraded)}, and somebody else comes up to match. Group is no weaker.` };
              }
              if (pick.moved.length) {
                return { tone: "ok", text: `${pick.moved.length} other founder${pick.moved.length > 1 ? "s" : ""} swap mentors, nobody drops a grade.` };
              }
              return { tone: "ok", text: "Nobody else's plan changes." };
            };

            const chip = (label, n, bg, color) => (
              <span key={label} style={{ background: bg, color, borderRadius: 6, padding: "3px 9px", fontSize: 11.5, fontWeight: 700 }}>
                {n} {label}
              </span>
            );

            return (
            <>
              {/* The whole hive, before any single click. */}
              <div style={{ ...card, borderLeft: "4px solid #5c4eb5" }}>
                <p style={kicker}>Cohort plan · {unmatchedMentees.length} waiting · {cohort?.slotsOpen ?? 0} mentor slot{(cohort?.slotsOpen ?? 0) === 1 ? "" : "s"} open</p>
                {eligibleMentors.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No approved mentors yet, so there is nothing to plan. Approve mentors on the Mentor Apps tab.</p>
                ) : unmatchedMentees.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Everyone approved has a mentor. Nothing waiting.</p>
                ) : (<>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                    {plan.summary.perfect > 0 && chip("perfect", plan.summary.perfect, "#e8f8f0", "#1a6e42")}
                    {plan.summary.excellent > 0 && chip("excellent", plan.summary.excellent, "#e8f8f0", "#1a6e42")}
                    {plan.summary.strong > 0 && chip("strong", plan.summary.strong, "#eafaf7", "#0e7c6b")}
                    {plan.summary.good > 0 && chip("good", plan.summary.good, "#fffbeb", "#7a5c00")}
                    {chip("weak", plan.summary.weak, plan.summary.weak ? "#fef0f0" : "#f0eef8", plan.summary.weak ? "#c0392b" : "#9b8fcf")}
                    {plan.summary.unmatched > 0 && chip("no mentor available", plan.summary.unmatched, "#fef0f0", "#c0392b")}
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 13, color: "#37324e", lineHeight: 1.6 }}>
                    This is the best set of pairings for all {unmatchedMentees.length} at once, not the best next click.
                    Going down the list newest-first instead would leave{" "}
                    <strong>{greedyForCohort.summary.weak} weak</strong> and{" "}
                    <strong>{greedyForCohort.summary.excellentPlus} excellent-or-better</strong>, against{" "}
                    <strong>{plan.summary.weak} weak</strong> and <strong>{plan.summary.excellentPlus} excellent-or-better</strong> here.
                    {lifted > 0 && <> {lifted} founder{lifted > 1 ? "s" : ""} come up a grade because {yielded} give up a mentor they would have grabbed first.</>}
                  </p>
                  {cohort?.allowMultiple && (
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#b9770e" }}>
                      ⚠ Not enough approved mentors for one each, so the plan doubles some up — never past the number of sessions they offered.
                    </p>
                  )}
                  <button onClick={() => setShowCohortPlan(v => !v)} style={{ border: "1px solid #e8e4f5", borderRadius: 6, padding: "4px 10px", background: "#fff", color: "#5c4eb5", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {showCohortPlan ? "Hide the pairing list" : `Show all ${plan.pairs.length} planned pairings`}
                  </button>
                  {showCohortPlan && (
                    <div style={{ marginTop: 10, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <tbody>
                          {plan.pairs.map(pr => {
                            const g = gradeOf(pr.score);
                            const grab = greedyForCohort.byMentee[pr.mentee.id];
                            const gave = grab && grab.mentor.id !== pr.mentor.id && gradeOf(grab.score).tier > g.tier;
                            return (
                              <tr key={pr.mentee.id} style={{ borderTop: "1px solid #f0edf9" }}>
                                <td style={{ padding: "6px 10px 6px 0", fontWeight: 700, whiteSpace: "nowrap" }}>
                                  <button onClick={() => setSelectedMentee(pr.mentee.id)} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#3d2f8a", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>
                                    {pr.mentee.first} {pr.mentee.last}
                                  </button>
                                </td>
                                <td style={{ padding: "6px 10px", color: "#6b6480", whiteSpace: "nowrap" }}>→ {pr.mentor.name}{pr.second ? " (2nd founder)" : ""}</td>
                                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                                  <span style={{ background: g.bg, color: g.color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{g.short} · {pr.score}</span>
                                </td>
                                <td style={{ padding: "6px 0 6px 10px", fontSize: 11.5, color: "#b9770e" }}>
                                  {gave ? `gives up ${grab.mentor.name} (${gradeOf(grab.score).short}) so the group nets out better` : ""}
                                </td>
                              </tr>
                            );
                          })}
                          {plan.unassigned.map(a => (
                            <tr key={a.id} style={{ borderTop: "1px solid #f0edf9" }}>
                              <td style={{ padding: "6px 10px 6px 0", fontWeight: 700, whiteSpace: "nowrap" }}>{a.first} {a.last}</td>
                              <td colSpan={3} style={{ padding: "6px 10px", fontSize: 11.5, color: "#c0392b" }}>no mentor slot left — approve more mentors</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <div style={card}>
                  <p style={kicker}>Awaiting Match · {unmatchedMentees.length} approved · newest first</p>
                  {unmatchedMentees.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>No approved applicants waiting. Approve founders on the Mentee Apps tab and they land here.</p>}
                  {unmatchedMentees.map(a => {
                    const mine = plan?.byMentee[a.id];
                    const g = mine ? gradeOf(mine.score) : null;
                    return (
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
                      {/* Their place in the whole-cohort plan, so the queue reads
                          as a group rather than a stack of separate decisions. */}
                      {g && <p style={{ margin: "3px 0 0", fontSize: 11.5, color: g.color, fontWeight: 700 }}>plan: {mine.mentor.name} · {g.short}</p>}
                      {!mine && <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#c0392b", fontWeight: 700 }}>plan: no mentor slot left</p>}
                    </div>
                  );})}
                </div>
                <div style={card}>
                  {!sel && <><p style={kicker}>Mentor Pool · {eligibleMentors.length} approved</p><p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Select a founder on the left for the three picks that work best once everybody else still waiting is accounted for.</p></>}
                  {sel && (
                    <>
                      <p style={kicker}>Top 3 for {sel.first} {sel.last} · weighed against the other {Math.max(0, unmatchedMentees.length - 1)} waiting</p>
                      {(!recs || recs.picks.length === 0) && (
                        <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>
                          {sel.matchedMentorId ? "Already matched — unmatch them on the Matched tab to plan again." : "No approved mentor has an open slot. Approve mentors on the Mentor Apps tab."}
                        </p>
                      )}
                      {recs?.picks.map((pick, i) => {
                        const im = impactOf(pick);
                        return (
                          <div key={pick.mentor.id} style={{
                            display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 0",
                            borderTop: i === 0 ? "none" : "1px solid #f0edf9",
                          }}>
                            <span style={{
                              minWidth: 100, borderRadius: 6, flexShrink: 0, padding: "5px 8px",
                              background: pick.grade.bg, color: pick.grade.color,
                              textAlign: "center", fontSize: 11, fontWeight: 800, lineHeight: 1.35,
                            }}>
                              {i + 1}. {pick.grade.short}
                              <br /><span style={{ fontWeight: 600, opacity: 0.7 }}>score {pick.score}</span>
                            </span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                                <button onClick={() => setProfile({ kind: "mentor", person: pick.mentor })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#1a1733", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{pick.mentor.name}</button> <span style={{ fontWeight: 400, color: "#9b8fcf" }}>· {pick.mentor.company || ""}</span>
                                {pick.isCohortPick && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#efeaff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px" }}>BEST FOR THE GROUP</span>}
                                {pick.second && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "1px 6px" }}>2ND FOUNDER</span>}
                              </p>
                              <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "#6b6480" }}>
                                {pick.reasons.length ? pick.reasons.join(" · ") : "no signal overlap"}{pick.mentor.tier ? ` · ${pick.mentor.tier}` : ""}
                              </p>
                              {/* The consequence, spelled out. This is the part a
                                  one-founder-at-a-time view cannot tell you. */}
                              <p style={{ margin: "4px 0 0", fontSize: 11.5, fontWeight: 700, color: im.tone === "warn" ? "#b35c00" : "#1a6e42" }}>
                                {im.tone === "warn" ? "⚠ " : "✓ "}{im.text}
                              </p>
                            </div>
                            <button disabled={matchBusy} onClick={() => doMatch("match", sel, pick.mentor)} style={{
                              border: "none", borderRadius: 6, padding: "6px 14px", flexShrink: 0,
                              background: i === 0 ? "#5c4eb5" : "#fff", color: i === 0 ? "#fff" : "#5c4eb5",
                              boxShadow: i === 0 ? "none" : "inset 0 0 0 1px #d9d2f5",
                              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: matchBusy ? 0.6 : 1,
                            }}>
                              {matchBusy ? "…" : "Match"}
                            </button>
                          </div>
                        );
                      })}
                      {recs?.picks.length > 0 && (
                        <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic", lineHeight: 1.6 }}>
                          Ranked by re-solving all {unmatchedMentees.length} pairings with each mentor locked to {sel.first}, so a mentor who is slightly better here and costly elsewhere sinks. Their own highest-scoring mentor is{" "}
                          {(() => {
                            const raw = recs.all[0] && [...recs.all].sort((x, y) => y.score - x.score)[0];
                            return raw ? `${raw.mentor.name} (${raw.score})` : "—";
                          })()}.
                        </p>
                      )}
                      <button onClick={() => setShowAllMentors(v => !v)} style={{ marginTop: 10, border: "1px solid #e8e4f5", borderRadius: 6, padding: "4px 10px", background: "#fff", color: "#5c4eb5", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {showAllMentors ? "Hide the full pool" : "Override: show every mentor by pair score"}
                      </button>
                      {showAllMentors && scored.slice(0, 12).map(mt => {
                        const cand = recs?.all.find(c => c.mentor.id === mt.id);
                        return (
                        <div key={mt.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #f0edf9" }}>
                          <span style={{
                            minWidth: 96, borderRadius: 6, flexShrink: 0, padding: "4px 8px",
                            background: gradeOf(mt.score).bg, color: gradeOf(mt.score).color,
                            textAlign: "center", fontSize: 11, fontWeight: 800, lineHeight: 1.3,
                          }}>{gradeOf(mt.score).label}<br /><span style={{ fontWeight: 600, opacity: 0.7 }}>score {mt.score}</span></span>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                              <button onClick={() => setProfile({ kind: "mentor", person: mt })} style={{ border: "none", background: "none", padding: 0, fontWeight: 700, color: "#1a1733", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{mt.name}</button> <span style={{ fontWeight: 400, color: "#9b8fcf" }}>· {mt.company || ""}</span>
                              {!isEligibleMentor(mt) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "1px 6px" }}>{mt.isTest ? "TEST ACCOUNT" : mt.decision === "rejected" ? "REJECTED" : "NOT APPROVED"}</span>}
                              {mt.assignedTo.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "1px 6px" }}>{mt.assignedTo.length} MENTEE{mt.assignedTo.length > 1 ? "S" : ""}</span>}
                            </p>
                            <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "#6b6480" }}>
                              {mt.reasons.length ? mt.reasons.join(" · ") : "no signal overlap"}{mt.tier ? ` · ${mt.tier}` : ""}
                            </p>
                            {cand && cand.cohortCost > 0.05 && cand.downgraded.length > 0 && (
                              <p style={{ margin: "3px 0 0", fontSize: 11.5, fontWeight: 700, color: "#b35c00" }}>
                                ⚠ {cand.downgraded.slice(0, 2).map(d => `${d.mentee.first} ${d.mentee.last} ${d.from.short} → ${d.to ? d.to.short : "no mentor"}`).join(" · ")}
                              </p>
                            )}
                          </div>
                          <button disabled={matchBusy} onClick={() => doMatch("match", sel, mt)} style={{
                            border: "none", borderRadius: 6, padding: "6px 14px", flexShrink: 0,
                            background: "#fff", color: "#5c4eb5", boxShadow: "inset 0 0 0 1px #d9d2f5",
                            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: matchBusy ? 0.6 : 1,
                          }}>
                            {matchBusy ? "…" : "Match"}
                          </button>
                        </div>
                      );})}
                    </>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "#9b8fcf", lineHeight: 1.6 }}>
                Matches save to the FallMatches sheet tab instantly and survive new applications arriving; nothing is imported or frozen. The plan is advisory and recomputes every time you match somebody, so it always reflects who is actually left. Portal mentor reveals still come from the roster file until the ingest wires these matches through automatically.
              </p>
            </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
