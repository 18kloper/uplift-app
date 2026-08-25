import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

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

        {/* Header + freshness */}
        <div style={{ background: "#0f0729", color: "#fff", padding: "18px 28px", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
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

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 28px 80px" }}>
          {err && (
            <div style={{ ...card, borderLeft: "4px solid #e74c3c" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#c0392b", fontWeight: 600 }}>Data load failed: {err}</p>
            </div>
          )}

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
        </div>
      </div>
    </>
  );
}
