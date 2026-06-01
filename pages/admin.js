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

const MILESTONE_FILTERS = [
  { key: "onboarding", label: "Completed Onboarding", color: "#1a6e42", bg: "#e8f8f0", test: m => m.milestones?.onboarding },
  { key: "mentor1", label: "1 Mentor Session",  color: "#5c4eb5", bg: "#f0ecff", test: m => m.mentorCount === 1 },
  { key: "mentor2", label: "2 Mentor Sessions", color: "#5c4eb5", bg: "#f0ecff", test: m => m.mentorCount === 2 },
  { key: "mentor3", label: "3 Mentor Sessions", color: "#5c4eb5", bg: "#f0ecff", test: m => m.mentorCount >= 3 },
  { key: "edu1",    label: "1 Edu Session",     color: "#2a7fd4", bg: "#e8f4ff", test: m => m.eduCount === 1 },
  { key: "edu2",    label: "2 Edu Sessions",    color: "#2a7fd4", bg: "#e8f4ff", test: m => m.eduCount === 2 },
  { key: "edu3",    label: "3 Edu Sessions",    color: "#2a7fd4", bg: "#e8f4ff", test: m => m.eduCount >= 3 },
];

// ─── Click Engagement view ────────────────────────────────────────────────────
function ClickEngagement() {
  const [stats, setStats] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/resource-stats").then(r => r.json()),
      fetch("/api/event-stats").then(r => r.json()),
    ]).then(([res, evs]) => {
      setStats(res);
      setEventStats(evs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const RankList = ({ items, label, accentColor = "#5c4eb5" }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
        {label}
      </p>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "#b0a8cc", fontStyle: "italic" }}>No clicks recorded yet.</p>
      ) : (
        items.map((item, i) => {
          const max = items[0].count;
          const pct = Math.round((item.count / max) * 100);
          const medals = ["🥇", "🥈", "🥉", "4", "5"];
          return (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: i < 3 ? 18 : 13, width: 24, textAlign: "center", flexShrink: 0, fontWeight: 700, color: "#9b8fcf" }}>
                  {medals[i]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <a href={item.url || "#"} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14, fontWeight: 600, color: "#1a1733", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </a>
                    <span style={{ fontSize: 13, fontWeight: 700, color: accentColor, flexShrink: 0 }}>
                      {item.count} click{item.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 6, background: "#ede9f8", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? accentColor : accentColor + "88", borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#b0a8cc", flexShrink: 0 }}>
                      {item.uniqueFounders} founder{item.uniqueFounders !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const ClickLog = ({ items, accentColor = "#5c4eb5" }) => (
    <div style={{ maxHeight: 400, overflowY: "auto" }}>
      {!items || items.length === 0 ? (
        <p style={{ padding: "24px", fontSize: 13, color: "#b0a8cc", fontStyle: "italic", margin: 0 }}>No clicks recorded yet.</p>
      ) : items.map((click, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "180px 1fr 1fr",
          padding: "11px 24px", alignItems: "center",
          borderBottom: i < items.length - 1 ? "1px solid #faf9ff" : "none",
          background: i % 2 === 0 ? "#fff" : "#faf9ff",
        }}>
          <span style={{ fontSize: 11, color: "#b0a8cc", fontVariantNumeric: "tabular-nums" }}>
            {click.timestamp}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>
            {click.name}
          </span>
          <a href={click.url || "#"} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: accentColor, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
            {click.title}
          </a>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Click Engagement</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>
            {stats && eventStats ? `${stats.total} resource clicks · ${eventStats.total} event clicks` : "Loading…"}
          </p>
        </div>
      </div>

      {loading && (
        <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Loading click data…</p>
      )}

      {!loading && stats && (
        <>
          {/* ── Resources ── */}
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            📎 Resource Clicks
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 320, background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", padding: "24px 28px" }}>
              <RankList items={stats.allTime} label="Top 5 — All Time" />
            </div>
            <div style={{ flex: 1, minWidth: 320, background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", padding: "24px 28px" }}>
              <RankList items={stats.thisWeek} label="Top 5 — This Week" />
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", overflow: "hidden", marginBottom: 36 }}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #f0ecff", display: "flex", alignItems: "center", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1733" }}>Recent Resource Clicks</p>
              <span style={{ fontSize: 12, color: "#9b8fcf" }}>— most recent first</span>
            </div>
            <ClickLog items={stats.recent} accentColor="#5c4eb5" />
          </div>

          {/* ── Events ── */}
          {eventStats && (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#2a7fd4", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                📅 Event Clicks (Register on Luma)
              </p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 320, background: "#fff", borderRadius: 14, border: "1px solid #d4e9fb", padding: "24px 28px" }}>
                  <RankList items={eventStats.allTime} label="Top 5 — All Time" accentColor="#2a7fd4" />
                </div>
                <div style={{ flex: 1, minWidth: 320, background: "#fff", borderRadius: 14, border: "1px solid #d4e9fb", padding: "24px 28px" }}>
                  <RankList items={eventStats.thisWeek} label="Top 5 — This Week" accentColor="#2a7fd4" />
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #d4e9fb", overflow: "hidden" }}>
                <div style={{ padding: "14px 24px", borderBottom: "1px solid #e8f4ff", display: "flex", alignItems: "center", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1733" }}>Recent Event Clicks</p>
                  <span style={{ fontSize: 12, color: "#9b8fcf" }}>— most recent first</span>
                </div>
                <ClickLog items={eventStats.recent} accentColor="#2a7fd4" />
              </div>
            </>
          )}
        </>
      )}
      <p style={{ margin: "28px 0 0", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        📋 To view more in depth, please go directly to the master tracker sheet.
      </p>
    </div>
  );
}

// Returns true if AI cache should be refreshed.
// Refreshes on Sunday (0) and Wednesday (3) nights at 9pm — or if no cache.
function isAICacheStale(generatedAt) {
  if (!generatedAt) return true;
  const generated = new Date(generatedAt);
  const now = new Date();
  // Walk back up to 7 days to find the most recent Sun or Wed at 9pm
  for (let i = 0; i < 7; i++) {
    const boundary = new Date(now);
    boundary.setDate(boundary.getDate() - i);
    boundary.setHours(21, 0, 0, 0); // 9pm
    if ((boundary.getDay() === 0 || boundary.getDay() === 3) && boundary <= now) {
      return generated < boundary; // stale if generated before that boundary
    }
  }
  return true; // fallback
}

// ─── Prompt Engagement view ───────────────────────────────────────────────────
function PromptEngagement() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState({});

  // AI Insights state
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  const CACHE_KEY = "uplift_prompt_insights";
  const COHORT_NAMES_PE = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

  useEffect(() => {
    fetch("/api/prompt-stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Auto-load insights — refresh on Sun/Wed nights at 9pm
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!isAICacheStale(parsed.generatedAt)) {
          setInsights(parsed);
          return; // cache is fresh
        }
      }
    } catch (_) {}
    fetchInsights();
  }, []);

  const fetchInsights = (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!isAICacheStale(parsed.generatedAt)) { setInsights(parsed); return; }
        }
      } catch (_) {}
    }
    setInsightsLoading(true);
    setInsightsError(null);
    fetch("/api/prompt-themes")
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setInsightsError(d.error);
        } else {
          setInsights(d);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (_) {}
        }
        setInsightsLoading(false);
      })
      .catch(e => { setInsightsError(e.message); setInsightsLoading(false); });
  };

  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const THEME_ICONS = ["🔍", "⚡", "🧩", "🎯", "💡"];
  const SESSION_ICONS = ["🎤", "🛠️", "👥", "📊", "🚀"];

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Prompt Engagement</p>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "#9b8fcf" }}>
        Founders who've saved at least one response per prompt section — click any row to see who
      </p>

      {/* ── AI Insights panel ── */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        borderRadius: 14, padding: "22px 26px", marginBottom: 28, color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: insights ? 20 : 0 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 800 }}>🧠 AI Insights</p>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
              {insightsLoading
                ? "Analyzing responses…"
                : insights
                ? `${insights.totalResponses || "All"} responses analyzed · Refreshed ${new Date(insights.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · Auto-updates Sun & Wed nights`
                : "Auto-updates Sun & Wed nights — loading…"}
            </p>
          </div>
          <button
            onClick={() => fetchInsights(true)}
            disabled={insightsLoading}
            style={{
              background: insightsLoading ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 700,
              cursor: insightsLoading ? "default" : "pointer",
              flexShrink: 0, marginLeft: 16,
              fontFamily: "Inter, system-ui, sans-serif",
              transition: "background 0.2s",
            }}
          >
            {insightsLoading ? "Analyzing…" : "↻ Refresh"}
          </button>
        </div>

        {insightsError && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#ffb3b3" }}>⚠️ {insightsError}</p>
        )}

        {insights && !insightsLoading && (
          <div>
            {/* Overall top 5 themes */}
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>
              Top 5 Overall Themes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {(insights.themes || []).map((t, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.1)", borderRadius: 10,
                  padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{THEME_ICONS[i] || "•"}</span>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700 }}>{t.title}</p>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>{t.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Session Ideas */}
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>
              Session Ideas
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(insights.sessionIdeas || []).map((s, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.08)", borderRadius: 10,
                  padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                  borderLeft: "3px solid rgba(167,139,250,0.6)",
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{SESSION_ICONS[i] || "•"}</span>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700 }}>{s.title}</p>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Week-by-week themes (outside dark card, light background) ── */}
      {insights && !insightsLoading && Object.keys(insights.weeklyThemes || {}).length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
            📅 Themes by Prompt Section
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(insights.weeklyThemes).map(([key, section]) => (
              <div key={key} style={{
                background: "#fff", borderRadius: 12,
                border: "1px solid #e8e4f5", padding: "16px 20px",
              }}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1733", flex: 1 }}>
                    {section.label}
                  </p>
                  <span style={{
                    fontSize: 11, color: "#9b8fcf", background: "#f3f0ff",
                    borderRadius: 20, padding: "2px 10px", flexShrink: 0,
                  }}>
                    {section.count} response{section.count !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Top 3 themes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {section.themes.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{
                        background: "#f3f0ff", color: "#5c4eb5",
                        borderRadius: 6, padding: "2px 8px",
                        fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1,
                      }}>
                        #{i + 1}
                      </span>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{t.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b6480", lineHeight: 1.6 }}>{t.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Loading…</p>}

      {!loading && stats && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(stats.sections || []).map(section => {
            const total  = stats.total || 1;
            const pct    = total > 0 ? Math.round((section.count / total) * 100) : 0;
            const hasAny = section.count > 0;
            const isOpen = !!openSections[section.key];
            return (
              <div key={section.key} style={{
                background: "#fff", borderRadius: 12,
                border: `1px solid ${isOpen ? "#c4b8f0" : "#e8e4f5"}`,
                overflow: "hidden",
                boxShadow: isOpen ? "0 2px 12px rgba(92,78,181,0.08)" : "none",
              }}>
                {/* Header row — clickable */}
                <button
                  onClick={() => toggle(section.key)}
                  style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    padding: "15px 20px", display: "flex", alignItems: "center", gap: 16,
                    fontFamily: "Inter, system-ui, sans-serif", textAlign: "left",
                  }}
                >
                  {/* Percentage pill */}
                  <span style={{
                    fontSize: 18, fontWeight: 800, lineHeight: 1, flexShrink: 0, minWidth: 52,
                    color: hasAny ? "#5c4eb5" : "#c0b8d8",
                  }}>
                    {pct}%
                  </span>

                  {/* Label + mini bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>
                      {section.label}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: "#e8e4f5", borderRadius: 3, overflow: "hidden", maxWidth: 260 }}>
                        <div style={{
                          width: `${pct}%`, height: "100%",
                          background: hasAny ? "#5c4eb5" : "#e8e4f5",
                          borderRadius: 3, transition: "width 0.4s",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#9b8fcf", flexShrink: 0 }}>
                        {section.count} founder{section.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <span style={{
                    fontSize: 14, color: "#9b8fcf", flexShrink: 0,
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}>▾</span>
                </button>

                {/* Dropdown — who completed */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid #f0ecff", padding: "14px 20px" }}>
                    {section.mentees.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: "#b0a8cc", fontStyle: "italic" }}>
                        No responses saved yet.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {section.mentees.map((m, i) => (
                          <span key={i} style={{
                            fontSize: 12, fontWeight: 600, color: "#1a1733",
                            background: "#f3f0ff", border: "1px solid #e0d9f8",
                            borderRadius: 20, padding: "4px 12px",
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            {m.name}
                            <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 500 }}>
                              {m.cohort} · {COHORT_NAMES_PE[m.cohort] || m.cohort}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p style={{ margin: "28px 0 0", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        📋 To view individual responses, please go directly to the master tracker sheet.
      </p>
    </div>
  );
}

// ─── Peer Connections view ────────────────────────────────────────────────────
function PeerConnections() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const CACHE_KEY = "uplift_peer_connections";

  const COHORT_COLORS = {
    1: { bg: "#fff3cd", color: "#7a5700", border: "#f5c542" },
    2: { bg: "#d4edda", color: "#1a5c2a", border: "#5cb85c" },
    3: { bg: "#d0e8ff", color: "#0a3d6b", border: "#2a7fd4" },
    4: { bg: "#f3d0ff", color: "#5a0d7a", border: "#9b59b6" },
    5: { bg: "#ffe0d0", color: "#7a2d0a", border: "#e87040" },
  };

  useEffect(() => {
    // Load from cache or auto-fetch — refreshes Sun & Wed nights at 9pm
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!isAICacheStale(parsed.generatedAt)) { setData(parsed); return; }
      }
    } catch (_) {}
    fetchConnections();
  }, []);

  const fetchConnections = () => {
    setLoading(true);
    setError(null);
    fetch("/api/peer-connections")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setData(d);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (_) {}
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  const FounderPill = ({ founder }) => {
    const c = COHORT_COLORS[founder.cohort] || { bg: "#f3f0ff", color: "#5c4eb5", border: "#c4b8f0" };
    return (
      <div style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 10, padding: "8px 14px", minWidth: 0,
      }}>
        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>{founder.name}</p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: c.color }}>
          Cohort {founder.cohort} · {founder.cohortName}
        </p>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Peer Connections</p>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#9b8fcf" }}>
            {data
              ? `${data.connections?.length || 0} suggested pairings from ${data.totalFoundersAnalyzed} founders · Refreshed ${new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · Auto-updates daily`
              : loading ? "Analyzing responses…" : "Auto-updates Sun & Wed nights — loading…"}
          </p>
        </div>
        <button
          onClick={fetchConnections}
          disabled={loading}
          style={{
            background: loading ? "#e8e4f5" : "#5c4eb5",
            border: "none", color: "#fff", borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            fontFamily: "Inter, system-ui, sans-serif",
            flexShrink: 0, marginTop: 2,
          }}
        >
          {loading ? "Analyzing…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#c00" }}>⚠️ {error}</p>
        </div>
      )}

      {loading && !data && (
        <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Analyzing founder responses to find connections…</p>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(data.connections || []).length === 0 ? (
            <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>No connections found yet — more responses needed.</p>
          ) : (data.connections || []).map((conn, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 14,
              border: "1px solid #e8e4f5",
              padding: "18px 20px",
              boxShadow: "0 1px 4px rgba(92,78,181,0.06)",
            }}>
              {/* Shared theme tag */}
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  background: "#f3f0ff", color: "#5c4eb5",
                  borderRadius: 6, padding: "3px 10px",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                }}>
                  🔗 {conn.sharedTheme}
                </span>
              </div>

              {/* The two founders */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <FounderPill founder={conn.founders[0]} />
                <span style={{ fontSize: 20, color: "#c4b8f0", flexShrink: 0 }}>↔</span>
                <FounderPill founder={conn.founders[1]} />
              </div>

              {/* Reason */}
              <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.65 }}>
                {conn.reason}
              </p>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: "28px 0 0", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        📋 Connections are AI-suggested based on prompt responses. Use your judgment before making introductions.
      </p>
    </div>
  );
}

