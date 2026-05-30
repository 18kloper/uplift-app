import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };
const COHORTS = ["All", 1, 2, 3, 4, 5, "Test"];

const STATUS_CONFIG = {
  "at-risk":         { label: "At Risk",              color: "#c0392b", bg: "#fef0f0", dot: "#e74c3c" },
  "needs-attention": { label: "Needs Attention",      color: "#b35c00", bg: "#fff3e0", dot: "#f39c12" },
  "on-track":        { label: "On Track",              color: "#1a6e42", bg: "#e8f8f0", dot: "#27ae60" },
  "churned":         { label: "Churned / Dropped Out", color: "#6b6480", bg: "#f0eef8", dot: "#9b8fcf" },
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
        <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "#1a1733" }}>
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

// ─── Dots indicator ────────────────────────────────────────────────────────────
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

// ─── Inline note editor ────────────────────────────────────────────────────────
function AdminNote({ slug, initialValue }) {
  const [value, setValue] = useState(initialValue || "");
  const [status, setStatus] = useState("idle");
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setValue(newVal);
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/admin-save-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, note: newVal }),
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch (_) {
        setStatus("idle");
      }
    }, 800);
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Add notes…"
        rows={2}
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 6,
          border: "1.5px solid #e8e4f5", background: "#fafafa",
          fontSize: 12, lineHeight: 1.5, resize: "vertical",
          fontFamily: "inherit", boxSizing: "border-box", outline: "none",
          transition: "border-color 0.15s", color: "#1a1733",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#5c4eb5")}
        onBlur={(e) => (e.target.style.borderColor = "#e8e4f5")}
      />
      {status !== "idle" && (
        <span style={{
          position: "absolute", bottom: 6, right: 8, fontSize: 10,
          color: status === "saved" ? "#22a366" : "#9b8fcf",
          fontWeight: 500, pointerEvents: "none",
          background: "rgba(250,250,250,0.9)", padding: "0 2px",
        }}>
          {status === "saving" ? "Syncing…" : "✓ Synced"}
        </span>
      )}
    </div>
  );
}

const PROGRAM_START = new Date("2026-06-01");

