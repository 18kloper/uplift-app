import { useState, useEffect } from "react";
import Head from "next/head";

const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };
const COHORTS = ["All", 1, 2, 3, 4, 5, "Test"]; // filter by number, display with name

const STATUS_CONFIG = {
  "at-risk":         { label: "At Risk",          color: "#c0392b", bg: "#fef0f0", dot: "#e74c3c" },
  "needs-attention": { label: "Needs Attention",  color: "#b35c00", bg: "#fff3e0", dot: "#f39c12" },
  "on-track":        { label: "On Track",          color: "#1a6e42", bg: "#e8f8f0", dot: "#27ae60" },
};

// ─── Password gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const attempt = () => {
    if (input.trim().toLowerCase() === "admin") {
      onAuthenticated();
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 380,
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px", fontSize: 24,
        }}>🔒</div>
        <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#1a1733" }}>
          Uplift Admin
        </p>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#9b8fcf" }}>
          Internal team dashboard · Summer 2026
        </p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Enter admin password"
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14,
            border: error ? "2px solid #e74c3c" : "2px solid #e8e4f5",
            borderRadius: 8, outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", marginBottom: 12,
            background: error ? "#fff5f5" : "#fff",
            transition: "border-color 0.2s",
          }}
          autoFocus
        />
        {error && (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#e74c3c", fontWeight: 600 }}>
            Incorrect password
          </p>
        )}
        <button
          onClick={attempt}
          style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 700,
            background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

// ─── Dots indicator (e.g. 2/3 filled) ─────────────────────────────────────────
function Dots({ filled, total, color = "#5c4eb5" }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: "50%",
          background: i < filled ? color : "#e8e4f5",
        }} />
      ))}
      <span style={{ fontSize: 11, color: "#9b8fcf", marginLeft: 3 }}>
        {filled}/{total}
      </span>
    </div>
  );
}

// ─── Mini progress bar ─────────────────────────────────────────────────────────
function MiniBar({ value, total, color = "#5c4eb5" }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, background: "#e8e4f5", borderRadius: 4, height: 6, minWidth: 60 }}>
        <div style={{
          width: `${pct}%`, height: 6, borderRadius: 4,
          background: pct === 100 ? "#27ae60" : color,
          transition: "width 0.4s",
        }} />
      </div>
      <span style={{ fontSize: 11, color: "#6b6480", whiteSpace: "nowrap" }}>
        {value}/{total}
      </span>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────
