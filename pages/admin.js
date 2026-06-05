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

// Program starts June 1 2026. Returns current program week number (1–9).
function getProgramWeekNum() {
  const start = new Date("2026-06-01");
  const daysSince = Math.max(0, Math.floor((Date.now() - start) / 86400000));
  return Math.min(Math.floor(daysSince / 7) + 1, 9);
}

const INSIGHTS_HISTORY_KEY = "uplift_insights_history_v1";

function saveInsightToHistory(data, dayKey) {
  // dayKey: "sunday" | "wednesday"
  try {
    const stored = localStorage.getItem(INSIGHTS_HISTORY_KEY);
    const history = stored ? JSON.parse(stored) : {};
    const weekNum = getProgramWeekNum();
    const key = `${weekNum}_${dayKey}`;
    const dayLabel = dayKey === "sunday" ? "Sunday" : "Wednesday";
    history[key] = {
      weekNum,
      day: dayKey,
      label: `Week ${weekNum} · ${dayLabel}`,
      generatedAt: data.generatedAt,
      themes: data.themes || [],
      weeklyThemes: data.weeklyThemes || {},
      sessionIdeas: data.sessionIdeas || [],
      totalResponses: data.totalResponses || 0,
    };
    localStorage.setItem(INSIGHTS_HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

function loadInsightsHistory() {
  try {
    const stored = localStorage.getItem(INSIGHTS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (_) { return {}; }
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

function isSundayCacheStale(generatedAt) {
  if (!generatedAt) return true;
  const generated = new Date(generatedAt);
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const b = new Date(now);
    b.setDate(b.getDate() - i);
    b.setHours(21, 0, 0, 0);
    if (b.getDay() === 0 && b <= now) return generated < b;
  }
  return true;
}

function isWednesdayCacheStale(generatedAt) {
  if (!generatedAt) return true;
  const generated = new Date(generatedAt);
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const b = new Date(now);
    b.setDate(b.getDate() - i);
    b.setHours(21, 0, 0, 0);
    if (b.getDay() === 3 && b <= now) return generated < b;
  }
  return true;
}

// ─── Prompt Engagement view ───────────────────────────────────────────────────
function PromptEngagement() {
  const [stats, setStats]           = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [openSections, setOpenSections] = useState({});
  const [subTab, setSubTab]         = useState(1); // week number or "ai"

  const [sunData, setSunData]       = useState(null);
  const [wedData, setWedData]       = useState(null);
  const [loadingSun, setLoadingSun] = useState(false);
  const [loadingWed, setLoadingWed] = useState(false);
  const [errorSun, setErrorSun]     = useState(null);
  const [errorWed, setErrorWed]     = useState(null);


  const [selectedHistoryKey, setSelectedHistoryKey] = useState(null);

  const SUN_CACHE = "uplift_insights_sun_v2";
  const WED_CACHE = "uplift_insights_wed_v2";

  const COHORT_NAMES_PE = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

  // Which prompt-section keys belong to each week
  const SECTION_WEEK = {
    goals: 1, onboarding_block: 1,
    pre_meeting: 2,
    week3: 3, week3_win: 3,
    midpoint: 4,
    week5: 5,
    week6: 6,
    week7: 7,
    quote: 9,
  };
  const WEEK_KEYS = {};
  for (const [k, w] of Object.entries(SECTION_WEEK)) {
    WEEK_KEYS[w] = [...(WEEK_KEYS[w] || []), k];
  }
  const ACTIVE_WEEKS = [1, 2, 3, 4, 5, 6, 7, 9];
  const THEME_ICONS    = ["🔍","⚡","🧩","🎯","💡"];
  const SESSION_ICONS  = ["🎤","🛠️","👥","📊","🚀"];

  const fetchSnapshot = (cacheKey, isStale, setter, setLoad, setErr, force = false, dayKey = "sunday") => {
    if (!force) {
      try {
        const c = localStorage.getItem(cacheKey);
        if (c) { const p = JSON.parse(c); if (!isStale(p.generatedAt)) { setter(p); return; } }
      } catch (_) {}
    }
    setLoad(true); setErr(null);
    fetch("/api/prompt-themes")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErr(d.error); }
        else {
          setter(d);
          try { localStorage.setItem(cacheKey, JSON.stringify(d)); } catch (_) {}
          saveInsightToHistory(d, dayKey);
        }
        setLoad(false);
      })
      .catch(e => { setErr(e.message); setLoad(false); });
  };

  useEffect(() => {
    fetch("/api/prompt-stats")
      .then(r => r.json())
      .then(d => { setStats(d); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
    fetchSnapshot(SUN_CACHE, isSundayCacheStale, setSunData, setLoadingSun, setErrorSun, false, "sunday");
    fetchSnapshot(WED_CACHE, isWednesdayCacheStale, setWedData, setLoadingWed, setErrorWed, false, "wednesday");
  }, []);

  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));


  // Completion card for one prompt section
  const SectionCard = ({ section }) => {
    const total  = stats?.total || 1;
    const pct    = total > 0 ? Math.round((section.count / total) * 100) : 0;
    const hasAny = section.count > 0;
    const isOpen = !!openSections[section.key];
    return (
      <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${isOpen ? "#c4b8f0" : "#e8e4f5"}`, overflow: "hidden", boxShadow: isOpen ? "0 2px 12px rgba(92,78,181,0.08)" : "none" }}>
        <button onClick={() => toggle(section.key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "15px 20px", display: "flex", alignItems: "center", gap: 16, fontFamily: "Inter, system-ui, sans-serif", textAlign: "left" }}>
          <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, flexShrink: 0, minWidth: 52, color: hasAny ? "#5c4eb5" : "#c0b8d8" }}>{pct}%</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>{section.label}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: "#e8e4f5", borderRadius: 3, overflow: "hidden", maxWidth: 260 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: hasAny ? "#5c4eb5" : "#e8e4f5", borderRadius: 3, transition: "width 0.4s" }} />
              </div>
              <span style={{ fontSize: 11, color: "#9b8fcf", flexShrink: 0 }}>{section.count} founder{section.count !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <span style={{ fontSize: 14, color: "#9b8fcf", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </button>
        {isOpen && (
          <div style={{ borderTop: "1px solid #f0ecff", padding: "14px 20px" }}>
            {section.mentees.length === 0
              ? <p style={{ margin: 0, fontSize: 13, color: "#b0a8cc", fontStyle: "italic" }}>No responses saved yet.</p>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {section.mentees.map((m, i) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#1a1733", background: "#f3f0ff", border: "1px solid #e0d9f8", borderRadius: 20, padding: "4px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      {m.name}
                      <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 500 }}>{m.cohort} · {COHORT_NAMES_PE[m.cohort] || m.cohort}</span>
                    </span>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    );
  };

  // AI snapshot card for a set of section keys
  const SnapshotCard = ({ data, loading, error, sectionKeys, label, emoji, cacheKey, isStale, setter, setLoad, setErr, dayKey = "sunday" }) => (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "16px 18px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1733", flex: 1 }}>{emoji} {label}</p>
        {data?.generatedAt && <span style={{ fontSize: 10, color: "#9b8fcf" }}>{new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
        <button onClick={() => fetchSnapshot(cacheKey, isStale, setter, setLoad, setErr, true, dayKey)} disabled={loading}
          style={{ background: "none", border: "none", color: "#c0b8d8", cursor: "pointer", fontSize: 12, padding: "0 0 0 8px", fontFamily: "Inter, system-ui, sans-serif" }}>↻</button>
      </div>
      {loading && <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>Analyzing…</p>}
      {error && <p style={{ margin: 0, fontSize: 12, color: "#c00" }}>⚠️ {error}</p>}
      {!loading && !error && !data && <p style={{ margin: 0, fontSize: 12, color: "#c0b8d8", fontStyle: "italic" }}>Not yet generated.</p>}
      {data && !loading && (() => {
        const items = sectionKeys.map(k => data.weeklyThemes?.[k]).filter(Boolean);
        if (items.length === 0) return <p style={{ margin: 0, fontSize: 12, color: "#c0b8d8", fontStyle: "italic" }}>No themes yet — more responses needed.</p>;
        return items.map((sec, si) => (
          <div key={si} style={{ marginBottom: si < items.length - 1 ? 14 : 0 }}>
            {items.length > 1 && <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sec.label}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {sec.themes.map((t, ti) => (
                <div key={ti} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <span style={{ background: "#f3f0ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>#{ti + 1}</span>
                  <div>
                    <p style={{ margin: "0 0 1px", fontSize: 12, fontWeight: 600, color: "#1a1733" }}>{t.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b6480", lineHeight: 1.55 }}>{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ));
      })()}
    </div>
  );

  const weekSections = (weekNum) => (stats?.sections || []).filter(s => (WEEK_KEYS[weekNum] || []).includes(s.key));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Prompt Engagement</p>
        <button
          onClick={() => {
            const sections = stats?.sections || [];
            const total = stats?.total || 0;
            const rows = sections.map(s => {
              const pct = total > 0 ? Math.round(s.count / total * 100) : 0;
              const names = (s.mentees || []).map(m => m.name).join(", ");
              return `<tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e8e4f5;font-weight:600;color:#1a1733">${s.label}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e8e4f5;text-align:center;font-weight:700;color:#5c4eb5">${pct}%</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e8e4f5;text-align:center;color:#6b6480">${s.count} / ${total}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e8e4f5;font-size:12px;color:#6b6480">${names}</td>
              </tr>`;
            }).join("");
            const html = `<!DOCTYPE html><html><head><title>Uplift Prompt Engagement — ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</title>
            <style>
              body{font-family:Inter,system-ui,sans-serif;margin:0;padding:32px 40px;color:#1a1733;background:#fff}
              h1{font-size:22px;font-weight:800;margin:0 0 4px}
              .meta{font-size:13px;color:#9b8fcf;margin:0 0 28px}
              table{width:100%;border-collapse:collapse;font-size:14px}
              th{text-align:left;padding:10px 14px;background:#f7f5ff;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5c4eb5;border-bottom:2px solid #e8e4f5}
              tr:last-child td{border-bottom:none}
              .footer{margin-top:32px;font-size:11px;color:#c0b8d8;border-top:1px solid #e8e4f5;padding-top:16px}
            </style></head><body>
            <h1>Prompt Engagement</h1>
            <p class="meta">Uplift Summer 2026 · Generated ${new Date().toLocaleString("en-US",{month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}</p>
            <table>
              <thead><tr>
                <th>Prompt Section</th><th style="text-align:center">Completion</th><th style="text-align:center">Founders</th><th>Who Completed</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p class="footer">Uplift Summer 2026 · TechUnited:NJ · uplift2026.vercel.app</p>
            </body></html>`;
            const win = window.open("", "_blank");
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 400);
          }}
          style={{
            background: "#5c4eb5", color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "Inter, system-ui, sans-serif", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ⬇ Download PDF
        </button>
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e8e4f5", marginBottom: 28, flexWrap: "wrap" }}>
        {ACTIVE_WEEKS.map(w => (
          <button key={w} onClick={() => setSubTab(w)} style={{
            background: "none", border: "none",
            borderBottom: subTab === w ? "2px solid #5c4eb5" : "2px solid transparent",
            color: subTab === w ? "#5c4eb5" : "#9b8fcf",
            fontFamily: "Inter, system-ui, sans-serif", fontSize: 13,
            fontWeight: subTab === w ? 700 : 500,
            padding: "8px 16px", cursor: "pointer", marginBottom: -2,
          }}>Week {w}</button>
        ))}
        <button onClick={() => setSubTab("ai")} style={{
          background: "none", border: "none",
          borderBottom: subTab === "ai" ? "2px solid #5c4eb5" : "2px solid transparent",
          color: subTab === "ai" ? "#5c4eb5" : "#9b8fcf",
          fontFamily: "Inter, system-ui, sans-serif", fontSize: 13,
          fontWeight: subTab === "ai" ? 700 : 500,
          padding: "8px 16px", cursor: "pointer", marginBottom: -2,
        }}>✨ AI Insights</button>
      </div>

      {/* ── WEEK TAB ── */}
      {subTab !== "ai" && (
        <div>
          {statsLoading
            ? <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Loading…</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {weekSections(subTab).map(s => <SectionCard key={s.key} section={s} />)}
                {weekSections(subTab).length === 0 && (
                  <p style={{ fontSize: 13, color: "#c0b8d8", fontStyle: "italic" }}>No prompt sections for this week yet.</p>
                )}
              </div>
          }

          {/* AI snapshots side-by-side */}
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>🧠 AI Theme Snapshots</p>
          <div style={{ display: "flex", gap: 12 }}>
            <SnapshotCard data={sunData} loading={loadingSun} error={errorSun} sectionKeys={WEEK_KEYS[subTab] || []}
              label="Sunday Snapshot" emoji="🌙" cacheKey={SUN_CACHE} isStale={isSundayCacheStale}
              setter={setSunData} setLoad={setLoadingSun} setErr={setErrorSun} dayKey="sunday" />
            <SnapshotCard data={wedData} loading={loadingWed} error={errorWed} sectionKeys={WEEK_KEYS[subTab] || []}
              label="Wednesday Snapshot" emoji="📋" cacheKey={WED_CACHE} isStale={isWednesdayCacheStale}
              setter={setWedData} setLoad={setLoadingWed} setErr={setErrorWed} dayKey="wednesday" />
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS TAB ── */}
      {subTab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { d: sunData, loading: loadingSun, err: errorSun, label: "🌙 Sunday Overall Analysis", ck: SUN_CACHE, stale: isSundayCacheStale, set: setSunData, setL: setLoadingSun, setE: setErrorSun, dk: "sunday" },
            { d: wedData, loading: loadingWed, err: errorWed, label: "📋 Wednesday Overall Analysis", ck: WED_CACHE, stale: isWednesdayCacheStale, set: setWedData, setL: setLoadingWed, setE: setErrorWed, dk: "wednesday" },
          ].map(({ d, loading, err, label, ck, stale, set, setL, setE, dk }) => (
            <div key={label} style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", borderRadius: 14, padding: "20px 24px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: d ? 18 : 0 }}>
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 800 }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
                    {loading ? "Analyzing…" : d ? `From ${new Date(d.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · ${d.totalResponses || 0} responses` : "Not yet generated"}
                  </p>
                </div>
                <button onClick={() => fetchSnapshot(ck, stale, set, setL, setE, true, dk)} disabled={loading}
                  style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "Inter, system-ui, sans-serif", flexShrink: 0, marginLeft: 16 }}>
                  {loading ? "Analyzing…" : "↻ Refresh"}
                </button>
              </div>
              {err && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#ffb3b3" }}>⚠️ {err}</p>}
              {d && !loading && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Top 5 Themes</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                    {(d.themes || []).map((t, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{THEME_ICONS[i] || "•"}</span>
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700 }}>{t.title}</p>
                          <p style={{ margin: 0, fontSize: 11, opacity: 0.8, lineHeight: 1.55 }}>{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Session Ideas</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {(d.sessionIdeas || []).map((s, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start", borderLeft: "3px solid rgba(167,139,250,0.6)" }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{SESSION_ICONS[i] || "•"}</span>
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700 }}>{s.title}</p>
                          <p style={{ margin: 0, fontSize: 11, opacity: 0.8, lineHeight: 1.55 }}>{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* ── History section ── */}
          {(() => {
            const history = loadInsightsHistory();
            const historyEntries = Object.entries(history).sort((a, b) => {
              const [wA, dA] = a[0].split("_");
              const [wB, dB] = b[0].split("_");
              if (wB !== wA) return parseInt(wB) - parseInt(wA);
              // wednesday after sunday within same week = lower index = show sunday first? sort desc: wed > sun
              return (dB === "wednesday" ? 1 : 0) - (dA === "wednesday" ? 1 : 0);
            });
            const selectedEntry = selectedHistoryKey ? history[selectedHistoryKey] : null;
            return (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "16px 20px" }}>
                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>📅 Snapshot History</p>
                {historyEntries.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#c0b8d8", fontStyle: "italic" }}>No history yet — snapshots are saved automatically each time they are generated.</p>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                      {/* Current chip */}
                      <button onClick={() => setSelectedHistoryKey(null)} style={{
                        flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: !selectedHistoryKey ? "#5c4eb5" : "#f3f0ff",
                        color: !selectedHistoryKey ? "#fff" : "#5c4eb5",
                        border: !selectedHistoryKey ? "2px solid #5c4eb5" : "2px solid #e0d9f8",
                      }}>
                        Current
                      </button>
                      {historyEntries.map(([key, entry]) => (
                        <button key={key} onClick={() => setSelectedHistoryKey(key)} style={{
                          flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          background: selectedHistoryKey === key ? "#5c4eb5" : "#f3f0ff",
                          color: selectedHistoryKey === key ? "#fff" : "#5c4eb5",
                          border: selectedHistoryKey === key ? "2px solid #5c4eb5" : "2px solid #e0d9f8",
                        }}>
                          {entry.label}
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, opacity: 0.75 }}>
                            {entry.generatedAt ? new Date(entry.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedEntry && (
                      <div style={{ marginTop: 16, background: "#fafafa", borderRadius: 10, border: "1.5px solid #c4b8f0", padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#5c4eb5" }}>{selectedEntry.label}</p>
                          <span style={{ fontSize: 11, color: "#9b8fcf" }}>
                            {selectedEntry.generatedAt ? new Date(selectedEntry.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                            {selectedEntry.totalResponses ? ` · ${selectedEntry.totalResponses} responses` : ""}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9b8fcf" }}>Top 5 Themes</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                          {(selectedEntry.themes || []).slice(0, 5).map((t, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ background: "#f3f0ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>#{i + 1}</span>
                              <div>
                                <p style={{ margin: "0 0 1px", fontSize: 12, fontWeight: 700, color: "#1a1733" }}>{t.title}</p>
                                <p style={{ margin: 0, fontSize: 11, color: "#6b6480", lineHeight: 1.55 }}>{t.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(selectedEntry.sessionIdeas || []).length > 0 && (
                          <>
                            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9b8fcf" }}>Session Ideas</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                              {selectedEntry.sessionIdeas.map((s, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", borderLeft: "3px solid #c4b8f0", paddingLeft: 10 }}>
                                  <span style={{ fontSize: 14, flexShrink: 0 }}>{SESSION_ICONS[i] || "•"}</span>
                                  <div>
                                    <p style={{ margin: "0 0 1px", fontSize: 12, fontWeight: 700, color: "#1a1733" }}>{s.title}</p>
                                    <p style={{ margin: 0, fontSize: 11, color: "#6b6480", lineHeight: 1.55 }}>{s.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
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
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [undoState, setUndoState] = useState(null); // { pairKey, prevStatus, label }
  const undoTimerRef = useRef(null);
  const [draftEmails, setDraftEmails] = useState({}); // pairKey → { loading, subject, body, error, copied }
  const [activeFilter, setActiveFilter] = useState("all");
  const STORE_KEY = "uplift_peer_connections_v3";

  const COHORT_COLORS = {
    1: { bg: "#fff3cd", color: "#7a5700", border: "#f5c542" },
    2: { bg: "#d4edda", color: "#1a5c2a", border: "#5cb85c" },
    3: { bg: "#d0e8ff", color: "#0a3d6b", border: "#2a7fd4" },
    4: { bg: "#f3d0ff", color: "#5a0d7a", border: "#9b59b6" },
    5: { bg: "#ffe0d0", color: "#7a2d0a", border: "#e87040" },
  };

  const STATUS_OPTIONS = [
    { key: "connected", label: "✓ I connected them",    color: "#1a6e42", bg: "#e8f8f0", border: "#b8e8d0" },
    { key: "planned",   label: "📅 Planning to connect", color: "#7a5700", bg: "#fffbe6", border: "#f5c542" },
    { key: "skip",      label: "✕ Not connecting",       color: "#888",    bg: "#f5f5f5", border: "#ddd" },
  ];

  const isPeerStale = (runAt) => {
    if (!runAt) return true;
    const generated = new Date(runAt);
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const b = new Date(now);
      b.setDate(b.getDate() - i);
      b.setHours(21, 0, 0, 0);
      if ((b.getDay() === 0 || b.getDay() === 3) && b <= now) return generated < b;
    }
    return true;
  };

  // Fetch sheet statuses and overlay them on a connections array
  const applySheetStatuses = async (conns) => {
    try {
      const r = await fetch("/api/get-peer-statuses");
      const { statuses } = await r.json();
      if (!statuses || !Object.keys(statuses).length) return conns;
      return conns.map(c => {
        const s = statuses[c.pairKey];
        if (!s) return c;
        return {
          ...c,
          status:      s.status      ?? c.status,
          plannedAt:   s.plannedAt   ?? c.plannedAt,
          connectedAt: s.connectedAt ?? c.connectedAt,
          skippedAt:   s.skippedAt   ?? c.skippedAt,
        };
      });
    } catch (_) { return conns; }
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(STORE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const baseConns = parsed.connections || [];
          if (!isPeerStale(parsed.lastRunAt)) {
            const synced = await applySheetStatuses(baseConns);
            setConnections(synced);
            setLastRunAt(parsed.lastRunAt);
            return;
          } else {
            runAnalysis(baseConns);
            return;
          }
        }
      } catch (_) {}
      runAnalysis([]);
    })();
  }, []);

  const runAnalysis = (existingConnections) => {
    setLoading(true);
    setError(null);
    fetch("/api/peer-connections")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        const now = new Date().toISOString();
        // Build a set of existing pair keys
        const existingKeys = new Set(existingConnections.map(c => c.pairKey));
        // Fresh connections from API — compute their pairKey
        const freshConns = (d.connections || []).map(conn => {
          const slugs = (conn.founders || []).map(f => f.slug || f.name).sort();
          return { ...conn, pairKey: slugs.join("|") };
        });
        const freshKeys = new Set(freshConns.map(c => c.pairKey));
        // Mark existing as not-new
        const existingUpdated = existingConnections
          .filter(c => freshKeys.has(c.pairKey))
          .map(c => ({ ...c, isNew: false }));
        // Find truly new pairs
        const newOnes = freshConns
          .filter(c => !existingKeys.has(c.pairKey))
          .map(c => ({ ...c, isNew: true, addedAt: now, status: null }));
        const merged = [...newOnes, ...existingUpdated];
        applySheetStatuses(merged).then(synced => {
          setConnections(synced);
          setLastRunAt(now);
          try { localStorage.setItem(STORE_KEY, JSON.stringify({ connections: synced, lastRunAt: now })); } catch (_) {}
          setLoading(false);
        });
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  const updateStatus = (pairKey, status) => {
    const nextStatus = status || null;
    const conn = connections.find(c => c.pairKey === pairKey);
    const prevStatus = conn?.status ?? null;
    // Snapshot all timeline stamps for undo
    const prevStamps = { plannedAt: conn?.plannedAt, connectedAt: conn?.connectedAt, skippedAt: conn?.skippedAt };
    const now = new Date().toISOString();
    const updated = connections.map(c => c.pairKey !== pairKey ? c : {
      ...c,
      status: nextStatus,
      // Each timestamp only sets once — stamp when first switching to that status
      plannedAt:   nextStatus === "planned"   ? now : c.plannedAt,
      connectedAt: nextStatus === "connected" ? now : c.connectedAt,
      skippedAt:   nextStatus === "skip"      ? now : c.skippedAt,
    });

    setConnections(updated);
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ connections: updated, lastRunAt })); } catch (_) {}

    // Undo toast
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState({ pairKey, prevStatus, prevStamps });
    undoTimerRef.current = setTimeout(() => setUndoState(null), 5000);

    // Persist to sheet (fire-and-forget)
    if (conn) {
      fetch("/api/save-peer-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairKey,
          status:       nextStatus,
          founder1Name: conn.founders?.[0]?.name,
          founder2Name: conn.founders?.[1]?.name,
          sharedTheme:  conn.sharedTheme,
          plannedAt:    nextStatus === "planned"   ? now : conn.plannedAt,
          connectedAt:  nextStatus === "connected" ? now : conn.connectedAt,
          skippedAt:    nextStatus === "skip"      ? now : conn.skippedAt,
        }),
      }).catch(() => {});
    }
  };

  const handleUndo = () => {
    if (!undoState) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setConnections(prev => {
      const updated = prev.map(c => c.pairKey === undoState.pairKey ? { ...c, status: undoState.prevStatus, ...undoState.prevStamps } : c);
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ connections: updated, lastRunAt })); } catch (_) {}
      return updated;
    });
    setUndoState(null);
  };

  const draftIntro = async (conn) => {
    const key = conn.pairKey;
    setDraftEmails(prev => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await fetch("/api/draft-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founder1: conn.founders[0],
          founder2: conn.founders[1],
          sharedTheme: conn.sharedTheme,
          reason: conn.reason,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftEmails(prev => ({ ...prev, [key]: { loading: false, subject: data.subject, body: data.body, copied: false } }));
    } catch (err) {
      setDraftEmails(prev => ({ ...prev, [key]: { loading: false, error: err.message } }));
    }
  };

  const sortedConnections = [...connections].sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
  });

  // Detect duplicate pairs: same two founders appearing in multiple cards
  const namePairKey = (conn) => (conn.founders || []).map(f => f.name).sort().join("||");
  const pairStatusMap = {};
  connections.forEach(c => {
    const nk = namePairKey(c);
    if (!pairStatusMap[nk]) pairStatusMap[nk] = [];
    pairStatusMap[nk].push({ pairKey: c.pairKey, status: c.status });
  });
  const getSiblingStatus = (conn) => {
    const siblings = (pairStatusMap[namePairKey(conn)] || []).filter(s => s.pairKey !== conn.pairKey && s.status);
    if (siblings.some(s => s.status === "connected")) return "connected";
    if (siblings.some(s => s.status === "planned")) return "planned";
    return null;
  };

  const newCount = connections.filter(c => c.isNew).length;

  const FILTERS = [
    { key: "all",        label: "All",                   match: () => true },
    { key: "new",        label: "New this week",          match: c => !!c.isNew },
    { key: "unreviewed", label: "Not reviewed yet",       match: c => !c.status },
    { key: "connected",  label: "I connected them",       match: c => c.status === "connected" },
    { key: "planned",    label: "Planning to connect",    match: c => c.status === "planned" },
    { key: "skip",       label: "Not connecting",         match: c => c.status === "skip" },
  ];
  const filteredConnections = sortedConnections.filter(
    FILTERS.find(f => f.key === activeFilter)?.match || (() => true)
  );

  const FounderPill = ({ founder }) => {
    const c = COHORT_COLORS[founder.cohort] || { bg: "#f3f0ff", color: "#5c4eb5", border: "#c4b8f0" };
    return (
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 0 }}>
        <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>{founder.name}</p>
        {founder.company && (
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#1a1733", opacity: 0.7 }}>{founder.company}</p>
        )}
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: c.color }}>
          Cohort {founder.cohort} · {founder.cohortName}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 6px" }}>
          {founder.industry && (
            <span style={{ fontSize: 10, background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "1px 6px", color: "#4a4060", fontWeight: 500 }}>
              {founder.industry}
            </span>
          )}
          {founder.stage && (
            <span style={{ fontSize: 10, background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "1px 6px", color: "#4a4060", fontWeight: 500 }}>
              {founder.stage}
            </span>
          )}
          {founder.county && (
            <span style={{ fontSize: 10, background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "1px 6px", color: "#4a4060", fontWeight: 500 }}>
              📍 {founder.county} County
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Peer Connections</p>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#9b8fcf" }}>
          {connections.length > 0
            ? `${connections.length} suggested pairings · Last analyzed ${lastRunAt ? new Date(lastRunAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"} · Auto-updates Sun & Wed nights`
            : loading ? "Analyzing responses…" : "Auto-updates Sun & Wed nights — loading…"}
        </p>
      </div>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#c00" }}>⚠️ {error}</p>
        </div>
      )}

      {loading && connections.length === 0 && (
        <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Analyzing founder responses to find connections…</p>
      )}

      {sortedConnections.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {FILTERS.map(f => {
            const count = f.key === "all" ? sortedConnections.length : sortedConnections.filter(f.match).length;
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
                  border: active ? "1.5px solid #5c4eb5" : "1.5px solid #e0daf5",
                  background: active ? "#5c4eb5" : "#fff",
                  color: active ? "#fff" : "#6b6480",
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {f.label}
                <span style={{
                  background: active ? "rgba(255,255,255,0.25)" : "#f0ecff",
                  color: active ? "#fff" : "#5c4eb5",
                  borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {sortedConnections.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredConnections.map((conn, i) => (
            <div key={conn.pairKey || i} style={{
              background: "#fff", borderRadius: 14,
              border: "1px solid #e8e4f5",
              padding: "18px 20px",
              boxShadow: "0 1px 4px rgba(92,78,181,0.06)",
            }}>
              {/* Top row: shared theme + already-handled badge + date */}
              {(() => {
                const siblingStatus = getSiblingStatus(conn);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{ background: "#f3f0ff", color: "#5c4eb5", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
                      🔗 {conn.sharedTheme}
                    </span>
                    {siblingStatus === "connected" && (
                      <span style={{ background: "#e8f8f0", color: "#1a6e42", border: "1px solid #b8e8d0", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                        ✓ Already connected
                      </span>
                    )}
                    {siblingStatus === "planned" && (
                      <span style={{ background: "#fffbe6", color: "#7a5700", border: "1px solid #f5c542", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                        📅 Connection in progress
                      </span>
                    )}
                    {(() => {
                      const fmtDate = iso => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", yyyy: "numeric", year: "numeric" });
                      const lines = [
                        { iso: conn.addedAt || new Date().toISOString(), label: `Suggested` },
                        conn.plannedAt   && { iso: conn.plannedAt,   label: "Planning to connect" },
                        conn.skippedAt   && { iso: conn.skippedAt,   label: "Decided not to connect" },
                        conn.connectedAt && { iso: conn.connectedAt, label: "Connected" },
                      ].filter(Boolean);
                      return (
                        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                          {lines.map((l, i) => (
                            <span key={i} style={{ fontSize: 10, color: "#c0b8d8", fontStyle: "italic", whiteSpace: "nowrap" }}>
                              {l.label} {fmtDate(l.iso)}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* The two founders */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <FounderPill founder={conn.founders[0]} />
                <span style={{ fontSize: 20, color: "#c4b8f0", flexShrink: 0 }}>↔</span>
                <FounderPill founder={conn.founders[1]} />
              </div>

              {/* Reason */}
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4a4060", lineHeight: 1.65 }}>
                {conn.reason}
              </p>

              {/* Draft intro email */}
              {(() => {
                const draft = draftEmails[conn.pairKey];
                if (!draft) {
                  return (
                    <button
                      onClick={() => draftIntro(conn)}
                      style={{
                        marginBottom: 12, padding: "6px 14px",
                        background: "#f3f0ff", border: "1px solid #c4b8f0",
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        color: "#5c4eb5", cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      ✉️ Draft Intro Email
                    </button>
                  );
                }
                if (draft.loading) {
                  return (
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>
                      ✉️ Drafting intro email…
                    </p>
                  );
                }
                if (draft.error) {
                  return (
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: "#c0392b" }}>
                      ⚠ {draft.error} —{" "}
                      <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => draftIntro(conn)}>retry</span>
                    </p>
                  );
                }
                return (
                  <div style={{
                    marginBottom: 12, background: "#f7f5ff",
                    border: "1px solid #ddd8f8", borderRadius: 10, padding: "14px 16px",
                  }}>
                    {/* Subject row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{draft.subject}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
                            setDraftEmails(prev => ({ ...prev, [conn.pairKey]: { ...prev[conn.pairKey], copied: true } }));
                            setTimeout(() => setDraftEmails(prev => ({ ...prev, [conn.pairKey]: { ...prev[conn.pairKey], copied: false } })), 2000);
                          }}
                          style={{ padding: "4px 10px", background: draft.copied ? "#e8f8f0" : "#fff", border: `1px solid ${draft.copied ? "#b8e8d0" : "#c4b8f0"}`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: draft.copied ? "#1a6e42" : "#5c4eb5", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {draft.copied ? "✓ Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => draftIntro(conn)}
                          style={{ padding: "4px 10px", background: "#fff", border: "1px solid #e0daf5", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#9b8fcf", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          ↺ Redo
                        </button>
                        <button
                          onClick={() => setDraftEmails(prev => { const n = { ...prev }; delete n[conn.pairKey]; return n; })}
                          style={{ padding: "4px 8px", background: "#fff", border: "1px solid #e0daf5", borderRadius: 6, fontSize: 13, lineHeight: 1, color: "#b0a8cc", cursor: "pointer", fontFamily: "inherit" }}
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {/* Editable body */}
                    <textarea
                      value={draft.body}
                      onChange={e => setDraftEmails(prev => ({ ...prev, [conn.pairKey]: { ...prev[conn.pairKey], body: e.target.value } }))}
                      rows={10}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        fontSize: 12, color: "#4a4060", lineHeight: 1.7,
                        fontFamily: "inherit", background: "#fff",
                        border: "1px solid #e0daf5", borderRadius: 8,
                        padding: "10px 12px", resize: "vertical", outline: "none",
                      }}
                    />
                  </div>
                );
              })()}

              {/* Status dropdown */}
              {(() => {
                const active = STATUS_OPTIONS.find(o => o.key === conn.status);
                return (
                  <select
                    value={conn.status || ""}
                    onChange={e => updateStatus(conn.pairKey, e.target.value || null)}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8,
                      border: active ? `1.5px solid ${active.border}` : "1.5px solid #e8e4f5",
                      background: active ? active.bg : "#f7f5ff",
                      color: active ? active.color : "#9b8fcf",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", outline: "none",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239b8fcf'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      paddingRight: 32,
                    }}
                  >
                    <option value="">Not reviewed yet</option>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {connections.length === 0 && !loading && (
        <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>No connections found yet — more responses needed.</p>
      )}
      {connections.length > 0 && filteredConnections.length === 0 && (
        <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>No connections match this filter.</p>
      )}

      <p style={{ margin: "28px 0 0", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        📋 Connections are AI-suggested based on prompt responses. Use your judgment before making introductions.
      </p>

      {/* Undo toast */}
      {undoState && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#1a1733", color: "#fff", borderRadius: 10,
          padding: "12px 18px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.28)", zIndex: 9999,
          fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
          animation: "slideUp 0.2s ease",
        }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
          <span>Status updated</span>
          <button
            onClick={handleUndo}
            style={{
              background: "#5c4eb5", border: "none", color: "#fff",
              borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Undo
          </button>
          <button
            onClick={() => setUndoState(null)}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.45)",
              fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
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
function Dashboard({ data, refreshedAt, confirmedSlugs = new Set(), declinedSlugs = new Set(), respondedMentorNames = new Set(), onChurnChange }) {
  const [activeCohort, setActiveCohort] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [milestoneFilters, setMilestoneFilters] = useState([]);
  const [needsMentorFilter, setNeedsMentorFilter] = useState(false);
  const [confirmedMentorFilter, setConfirmedMentorFilter] = useState(false);
  const [pendingMentorFilter, setPendingMentorFilter] = useState(false);
  const [participatedNotOnboardedFilter, setParticipatedNotOnboardedFilter] = useState(false);
  const [onboardedPendingMentorFilter, setOnboardedPendingMentorFilter] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState([]);

  useEffect(() => {
    fetch("/api/admin/pending-assignments")
      .then(r => r.json())
      .then(d => setPendingAssignments(d.pending || []))
      .catch(() => {});
  }, []);

  const { mentees = [], pendingReviewCount = 0 } = data;
  const isPreProgram = new Date() < PROGRAM_START;

  // Change cohort → clear filters
  const handleCohortChange = (c) => {
    setActiveCohort(c);
    setStatusFilters([]);
    setMilestoneFilters([]);
  };

  // Build slug → pending assignment lookup from /api/admin/pending-assignments
  const pendingBySlug = {};
  for (const g of pendingAssignments) {
    for (const mentee of (g.mentees || [])) {
      pendingBySlug[mentee.slug] = { mentorName: g.mentorName, mentorEmail: g.mentorEmail, isRematch: mentee.isRematch, prevMentor: mentee.prevMentor };
    }
  }

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
    const needsMentorMatch = !needsMentorFilter || declinedSlugs.has(m.slug) || (!m.mentorName && !confirmedSlugs.has(m.slug));
    const confirmedMentorMatch = !confirmedMentorFilter || confirmedSlugs.has(m.slug);
    const pendingMentorMatch = !pendingMentorFilter || (m.mentorName && !respondedMentorNames.has(m.mentorName));
    const participatedNotOnboardedMatch = !participatedNotOnboardedFilter || (m.milestones?.participation && !m.milestones?.onboarding);
    const onboardedPendingMentorMatch = !onboardedPendingMentorFilter || (m.milestones?.onboarding && m.mentorName && !confirmedSlugs.has(m.slug));
    return cohortMatch && searchMatch && statusMatch && milestoneMatch && needsMentorMatch && confirmedMentorMatch && pendingMentorMatch && participatedNotOnboardedMatch && onboardedPendingMentorMatch;
  });

  const realMentees   = mentees.filter(m => !m.isTest);
  const activeMentees = realMentees.filter(m => m.status !== "churned");
  const counts = {
    total:      activeMentees.length,
    atRisk:     activeMentees.filter(m => m.status === "at-risk").length,
    attention:  activeMentees.filter(m => m.status === "needs-attention").length,
    onTrack:    activeMentees.filter(m => m.status === "on-track").length,
    churned:    realMentees.filter(m => m.status === "churned").length,
    onboarding: realMentees.filter(m => m.milestones?.onboarding).length,
    participated: realMentees.filter(m => m.milestones?.participation).length,
    onboardedWithMentor: realMentees.filter(m => m.milestones?.onboarding && confirmedSlugs.has(m.slug)).length,
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

  const statCardsRow1 = [
    {
      label: "Total Mentees",
      value: counts.total,
      color: "#5c4eb5", bg: "#f3f0ff",
      desc: `All active program participants excluding test accounts and churned mentees`,
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
      label: "🎓 Onboarded + Mentor Confirmed",
      value: counts.onboardedWithMentor,
      color: "#0e7c6b", bg: "#e8faf7",
      desc: "Completed onboarding and have a mentor who has confirmed",
      statusKey: null,
    },
    {
      label: "🎓 Onboarded + Mentor Pending",
      value: realMentees.filter(m => m.milestones?.onboarding && m.mentorName && !confirmedSlugs.has(m.slug)).length,
      color: "#7a5700", bg: "#fffbe6",
      desc: "Completed onboarding but mentor has not yet confirmed",
      statusKey: null,
    },
  ];

  const statCardsRow2 = [
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
      desc: "Has confirmed participation but has not attended an onboarding session, or is behind on required milestones",
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

  const statCards = [...statCardsRow1, ...statCardsRow2];

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
        {[statCardsRow1, statCardsRow2].map((row, ri) => (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
            {row.map(({ label, value, color, bg, desc }) => (
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
        ))}

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

          {/* Divider */}
          <span style={{ width: 1, height: 18, background: "#e0daf0", flexShrink: 0 }} />

          {/* Needs Mentor filter */}
          {(() => {
            const nmCount = mentees.filter(m => declinedSlugs.has(m.slug) || (!m.mentorName && !confirmedSlugs.has(m.slug))).length;
            return (
              <button onClick={() => setNeedsMentorFilter(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: needsMentorFilter ? "2px solid #b35c00" : "1.5px solid #b35c0044",
                background: needsMentorFilter ? "#b35c00" : "#fff3e0",
                color: needsMentorFilter ? "#fff" : "#b35c00",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: needsMentorFilter ? "rgba(255,255,255,0.8)" : "#b35c00", flexShrink: 0 }} />
                Needs Mentor ({nmCount})
                {needsMentorFilter && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })()}

          {/* Confirmed Mentor filter */}
          {(() => {
            const cmCount = mentees.filter(m => confirmedSlugs.has(m.slug)).length;
            return (
              <button onClick={() => setConfirmedMentorFilter(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: confirmedMentorFilter ? "2px solid #1a6e42" : "1.5px solid #1a6e4244",
                background: confirmedMentorFilter ? "#1a6e42" : "#e8f8f0",
                color: confirmedMentorFilter ? "#fff" : "#1a6e42",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: confirmedMentorFilter ? "rgba(255,255,255,0.8)" : "#1a6e42", flexShrink: 0 }} />
                Confirmed Mentor ({cmCount})
                {confirmedMentorFilter && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })()}

          {/* Pending Mentor Match filter */}
          {(() => {
            const pmCount = mentees.filter(m => m.mentorName && !respondedMentorNames.has(m.mentorName)).length;
            return (
              <button onClick={() => setPendingMentorFilter(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: pendingMentorFilter ? "2px solid #6b6480" : "1.5px solid #6b648044",
                background: pendingMentorFilter ? "#6b6480" : "#f0eef8",
                color: pendingMentorFilter ? "#fff" : "#6b6480",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: pendingMentorFilter ? "rgba(255,255,255,0.8)" : "#6b6480", flexShrink: 0 }} />
                Pending Mentor Reply ({pmCount})
                {pendingMentorFilter && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })()}

          {(() => {
            const count = mentees.filter(m => !m.isTest && m.milestones?.participation && !m.milestones?.onboarding).length;
            return (
              <button onClick={() => setParticipatedNotOnboardedFilter(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: participatedNotOnboardedFilter ? "2px solid #0e7c6b" : "1.5px solid #0e7c6b44",
                background: participatedNotOnboardedFilter ? "#0e7c6b" : "#e8faf7",
                color: participatedNotOnboardedFilter ? "#fff" : "#0e7c6b",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: participatedNotOnboardedFilter ? "rgba(255,255,255,0.8)" : "#0e7c6b", flexShrink: 0 }} />
                Confirmed · Onboarding Incomplete ({count})
                {participatedNotOnboardedFilter && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })()}

          {(() => {
            const count = mentees.filter(m => !m.isTest && m.milestones?.onboarding && m.mentorName && !confirmedSlugs.has(m.slug)).length;
            return (
              <button onClick={() => setOnboardedPendingMentorFilter(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: onboardedPendingMentorFilter ? "2px solid #2a7fd4" : "1.5px solid #2a7fd444",
                background: onboardedPendingMentorFilter ? "#2a7fd4" : "#e8f4ff",
                color: onboardedPendingMentorFilter ? "#fff" : "#2a7fd4",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", userSelect: "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: onboardedPendingMentorFilter ? "rgba(255,255,255,0.8)" : "#2a7fd4", flexShrink: 0 }} />
                🎓 Onboarded · Mentor Pending ({count})
                {onboardedPendingMentorFilter && <span style={{ marginLeft: 1 }}>×</span>}
              </button>
            );
          })()}

        </div>

        {/* Table — sticky header, scrollable rows */}
        {(() => {
          const COLS = "1.3fr 1.2fr 78px 118px 110px 86px 76px 1.3fr 82px 1.9fr";
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
                  {["Mentee", "Mentor", "Cohort", "Status", "Milestones", "Sessions", "Edu", "Flags", ""].map(h => (
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
                        {declinedSlugs.has(m.slug) ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#b35c00", background: "#fff3e0", borderRadius: 4, padding: "2px 7px" }}>
                            Needs Mentor
                          </span>
                        ) : pendingBySlug[m.slug] ? (
                          <>
                            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#1a1733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {pendingBySlug[m.slug].mentorName}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#0e7c6b", background: "#e8faf7", border: "1px solid #9ee3d8", borderRadius: 4, padding: "2px 7px" }}>
                                Pending · Needs to Send
                              </span>
                              {pendingBySlug[m.slug].isRematch && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#b35c00", background: "#fff3e0", border: "1px solid #f5d9a0", borderRadius: 4, padding: "2px 7px" }}>
                                  🔄 2nd match
                                </span>
                              )}
                            </div>
                          </>
                        ) : m.mentorName ? (
                          <>
                            <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: "#1a1733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                              {confirmedSlugs.has(m.slug) && (
                                <span style={{ color: "#22a366", fontSize: 13, flexShrink: 0 }}>✓</span>
                              )}
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
                        {declinedSlugs.has(m.slug) && (
                          <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3, background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "2px 5px" }}>
                            Mentor declined — needs reassignment
                          </span>
                        )}
                        {m.flags.length === 0 && !declinedSlugs.has(m.slug) ? (
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

                      {/* Churn toggle */}
                      <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 2 }}>
                        <button
                          title={m.status === "churned" ? "Re-enroll into program (restore portal access)" : "Mark as churned (freeze portal)"}
                          onClick={async () => {
                            const newVal = m.status !== "churned";
                            if (newVal) {
                              const ok = window.confirm(`Are you sure you want to churn ${m.first} ${m.last}?\n\nThis will freeze their portal and they will no longer be able to access it until restored.`);
                              if (!ok) return;
                            }
                            await fetch("/api/set-churned", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ slug: m.slug, churned: newVal }),
                            });
                            onChurnChange?.(m.slug, newVal);
                          }}
                          style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 6,
                            border: "1px solid", whiteSpace: "nowrap",
                            cursor: "pointer",
                            background: m.status === "churned" ? "#f0eef8" : "#fff",
                            color: m.status === "churned" ? "#6b6480" : "#c0b8d8",
                            borderColor: m.status === "churned" ? "#c4b8e8" : "#e0daf0",
                            transition: "all 0.15s",
                          }}
                        >
                          {m.status === "churned" ? "↩ Re-enroll" : "Churn"}
                        </button>
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

// ─── Match Status tab ──────────────────────────────────────────────────────────
function MatchStatus({ mentees = [], confirmations = {}, confirmedSlugs, declinedSlugs }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const TEST_SLUGS = new Set(["kennedy", "jackie", "aaron", "mj"]);
  const real = mentees.filter(m => !m.isTest && !TEST_SLUGS.has(m.slug) && m.status !== "churned");

  // Categorise each mentee — declined counts as needs-match since they'd need reassignment
  const rows = real.map(m => {
    let matchStatus;
    if (confirmedSlugs.has(m.slug))     matchStatus = "confirmed";
    else if (m.mentorName)              matchStatus = "pending";
    else                                matchStatus = "needs-match";
    return { ...m, matchStatus };
  });

  // Build mentor → [mentee names] map so we can show "also mentoring X"
  const mentorToMentees = {};
  for (const r of rows) {
    if (!r.mentorName) continue;
    if (!mentorToMentees[r.mentorName]) mentorToMentees[r.mentorName] = [];
    mentorToMentees[r.mentorName].push(`${r.first} ${r.last}`);
  }

  const FILTERS = [
    { key: "all",         label: "All",               color: "#5c4eb5", bg: "#f3f0ff" },
    { key: "confirmed",   label: "✓ Confirmed Match",  color: "#1a6e42", bg: "#e8f8f0" },
    { key: "pending",     label: "⏳ Pending Match",   color: "#7a5700", bg: "#fffbe6" },
    { key: "needs-match", label: "⚠️ Needs a Match",   color: "#c0392b", bg: "#fef0f0" },
  ];

  const counts = {
    all:           rows.length,
    confirmed:     rows.filter(r => r.matchStatus === "confirmed").length,
    pending:       rows.filter(r => r.matchStatus === "pending").length,
    "needs-match": rows.filter(r => r.matchStatus === "needs-match").length,
  };

  const q = search.toLowerCase();
  const visible = rows
    .filter(r => filter === "all" || r.matchStatus === filter)
    .filter(r => !q || `${r.first} ${r.last} ${r.company} ${r.mentorName || ""}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const order = { "needs-match": 0, pending: 1, confirmed: 2 };
      return (order[a.matchStatus] ?? 9) - (order[b.matchStatus] ?? 9) || `${a.last}${a.first}`.localeCompare(`${b.last}${b.first}`);
    });

  const STATUS_STYLE = {
    confirmed:    { label: "Confirmed",   color: "#1a6e42", bg: "#e8f8f0", dot: "#22a366" },
    pending:      { label: "Pending",     color: "#7a5700", bg: "#fffbe6", dot: "#f5a623" },
    "needs-match":{ label: "Needs Match", color: "#c0392b", bg: "#fef0f0", dot: "#e74c3c" },
  };

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "6px 14px", borderRadius: 20, border: active ? `2px solid ${f.color}` : `1.5px solid ${f.color}44`,
              background: active ? f.color : f.bg,
              color: active ? "#fff" : f.color,
              fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif",
            }}>
              {f.label} <span style={{ opacity: 0.75 }}>({counts[f.key]})</span>
            </button>
          );
        })}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search mentees or mentors…"
          style={{
            marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1.5px solid #e0daf0",
            fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", outline: "none", width: 220,
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", overflow: "clip" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.6fr 120px",
          padding: "11px 20px", background: "#f7f5ff", borderBottom: "1px solid #e8e4f5",
        }}>
          {["Mentee", "Company", "Cohort", "Mentor", "Status"].map(h => (
            <p key={h} style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</p>
          ))}
        </div>

        {/* Rows */}
        {visible.length === 0 ? (
          <p style={{ margin: 0, padding: "24px 20px", fontSize: 13, color: "#9b8fcf", textAlign: "center" }}>No mentees match this filter.</p>
        ) : visible.map((m, i) => {
          const ss = STATUS_STYLE[m.matchStatus];
          return (
            <div key={m.slug} style={{
              display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.6fr 120px",
              padding: "13px 20px", alignItems: "center",
              borderBottom: i < visible.length - 1 ? "1px solid #f5f3ff" : "none",
              background: "#fff",
            }}>
              <div>
                <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>{m.first} {m.last}</p>
                {m.email && <p style={{ margin: 0, fontSize: 11, color: "#9b8fcf" }}>{m.email}</p>}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#6b6480" }}>{m.company || "—"}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b6480" }}>Cohort {m.cohort}</p>
              <div>
                {m.mentorName ? (
                  <>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{m.mentorName}</p>
                    {m.mentorEmail && <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9b8fcf" }}>{m.mentorEmail}</p>}
                    {(() => {
                      const others = (mentorToMentees[m.mentorName] || []).filter(n => n !== `${m.first} ${m.last}`);
                      return others.length > 0 ? (
                        <span style={{
                          display: "inline-block", fontSize: 10, fontWeight: 600,
                          background: "#f0ecff", color: "#5c4eb5", borderRadius: 4,
                          padding: "2px 7px",
                        }}>
                          Also mentoring {others.join(", ")}
                        </span>
                      ) : null;
                    })()}
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: "#c0b8d8" }}>No mentor assigned</span>
                )}
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                background: ss.bg, color: ss.color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot, flexShrink: 0 }} />
                {ss.label}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 11, color: "#c0b8d8", textAlign: "right" }}>
        {visible.length} of {rows.length} mentees shown
      </p>
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
  const [mentorConfirmations, setMentorConfirmations] = useState({});
  const [mentorSessions, setMentorSessions] = useState({});
  const [respondedMentorNames, setRespondedMentorNames] = useState(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("uplift_admin") === "yes") setAuthed(true);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("uplift_mentor_confirmations_v1");
      if (stored) setMentorConfirmations(JSON.parse(stored));
    } catch (_) {}
    try {
      const stored = localStorage.getItem("uplift_mentor_sessions_v1");
      if (stored) setMentorSessions(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const handleMentorSessionChange = (mentorKey, count) => {
    const next = { ...mentorSessions, [mentorKey]: count };
    setMentorSessions(next);
    try { localStorage.setItem("uplift_mentor_sessions_v1", JSON.stringify(next)); } catch (_) {}
    // mentorKey format: mentorEmail|menteeSlug
    const [mentorEmail, menteeSlug] = mentorKey.split("|");
    if (mentorEmail && menteeSlug) {
      fetch("/api/save-mentor-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorEmail, menteeSlug, count }),
      }).catch(() => {});
    }
  };

  const handleConfirmationChange = (key, val, meta) => {
    const next = { ...mentorConfirmations, [key]: val };
    setMentorConfirmations(next);
    try { localStorage.setItem("uplift_mentor_confirmations_v1", JSON.stringify(next)); } catch (_) {}
    // Persist to Google Sheet (fire-and-forget)
    if (meta) {
      fetch("/api/save-mentor-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, status: val }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([
      fetch("/api/admin-data").then(r => r.json()),
      fetch("/api/mentor-email-responses").then(r => r.json()),
      fetch("/api/get-mentor-confirmations").then(r => r.json()).catch(() => ({})),
      fetch("/api/get-mentor-sessions").then(r => r.json()).catch(() => ({})),
    ]).then(([d, emailData, confData, sessData]) => {
      setData(d);
      setRespondedMentorNames(new Set((emailData.responses || []).map(r => r.mentor.name)));
      // Sheet is source of truth — merge over localStorage
      if (confData.confirmations && Object.keys(confData.confirmations).length > 0) {
        setMentorConfirmations(prev => ({ ...prev, ...confData.confirmations }));
        try { localStorage.setItem("uplift_mentor_confirmations_v1", JSON.stringify({ ...JSON.parse(localStorage.getItem("uplift_mentor_confirmations_v1") || "{}"), ...confData.confirmations })); } catch (_) {}
      }
      if (sessData.sessions && Object.keys(sessData.sessions).length > 0) {
        setMentorSessions(prev => ({ ...prev, ...sessData.sessions }));
        try { localStorage.setItem("uplift_mentor_sessions_v1", JSON.stringify({ ...JSON.parse(localStorage.getItem("uplift_mentor_sessions_v1") || "{}"), ...sessData.sessions })); } catch (_) {}
      }
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
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
          <div style={{ background: "#1a0e4f", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 4, padding: "0 32px", overflowX: "auto" }}>
            {[
              { key: "mentees",     label: "👥 Mentees" },
              { key: "match-status", label: "🔗 Match Status" },
              { key: "clicks",      label: "📊 Click Engagement" },
              { key: "prompts",     label: "📝 Prompt Engagement" },
              { key: "activity",    label: "🕐 Portal Activity" },
              { key: "connections", label: "🤝 Peer Connections" },
              { key: "pulse",       label: "❤️ Weekly Pulse" },
              { key: "matches",     label: "👥 Mentors" },
              { key: "matching",    label: "🔀 Matching" },
              { key: "need-to-send", label: "📬 Need to Send" },
              { key: "emails",      label: "✅ Mentor Confirmation" },
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
          {(() => {
            const confirmedSlugs = new Set(Object.entries(mentorConfirmations).filter(([,v]) => v === "confirmed").map(([k]) => k.split("|")[1]));
            const declinedSlugs  = new Set(Object.entries(mentorConfirmations).filter(([,v]) => v === "declined").map(([k]) => k.split("|")[1]));
            return adminTab === "mentees" && <Dashboard data={data} refreshedAt={data.generatedAt} confirmedSlugs={confirmedSlugs} declinedSlugs={declinedSlugs} respondedMentorNames={respondedMentorNames} onChurnChange={(slug, churned) => {
              setData(prev => ({
                ...prev,
                mentees: prev.mentees.map(m => m.slug === slug ? { ...m, status: churned ? "churned" : "needs-attention" } : m),
              }));
            }} />;
          })()}
          {adminTab === "match-status" && (() => {
            const confirmedSlugs = new Set(Object.entries(mentorConfirmations).filter(([,v]) => v === "confirmed").map(([k]) => k.split("|")[1]));
            const declinedSlugs  = new Set(Object.entries(mentorConfirmations).filter(([,v]) => v === "declined").map(([k]) => k.split("|")[1]));
            return <MatchStatus mentees={data?.mentees || []} confirmations={mentorConfirmations} confirmedSlugs={confirmedSlugs} declinedSlugs={declinedSlugs} />;
          })()}
          {adminTab === "clicks"   && <ClickEngagement />}
          {adminTab === "prompts"     && <PromptEngagement />}
          {adminTab === "activity"    && <PortalActivity />}
          {adminTab === "connections" && <PeerConnections />}
          {adminTab === "pulse"       && <PulseReport />}
          {adminTab === "matches"     && <MentorMatches confirmations={mentorConfirmations} sessions={mentorSessions} onSessionChange={handleMentorSessionChange} mentees={data?.mentees || []} />}
          {adminTab === "matching"    && <MatchingDashboard confirmations={mentorConfirmations} mentees={data?.mentees || []} />}
          {adminTab === "need-to-send" && <NeedToSend />}
          {adminTab === "emails"      && <MentorEmailResponses confirmations={mentorConfirmations} onConfirmationChange={handleConfirmationChange} />}
        </>
      )}
    </>
  );
}

// ─── Matching Dashboard view ──────────────────────────────────────────────────
function MatchingDashboard({ confirmations = {}, mentees = [] }) {
  const [selData, setSelData]     = useState(null);
  const [responses, setResponses] = useState([]);
  const [newMentors, setNewMentors] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [menteeFilters, setMenteeFilters] = useState(new Set()); // empty = show all
  const [mentorFilters, setMentorFilters] = useState(new Set());
  const [approvedMenteeSlugs, setApprovedMenteeSlugs] = useState(new Set());
  const [approvedMentorNames, setApprovedMentorNames] = useState(new Set());
  const [adminMatchedSlugs, setAdminMatchedSlugs] = useState(new Set()); // slugs with fresh admin-assigned match

  const handleMatchApproved = (menteeSlugs, mentorName) => {
    setApprovedMenteeSlugs(prev => { const s = new Set(prev); menteeSlugs.forEach(sl => s.add(sl)); return s; });
    setApprovedMentorNames(prev => { const s = new Set(prev); s.add(mentorName); return s; });
    setAdminMatchedSlugs(prev => { const s = new Set(prev); menteeSlugs.forEach(sl => s.add(sl)); return s; });
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/mentor-selections").then(r => r.json()),
      fetch("/api/mentor-email-responses").then(r => r.json()),
      fetch("/api/admin/new-mentor-details").then(r => r.json()).catch(() => ({ mentors: [] })),
      fetch("/api/admin/pending-assignments").then(r => r.json()).catch(() => ({ pending: [] })),
    ]).then(([sel, email, app, pend]) => {
      setSelData(sel);
      setResponses(email.responses || []);
      setNewMentors(app.mentors || []);
      // Build sets of slugs/mentor names that have a fresh admin-approved (not-yet-sent) match
      const adminSlugs = new Set();
      const adminMentors = new Set();
      for (const g of (pend.pending || [])) {
        if (g.adminAssigned) {
          adminMentors.add(g.mentorName);
          for (const m of (g.mentees || [])) adminSlugs.add(m.slug);
        }
      }
      setAdminMatchedSlugs(adminSlugs);
      setApprovedMenteeSlugs(adminSlugs);   // seed so declined mentees with new match are excluded
      setApprovedMentorNames(adminMentors);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: "#9b8fcf", fontFamily: "Inter, system-ui, sans-serif" }}>Loading…</div>
  );

  const COHORT_NAMES_MD = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

  // Build mentee status lookup from admin-data mentees prop
  const menteeStatusBySlug = {};
  for (const m of mentees) {
    if (m.isTest) continue;
    menteeStatusBySlug[m.slug] = {
      participation: m.milestones?.participation || false,
      churned: m.status === "churned",
      name: m.name,
      company: m.company,
      cohort: m.cohort,
    };
  }

  // Build set of slugs that have a mentor assigned in MENTEES
  const selectionsMap = {}; // slug → mentor name
  for (const s of (selData?.selections || [])) {
    if (s.mentor?.name) selectionsMap[s.slug] = s.mentor.name;
  }

  // Build confirmation sets from mentor email responses
  const confirmedSlugsByMentor = {}; // mentor name → [slug]
  const responseByMentor = {};
  for (const r of responses) {
    responseByMentor[r.mentor?.name] = r;
    for (const opt of (r.options || [])) {
      const key = `${r.threadId}|${opt.slug}`;
      if (confirmations[key] === "confirmed") {
        if (!confirmedSlugsByMentor[r.mentor.name]) confirmedSlugsByMentor[r.mentor.name] = [];
        confirmedSlugsByMentor[r.mentor.name].push(opt.slug);
      }
    }
  }

  // Only count confirmed participants
  const confirmedParticipantSlugs = new Set(
    mentees.filter(m => !m.isTest && m.milestones?.participation).map(m => m.slug)
  );

  const isConfirmed = s => confirmedParticipantSlugs.has(s.slug);

  const TEST_SLUGS_MD = new Set(["kennedy", "jackie", "aaron", "mj"]);

  // Build a per-mentee-slug confirmation status map from email threads
  // status: "confirmed" | "declined" | "pending" (thread exists, no answer yet) | null (no thread)
  const slugConfirmStatus = {}; // slug → { status, mentorName }
  const slugDeclinedBy = {};    // slug → mentor name who declined
  for (const r of responses) {
    for (const opt of (r.options || [])) {
      const key = `${r.threadId}|${opt.slug}`;
      const st = confirmations[key]; // "confirmed" | "declined" | undefined
      const existing = slugConfirmStatus[opt.slug];
      // "confirmed" wins over everything; "declined" only sets if not confirmed elsewhere
      if (st === "confirmed") {
        slugConfirmStatus[opt.slug] = { status: "confirmed", mentorName: r.mentor?.name };
      } else if (!existing || existing.status !== "confirmed") {
        if (st === "declined") {
          slugDeclinedBy[opt.slug] = r.mentor?.name;
          if (!existing) slugConfirmStatus[opt.slug] = { status: "declined", mentorName: r.mentor?.name };
        } else if (!existing) {
          // Thread exists but no answer yet
          slugConfirmStatus[opt.slug] = { status: "pending", mentorName: r.mentor?.name };
        }
      }
    }
  }

  // ── Unified mentee needs list ─────────────────────────────────────────────
  // tag: "not-invited" = accepted into program, not yet invited/participated
  // tag: null          = confirmed participant, no mentor assigned
  // tag: "pending"     = confirmed participant, assigned mentor not confirmed yet
  // tag: "declined"    = confirmed participant, mentor explicitly declined
  // Build a set of mentor names that have sheet-assigned mentees (selectedMentor from Mentor Selections)
  // This is synchronous data from selData — no state dependency — so it's always accurate.
  const mentorsWithSheetAssignment = new Set();
  for (const s of (selData?.selections || [])) {
    if (s.selectedMentor) mentorsWithSheetAssignment.add(s.selectedMentor);
  }

  const needsMentorList = [];
  for (const s of (selData?.selections || []).filter(s => !approvedMenteeSlugs.has(s.slug))) {
    if (TEST_SLUGS_MD.has(s.slug)) continue;

    // If the sheet already has an admin-assigned mentor (selectedMentor), they're covered — skip.
    if (s.selectedMentor) continue;

    if (!isConfirmed(s)) {
      // Explicitly flagged in lib/mentees.js as needing an invitation (not yet onboarded)
      if (s.needsInvitation) needsMentorList.push({ ...s, needTag: "not-invited" });
      // Otherwise unconfirmed = engagement issue, not a matching issue — skip
      continue;
    }

    if (!s.assignedMentor) {
      needsMentorList.push({ ...s, needTag: null });
    } else {
      const conf = slugConfirmStatus[s.slug];
      if (conf && conf.status === "declined") {
        needsMentorList.push({ ...s, needTag: "declined", declinedBy: slugDeclinedBy[s.slug] });
      }
      // "pending", "new-match", "confirmed" → has active/pending match, don't show
    }
  }

  // Keep a separate declined set for right-column logic
  const slugsDeclined = new Set(
    needsMentorList.filter(m => m.needTag === "declined").map(m => m.slug)
  );

  // ── 3. Mentors who need a mentee / mentors whose mentee is unresponsive ───
  const mentorsNeedingMentee = [];
  for (const mentor of (selData?.mentors || [])) {
    if (mentor.name === "MJ" || mentor.name === "Kennedy") continue;
    const resp = responseByMentor[mentor.name];
    if (resp) {
      const opts = resp.options || [];
      const allDeclined = opts.length > 0 && opts.every(o => confirmations[`${resp.threadId}|${o.slug}`] === "declined");
      if (allDeclined) {
        mentorsNeedingMentee.push({ name: mentor.name, email: mentor.email, label: "Declined — Needs Rematch" });
        continue;
      }
      // Only flag "Mentee Unresponsive" if the mentor has NO mentee who has confirmed participation.
      // If even one of their confirmed mentees is an active participant, they're covered.
      const confirmedMentees = opts.filter(o => confirmations[`${resp.threadId}|${o.slug}`] === "confirmed");
      const hasActiveMentee = confirmedMentees.some(o => confirmedParticipantSlugs.has(o.slug));
      if (!hasActiveMentee && confirmedMentees.length > 0) {
        // All confirmed mentees are unresponsive — flag the mentor once
        const names = confirmedMentees.map(o => o.name).join(", ");
        mentorsNeedingMentee.push({ name: mentor.name, email: mentor.email, menteeName: names, label: "Mentee Unresponsive" });
      }
    }
  }
  for (const m of newMentors) {
    mentorsNeedingMentee.push({ name: m.name, email: m.email, company: m.company, title: m.title, industry: m.industry, focus: m.focus, label: "New Applicant" });
  }

  // Hide mentors that already have sheet-assigned mentees (selectedMentor) OR were approved this session
  const visibleMentorsNeedingMentee = mentorsNeedingMentee.filter(
    m => !approvedMentorNames.has(m.name) && !mentorsWithSheetAssignment.has(m.name)
  );

  const ColHeader = ({ emoji, label, count, color, bg }) => (
    <div style={{ background: bg, borderRadius: "12px 12px 0 0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1.5px solid rgba(0,0,0,0.06)" }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color, flex: 1 }}>{label}</p>
      <span style={{ fontSize: 20, fontWeight: 900, color }}>{count}</span>
    </div>
  );

  const Card = ({ children, border }) => (
    <div style={{ background: "#fff", border: `1.5px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
      {children}
    </div>
  );

  const emptyNote = (
    <p style={{ margin: 0, fontSize: 13, color: "#22a366", fontWeight: 600, padding: "12px 0" }}>✓ None — all clear</p>
  );

  // Hoisted so both columns AND the suggested matches section share the same filtered lists
  const isMenteeActive = (key) => menteeFilters.size === 0 || menteeFilters.has(key === null ? "__none__" : key);
  const visibleMentees = needsMentorList.filter(s => isMenteeActive(s.needTag));
  const visibleMentors = mentorFilters.size === 0
    ? visibleMentorsNeedingMentee
    : visibleMentorsNeedingMentee.filter(m => mentorFilters.has(m.label));
  const actionableMentors = visibleMentors.filter(m => m.label === "New Applicant" || m.label === "Declined — Needs Rematch");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Matching</p>
        <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>Confirmed participants only · Cross-compare to make new pairings</p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: MENTEES ── */}
        {(() => {
          const MENTEE_TAG_OPTS = [
            { key: "not-invited", label: "Needs Invitation",        color: "#6b3fa0", bg: "#f5f0ff", border: "#d4b8f0" },
            { key: null,          label: "No Mentor",                color: "#c0392b", bg: "#fef5f5", border: "#f5c6c6" },
            { key: "declined",    label: "Mentor Declined",          color: "#b35c00", bg: "#fff3e0", border: "#f5d9a0" },
          ];
          const toggleMentee = (key) => setMenteeFilters(prev => {
            const next = new Set(prev);
            const k = key === null ? "__none__" : key;
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
          });
          const tagMap = {
            "not-invited": { label: "Needs Invitation",                color: "#6b3fa0", bg: "#f5f0ff", border: "#d4b8f0" },
            declined:      { label: "Mentor Declined — Needs Rematch", color: "#b35c00", bg: "#fff3e0", border: "#f5d9a0" },
          };
          return (
            <div>
              {/* Filter chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {MENTEE_TAG_OPTS.map(opt => {
                  const count = needsMentorList.filter(s => s.needTag === opt.key).length;
                  const active = menteeFilters.size === 0
                    ? true
                    : menteeFilters.has(opt.key === null ? "__none__" : opt.key);
                  return (
                    <button key={String(opt.key)} onClick={() => toggleMentee(opt.key)} style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 500,
                      border: `1.5px solid ${active ? opt.border : "#e8e4f5"}`,
                      background: active ? opt.bg : "#fff",
                      color: active ? opt.color : "#9b8fcf",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
                    }}>
                      {opt.label}
                      <span style={{ background: active ? opt.border : "#f0ecff", color: active ? opt.color : "#9b8fcf", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>
                    </button>
                  );
                })}
                {menteeFilters.size > 0 && (
                  <button onClick={() => setMenteeFilters(new Set())} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, border: "1.5px solid #e8e4f5", background: "#fff", color: "#9b8fcf", cursor: "pointer", fontFamily: "inherit" }}>
                    ✕ Clear
                  </button>
                )}
              </div>
              <div style={{ border: "1.5px solid #f5c6c6", borderRadius: 12, overflow: "hidden" }}>
                <ColHeader emoji="👤" label="Mentees Needing a Mentor" count={visibleMentees.length} color="#c0392b" bg="#fef5f5" />
                <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {visibleMentees.length === 0
                    ? <p style={{ margin: 0, fontSize: 13, color: "#22a366", fontWeight: 600, padding: "12px 0" }}>✓ None matching this filter</p>
                    : visibleMentees.map(s => {
                      const tag = s.needTag ? tagMap[s.needTag] : null;
                      return (
                        <Card key={s.slug} border={tag?.border || "#f5c6c6"}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: tag ? 4 : 0 }}>
                            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>{s.first} {s.last}</p>
                            {tag && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: tag.color, background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: 6, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                                {tag.label}
                              </span>
                            )}
                          </div>
                          {s.company && <p style={{ margin: "0 0 2px", fontSize: 11, color: "#6b6480" }}>{s.company}</p>}
                          {s.assignedMentor && <p style={{ margin: "0 0 1px", fontSize: 11, color: "#9b8fcf" }}>Assigned: {s.assignedMentor}</p>}
                          {s.needTag === "declined" && s.declinedBy && (
                            <p style={{ margin: "0 0 1px", fontSize: 11, color: "#b35c00", fontWeight: 600 }}>Declined by {s.declinedBy}</p>
                          )}
                          {s.cohort && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#c0b8d8" }}>Cohort {s.cohort} · {COHORT_NAMES_MD[s.cohort]}</p>}
                        </Card>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── RIGHT: MENTORS ── */}
        {(() => {
          const MENTOR_TAG_OPTS = [
            { key: "New Applicant",            color: "#1a6e42", bg: "#e8f8f0", border: "#b8e8d0" },
            { key: "Declined — Needs Rematch", color: "#c0392b", bg: "#fef0f0", border: "#f5c6c6" },
            { key: "Mentee Unresponsive",      color: "#b35c00", bg: "#fff3e0", border: "#f5d9a0" },
          ];
          const toggleMentor = (key) => setMentorFilters(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
          });
          const tagStyles = {
            "New Applicant":            { color: "#1a6e42", bg: "#e8f8f0", border: "#b8e8d0" },
            "Declined — Needs Rematch": { color: "#c0392b", bg: "#fef0f0", border: "#f5c6c6" },
            "Mentee Unresponsive":      { color: "#b35c00", bg: "#fff3e0", border: "#f5d9a0" },
          };
          return (
            <div>
              {/* Filter chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {MENTOR_TAG_OPTS.map(opt => {
                  const count = visibleMentorsNeedingMentee.filter(m => m.label === opt.key).length;
                  const active = mentorFilters.size === 0 ? true : mentorFilters.has(opt.key);
                  return (
                    <button key={opt.key} onClick={() => toggleMentor(opt.key)} style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 500,
                      border: `1.5px solid ${active ? opt.border : "#e8e4f5"}`,
                      background: active ? opt.bg : "#fff",
                      color: active ? opt.color : "#9b8fcf",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
                    }}>
                      {opt.key}
                      <span style={{ background: active ? opt.border : "#f0ecff", color: active ? opt.color : "#9b8fcf", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>
                    </button>
                  );
                })}
                {mentorFilters.size > 0 && (
                  <button onClick={() => setMentorFilters(new Set())} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, border: "1.5px solid #e8e4f5", background: "#fff", color: "#9b8fcf", cursor: "pointer", fontFamily: "inherit" }}>
                    ✕ Clear
                  </button>
                )}
              </div>
              <div style={{ border: "1.5px solid #c4b8f0", borderRadius: 12, overflow: "hidden" }}>
                <ColHeader emoji="🔍" label="Mentors Who Need a Mentee" count={visibleMentors.length} color="#5c4eb5" bg="#f3f0ff" />
                <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {visibleMentors.length === 0
                    ? <p style={{ margin: 0, fontSize: 13, color: "#22a366", fontWeight: 600, padding: "12px 0" }}>✓ None matching this filter</p>
                    : visibleMentors.map((m, i) => {
                      const ts = tagStyles[m.label] || { color: "#5c4eb5", bg: "#f3f0ff", border: "#c4b8f0" };
                      return (
                        <Card key={i} border={ts.border}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1733" }}>{m.name}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, color: ts.color, background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 6, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>{m.label}</span>
                          </div>
                          {m.menteeName && <p style={{ margin: "0 0 2px", fontSize: 11, color: "#b35c00", fontWeight: 600 }}>Mentee: {m.menteeName} — not yet responsive</p>}
                          {m.company && <p style={{ margin: "0 0 1px", fontSize: 11, color: "#6b6480" }}>{m.company}{m.title ? ` · ${m.title}` : ""}</p>}
                          {m.email && <p style={{ margin: "0 0 2px", fontSize: 11, color: "#5c4eb5" }}>{m.email}</p>}
                          {m.industry && <p style={{ margin: "0 0 1px", fontSize: 10, color: "#9b8fcf" }}>🏷 {m.industry}</p>}
                          {m.focus && <p style={{ margin: 0, fontSize: 10, color: "#9b8fcf" }}>🎯 {m.focus}</p>}
                        </Card>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* ── SUGGESTED MATCHES ── */}
      {actionableMentors.length > 0 && visibleMentees.length > 0 && (
        <SuggestedMatches
          mentees={visibleMentees}
          mentors={actionableMentors}
          maxPairings={actionableMentors.length * 2}
          onApproved={handleMatchApproved}
        />
      )}

    </div>
  );
}

function SuggestedMatches({ mentees, mentors, maxPairings, onApproved }) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Build slug → { needTag, assignedMentor, first, last } for chip annotations
  const menteeMetaBySlug = {};
  for (const m of mentees) menteeMetaBySlug[m.slug] = m;
  // cardState: { [i]: "approved" | "rematched" | null }
  const [cardState, setCardState] = useState({});
  // saving: { [i]: true } while API call in flight
  const [saving, setSaving] = useState({});
  // saveError: { [i]: string }
  const [saveError, setSaveError] = useState({});

  const generate = async () => {
    setLoading(true);
    setError(null);
    setMatches(null);
    setCardState({});
    setSaving({});
    setSaveError({});
    try {
      const menteePendingMentors = {};
      mentees.forEach(m => { if (m.needTag === "pending" && m.assignedMentor) menteePendingMentors[m.slug] = m.assignedMentor; });

      const res = await fetch("/api/admin/suggest-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menteeslugs: mentees.map(m => m.slug),
          mentors: mentors.map(m => ({
            name: m.name, company: m.company, title: m.title,
            industry: m.industry, focus: m.focus, bio: m.bio,
          })),
          menteePendingMentors,
          maxPairings: maxPairings || mentors.length * 2,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMatches(data.matches || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleApprove = async (match, i) => {
    setSaving(s => ({ ...s, [i]: true }));
    setSaveError(s => ({ ...s, [i]: null }));
    try {
      // Approve each mentee in the pairing
      for (let j = 0; j < (match.menteeSlugs || []).length; j++) {
        const slug = match.menteeSlugs[j];
        const name = match.menteeNames?.[j] || "";
        const mentor = mentors.find(m => m.name === match.mentorName) || {};
        const meta = menteeMetaBySlug[slug];
        const isRematch = !!(meta && (meta.needTag === "pending" || meta.needTag === "declined"));
        const prevMentor = meta?.assignedMentor || meta?.declinedBy || "";
        const r = await fetch("/api/admin/approve-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menteeSlug: slug,
            menteeName: name,
            mentorName: match.mentorName,
            mentorEmail: mentor.email || "",
            isRematch,
            prevMentor,
          }),
        });
        const d = await r.json();
        if (!d.ok && !d.dev) throw new Error(d.error || "Save failed");
      }
      setCardState(s => ({ ...s, [i]: "approved" }));
      if (onApproved) onApproved(match.menteeSlugs || [], match.mentorName);
    } catch (e) {
      setSaveError(s => ({ ...s, [i]: e.message }));
    }
    setSaving(s => ({ ...s, [i]: false }));
  };

  const handleRematch = (i) => {
    setCardState(s => ({ ...s, [i]: "rematched" }));
  };

  const approvedCount = Object.values(cardState).filter(v => v === "approved").length;
  const pendingCount = matches ? matches.filter((_, i) => !cardState[i]).length : 0;

  const strengthStyles = {
    strong: { color: "#1a6e42", bg: "#e8f8f0", border: "#b8e8d0", label: "⭐ Strong match" },
    good:   { color: "#5c4eb5", bg: "#f3f0ff", border: "#c4b8f0", label: "✓ Good match" },
    fair:   { color: "#7a5700", bg: "#fffbe6", border: "#f5c542", label: "~ Fair match" },
  };

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 18, fontWeight: 800, color: "#1a1733" }}>💡 Suggested Matches</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>
            {mentors.length} available mentor{mentors.length !== 1 ? "s" : ""} × up to 2 mentees each = up to {maxPairings || mentors.length * 2} pairings · drawn from {mentees.length} mentees needing a mentor
          </p>
          {matches && approvedCount > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#1a6e42", fontWeight: 600 }}>
              ✓ {approvedCount} match{approvedCount !== 1 ? "es" : ""} approved · {pendingCount} remaining
            </p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: loading ? "#e8e4f5" : "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
            color: loading ? "#9b8fcf" : "#fff",
            border: "none", borderRadius: 10, padding: "10px 22px",
            fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
            fontFamily: "Inter, system-ui, sans-serif", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {loading ? "✨ Generating…" : matches ? "↻ Regenerate" : "✨ Generate Suggestions"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#c00" }}>⚠️ {error}</p>
        </div>
      )}

      {loading && (
        <div style={{ background: "#f7f5ff", border: "1.5px solid #e0d9f8", borderRadius: 14, padding: "32px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#9b8fcf", fontStyle: "italic" }}>Analyzing profiles and generating matches…</p>
        </div>
      )}

      {matches && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {matches.map((m, i) => {
            const ss = strengthStyles[m.strength] || strengthStyles.good;
            const state = cardState[i];
            const isSaving = saving[i];
            const cardErr = saveError[i];

            if (state === "approved") {
              const rematchedNames = (m.menteeSlugs || [])
                .map((slug, j) => {
                  const meta = menteeMetaBySlug[slug];
                  return (meta?.needTag === "pending" || meta?.needTag === "declined") ? (m.menteeNames || [])[j] : null;
                })
                .filter(Boolean);
              return (
                <div key={i} style={{
                  background: "#f0faf4", border: "1.5px solid #b8e8d0",
                  borderRadius: 14, padding: "14px 20px",
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a6e42" }}>
                      {m.mentorName} → {(m.menteeNames || []).join(" & ")}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#3a8e5e" }}>Match approved — assigned as pending mentor confirmation</p>
                    {rematchedNames.length > 0 && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "#b35c00" }}>
                        🔄 2nd match for: {rematchedNames.join(", ")} — previous mentor was non-responsive
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            if (state === "rematched") {
              return (
                <div key={i} style={{
                  background: "#fffbe6", border: "1.5px solid #f5c542",
                  borderRadius: 14, padding: "14px 20px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>🔄</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#7a5700" }}>
                      {m.mentorName} — flagged for rematch
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#a07020" }}>Regenerate suggestions or manually assign from the mentor list</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} style={{
                background: "#fff", border: `1.5px solid ${ss.border}`,
                borderRadius: 14, padding: "18px 20px",
                boxShadow: "0 1px 4px rgba(92,78,181,0.06)",
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ background: "#1a1733", borderRadius: 8, padding: "6px 14px" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>🎓 {m.mentorName}</p>
                    </div>
                    <span style={{ fontSize: 18, color: "#c4b8f0" }}>→</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(m.menteeNames || []).map((name, j) => {
                        const slug = (m.menteeSlugs || [])[j];
                        const meta = menteeMetaBySlug[slug];
                        const isRematch = meta && (meta.needTag === "pending" || meta.needTag === "declined");
                        const prevMentor = meta?.assignedMentor || meta?.declinedBy;
                        return (
                          <div key={j} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ background: "#f3f0ff", border: "1.5px solid #c4b8f0", borderRadius: 8, padding: "6px 14px" }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5c4eb5" }}>👤 {name}</p>
                            </div>
                            {isRematch && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#b35c00", background: "#fff3e0", border: "1px solid #f5d9a0", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                                  🔄 2nd match{prevMentor ? ` · prev: ${prevMentor}` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 6, padding: "3px 10px", flexShrink: 0 }}>
                    {ss.label}
                  </span>
                </div>

                {/* Reason */}
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#4a4060", lineHeight: 1.65 }}>{m.reason}</p>

                {/* Action buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleApprove(m, i)}
                    disabled={isSaving}
                    style={{
                      background: isSaving ? "#e8f8f0" : "linear-gradient(135deg, #1a6e42, #0f4a2c)",
                      color: isSaving ? "#3a8e5e" : "#fff",
                      border: "none", borderRadius: 8, padding: "8px 18px",
                      fontSize: 13, fontWeight: 700, cursor: isSaving ? "default" : "pointer",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {isSaving ? "Saving…" : "✓ Approve & Assign"}
                  </button>
                  <button
                    onClick={() => handleRematch(i)}
                    disabled={isSaving}
                    style={{
                      background: "#fff", color: "#7a5700",
                      border: "1.5px solid #f5c542", borderRadius: 8, padding: "8px 18px",
                      fontSize: 13, fontWeight: 700, cursor: isSaving ? "default" : "pointer",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    🔄 Flag for Rematch
                  </button>
                  {cardErr && (
                    <span style={{ fontSize: 12, color: "#c00" }}>⚠️ {cardErr}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!matches && !loading && !error && (
        <div style={{ background: "#faf9ff", border: "1.5px dashed #c4b8f0", borderRadius: 14, padding: "32px", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 14, color: "#9b8fcf" }}>Click "Generate Suggestions" to get AI-powered match recommendations</p>
          <p style={{ margin: 0, fontSize: 12, color: "#c0b8d8" }}>Considers industry, focus areas, stage, and mentor background</p>
        </div>
      )}
    </div>
  );
}

// ─── Need to Send view ────────────────────────────────────────────────────────
function NeedToSend() {
  const [groups, setGroups] = useState([]);
  const [sentGroups, setSentGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markedSent, setMarkedSent] = useState({}); // mentorName → true
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [sentOpen, setSentOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pending-assignments")
      .then(r => r.json())
      .then(d => { setGroups(d.pending || []); setSentGroups(d.sent || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const markSent = (mentorName) => {
    setMarkedSent(s => ({ ...s, [mentorName]: true }));
  };

  const pending = groups.filter(g => !markedSent[g.mentorName]);
  const sessionSent = groups.filter(g => markedSent[g.mentorName]);
  const allSent = [...sentGroups, ...sessionSent];
  const sentCount = Object.values(markedSent).filter(Boolean).length;

  const exportCSV = () => {
    const rows = [["Mentor Name", "Mentor Email", "Mentee Name", "Mentee Slug", "Assigned Date", "AI Suggested", "2nd Match", "Prev Mentor"]];
    for (const g of pending) {
      for (const m of g.mentees) {
        rows.push([g.mentorName, g.mentorEmail, m.name || m.slug, m.slug, m.updatedAt || "", g.adminAssigned ? "Yes" : "No", m.isRematch ? "Yes" : "No", m.prevMentor || ""]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "need-to-send.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: "#9b8fcf", fontFamily: "Inter, system-ui, sans-serif" }}>Loading…</div>
  );

  return (
    <div style={{ padding: "32px 40px", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>📬 Need to Send</p>
          <p style={{ margin: 0, fontSize: 14, color: "#9b8fcf" }}>
            Mentor–mentee pairings approved but not yet sent. Reach out to each mentor to introduce their mentee(s).
          </p>
          {sentCount > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#1a6e42", fontWeight: 600 }}>
              ✓ {sentCount} batch{sentCount !== 1 ? "es" : ""} marked as sent this session
            </p>
          )}
        </div>
        {pending.length > 0 && (
          <button
            onClick={exportCSV}
            style={{
              background: "#fff", color: "#5c4eb5", border: "1.5px solid #c4b8f0",
              borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif", flexShrink: 0,
            }}
          >
            ⬇ Export CSV
          </button>
        )}
      </div>

      {pending.length === 0 && (
        <div style={{ background: "#f0faf4", border: "1.5px solid #b8e8d0", borderRadius: 14, padding: "32px", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#1a6e42" }}>🎉 All caught up!</p>
          <p style={{ margin: 0, fontSize: 13, color: "#3a8e5e" }}>No pending assignments waiting to be sent.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {pending.map((g, i) => (
          <div key={i} style={{
            background: "#fff", border: "1.5px solid #e0d9f8",
            borderRadius: 14, padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(92,78,181,0.06)",
          }}>
            {/* Mentor row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ background: "#1a1733", borderRadius: 8, padding: "6px 14px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>🎓 {g.mentorName}</p>
                  </div>
                  {g.adminAssigned && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#5c4eb5", background: "#f3f0ff", border: "1px solid #c4b8f0", borderRadius: 6, padding: "3px 10px" }}>
                      AI suggested
                    </span>
                  )}
                </div>
                {g.mentorEmail && (
                  <button
                    onClick={() => copyEmail(g.mentorEmail)}
                    style={{
                      marginTop: 6, background: "none", border: "none", padding: 0,
                      fontSize: 12, color: copiedEmail === g.mentorEmail ? "#1a6e42" : "#9b8fcf",
                      cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500,
                    }}
                  >
                    {copiedEmail === g.mentorEmail ? "✓ Copied!" : `📋 ${g.mentorEmail}`}
                  </button>
                )}
              </div>

              <button
                onClick={() => markSent(g.mentorName)}
                style={{
                  background: "linear-gradient(135deg, #1a6e42, #0f4a2c)",
                  color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Inter, system-ui, sans-serif", flexShrink: 0,
                }}
              >
                ✓ Mark as Sent
              </button>
            </div>

            {/* Mentee chips */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#9b8fcf", marginRight: 4, marginTop: 6 }}>Mentee{g.mentees.length !== 1 ? "s" : ""}:</span>
              {g.mentees.map((m, j) => (
                <div key={j} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ background: "#f3f0ff", border: "1.5px solid #c4b8f0", borderRadius: 8, padding: "5px 12px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5c4eb5" }}>👤 {m.name || m.slug}</p>
                  </div>
                  {m.isRematch && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#b35c00", background: "#fff3e0", border: "1px solid #f5d9a0", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                      🔄 2nd match{m.prevMentor ? ` · prev: ${m.prevMentor}` : ""} — mentor non-responsive
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Assigned date */}
            {g.mentees[0]?.updatedAt && (
              <p style={{ margin: "10px 0 0", fontSize: 11, color: "#c0b8d8" }}>
                Assigned {g.mentees[0].updatedAt}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Already Sent collapsible ── */}
      {allSent.length > 0 && (
        <div style={{ marginTop: 32, border: "1.5px solid #b8e8d0", borderRadius: 14, overflow: "hidden" }}>
          <button
            onClick={() => setSentOpen(o => !o)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 24px", background: "#f0faf4", border: "none", cursor: "pointer",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a6e42" }}>
              ✅ Already Sent — {allSent.length} mentor{allSent.length !== 1 ? "s" : ""} awaiting reply
            </span>
            <span style={{ fontSize: 16, color: "#1a6e42" }}>{sentOpen ? "▲" : "▼"}</span>
          </button>

          {sentOpen && (
            <div style={{ background: "#fff", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {allSent.map((g, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                  gap: 12, padding: "12px 16px", background: "#f9fef9",
                  border: "1px solid #d4edda", borderRadius: 10, flexWrap: "wrap",
                }}>
                  <div>
                    <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#1a1733" }}>🎓 {g.mentorName}</p>
                    {g.mentorEmail && (
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#9b8fcf" }}>{g.mentorEmail}</p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {g.mentees.map((m, j) => (
                        <span key={j} style={{
                          fontSize: 12, fontWeight: 600, color: "#1a6e42",
                          background: "#e8f8f0", border: "1px solid #9edbb8",
                          borderRadius: 6, padding: "3px 10px",
                        }}>
                          {m.name || m.slug}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1a6e42", background: "#e8f8f0", border: "1px solid #9edbb8", borderRadius: 6, padding: "4px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Sent · Awaiting reply
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mentor Selections view ───────────────────────────────────────────────────
function MentorSelections() {
  const [selections, setSelections] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // slug → "saving" | "saved" | "error"
  const [activeCohort, setActiveCohort] = useState("All");
  const [activeFilter, setActiveFilter] = useState("all");
  const [edits, setEdits] = useState({}); // slug → { responded, selectedMentor, responseDate, notes }
  const COHORT_NAMES_MS = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

  useEffect(() => {
    fetch("/api/mentor-selections")
      .then(r => r.json())
      .then(d => {
        setSelections(d.selections || []);
        setMentors(d.mentors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getEdited = (s) => ({ ...s, ...(edits[s.slug] || {}) });

  const handleChange = (slug, field, value) => {
    setEdits(prev => ({ ...prev, [slug]: { ...(prev[slug] || {}), [field]: value } }));
  };

  const save = async (slug) => {
    const sel = getEdited(selections.find(s => s.slug === slug));
    setSaving(prev => ({ ...prev, [slug]: "saving" }));
    try {
      await fetch("/api/save-mentor-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          responded:      sel.responded,
          selectedMentor: sel.selectedMentor,
          responseDate:   sel.responseDate,
          notes:          sel.notes,
        }),
      });
      // Merge edits back into selections
      setSelections(prev => prev.map(s => s.slug === slug ? { ...s, ...(edits[slug] || {}) } : s));
      setEdits(prev => { const n = { ...prev }; delete n[slug]; return n; });
      setSaving(prev => ({ ...prev, [slug]: "saved" }));
      setTimeout(() => setSaving(prev => { const n = { ...prev }; delete n[slug]; return n; }), 2000);
    } catch (_) {
      setSaving(prev => ({ ...prev, [slug]: "error" }));
      setTimeout(() => setSaving(prev => { const n = { ...prev }; delete n[slug]; return n; }), 3000);
    }
  };

  const cohorts = ["All", 1, 2, 3, 4, 5, "Test"];
  const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

  const FILTERS = [
    { key: "all",       label: "All",          match: () => true },
    { key: "responded", label: "Responded",    match: s => s.responded },
    { key: "pending",   label: "No response",  match: s => !s.responded },
  ];

  let visible = selections.filter(s => {
    if (activeCohort === "Test") return TEST_SLUGS.includes(s.slug);
    if (activeCohort === "All")  return !TEST_SLUGS.includes(s.slug);
    return s.cohort === activeCohort && !TEST_SLUGS.includes(s.slug);
  });
  const filterFn = FILTERS.find(f => f.key === activeFilter)?.match || (() => true);
  visible = visible.filter(s => filterFn(getEdited(s)));

  const totalResponded = selections.filter(s => !TEST_SLUGS.includes(s.slug) && getEdited(s).responded).length;
  const totalNonTest   = selections.filter(s => !TEST_SLUGS.includes(s.slug)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Mentor Selections</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>
            {loading ? "Loading…" : `${totalResponded} of ${totalNonTest} founders have responded`}
          </p>
        </div>
        {/* Response progress bar */}
        {!loading && totalNonTest > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 180, height: 8, background: "#e8e4f5", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${Math.round(totalResponded / totalNonTest * 100)}%`,
                height: "100%", background: "#27ae60", borderRadius: 4, transition: "width 0.4s",
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a6e42" }}>
              {Math.round(totalResponded / totalNonTest * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Cohort tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e8e4f5", marginBottom: 20 }}>
        {cohorts.map(c => (
          <button key={c} onClick={() => setActiveCohort(c)} style={{
            background: "none", border: "none",
            borderBottom: activeCohort === c ? "2px solid #5c4eb5" : "2px solid transparent",
            color: activeCohort === c ? "#5c4eb5" : "#9b8fcf",
            fontFamily: "inherit", fontSize: 13,
            fontWeight: activeCohort === c ? 700 : 500,
            padding: "8px 16px", cursor: "pointer", marginBottom: -2,
          }}>
            {c === "All" || c === "Test" ? c : `${COHORT_NAMES_MS[c]} (${c})`}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const count = selections
            .filter(s => activeCohort === "Test" ? TEST_SLUGS.includes(s.slug) : activeCohort === "All" ? !TEST_SLUGS.includes(s.slug) : s.cohort === activeCohort && !TEST_SLUGS.includes(s.slug))
            .filter(s => f.match(getEdited(s))).length;
          const active = activeFilter === f.key;
          return (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
              border: active ? "1.5px solid #5c4eb5" : "1.5px solid #e0daf5",
              background: active ? "#5c4eb5" : "#fff",
              color: active ? "#fff" : "#6b6480",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {f.label}
              <span style={{
                background: active ? "rgba(255,255,255,0.25)" : "#f0ecff",
                color: active ? "#fff" : "#5c4eb5",
                borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <p style={{ color: "#9b8fcf", fontSize: 14, fontStyle: "italic" }}>Loading mentor selections…</p>}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.length === 0 && (
            <p style={{ fontSize: 13, color: "#c0b8d8", fontStyle: "italic" }}>No founders match this filter.</p>
          )}
          {visible.map(rawSel => {
            const sel = getEdited(rawSel);
            const isDirty = !!edits[sel.slug];
            const savingState = saving[sel.slug];
            return (
              <div key={sel.slug} style={{
                background: "#fff", borderRadius: 12,
                border: isDirty ? "1.5px solid #a78bfa" : "1px solid #e8e4f5",
                padding: "14px 18px",
              }}>
                {/* Row 1: identity + responded toggle + save */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 180px", minWidth: 0 }}>
                    <p style={{ margin: "0 0 1px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
                      {sel.first} {sel.last}
                    </p>
                    <p style={{ margin: "0 0 3px", fontSize: 11, color: "#9b8fcf", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sel.company}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#f3f0ff", color: "#5c4eb5", borderRadius: 4, padding: "1px 7px" }}>
                      {COHORT_NAMES_MS[sel.cohort]} ({sel.cohort})
                    </span>
                  </div>
                  <div style={{ flex: "0 0 160px", minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#4a4060" }}>
                      {sel.assignedMentor || <span style={{ color: "#c0b8d8", fontStyle: "italic" }}>—</span>}
                    </p>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleChange(sel.slug, "responded", !sel.responded)}
                      style={{
                        padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", border: "none",
                        background: sel.responded ? "#e8f8f0" : "#fef0f0",
                        color: sel.responded ? "#1a6e42" : "#c0392b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sel.responded ? "✓ Responded" : "✕ No response"}
                    </button>
                    {isDirty && (
                      <button
                        onClick={() => save(sel.slug)}
                        disabled={savingState === "saving"}
                        style={{
                          padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: savingState === "saving" ? "default" : "pointer",
                          fontFamily: "inherit", border: "none", whiteSpace: "nowrap",
                          background: savingState === "saved" ? "#e8f8f0" : savingState === "error" ? "#fee2e2" : "#5c4eb5",
                          color: savingState === "saved" ? "#1a6e42" : savingState === "error" ? "#c0392b" : "#fff",
                        }}
                      >
                        {savingState === "saving" ? "Saving…" : savingState === "saved" ? "✓ Saved" : savingState === "error" ? "Error" : "Save"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: selected mentor + date + notes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 1fr", gap: 12 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Selected by founder</p>
                    <select
                      value={sel.selectedMentor || ""}
                      onChange={e => handleChange(sel.slug, "selectedMentor", e.target.value)}
                      style={{
                        width: "100%", padding: "7px 10px", borderRadius: 7,
                        border: "1.5px solid #e8e4f5", fontSize: 12, fontFamily: "inherit",
                        outline: "none", background: "#fafafa", color: "#1a1733", cursor: "pointer",
                      }}
                      onFocus={e => (e.target.style.borderColor = "#a78bfa")}
                      onBlur={e => (e.target.style.borderColor = "#e8e4f5")}
                    >
                      <option value="">— Not recorded —</option>
                      {mentors.map(m => (
                        <option key={m.name} value={m.name}>{m.name} ({m.company})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date responded</p>
                    <input
                      type="date"
                      value={sel.responseDate || ""}
                      onChange={e => handleChange(sel.slug, "responseDate", e.target.value)}
                      style={{
                        width: "100%", padding: "7px 10px", borderRadius: 7,
                        border: "1.5px solid #e8e4f5", fontSize: 12, fontFamily: "inherit",
                        outline: "none", background: "#fafafa", boxSizing: "border-box",
                      }}
                      onFocus={e => (e.target.style.borderColor = "#a78bfa")}
                      onBlur={e => (e.target.style.borderColor = "#e8e4f5")}
                    />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
                    <input
                      type="text"
                      value={sel.notes || ""}
                      onChange={e => handleChange(sel.slug, "notes", e.target.value)}
                      placeholder="Optional notes…"
                      style={{
                        width: "100%", padding: "7px 10px", borderRadius: 7,
                        border: "1.5px solid #e8e4f5", fontSize: 12, fontFamily: "inherit",
                        outline: "none", background: "#fafafa", boxSizing: "border-box",
                      }}
                      onFocus={e => (e.target.style.borderColor = "#a78bfa")}
                      onBlur={e => (e.target.style.borderColor = "#e8e4f5")}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ margin: "28px 0 0", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        📋 Changes are saved to the "Mentor Selections" tab in the master tracker sheet.
      </p>
    </div>
  );
}

// ─── Mentor note editor ────────────────────────────────────────────────────────
function MentorNote({ mentorKey, initialValue }) {
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
        await fetch("/api/save-mentor-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mentorKey, note: newVal }),
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
        onFocus={e => (e.target.style.borderColor = "#5c4eb5")}
        onBlur={e => (e.target.style.borderColor = "#e8e4f5")}
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

// ─── Mentor Matches view ──────────────────────────────────────────────────────
function MentorMatches({ confirmations = {}, sessions = {}, onSessionChange, mentees = [] }) {
  const [responses, setResponses] = useState([]);
  const [allMentors, setAllMentors] = useState([]);
  const [menteeBySlug, setMenteeBySlug] = useState({});
  const [mentorNotes, setMentorNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);

  const toggleFilter = key => {
    if (key === "all") { setActiveFilters([]); return; }
    setActiveFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev.filter(k => k !== "all"), key]
    );
  };

  const [pendingByMentor, setPendingByMentor] = useState({});
  const [sentByMentor, setSentByMentor] = useState({});
  const [sentSectionOpen, setSentSectionOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/mentor-email-responses").then(r => r.json()),
      fetch("/api/mentor-selections").then(r => r.json()),
      fetch("/api/mentor-applications").then(r => r.json()).catch(() => ({ mentors: [] })),
      fetch("/api/get-mentor-notes").then(r => r.json()).catch(() => ({ notes: {} })),
      fetch("/api/admin/pending-assignments").then(r => r.json()).catch(() => ({ pending: [] })),
    ]).then(([emailData, selData, appData, notesData, pendingData]) => {
      setResponses(emailData.responses || []);
      if (notesData.notes) setMentorNotes(notesData.notes);

      // Build pendingByMentor and sentByMentor maps
      const pbm = {};
      for (const g of (pendingData.pending || [])) {
        pbm[g.mentorName] = (g.mentees || []).map(m => ({ name: m.name, slug: m.slug, isRematch: m.isRematch, prevMentor: m.prevMentor }));
      }
      setPendingByMentor(pbm);
      const sbm = {};
      for (const g of (pendingData.sent || [])) {
        sbm[g.mentorName] = (g.mentees || []).map(m => ({ name: m.name, slug: m.slug }));
      }
      setSentByMentor(sbm);

      // Merge MENTEES-assigned mentors with unmatched Typeform applicants
      const assigned = selData.mentors || [];
      const assignedNames = new Set(assigned.map(m => m.name.toLowerCase().trim()));
      const assignedEmails = new Set(assigned.map(m => (m.email || "").toLowerCase().trim()).filter(Boolean));
      const newApplicants = (appData.mentors || []).filter(m => {
        const n = m.name.toLowerCase().trim();
        const e = (m.email || "").toLowerCase().trim();
        return !assignedNames.has(n) && !(e && assignedEmails.has(e));
      });
      setAllMentors([...assigned, ...newApplicants.map(m => ({ name: m.name, email: m.email, isApplicant: true }))]);

      // Build slug → { email, cohort } lookup
      const emails = selData.menteeEmails || {};
      const lookup = {};
      for (const s of (selData.selections || [])) {
        lookup[s.slug] = { email: emails[s.slug] || "", cohort: s.cohort };
      }
      setMenteeBySlug(lookup);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Build a map of email responses by mentor name
  const responseByMentor = {};
  for (const r of responses) responseByMentor[r.mentor.name] = r;

  // Build slug → { participation, churned } from admin mentees data (must be before rows map)
  const menteeStatusBySlug = {};
  for (const m of mentees) {
    menteeStatusBySlug[m.slug] = {
      participation: m.milestones?.participation || false,
      churned: m.status === "churned",
    };
  }

  // Full rows: all mentors, overlay response data if available
  const rows = allMentors
    .filter(m => m.name !== "MJ" && m.name !== "Kennedy") // exclude test accounts
    .map(m => {
      const resp = responseByMentor[m.name];
      const pendingMentees = pendingByMentor[m.name] || null;
      const hasPendingAssignment = !!(pendingMentees && pendingMentees.length > 0);
      if (resp) {
        const opts = resp.options || [];
        const confirmed = opts.filter(o => confirmations[`${resp.threadId}|${o.slug}`] === "confirmed");
        const declined  = opts.filter(o => confirmations[`${resp.threadId}|${o.slug}`] === "declined");
        const visibleOpts = opts.filter(o => confirmations[`${resp.threadId}|${o.slug}`] !== "declined");
        const allDeclined = opts.length > 0 && declined.length === opts.length;
        // Exclude churned mentees from active match count so mentor re-enters "Needs a Mentee"
        const activeConfirmed = confirmed.filter(o => !menteeStatusBySlug[o.slug]?.churned);
        return { ...resp, opts: visibleOpts, allOpts: opts, matchCount: activeConfirmed.length, needsMentee: activeConfirmed.length === 0, allDeclined, isPending: false, pendingMentees, hasPendingAssignment };
      }
      // No email response yet — applicants from Typeform not yet emailed show as Needs a Mentee
      return {
        threadId: null, mentor: { name: m.name, email: m.email || "" },
        opts: [], allOpts: [], matchCount: 0, needsMentee: true, allDeclined: false,
        isPending: !m.isApplicant,
        isApplicant: m.isApplicant || false,
        pendingMentees, hasPendingAssignment,
      };
    });

  // A row has confirmed mentees but at least one hasn't confirmed participation
  const mentorConfirmedMenteePending = r => {
    const confirmed = (r.allOpts || []).filter(o => confirmations[`${r.threadId}|${o.slug}`] === "confirmed");
    return confirmed.length > 0 && confirmed.some(o => {
      const s = menteeStatusBySlug[o.slug];
      return s && !s.participation && !s.churned;
    });
  };

  const FILTERS = [
    { key: "all",            label: "All",                          match: () => true },
    { key: "two",            label: "2 Mentees",                   match: r => r.matchCount === 2 },
    { key: "one",            label: "1 Mentee",                    match: r => r.matchCount === 1 },
    { key: "none",           label: "Needs a Mentee",              match: r => (r.needsMentee && !r.isPending && !r.allDeclined) || r.isApplicant },
    { key: "rematch",        label: "Needs Rematch",               match: r => r.allDeclined },
    { key: "pending",        label: "Pending",                     match: r => r.isPending },
    { key: "mentee-pending", label: "Mentee Not Yet Confirmed",    match: mentorConfirmedMenteePending },
  ];

  const visible = activeFilters.length === 0
    ? rows
    : rows.filter(r => activeFilters.some(key => FILTERS.find(f => f.key === key)?.match(r)));

  const COLS = "1.4fr 1.6fr 1.6fr 110px 120px 1.8fr";

  const MenteeCell = ({ opt, threadId }) => {
    if (!opt) return <span style={{ fontSize: 12, color: "#c0b8d8" }}>—</span>;
    const state = confirmations[`${threadId}|${opt.slug}`] || "";
    const isConf = state === "confirmed";
    const isDecl = state === "declined";
    const menteeStatus = menteeStatusBySlug[opt.slug];
    const menteeChurned = menteeStatus?.churned;
    const menteeParticipated = menteeStatus?.participation;

    const nameColor = isConf ? "#1a1733" : isDecl ? "#9b8fcf" : "#1a1733";
    const textDecor = isDecl ? "line-through" : "none";

    // Single dot on left: mentee participation/churn status
    const dotColor = menteeChurned ? "#e74c3c" : menteeParticipated ? "#22a366" : "#f5a623";
    const dotTitle = menteeChurned ? "Churned / dropped out" : menteeParticipated ? "Confirmed participation" : "Has not confirmed participation yet";

    const info = menteeBySlug[opt.slug] || {};
    return (
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
          <div title={dotTitle} style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: nameColor, textDecoration: textDecor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {opt.name}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#9b8fcf", paddingLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.company}</div>
        {info.email && (
          <div style={{ fontSize: 11, color: "#5c4eb5", paddingLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.email}</div>
        )}
        {info.cohort && (
          <div style={{ fontSize: 10, color: "#9b8fcf", paddingLeft: 12, marginTop: 1 }}>Cohort {info.cohort}</div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: "#9b8fcf", fontFamily: "Inter, system-ui, sans-serif" }}>Loading…</div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1733" }}>Mentors</p>
        <span style={{ fontSize: 13, color: "#9b8fcf", flex: 1 }}>
          {rows.length} mentors · {rows.reduce((s, r) => s + r.matchCount, 0)} confirmed · {rows.filter(r => r.isPending).length} pending
        </span>
        <button
          onClick={() => {
            const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
            const hdrs = ["Mentor Name", "Mentor Email", "Mentee 1", "Mentee 1 Email", "Mentee 1 Cohort", "Mentee 1 Sessions", "Mentee 2", "Mentee 2 Email", "Mentee 2 Cohort", "Mentee 2 Sessions", "Status"];
            const csvRows = visible.map(r => {
              const o1 = r.allOpts?.[0];
              const o2 = r.allOpts?.[1];
              const mc = r.matchCount;
              const statusLabel = r.isPending ? "Pending" : r.allDeclined ? "Needs Rematch" : mc === 0 ? "Needs a Mentee" : mc === 1 ? "1 Mentee" : "2 Mentees";
              const mk = r.mentor.email || r.mentor.name;
              const s1 = o1 ? (sessions[`${mk}|${o1.slug}`] ?? 0) : "";
              const s2 = o2 ? (sessions[`${mk}|${o2.slug}`] ?? 0) : "";
              const i1 = o1 ? (menteeBySlug[o1.slug] || {}) : {};
              const i2 = o2 ? (menteeBySlug[o2.slug] || {}) : {};
              return [
                r.mentor.name, r.mentor.email,
                o1?.name || "", i1.email || "", i1.cohort ? `Cohort ${i1.cohort}` : "", s1,
                o2?.name || "", i2.email || "", i2.cohort ? `Cohort ${i2.cohort}` : "", s2,
                statusLabel,
              ].map(escape).join(",");
            });
            const csv = [hdrs.map(escape).join(","), ...csvRows].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `uplift-mentors-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            border: "1.5px solid #5c4eb5", background: "#fff", color: "#5c4eb5",
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f0ecff"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
        >
          ⬇ Export CSV <span style={{ opacity: 0.6, marginLeft: 3 }}>({visible.length})</span>
        </button>
      </div>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#9b8fcf" }}>
        Confirmed/declined on the ✅ Mentor Confirmation tab — matches update here automatically.
      </p>

      {/* Filter chips — multi-select, empty = All */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => toggleFilter("all")} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: activeFilters.length === 0 ? 700 : 500,
          border: `1.5px solid ${activeFilters.length === 0 ? "#5c4eb5" : "#e0daf5"}`,
          background: activeFilters.length === 0 ? "#5c4eb5" : "#fff",
          color: activeFilters.length === 0 ? "#fff" : "#6b6480",
          cursor: "pointer", fontFamily: "inherit",
        }}>
          All
          <span style={{
            background: activeFilters.length === 0 ? "rgba(255,255,255,0.25)" : "#f0ecff",
            color: activeFilters.length === 0 ? "#fff" : "#5c4eb5",
            borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
          }}>{rows.length}</span>
        </button>
        {FILTERS.filter(f => f.key !== "all").map(f => {
          const count = rows.filter(f.match).length;
          const active = activeFilters.includes(f.key);
          const accent = f.key === "none" ? "#b35c00" : f.key === "two" ? "#1a6e42" : f.key === "rematch" ? "#c0392b" : "#5c4eb5";
          return (
            <button key={f.key} onClick={() => toggleFilter(f.key)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? accent : "#e0daf5"}`,
              background: active ? accent : "#fff",
              color: active ? "#fff" : "#6b6480",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {f.label}
              <span style={{
                background: active ? "rgba(255,255,255,0.25)" : "#f0ecff",
                color: active ? "#fff" : accent,
                borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", overflow: "clip" }}>
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 360px)", minHeight: 200 }}>
          {/* Sticky header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            display: "grid", gridTemplateColumns: COLS,
            padding: "11px 20px", background: "#f7f5ff",
            borderBottom: "1px solid #e8e4f5",
          }}>
            {["Mentor", "Mentee 1", "Mentee 2", "Sessions", "Mentees", "Notes"].map(h => (
              <p key={h} style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {visible.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9b8fcf", fontSize: 14 }}>
              No mentors match this filter.
            </div>
          ) : visible.map((r, i) => {
            const opt1 = r.opts[0];
            const opt2 = r.opts[1] || null;

            // match badge
            const total = r.opts.length;
            const mc = r.matchCount;
            const badgeLabel = r.hasPendingAssignment && mc === 0 ? "Needs to Send" : r.isPending ? "No Reply Yet" : r.isApplicant ? "Needs a Mentee" : r.allDeclined ? "Needs Rematch" : mc === 0 ? "Needs a Mentee" : mc === 1 ? "1 Mentee" : "2 Mentees";
            const badgeColor = r.hasPendingAssignment && mc === 0 ? "#0e7c6b" : r.isPending ? "#6b6480" : r.isApplicant ? "#b35c00" : r.allDeclined ? "#c0392b" : mc === 0 ? "#b35c00" : mc === 2 ? "#1a6e42" : "#5c4eb5";
            const badgeBg    = r.hasPendingAssignment && mc === 0 ? "#e8faf7" : r.isPending ? "#f0eef8" : r.isApplicant ? "#fff3e0" : r.allDeclined ? "#fdf0f0" : mc === 0 ? "#fff3e0" : mc === 2 ? "#e8f8f0" : "#f0ecff";

            const mentorKey = r.mentor.email || r.mentor.name;
            const sk1 = opt1 ? `${mentorKey}|${opt1.slug}` : null;
            const sk2 = opt2 ? `${mentorKey}|${opt2.slug}` : null;
            const sc1 = sk1 ? (sessions[sk1] ?? 0) : null;
            const sc2 = sk2 ? (sessions[sk2] ?? 0) : null;

            const SessionDots = ({ sk, count, color = "#5c4eb5" }) => {
              if (sk === null) return <div style={{ height: 18 }} />;
              return (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {Array.from({ length: 3 }).map((_, di) => (
                    <div
                      key={di}
                      onClick={() => onSessionChange && onSessionChange(sk, di < count ? di : di + 1)}
                      onContextMenu={e => { e.preventDefault(); onSessionChange && onSessionChange(sk, Math.max(0, count - 1)); }}
                      style={{
                        width: 10, height: 10, borderRadius: "50%", cursor: "pointer",
                        background: di < count ? color : "#e8e4f5",
                        transition: "background 0.15s",
                      }}
                    />
                  ))}
                  <span style={{ fontSize: 10, color: "#9b8fcf", marginLeft: 1 }}>{count}/3</span>
                </div>
              );
            };

            return (
              <div key={r.mentor.email || r.mentor.name}>
              <div style={{
                display: "grid", gridTemplateColumns: COLS,
                padding: "13px 20px", alignItems: "start",
                borderBottom: (i < visible.length - 1 && !r.pendingMentees?.length) ? "1px solid #f5f3ff" : "none",
                background: i % 2 === 0 ? "#fff" : "#fdfcff",
              }}>
                {/* Mentor */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: "#1a1733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.mentor.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#5c4eb5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.mentor.email}
                  </p>
                </div>

                {/* Mentee 1 */}
                <MenteeCell opt={opt1} threadId={r.threadId} />

                {/* Mentee 2 */}
                <MenteeCell opt={opt2} threadId={r.threadId} />

                {/* Sessions — one dot row per mentee */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
                  <SessionDots sk={sk1} count={sc1 ?? 0} />
                  {opt2 && <SessionDots sk={sk2} count={sc2 ?? 0} />}
                </div>

                {/* Match badge */}
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    borderRadius: 20, background: badgeBg, color: badgeColor,
                    whiteSpace: "nowrap",
                  }}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Notes */}
                <div style={{ minWidth: 0 }}>
                  <MentorNote mentorKey={mentorKey} initialValue={mentorNotes[mentorKey] || ""} />
                </div>
              </div>

              {/* Pending mentees — Needs to Send */}
              {r.pendingMentees?.length > 0 && (
                <div style={{ padding: "8px 20px 12px", background: i % 2 === 0 ? "#fff" : "#fdfcff", borderTop: "1px solid #e8faf7", borderBottom: i < visible.length - 1 ? "1px solid #f5f3ff" : "none" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#0e7c6b" }}>📬 Pending — Needs to Send</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {r.pendingMentees.map(pm => (
                      <div key={pm.slug} style={{ background: "#e8faf7", border: "1px solid #9ee3d8", borderRadius: 8, padding: "4px 10px" }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0e7c6b" }}>{pm.name || pm.slug}</p>
                        {pm.isRematch && (
                          <p style={{ margin: 0, fontSize: 10, color: "#b35c00" }}>🔄 2nd match</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            );
          })}
        </div>

        {/* ── Already Sent collapsible ── */}
        {Object.keys(sentByMentor).length > 0 && (
          <div style={{ marginTop: 24, border: "1px solid #d4edda", borderRadius: 12, overflow: "hidden" }}>
            <button
              onClick={() => setSentSectionOpen(o => !o)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px", background: "#f0faf4", border: "none", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1a6e42" }}>
                ✅ Already Sent — {Object.keys(sentByMentor).length} mentor{Object.keys(sentByMentor).length !== 1 ? "s" : ""} · awaiting their response
              </span>
              <span style={{ fontSize: 16, color: "#1a6e42" }}>{sentSectionOpen ? "▲" : "▼"}</span>
            </button>
            {sentSectionOpen && (
              <div style={{ background: "#fff", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(sentByMentor).map(([mentorName, mentees]) => (
                  <div key={mentorName} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1733", minWidth: 180 }}>{mentorName}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {mentees.map(pm => (
                        <span key={pm.slug} style={{ fontSize: 12, fontWeight: 600, color: "#1a6e42", background: "#e8f8f0", border: "1px solid #9edbb8", borderRadius: 6, padding: "2px 10px" }}>
                          {pm.name || pm.slug}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mentor Email Responses view ──────────────────────────────────────────────
function MentorEmailResponses({ confirmations = {}, onConfirmationChange }) {
  const [responses, setResponses] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/mentor-email-responses")
      .then(r => r.json())
      .then(d => {
        setResponses(d.responses || []);
        setLastRefreshed(d.lastRefreshed || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const confKey = (threadId, slug) => `${threadId}|${slug}`;

  // A card is "not reviewed" if any option has no confirmation set
  const isNotReviewed = r => r.options.some(opt => !(confirmations[confKey(r.threadId, opt.slug)]));
  // A card has a declined option
  const hasDeclined = r => r.options.length > 0 && r.options.every(opt => confirmations[confKey(r.threadId, opt.slug)] === "declined");

  const FILTERS = [
    { key: "all",        label: "All",               match: () => true },
    { key: "unreviewed", label: "Not Reviewed Yet",  match: isNotReviewed },
    { key: "declined",   label: "Declined Both Matches",  match: hasDeclined },
  ];

  const visible = responses.filter(FILTERS.find(f => f.key === filter)?.match || (() => true));

  const sentimentColor = (selected) => {
    if (!selected) return { bg: "#fef2f2", border: "#fca5a5", badge: "#ef4444", badgeText: "#fff", label: "Declined" };
    if (selected === "Both") return { bg: "#f0fdf4", border: "#86efac", badge: "#22c55e", badgeText: "#fff", label: "Both" };
    return { bg: "#f0f9ff", border: "#7dd3fc", badge: "#3b82f6", badgeText: "#fff", label: "1 of 2" };
  };

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>Loading…</div>;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e1b4b" }}>Mentor Confirmation</h2>
        <span style={{ fontSize: 13, color: "#6b7280" }}>{responses.length} replies received</span>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
        Replies to the "Your Uplift Mentor Matches" email via uplift@techunited.co &amp; uplift@vip.techunited.co.
        {lastRefreshed && ` Last parsed: ${lastRefreshed}.`}
      </p>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const count = responses.filter(f.match).length;
          const active = filter === f.key;
          const accent = f.key === "declined" ? "#dc2626" : "#5c4eb5";
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? accent : "#e0daf5"}`,
              background: active ? accent : "#fff",
              color: active ? "#fff" : "#6b6480",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {f.label}
              <span style={{
                background: active ? "rgba(255,255,255,0.25)" : "#f0ecff",
                color: active ? "#fff" : accent,
                borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {visible.map(r => {
          const { bg, border, badge, badgeText, label } = sentimentColor(r.selected);
          return (
            <div key={r.threadId} style={{ background: "#fff", border: `1.5px solid ${border}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#7c3aed", flexShrink: 0 }}>
                  {r.mentor.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1e1b4b" }}>{r.mentor.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{r.mentor.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: badge, color: badgeText, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{r.replyDate}</span>
                </div>
              </div>

              {/* Options */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {r.options.map((opt, i) => {
                  const chosen = r.selected === "Both" || r.selected === opt.name;
                  const ck = confKey(r.threadId, opt.slug);
                  const conf = confirmations[ck] || "";
                  const confColors = {
                    confirmed: { bg: "#f0fdf4", border: "#86efac", label: "✓ Confirmed", color: "#16a34a" },
                    declined:  { bg: "#fef2f2", border: "#fca5a5", label: "✕ Declined",  color: "#dc2626" },
                    "":        { bg: chosen ? "#f5f3ff" : "#f9fafb", border: chosen ? "#c4b5fd" : "#e5e7eb", label: "", color: "#6b7280" },
                  };
                  const cc = confColors[conf] || confColors[""];
                  return (
                    <div key={i} style={{ background: cc.bg, border: `1px solid ${cc.border}`, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: chosen ? "#7c3aed" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Option {i + 1}</div>
                        <select
                          value={conf}
                          onChange={e => onConfirmationChange && onConfirmationChange(ck, e.target.value, {
                            threadId: r.threadId,
                            mentorName: r.mentor.name,
                            mentorEmail: r.mentor.email,
                            menteeName: opt.name,
                            menteeSlug: opt.slug,
                          })}
                          style={{
                            fontSize: 11, fontWeight: 700, borderRadius: 6, border: "1px solid #d1d5db",
                            padding: "2px 6px", cursor: "pointer", fontFamily: "inherit",
                            background: conf === "confirmed" ? "#dcfce7" : conf === "declined" ? "#fee2e2" : "#f9fafb",
                            color: conf === "confirmed" ? "#16a34a" : conf === "declined" ? "#dc2626" : "#6b7280",
                            outline: "none",
                          }}
                        >
                          <option value="">— Pending —</option>
                          <option value="confirmed">✓ Confirmed</option>
                          <option value="declined">✕ Declined</option>
                        </select>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e1b4b", marginBottom: 2 }}>{opt.name}</div>
                      <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 6 }}>{opt.company}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
                        <span style={{ background: "#e5e7eb", borderRadius: 4, padding: "1px 6px", marginRight: 4 }}>{opt.stage}</span>
                        {opt.industry}
                      </div>
                      {opt.needs && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Needs: {opt.needs}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "3px solid #7c3aed", borderRadius: "0 6px 6px 0", padding: "12px 16px", fontSize: 13, color: "#374151", lineHeight: 1.6, fontStyle: "italic" }}>
                "{r.reply}"
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pulse Report ─────────────────────────────────────────────────────────────
const PULSE_RATINGS_ADMIN = {
  1: { label: "Could be better", emoji: "😌", color: "#c0392b", bg: "#fee2e2" },
  2: { label: "Getting there",   emoji: "🙂", color: "#b45309", bg: "#fef3c7" },
  3: { label: "Feeling good",    emoji: "😊", color: "#6b6480", bg: "#f0ecff" },
  4: { label: "Feeling great",   emoji: "😄", color: "#1a6e42", bg: "#e8f8f0" },
  5: { label: "Crushing it",     emoji: "🚀", color: "#1a6e42", bg: "#d4f8e8" },
};
const COHORT_NAMES_PULSE = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

function PulseReport() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);

  useEffect(() => {
    fetch("/api/pulse-stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#9b8fcf", fontFamily: "Inter, system-ui, sans-serif" }}>
      Loading pulse data…
    </div>
  );
  if (err) return (
    <div style={{ padding: 60, color: "#c0392b", fontFamily: "Inter, system-ui, sans-serif" }}>Error: {err}</div>
  );

  const pulses = data?.pulses || [];
  const respondedFounders = pulses.filter(p => Object.keys(p.responses).length > 0);

  // Build per-week stats
  const weekStats = {};
  for (let w = 1; w <= 9; w++) {
    const responders = pulses
      .filter(p => p.responses[w] !== undefined)
      .map(p => ({ name: p.name, cohort: p.cohort, value: p.responses[w] }));

    if (!responders.length) { weekStats[w] = null; continue; }

    const vals = responders.map(r => r.value);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

    const byCohort = {};
    for (const r of responders) {
      if (!byCohort[r.cohort]) byCohort[r.cohort] = [];
      byCohort[r.cohort].push(r.value);
    }

    weekStats[w] = { avg, responders, byCohort };
  }

  // Overall averages
  const allVals = pulses.flatMap(p => Object.values(p.responses));
  const overallAvg = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;

  const cohortOverall = {};
  for (const p of pulses) {
    const vals = Object.values(p.responses);
    if (!vals.length) continue;
    if (!cohortOverall[p.cohort]) cohortOverall[p.cohort] = [];
    cohortOverall[p.cohort].push(...vals);
  }

  const ratingColor = v => v >= 4 ? "#1a6e42" : v >= 3 ? "#b45309" : "#c0392b";
  const ratingBg    = v => v >= 4 ? "#e8f8f0" : v >= 3 ? "#fef3c7" : "#fee2e2";

  const AvgPill = ({ val, label, sub }) => (
    <div style={{
      background: ratingBg(val), borderRadius: 12,
      border: `1px solid ${ratingColor(val)}30`,
      padding: "18px 16px", textAlign: "center", minWidth: 120,
    }}>
      <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ratingColor(val) }}>
        {label}
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 800, color: ratingColor(val) }}>
        {val.toFixed(1)}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "#9b8fcf" }}>{sub}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a1733" }}>Weekly Pulse Check-In</h2>
      <p style={{ margin: "0 0 32px", fontSize: 13, color: "#9b8fcf" }}>
        How founders are feeling week by week · {respondedFounders.length} of {pulses.length} founders have responded
      </p>

      {/* Overall + per-cohort averages */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
        {overallAvg !== null && (
          <AvgPill val={overallAvg} label="Overall" sub={`${allVals.length} responses`} />
        )}
        {[1, 2, 3, 4, 5].map(cohort => {
          const vals = cohortOverall[cohort] || [];
          if (!vals.length) return null;
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          return <AvgPill key={cohort} val={avg} label={COHORT_NAMES_PULSE[cohort]} sub={`${vals.length} responses`} />;
        })}
      </div>

      {/* Empty state */}
      {!allVals.length && (
        <div style={{ background: "#fafafa", borderRadius: 12, border: "1px dashed #d4d0e8", padding: "40px 32px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, color: "#9b8fcf" }}>No pulse responses yet — they&apos;ll appear here as founders check in each week.</p>
        </div>
      )}

      {/* Week-by-week breakdown */}
      {allVals.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>Week by Week</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5,6,7,8,9].map(w => {
              const ws = weekStats[w];
              if (!ws) return null;
              const isOpen = expandedWeek === w;

              return (
                <div key={w} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", overflow: "hidden" }}>
                  {/* Row header */}
                  <button
                    onClick={() => setExpandedWeek(isOpen ? null : w)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 20px", background: "none", border: "none",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#9b8fcf", minWidth: 56 }}>Week {w}</span>

                    {/* Emoji count tally */}
                    <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "center" }}>
                      {[1,2,3,4,5].map(r => {
                        const count = ws.responders.filter(p => p.value === r).length;
                        if (!count) return null;
                        return (
                          <span key={r} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 16 }}>{PULSE_RATINGS_ADMIN[r].emoji}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b6480" }}>{count}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Avg pill */}
                    <span style={{
                      background: ratingBg(ws.avg), color: ratingColor(ws.avg),
                      borderRadius: 8, padding: "3px 12px", fontSize: 14, fontWeight: 700,
                    }}>
                      {ws.avg.toFixed(1)} avg
                    </span>

                    <span style={{ fontSize: 11, color: "#9b8fcf" }}>{ws.responders.length} responses</span>
                    <span style={{ fontSize: 11, color: "#b0a8cc" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded: per-cohort + individual */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #f0ecff", padding: "16px 20px" }}>
                      {/* Per-cohort averages */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                        {[1,2,3,4,5].map(cohort => {
                          const vals = ws.byCohort[cohort] || [];
                          if (!vals.length) return null;
                          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                          return (
                            <span key={cohort} style={{
                              background: ratingBg(avg), color: ratingColor(avg),
                              borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                              border: `1px solid ${ratingColor(avg)}25`,
                            }}>
                              {COHORT_NAMES_PULSE[cohort]}: {avg.toFixed(1)}
                            </span>
                          );
                        })}
                      </div>

                      {/* Individual responses sorted by rating */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[...ws.responders].sort((a, b) => a.value - b.value).map((r, i) => {
                          const rat = PULSE_RATINGS_ADMIN[r.value];
                          return (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 12px", background: "#fafafa", borderRadius: 8,
                            }}>
                              <span style={{ fontSize: 18, flexShrink: 0 }}>{rat.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{r.name}</span>
                                <span style={{ marginLeft: 8, fontSize: 11, color: "#9b8fcf" }}>
                                  Cohort {r.cohort} — {COHORT_NAMES_PULSE[r.cohort]}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 12, fontWeight: 700, color: rat.color,
                                background: rat.bg, borderRadius: 6, padding: "3px 10px", flexShrink: 0,
                              }}>
                                {r.value} — {rat.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