// ─── Main dashboard ────────────────────────────────────────────────────────────
function Dashboard({ data, refreshedAt }) {
  const [activeCohort, setActiveCohort] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  const { mentees = [], pendingReviewCount = 0 } = data;
  const isPreProgram = new Date() < PROGRAM_START;

  // Change cohort → clear status filter so they don't stack unexpectedly
  const handleCohortChange = (c) => {
    setActiveCohort(c);
    setStatusFilter(null);
  };

  const filtered = mentees.filter(m => {
    const cohortMatch = activeCohort === "All"
      ? true
      : activeCohort === "Test"
        ? m.isTest
        : !m.isTest && String(m.cohort) === String(activeCohort);
    const searchMatch = !search ||
      `${m.first} ${m.last} ${m.company}`.toLowerCase().includes(search.toLowerCase());
    const statusMatch = !statusFilter || m.status === statusFilter;
    return cohortMatch && searchMatch && statusMatch;
  });

  const realMentees   = mentees.filter(m => !m.isTest);
  const activeMentees = realMentees.filter(m => m.status !== "churned");
  const counts = {
    total:     realMentees.length,
    atRisk:    activeMentees.filter(m => m.status === "at-risk").length,
    attention: activeMentees.filter(m => m.status === "needs-attention").length,
    onTrack:   activeMentees.filter(m => m.status === "on-track").length,
    churned:   realMentees.filter(m => m.status === "churned").length,
  };

  const cohortCounts = {};
  COHORTS.slice(1).forEach(c => {
    cohortCounts[c] = c === "Test"
      ? mentees.filter(m => m.isTest).length
      : mentees.filter(m => !m.isTest && String(m.cohort) === String(c)).length;
  });

  // Cohort breakdown — only computed when a specific numbered cohort is active
  const cohortBreakdown = typeof activeCohort === "number" ? (() => {
    const group  = mentees.filter(m => !m.isTest && String(m.cohort) === String(activeCohort));
    const active = group.filter(m => m.status !== "churned");
    return {
      active:    active.length,
      churned:   group.filter(m => m.status === "churned").length,
      atRisk:    active.filter(m => m.status === "at-risk").length,
      attention: active.filter(m => m.status === "needs-attention").length,
      onTrack:   active.filter(m => m.status === "on-track").length,
      avg:       active.length
        ? Math.round(active.reduce((s, m) => s + m.milestoneCount, 0) / active.length)
        : 0,
    };
  })() : null;

  const statCards = [
    {
      label: "Total Mentees",
      value: counts.total,
      color: "#5c4eb5", bg: "#f3f0ff",
      desc: "All program participants excluding test accounts",
      statusKey: null,
    },
    {
      label: "At Risk",
      value: counts.atRisk,
      color: "#c0392b", bg: "#fef0f0",
      desc: "No mentor session logged past the Week 4 removal deadline, or critical requirements unmet",
      statusKey: "at-risk",
    },
    {
      label: "Needs Attention",
      value: counts.attention,
      color: "#b35c00", bg: "#fff3e0",
      desc: isPreProgram
        ? "Has not yet confirmed participation in the program"
        : "Behind on mentor sessions or missing required milestones for their current week",
      statusKey: "needs-attention",
    },
    {
      label: "On Track",
      value: counts.onTrack,
      color: "#1a6e42", bg: "#e8f8f0",
      desc: isPreProgram
        ? "Confirmed participation in the program"
        : "Meeting all program requirements on schedule",
      statusKey: "on-track",
    },
    {
      label: "Churned / Dropped Out",
      value: counts.churned,
      color: "#6b6480", bg: "#f0eef8",
      desc: "Marked as having left or dropped out of the program — set \"Churned\" = TRUE in the Dashboard sheet",
      statusKey: "churned",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        padding: "24px 32px", color: "#fff",
      }}>
        <div style={{ maxWidth: 1500, margin: "0 auto" }}>
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

      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "28px 32px 60px" }}>

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

        {/* Summary stat cards — display only */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 16 }}>
          {statCards.map(({ label, value, color, bg, desc }) => (
            <div key={label} style={{
              background: bg, borderRadius: 12, padding: "18px 22px",
              border: `1px solid ${color}22`,
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color, opacity: 0.8 }}>{label}</p>
              <p style={{ margin: "0 0 8px", fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 11, color, opacity: 0.65, fontStyle: "italic", lineHeight: 1.4 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Sessions pending review */}
        <div style={{
          background: "#fffbeb", borderRadius: 12, border: "1px solid #f5d97a",
          padding: "16px 22px", marginBottom: 28,
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#7a5c00" }}>
              🕐 Mentor Sessions Pending Internal Review
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9a7200", fontStyle: "italic" }}>
              Sessions submitted via Typeform that don't auto-qualify (under 60 min or no transcript) — awaiting admin approval in the SessionReview sheet tab.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: "#b35c00", lineHeight: 1 }}>
              {pendingReviewCount}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9a7200" }}>pending</p>
          </div>
        </div>

        {/* Status filter tags */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#9b8fcf", marginRight: 2 }}>Filter:</span>
          {statCards.filter(c => c.statusKey).map(({ label, color, bg, statusKey, value }) => {
            const isActive = statusFilter === statusKey;
            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(isActive ? null : statusKey)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: isActive ? `2px solid ${color}` : `1.5px solid ${color}55`,
                  background: isActive ? color : bg,
                  color: isActive ? "#fff" : color,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  userSelect: "none",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: isActive ? "rgba(255,255,255,0.8)" : color,
                  flexShrink: 0,
                }} />
                {label}
                <span style={{ opacity: isActive ? 0.85 : 0.65, fontSize: 11 }}>({value})</span>
                {isActive && <span style={{ marginLeft: 2, fontSize: 12 }}>×</span>}
              </button>
            );
          })}
        </div>

        {/* Cohort filter tabs + search */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {COHORTS.map(c => {
              const active = activeCohort === c;
              const count  = c === "All" ? mentees.length : cohortCounts[c] || 0;
              const label  = c === "All" ? "All Cohorts" : c === "Test" ? "🧪 Test Accounts" : `${c} · ${COHORT_NAMES[c]}`;
              return (
                <button key={c} onClick={() => handleCohortChange(c)} style={{
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

        {/* Cohort breakdown card — only shown when a specific cohort tab is active */}
        {cohortBreakdown && (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
            padding: "16px 22px", marginBottom: 18,
            display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap",
          }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
                {activeCohort} · {COHORT_NAMES[activeCohort]}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b6480" }}>
                {cohortBreakdown.active} active
                {cohortBreakdown.churned > 0 ? `, ${cohortBreakdown.churned} churned` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", flex: 1 }}>
              {cohortBreakdown.atRisk > 0 && (
                <span style={{ fontSize: 13, color: "#c0392b", fontWeight: 700 }}>
                  🔴 {cohortBreakdown.atRisk} at risk
                </span>
              )}
              {cohortBreakdown.attention > 0 && (
                <span style={{ fontSize: 13, color: "#b35c00", fontWeight: 700 }}>
                  🟡 {cohortBreakdown.attention} needs attention
                </span>
              )}
              <span style={{ fontSize: 13, color: "#1a6e42", fontWeight: 700 }}>
                🟢 {cohortBreakdown.onTrack} on track
              </span>
            </div>
            <div style={{ minWidth: 200 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9b8fcf" }}>Avg milestones (active)</p>
              <MiniBar value={cohortBreakdown.avg} total={13} />
            </div>
          </div>
        )}

        {/* Results count */}
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#9b8fcf" }}>
          Showing {filtered.length} mentee{filtered.length !== 1 ? "s" : ""}
          {activeCohort === "Test" ? " (test accounts)" : activeCohort !== "All" ? ` in Cohort ${activeCohort} · ${COHORT_NAMES[activeCohort]}` : ""}
          {statusFilter ? ` · ${STATUS_CONFIG[statusFilter]?.label}` : ""}
          {search ? ` matching "${search}"` : ""}
        </p>

        {/* Table — sticky header, scrollable rows */}
        {(() => {
          const COLS = "2fr 1.6fr 78px 118px 110px 86px 76px 1.3fr 1.9fr";
          return (
            /* overflow: clip clips rounded corners without breaking position:sticky */
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", overflow: "clip" }}>
              {/* Single scroll container — header is sticky within it */}
              <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 460px)", minHeight: 240 }}>
                {/* Sticky header */}
                <div style={{
                  position: "sticky", top: 0, zIndex: 10,
                  display: "grid", gridTemplateColumns: COLS,
                  padding: "11px 20px", background: "#f7f5ff",
                  borderBottom: "1px solid #e8e4f5",
                }}>
                  {["Mentee", "Mentor", "Cohort", "Status", "Milestones", "Sessions", "Edu", "Flags", "Notes"].map(h => (
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
                ) : filtered.map((m, i) => {
                  const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG["on-track"];
                  return (
                    <div key={m.slug} style={{
                      display: "grid", gridTemplateColumns: COLS,
                      padding: "13px 20px", alignItems: "start",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f5f3ff" : "none",
                      background: m.status === "at-risk" ? "#fffafa" : m.status === "churned" ? "#fafafa" : "#fff",
                      opacity: m.status === "churned" ? 0.75 : 1,
                    }}>

                      {/* Mentee */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: "#1a1733",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          textDecoration: m.status === "churned" ? "line-through" : "none",
                        }}>
                          {m.first} {m.last}
                        </p>
                        {m.email && (
                          <p style={{ margin: "0 0 1px", fontSize: 11, color: "#5c4eb5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.email}
                          </p>
                        )}
                        {m.company && (
                          <p style={{ margin: 0, fontSize: 11, color: "#9b8fcf", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.company}
                          </p>
                        )}
                      </div>

                      {/* Mentor */}
                      <div style={{ minWidth: 0 }}>
                        {m.mentorName ? (
                          <>
                            <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: "#1a1733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.mentorName}
                            </p>
                            <p style={{
                              margin: 0, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              color: m.mentorEmail ? "#5c4eb5" : "#c0b8d8", fontStyle: "italic",
                            }}>
                              {m.mentorEmail || "no email on file"}
                            </p>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: "#c0b8d8" }}>—</span>
                        )}
                      </div>

                      {/* Cohort */}
                      <div style={{ minWidth: 0 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#5c4eb5",
                          background: "#f3f0ff", borderRadius: 4, padding: "2px 6px",
                          display: "inline-block",
                        }}>
                          {m.cohort} · {COHORT_NAMES[m.cohort] || m.cohort}
                        </span>
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, whiteSpace: "nowrap" }}>
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, minWidth: 0 }}>
                        {m.flags.length === 0 ? (
                          <span style={{ fontSize: 11, color: "#27ae60", fontWeight: 600 }}>✓ All clear</span>
                        ) : (
                          m.flags.slice(0, 3).map((f, fi) => (
                            <span key={fi} style={{
                              fontSize: 10, fontWeight: 600, lineHeight: 1.3,
                              background: m.status === "at-risk" ? "#fef0f0" : m.status === "churned" ? "#f0eef8" : "#fff3e0",
                              color: m.status === "at-risk" ? "#c0392b" : m.status === "churned" ? "#6b6480" : "#b35c00",
                              borderRadius: 4, padding: "2px 5px",
                            }}>
                              {f}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Notes */}
                      <AdminNote slug={m.slug} initialValue={m.notes} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