// ─── Portal Activity view ─────────────────────────────────────────────────────
function PortalActivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ active: true, inactive: true, neverVisited: true });
  const COHORT_NAMES_LOCAL = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

  useEffect(() => {
    fetch("/api/portal-activity")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  const CARD_CONFIG = [
    { key: "active",       label: (d) => `Active — last ${d.days} days`,      color: "#1a6e42", bg: "#e8f8f0", border: "#b8e8d0", count: (d) => d.counts.active },
    { key: "inactive",     label: (d) => `Not visited — last ${d.days} days`,  color: "#b35c00", bg: "#fff3e0", border: "#f5d97a", count: (d) => d.counts.inactive },
    { key: "neverVisited", label: () => "Never visited",                        color: "#c0392b", bg: "#fef0f0", border: "#f5c6c6", count: (d) => d.counts.neverVisited },
  ];

  const filteredRows = !data ? [] : [
    ...(filters.neverVisited ? data.neverVisited.map(e => ({ ...e, group: "neverVisited" })) : []),
    ...(filters.inactive     ? data.inactive.map(e => ({ ...e, group: "inactive" }))         : []),
    ...(filters.active       ? data.active.map(e => ({ ...e, group: "active" }))             : []),
  ];

  const GROUP_DOT = { active: "#27ae60", inactive: "#f39c12", neverVisited: "#e74c3c" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Portal Activity</p>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "#9b8fcf" }}>
        {data
          ? `Last updated ${new Date(data.generatedAt).toLocaleTimeString()} · tracks when each founder last opened their portal`
          : "Loading…"}
      </p>

      {loading && <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Loading activity data…</p>}

      {!loading && data && (
        <>
          {/* Filter cards — toggle on/off */}
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            {CARD_CONFIG.map(({ key, label, color, bg, border, count }) => {
              const on = filters[key];
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  style={{
                    flex: 1, minWidth: 160, cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif",
                    background: on ? bg : "#f7f5ff",
                    border: `2px solid ${on ? border : "#e8e4f5"}`,
                    borderRadius: 12, padding: "16px 20px", textAlign: "left",
                    opacity: on ? 1 : 0.5,
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: on ? color : "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label(data)}
                  </p>
                  <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: on ? color : "#c0b8d8", lineHeight: 1 }}>
                    {count(data)}
                  </p>
                  <span style={{
                    position: "absolute", top: 10, right: 12,
                    fontSize: 11, fontWeight: 700,
                    color: on ? color : "#b0a8cc",
                    background: on ? "rgba(255,255,255,0.6)" : "transparent",
                    borderRadius: 4, padding: "2px 6px",
                  }}>
                    {on ? "✓ on" : "off"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Unified table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", overflow: "hidden" }}>
            {/* Column headers */}
            <div style={{ padding: "10px 20px", background: "#f7f5ff", borderBottom: "1px solid #e8e4f5", display: "grid", gridTemplateColumns: "12px 1fr 130px 180px", gap: 12, alignItems: "center" }}>
              <span />
              {["Name", "Cohort", "Last Seen"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>

            {filteredRows.length === 0 ? (
              <p style={{ padding: "28px 20px", margin: 0, fontSize: 13, color: "#b0a8cc", fontStyle: "italic" }}>
                {Object.values(filters).every(v => !v) ? "All filters off — toggle one above to see founders." : "No founders in the selected groups."}
              </p>
            ) : (
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {filteredRows.map((e, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "12px 1fr 130px 180px", gap: 12,
                    padding: "10px 20px", alignItems: "center",
                    borderBottom: i < filteredRows.length - 1 ? "1px solid #faf9ff" : "none",
                    background: i % 2 === 0 ? "#fff" : "#fdfcff",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: GROUP_DOT[e.group], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{e.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      background: "#f3f0ff", color: "#5c4eb5",
                      borderRadius: 4, padding: "2px 6px", display: "inline-block", width: "fit-content",
                    }}>
                      {e.cohort} · {COHORT_NAMES_LOCAL[e.cohort] || e.cohort}
                    </span>
                    <span style={{ fontSize: 12, color: "#9b8fcf", fontStyle: !e.lastSeen ? "italic" : "normal" }}>
                      {e.lastSeen || "Never visited"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#b0a8cc" }}>
            Showing {filteredRows.length} founder{filteredRows.length !== 1 ? "s" : ""}
            {" · "}
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#27ae60", verticalAlign: "middle" }} /> active
            {" "}
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#f39c12", verticalAlign: "middle", marginLeft: 6 }} /> not visited recently
            {" "}
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#e74c3c", verticalAlign: "middle", marginLeft: 6 }} /> never visited
          </p>
        </>
      )}
      <p style={{ margin: "28px 0 0", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        📋 For more details, please go directly to the master tracker sheet.
      </p>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────
function Dashboard({ data, refreshedAt }) {
  const [activeCohort, setActiveCohort] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [milestoneFilters, setMilestoneFilters] = useState([]);

  const { mentees = [], pendingReviewCount = 0 } = data;
  const isPreProgram = new Date() < PROGRAM_START;

  // Change cohort → clear filters
  const handleCohortChange = (c) => {
    setActiveCohort(c);
    setStatusFilters([]);
    setMilestoneFilters([]);
  };

  const filtered = mentees.filter(m => {
    const cohortMatch = activeCohort === "All"
      ? true
      : activeCohort === "Test"
        ? m.isTest
        : !m.isTest && String(m.cohort) === String(activeCohort);
    const searchMatch = !search ||
      `${m.first} ${m.last} ${m.company}`.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilters.length === 0 || statusFilters.includes(m.status);
    const milestoneMatch = milestoneFilters.length === 0 ||
      MILESTONE_FILTERS.filter(f => milestoneFilters.includes(f.key)).some(f => f.test(m));
    return cohortMatch && searchMatch && statusMatch && milestoneMatch;
  });

  const realMentees   = mentees.filter(m => !m.isTest);
  const activeMentees = realMentees.filter(m => m.status !== "churned");
  const counts = {
    total:      realMentees.length,
    atRisk:     activeMentees.filter(m => m.status === "at-risk").length,
    attention:  activeMentees.filter(m => m.status === "needs-attention").length,
    onTrack:    activeMentees.filter(m => m.status === "on-track").length,
    churned:    realMentees.filter(m => m.status === "churned").length,
    onboarding: realMentees.filter(m => m.milestones?.onboarding).length,
    participated: realMentees.filter(m => m.milestones?.participation).length,
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
      active:     active.length,
      churned:    group.filter(m => m.status === "churned").length,
      atRisk:     active.filter(m => m.status === "at-risk").length,
      attention:  active.filter(m => m.status === "needs-attention").length,
      onTrack:    active.filter(m => m.status === "on-track").length,
      onboarding: group.filter(m => m.milestones?.onboarding).length,
      avg:        active.length
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
      label: "Participation Confirmed",
      value: counts.participated,
      color: "#1a6e42", bg: "#e8f8f0",
      desc: "Founders who have accepted their spot in the program",
      statusKey: null,
    },
    {
      label: "Onboarding Completed",
      value: counts.onboarding,
      color: "#2a7fd4", bg: "#e8f4ff",
      desc: "Founders who have attended an onboarding session",
      statusKey: null,
    },
    {
      label: "On Track",
      value: counts.onTrack,
      color: "#1a6e42", bg: "#e8f8f0",
      desc: "Confirmed participation and meeting all program requirements",
      statusKey: "on-track",
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
      desc: "Has not confirmed participation, or behind on required milestones",
      statusKey: "needs-attention",
    },
    {
      label: "Churned / Dropped Out",
      pillLabel: "Churn",
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
          {statCards.map(({ label, value, color, bg, desc }) => (
            <div key={label} style={{
              background: bg, borderRadius: 12, padding: "14px 18px",
              border: `1px solid ${color}22`,
            }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 34, fontWeight: 800, color, lineHeight: 1, flexShrink: 0 }}>{value}</p>
                <p style={{ margin: 0, fontSize: 11, color, opacity: 0.6, fontStyle: "italic", lineHeight: 1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions pending review */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "#fffbeb", borderRadius: 8, border: "1px solid #f5d97a",
          padding: "8px 14px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 13 }}>🕐</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#7a5c00" }}>
            Mentor Sessions Pending Internal Review
          </span>
          <span style={{
            background: "#f5d97a", color: "#7a5c00",
            borderRadius: 20, padding: "2px 10px", fontSize: 13, fontWeight: 800,
          }}>
            {pendingReviewCount}
          </span>
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
              <span style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 700 }}>
                🔵 {cohortBreakdown.onboarding} onboarding complete
              </span>
            </div>
            <div style={{ minWidth: 200 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9b8fcf" }}>Avg milestones (active)</p>
              <MiniBar value={cohortBreakdown.avg} total={13} />
            </div>
          </div>
        )}

        {/* Results count + inline filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#9b8fcf", flexShrink: 0 }}>
            Showing {filtered.length} mentee{filtered.length !== 1 ? "s" : ""}
            {activeCohort === "Test" ? " (test accounts)" : activeCohort !== "All" ? ` in Cohort ${activeCohort} · ${COHORT_NAMES[activeCohort]}` : ""}
            {search ? ` matching "${search}"` : ""}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>Filter:</span>

          {/* Status pills */}
          {statCards.filter(c => c.statusKey).map(({ label, pillLabel, color, bg, statusKey }) => {
            const isActive = statusFilters.includes(statusKey);
            return (
              <button key={statusKey} onClick={() => setStatusFilters(prev => isActive ? prev.filter(k => k !== statusKey) : [...prev, statusKey])} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: isActive ? `2px solid ${color}` : `1.5px solid ${color}44`,
                background: isActive ? color : bg,
                color: isActive ? "#fff" : color,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "rgba(255,255,255,0.8)" : color, flexShrink: 0 }} />
                {pillLabel || label}
                {isActive && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })}

          {/* Divider */}
          <span style={{ width: 1, height: 18, background: "#e0daf0", flexShrink: 0 }} />

          {/* Milestone pills */}
          {MILESTONE_FILTERS.map(({ key, label, color, bg }) => {
            const isActive = milestoneFilters.includes(key);
            return (
              <button key={key} onClick={() => setMilestoneFilters(prev => isActive ? prev.filter(k => k !== key) : [...prev, key])} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: isActive ? `2px solid ${color}` : `1.5px solid ${color}44`,
                background: isActive ? color : bg,
                color: isActive ? "#fff" : color,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "rgba(255,255,255,0.8)" : color, flexShrink: 0 }} />
                {label}
                {isActive && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })}

        </div>

        {/* Table — sticky header, scrollable rows */}
        {(() => {
          const COLS = "1.3fr 1.2fr 78px 118px 110px 86px 76px 1.3fr 1.9fr";
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
                  {["Mentee", "Mentor", "Cohort", "Status", "Milestones", "Sessions", "Edu", "Flags"].map(h => (
                    <p key={h} style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {h}
                    </p>
                  ))}
                  {/* Notes header + CSV download */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                      Notes
                    </p>
                    <button
                      onClick={() => {
                        const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
                        const hdrs = ["First Name", "Last Name", "Email", "Company", "Cohort", "Status", "Mentor", "Mentor Email"];
                        const rows = filtered.map(m => [
                          m.first, m.last, m.email, m.company,
                          `${m.cohort} · ${COHORT_NAMES[m.cohort] || m.cohort}`,
                          STATUS_CONFIG[m.status]?.label || m.status,
                          m.mentorName, m.mentorEmail,
                        ].map(escape).join(","));
                        const csv = [hdrs.map(escape).join(","), ...rows].join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url  = URL.createObjectURL(blob);
                        const a    = document.createElement("a");
                        a.href = url;
                        a.download = `uplift-mentees-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        border: "1.5px solid #5c4eb5", background: "#fff", color: "#5c4eb5",
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0ecff"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                    >
                      ⬇ Export CSV <span style={{ opacity: 0.6 }}>({filtered.length})</span>
                    </button>
                  </div>
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

        {/* Cohort breakdown grid — only on All Cohorts view */}
        {activeCohort === "All" && (
          <div style={{ marginTop: 32 }}>
            <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
              Cohort Breakdown
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {COHORTS.slice(1).filter(c => c !== "Test").map(cohort => {
                const group  = mentees.filter(m => !m.isTest && String(m.cohort) === String(cohort));
                const active = group.filter(m => m.status !== "churned");
                const atRisk      = active.filter(m => m.status === "at-risk").length;
                const attention   = active.filter(m => m.status === "needs-attention").length;
                const onTrack     = active.filter(m => m.status === "on-track").length;
                const churned     = group.filter(m => m.status === "churned").length;
                const onboarding  = group.filter(m => m.milestones?.onboarding).length;
                const avgMilestones = active.length
                  ? Math.round(active.reduce((s, m) => s + m.milestoneCount, 0) / active.length)
                  : 0;
                return (
                  <div key={cohort} style={{
                    background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "16px 18px",
                  }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
                      {cohort} · {COHORT_NAMES[cohort]}
                    </p>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6b6480" }}>
                      {active.length} active{churned > 0 ? `, ${churned} churned` : ""}
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
                    <p style={{ margin: "0 0 2px", fontSize: 12, color: "#1a6e42", fontWeight: 600 }}>
                      🟢 {onTrack} on track
                    </p>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#2a7fd4", fontWeight: 600 }}>
                      🔵 {onboarding} onboarding complete
                    </p>
                    <div style={{ borderTop: "1px solid #f0ecff", paddingTop: 8 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9b8fcf" }}>Avg milestones (active)</p>
                      <MiniBar value={avgMilestones} total={13} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
  const [adminTab, setAdminTab] = useState("mentees");

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
      {data && !loading && (
        <>
          {/* Top-level admin tab bar */}
          <div style={{ background: "#1a0e4f", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 4, padding: "0 32px" }}>
            {[
              { key: "mentees",     label: "👥 Mentees" },
              { key: "clicks",      label: "📊 Click Engagement" },
              { key: "prompts",     label: "📝 Prompt Engagement" },
              { key: "activity",    label: "🕐 Portal Activity" },
              { key: "connections", label: "🤝 Peer Connections" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setAdminTab(key)} style={{
                background: "none", border: "none", borderBottom: adminTab === key ? "2px solid #f5c542" : "2px solid transparent",
                color: adminTab === key ? "#fff" : "rgba(255,255,255,0.5)",
                fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, fontWeight: 600,
                padding: "12px 18px", cursor: "pointer", transition: "color 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>
          {adminTab === "mentees"  && <Dashboard data={data} refreshedAt={data.generatedAt} />}
          {adminTab === "clicks"   && <ClickEngagement />}
          {adminTab === "prompts"     && <PromptEngagement />}
          {adminTab === "activity"    && <PortalActivity />}
          {adminTab === "connections" && <PeerConnections />}
        </>
      )}
    </>
  );
}