function Dashboard({ data, refreshedAt }) {
  const [activeCohort, setActiveCohort] = useState("All");
  const [search, setSearch] = useState("");

  const { mentees = [] } = data;

  const filtered = mentees.filter(m => {
    const cohortMatch = activeCohort === "All"
      ? true
      : activeCohort === "Test"
        ? m.isTest
        : !m.isTest && String(m.cohort) === String(activeCohort);
    const searchMatch = !search ||
      `${m.first} ${m.last} ${m.company}`.toLowerCase().includes(search.toLowerCase());
    return cohortMatch && searchMatch;
  });

  const realMentees = mentees.filter(m => !m.isTest);
  const counts = {
    total:     realMentees.length,
    atRisk:    realMentees.filter(m => m.status === "at-risk").length,
    attention: realMentees.filter(m => m.status === "needs-attention").length,
    onTrack:   realMentees.filter(m => m.status === "on-track").length,
  };

  const cohortCounts = {};
  COHORTS.slice(1).forEach(c => {
    cohortCounts[c] = c === "Test"
      ? mentees.filter(m => m.isTest).length
      : mentees.filter(m => !m.isTest && String(m.cohort) === String(c)).length;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        padding: "24px 32px", color: "#fff",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65 }}>
                Internal · TechUnited:NJ
              </p>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Uplift Summer 2026 — Admin Dashboard</h1>
            </div>
            {refreshedAt && (
              <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
                Live from Google Sheets · {new Date(refreshedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 60px" }}>

        {/* Disclaimer */}
        <div style={{
          background: "#fffbeb", border: "1px solid #f5d97a", borderRadius: 10,
          padding: "14px 20px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, color: "#7a5c00", lineHeight: 1.6 }}>
            <strong>For internal use only.</strong> This dashboard is a high-level overview designed to assist the tracking and support of the Uplift program. Data is synced from Google Sheets and may not reflect the most recent manual updates.{" "}
            <strong>Please verify against the master tracker sheet before approving, flagging, or making any program decisions.</strong>
          </p>
        </div>

        {/* Summary stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Mentees",    value: counts.total,     color: "#5c4eb5", bg: "#f3f0ff" },
            { label: "At Risk",          value: counts.atRisk,    color: "#c0392b", bg: "#fef0f0" },
            { label: "Needs Attention",  value: counts.attention, color: "#b35c00", bg: "#fff3e0" },
            { label: "On Track",         value: counts.onTrack,   color: "#1a6e42", bg: "#e8f8f0" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              background: bg, borderRadius: 12, padding: "18px 22px",
              border: `1px solid ${color}22`,
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color, opacity: 0.8 }}>{label}</p>
              <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Cohort filter + search */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {COHORTS.map(c => {
              const active = activeCohort === c;
              const count = c === "All" ? mentees.length : cohortCounts[c] || 0;
              const label = c === "All" ? "All Cohorts" : c === "Test" ? "🧪 Test Accounts" : `${c} · ${COHORT_NAMES[c]}`;
              return (
                <button key={c} onClick={() => setActiveCohort(c)} style={{
                  padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: active ? 700 : 500,
                  border: active ? "2px solid #5c4eb5" : "2px solid #e8e4f5",
                  background: active ? "#5c4eb5" : "#fff",
                  color: active ? "#fff" : "#6b6480",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  {label} <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Search by name or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              marginLeft: "auto", padding: "8px 14px", fontSize: 13,
              border: "2px solid #e8e4f5", borderRadius: 20, outline: "none",
              fontFamily: "inherit", minWidth: 220,
            }}
          />
        </div>

        {/* Results count */}
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#9b8fcf" }}>
          Showing {filtered.length} mentee{filtered.length !== 1 ? "s" : ""}
          {activeCohort === "Test" ? " (test accounts)" : activeCohort !== "All" ? ` in Cohort ${activeCohort} · ${COHORT_NAMES[activeCohort]}` : ""}
          {search ? ` matching "${search}"` : ""}
        </p>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 90px 130px 110px 110px 110px 1fr",
            padding: "12px 20px", background: "#f7f5ff",
            borderBottom: "1px solid #e8e4f5",
          }}>
            {["Mentee", "Cohort", "Status", "Milestones", "Mentor Sessions", "Edu Sessions", "Flags"].map(h => (
              <p key={h} style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9b8fcf", fontSize: 14 }}>
              No mentees match your filters.
            </div>
          ) : (
            filtered.map((m, i) => {
              const sc = STATUS_CONFIG[m.status];
              return (
                <div key={m.slug} style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 90px 130px 110px 110px 110px 1fr",
                  padding: "14px 20px", alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f5f3ff" : "none",
                  background: m.status === "at-risk" ? "#fffafa" : "#fff",
                  transition: "background 0.15s",
                }}>
                  {/* Name + company */}
                  <div>
                    <p style={{ margin: "0 0 1px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>
                      {m.first} {m.last}
                    </p>
                    {m.company && (
                      <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf" }}>{m.company}</p>
                    )}
                  </div>

                  {/* Cohort */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: "#5c4eb5",
                    background: "#f3f0ff", borderRadius: 5, padding: "3px 8px",
                    display: "inline-block", whiteSpace: "nowrap",
                  }}>
                    {m.cohort} · {COHORT_NAMES[m.cohort] || m.cohort}
                  </span>

                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: sc.color,
                      background: sc.bg, borderRadius: 5, padding: "3px 8px",
                    }}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Milestones */}
                  <MiniBar value={m.milestoneCount} total={13} />

                  {/* Mentor sessions */}
                  <Dots filled={m.mentorCount} total={3} color="#5c4eb5" />

                  {/* Edu sessions */}
                  <Dots filled={m.eduCount} total={3} color="#2a7fd4" />

                  {/* Flags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {m.flags.length === 0 ? (
                      <span style={{ fontSize: 11, color: "#27ae60", fontWeight: 600 }}>✓ All clear</span>
                    ) : (
                      m.flags.slice(0, 3).map((f, fi) => (
                        <span key={fi} style={{
                          fontSize: 10, fontWeight: 600,
                          background: m.status === "at-risk" ? "#fef0f0" : "#fff3e0",
                          color: m.status === "at-risk" ? "#c0392b" : "#b35c00",
                          borderRadius: 4, padding: "2px 6px",
                          whiteSpace: "nowrap",
                        }}>
                          {f}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cohort breakdown summary */}
        <div style={{ marginTop: 28 }}>
          <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
            Cohort Breakdown
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {COHORTS.slice(1).filter(c => c !== "Test").map(cohort => {
              const group = mentees.filter(m => !m.isTest && String(m.cohort) === String(cohort));
              const atRisk    = group.filter(m => m.status === "at-risk").length;
              const attention = group.filter(m => m.status === "needs-attention").length;
              const onTrack   = group.filter(m => m.status === "on-track").length;
              const avgMilestones = group.length
                ? Math.round(group.reduce((s, m) => s + m.milestoneCount, 0) / group.length)
                : 0;
              return (
                <div key={cohort} style={{
                  background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "16px 18px",
                }}>
                  <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
                    {cohort} · {COHORT_NAMES[cohort]}
                  </p>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b6480" }}>
                    {group.length} mentees
                  </p>
                  {atRisk > 0 && (
                    <p style={{ margin: "0 0 2px", fontSize: 12, color: "#c0392b", fontWeight: 600 }}>
                      🔴 {atRisk} at risk
                    </p>
                  )}
                  {attention > 0 && (
                    <p style={{ margin: "0 0 2px", fontSize: 12, color: "#b35c00", fontWeight: 600 }}>
                      🟡 {attention} needs attention
                    </p>
                  )}
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#1a6e42", fontWeight: 600 }}>
                    🟢 {onTrack} on track
                  </p>
                  <div style={{ borderTop: "1px solid #f0ecff", paddingTop: 8 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9b8fcf" }}>Avg milestones</p>
                    <MiniBar value={avgMilestones} total={13} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed]   = useState(false);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("uplift_admin") === "yes") setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/admin-data")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [authed]);

  const handleAuth = () => {
    sessionStorage.setItem("uplift_admin", "yes");
    setAuthed(true);
  };

  if (!authed) return (
    <>
      <Head>
        <title>Uplift Admin · Summer 2026</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <PasswordGate onAuthenticated={handleAuth} />
    </>
  );

  return (
    <>
      <Head>
        <title>Uplift Admin · Summer 2026</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      {loading && (
        <div style={{
          minHeight: "100vh", background: "#f7f5ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif", color: "#9b8fcf", fontSize: 15,
        }}>
          Loading dashboard data…
        </div>
      )}
      {error && (
        <div style={{ minHeight: "100vh", background: "#f7f5ff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, textAlign: "center" }}>
            <p style={{ color: "#c0392b", fontWeight: 700, marginBottom: 8 }}>Failed to load data</p>
            <p style={{ color: "#6b6480", fontSize: 13 }}>{error}</p>
          </div>
        </div>
      )}
      {data && !loading && <Dashboard data={data} refreshedAt={data.generatedAt} />}
    </>
  );
}
