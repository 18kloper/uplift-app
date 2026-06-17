import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import Head from "next/head";
import { getMenteeBySlug, MENTEES, PROMPTS, getFocusKey } from "../lib/mentees";
import { PROGRAM_EMAILS, RESOURCES, COHORTS } from "../lib/program-data";

// Mentees whose match is approved but pending mentor acceptance — show holding notice
const HOLDING_SLUGS = new Set([
  "gifty-anane",
  "annalyce-dagostino-gavin",
  "lina-escobar",
  "favio-jasso",
  "mark-kallback",
  "alina-okun",
  "alisha-sharma",
]);

// All holding slugs were late-matched — same due dates apply to everyone in this set
const LATE_MATCH_SLUGS = HOLDING_SLUGS;

// ─── Week definitions ─────────────────────────────────────────────────────────
const WEEKS = [
  {
    num: 1, label: "Week 1", title: "Welcome & Onboarding", dateRange: "Jun 1–6",
    tagline: "Get acclimated. Attend your cohort's onboarding session to meet your peers — or any session if that time doesn't work. Start mapping your asks, your needs, and what you're looking for from your mentor.",
    note: "We encourage you to attend your own cohort's session to meet your peers. If the timing doesn't work, any of the five sessions will do — just register through Luma.",
    type: "onboarding",
    events: [
      { name: "Onboarding — Edison", day: "Mon Jun 1", time: "12:30–1:15pm", format: "Virtual", url: "https://lu.ma/q2hlxrhu" },
      { name: "Onboarding — Hopper", day: "Tue Jun 2", time: "5:30–6:15pm", format: "Virtual", url: "https://lu.ma/boqqrwg2" },
      { name: "Onboarding — Bardeen", day: "Wed Jun 3", time: "12:30–1:15pm", format: "Virtual", url: "https://lu.ma/ddusqg24" },
      { name: "Onboarding — Lawrence", day: "Thu Jun 4", time: "12:30–1:15pm", format: "Virtual", url: "https://lu.ma/dg4muvxk" },
      { name: "Onboarding — Morrison", day: "Sat Jun 6", time: "10:00–10:45am", format: "Virtual", url: "https://lu.ma/p9zkhdle" },
    ],
  },
  {
    num: 2, label: "Week 2", title: "Meet Your Mentor", dateRange: "Jun 8–13",
    tagline: "All pairs should meet for 1 hour by the end of this week.",
    taglineType: "emphasis",
    type: "mentor-meeting",
    submitLabel: "Submit your 1st mentor meeting",
    events: [
      { name: "Expert Insight — Edison", day: "Mon Jun 8", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/vxnzwket", speaker: { name: "Aerica Shimizu Banks", linkedin: "https://www.linkedin.com/in/aericashimizubanks/" } },
      { name: "Pitch Without a Deck | Uplift Mentorship Workshop 🎤", day: "Fri Jun 12", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/0dh6bt4o", note: "Originally scheduled as an Ask Me Anything — swapped to a peer pitch workshop. Working in small groups of three, you'll pitch for 3 minutes to fellow founders and get direct, structured feedback. No slides, no deck, no camera. Just your voice and your story. 🔥" },
    ],
  },
  {
    num: 3, label: "Week 3", title: "Keep the Momentum", dateRange: "Jun 15–20",
    tagline: "We know everyone's schedules look different — by this time you should have met with your mentor for at least an hour. If you have not done so, this is an opportunity to catch up. If you have already done so, we encourage you to continue communication with your mentor and to attend one of this week's virtual sessions.",
    type: "reflection",
    events: [
      { name: "Expert Insight — Hopper", day: "Mon Jun 15", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/nj4xfgv6", speaker: { name: "Marc Saint-Ulysse", linkedin: "https://www.linkedin.com/in/marc-saint-ulysse-5b13262a" } },
      { name: "Peer Development — Edison", day: "Tue Jun 16", time: "5:30–6:00pm", format: "Virtual", url: "https://lu.ma/h9vhfsb2" },
    ],
  },
  {
    num: 4, label: "Week 4", title: "Midpoint Meetup", dateRange: "Jun 22–27",
    tagline: "If you have not met with your mentor by the end of this week, you are at risk of being removed from the program.",
    taglineType: "warning",
    type: "reflection",
    events: [
      { name: "Midpoint Meetup", day: "Tue Jun 23", time: "4:00–7:00pm", format: "In-Person", location: "Antique Lofts, Hoboken, NJ — 2 min walk from the PATH", required: true, url: "https://lu.ma/zfr1e2gt" },
      { name: "Industry Q&A — Hopper", day: "Fri Jun 26", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/e0sayfyh", speaker: { name: "Joanne Wilson", linkedin: "https://www.linkedin.com/in/joanne-wilson-b0886110" } },
    ],
  },
  {
    num: 5, label: "Week 5", title: "Deepen the Conversation", dateRange: "Jun 29–Jul 4",
    tagline: "All pairs should meet for an additional hour this week (total of 2 hours to date).",
    taglineType: "emphasis",
    type: "reflection",
    submitLabel: "Submit your 2nd mentor meeting",
    events: [
      { name: "Expert Insight — Bardeen", day: "Mon Jun 29", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/mvcaeaiu", speaker: { name: "Christina Perla", linkedin: "https://www.linkedin.com/in/christinaperla/" } },
      { name: "Peer Development — Hopper", day: "Tue Jun 30", time: "5:30–6:00pm", format: "Virtual", url: "https://lu.ma/ycu81x75" },
      { name: "Industry Q&A — Bardeen", day: "Fri Jul 3", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/zs1dqfeq" },
    ],
  },
  {
    num: 6, label: "Week 6", title: "Keep Building", dateRange: "Jul 6–11",
    tagline: "If you've fallen behind on hours with your mentor, use this week to catch up. If you're on track — keep the energy going.",
    type: "reflection",
    events: [
      { name: "Expert Insight — Lawrence", day: "Mon Jul 6", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/o20rkult" },
      { name: "Peer Development — Bardeen", day: "Tue Jul 7", time: "5:30–6:00pm", format: "Virtual", url: "https://lu.ma/sesem19h" },
    ],
  },
  {
    num: 7, label: "Week 7", title: "Meet With Your Mentor #3", dateRange: "Jul 13–18",
    tagline: "All pairs should meet for an additional hour this week (total of 3 hours to date).",
    taglineType: "emphasis",
    type: "reflection",
    submitLabel: "Submit your 3rd mentor meeting",
    events: [
      { name: "Expert Insight — Morrison", day: "Mon Jul 13", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/oh01c8fi", speaker: { name: "Crissy Buteas", linkedin: "https://www.linkedin.com/in/chrissy-buteas-9382063/" } },
      { name: "Peer Development — Lawrence", day: "Tue Jul 14", time: "5:30–6:00pm", format: "Virtual", url: "https://lu.ma/jgqgpyvx" },
      { name: "Industry Q&A — Lawrence", day: "Fri Jul 17", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/ekk5ycbt", speaker: { name: "Jie Li", linkedin: "https://www.linkedin.com/in/jieli2016/" } },
    ],
  },
  {
    num: 8, label: "Week 8", title: "Makeup Week + End Report", dateRange: "Jul 19–25",
    tagline: "Final makeup week before the Summit. Make sure you've completed your 3 hours with your mentor.",
    type: "reflection",
    submitLabel: "Submit your End Report (5 min)",
    submitPrimary: true,
    events: [
      { name: "Expert Session — Edison", day: "Mon Jul 20", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/9slfqpvz", speaker: { name: "Tony Triumph", linkedin: "https://www.linkedin.com/in/tonytriumph/" } },
    ],
  },
  {
    num: 9, label: "Week 9", title: "Summit & Graduation", dateRange: "Jul 27–Aug 4",
    tagline: "We are nearing the END — can't wait to celebrate you.",
    type: "closing",
    events: [
      { name: "Peer Development — Morrison", day: "Tue Jul 28", time: "5:30–6:00pm", format: "Virtual", url: "https://lu.ma/uy7rs79a" },
      { name: "Uplift Summit & Graduation", day: "Tue Aug 4", time: null, format: "In-Person", required: true, url: "https://lu.ma/c8we4c2b" },
    ],
  },
];

const PRIMARY_TABS = [
  { id: "journey",    label: "My Journey",                   tip: "Week-by-week action items for the program — follow along to see where you should be and what's coming up next." },
  { id: "milestones", label: "Milestones",                   tip: "A high-level overview of every task to complete in the program. See at a glance what's been checked off and what still needs to happen." },
  { id: "goals",      label: "My Goals & Reflections",       tip: "Everything you've written in the portal lives here — your goals, reflections, and responses all in one place, building as you go." },
  { id: "meetings",   label: "Logged Mentorship Sessions",   tip: "Track every mentor session you've submitted — view transcripts, see which sessions have been verified, monitor your progress toward the 3-hour requirement, and check on any pending or denied sessions." },
  { id: "edu",        label: "Logged Educational Sessions",  tip: "Track the educational sessions you've attended and browse everything that's available across the full program schedule." },
  { id: "calendar",   label: "Program Roadmap",              tip: "A high-level view of the entire 9-week program — all sessions, milestones, and key dates in one place." },
  { id: "resources",  label: "Resources",                    tip: "External links, tools, and resources curated for you — things you should know about as a founder in this program." },
  { id: "profile",    label: "Cohort Directory",             tip: "See who's in your cohort and explore the other cohorts too — get to know your fellow founders." },
  { id: "support",    label: "Support",                      tip: "Having trouble with something? Find out how to reach the Uplift team here." },
];
const TAB_ROW_1 = ["journey", "goals", "milestones", "meetings", "edu"];
const TAB_ROW_2 = ["calendar", "profile", "resources", "support"];

// ─── Tab tooltip wrapper ───────────────────────────────────────────────────────
function TabTooltip({ tip, children, direction = "up" }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  if (!tip) return children;
  const isDown = direction === "down";

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setCoords({ x: r.left + r.width / 2, y: isDown ? r.bottom : r.top });
    }
    setVisible(true);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: "fixed",
          left: coords.x,
          ...(isDown
            ? { top: coords.y + 8 }
            : { top: coords.y - 8, transform: "translate(-50%, -100%)" }),
          ...(isDown ? { transform: "translateX(-50%)" } : {}),
          background: "#1a1733", color: "#fff",
          borderRadius: 8, padding: "9px 13px",
          fontSize: 12, lineHeight: 1.55, fontWeight: 400,
          width: 220, textAlign: "left",
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          pointerEvents: "none", zIndex: 9999,
          whiteSpace: "normal",
        }}>
          {tip}
          <div style={{
            position: "absolute",
            ...(isDown
              ? { bottom: "100%", borderBottom: "6px solid #1a1733", borderTop: "none" }
              : { top: "100%", borderTop: "6px solid #1a1733", borderBottom: "none" }
            ),
            left: "50%",
            transform: "translateX(-50%)",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Save to Google Sheets ────────────────────────────────────────────────────
async function persistToSheet(slug, weekNum, fieldKey, value, question = "") {
  try {
    await fetch("/api/save-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, weekNum, fieldKey, value, question }),
    });
  } catch (_) {}
}

// ─── Autosaving textarea — syncs to Google Sheets ─────────────────────────────
function AutoTextarea({ storageKey, placeholder, slug, weekNum, fieldKey, rows = 4, question = "" }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("idle");
  const [hasSynced, setHasSynced] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { setValue(saved); setHasSynced(true); }
  }, [storageKey]);

  const handleChange = useCallback((e) => {
    const newVal = e.target.value;
    setValue(newVal);
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, newVal);
      persistToSheet(slug, weekNum, fieldKey, newVal, question);
      setStatus("saved");
      setHasSynced(true);
      setTimeout(() => setStatus("idle"), 2000);
    }, 900);
  }, [storageKey, slug, weekNum, fieldKey, question]);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.setItem(storageKey, value);
    persistToSheet(slug, weekNum, fieldKey, value, question);
    setStatus("saved");
    setHasSynced(true);
    setTimeout(() => setStatus("idle"), 2000);
  }, [storageKey, slug, weekNum, fieldKey, question, value]);

  return (
    <div>
      <div style={{
        border: "1.5px solid #d4d0e8", borderRadius: 8,
        background: "#fafafa", overflow: "hidden",
        transition: "border-color 0.15s",
      }}
        onFocus={(e) => e.currentTarget.style.borderColor = "#5c4eb5"}
        onBlur={(e) => e.currentTarget.style.borderColor = "#d4d0e8"}
      >
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          style={{
            width: "100%", padding: "12px 14px",
            border: "none", background: "transparent",
            fontSize: 15, lineHeight: 1.6, resize: "vertical",
            fontFamily: "inherit", boxSizing: "border-box", outline: "none",
            display: "block",
          }}
        />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          padding: "8px 12px", borderTop: "1px solid #ede9f8",
          background: "#f5f3ff",
        }}>
          <button
            onClick={saveNow}
            style={{
              padding: "5px 16px", fontSize: 12, fontWeight: 700,
              borderRadius: 6, border: "none", cursor: "pointer",
              fontFamily: "inherit", transition: "background 0.2s, color 0.2s",
              background: status === "saved" ? "#22a366" : "#5c4eb5",
              color: "#fff",
            }}
          >
            {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
      {hasSynced && (
        <p style={{
          margin: "7px 0 0", fontSize: 12, color: "#9b8fcf",
          fontStyle: "italic", lineHeight: 1.6,
        }}>
          Your response has been recorded. A full collection of everything you've written lives in the <strong style={{ fontStyle: "normal", fontWeight: 600 }}>My Goals &amp; Reflections</strong> tab — consider it your personal journal for this program. This field stays editable, so feel free to come back and update your thinking anytime.
        </p>
      )}
    </div>
  );
}

// ─── Save / submit button ────────────────────────────────────────────────────
function SaveButton({ label = "Save", primary = false }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
      style={{
        padding: primary ? "12px 32px" : "9px 22px",
        background: saved ? "#22a366" : primary ? "#5c4eb5" : "#fff",
        color: saved ? "#fff" : primary ? "#fff" : "#5c4eb5",
        border: `1.5px solid ${saved ? "#22a366" : "#5c4eb5"}`,
        borderRadius: 8, fontSize: 14, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.2s, color 0.2s, border-color 0.2s",
      }}
    >
      {saved ? "✓ Saved" : label}
    </button>
  );
}

// ─── Prompt block ─────────────────────────────────────────────────────────────
function PromptBlock({ theme, questions, slug, weekNum, blockIndex, accentColor }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
      padding: "24px 28px", marginBottom: 20, borderLeft: `4px solid ${accentColor}`,
    }}>
      <p style={{
        margin: "0 0 16px", fontWeight: 700, fontSize: 13,
        letterSpacing: "0.06em", textTransform: "uppercase", color: accentColor,
      }}>
        {theme}
      </p>
      {questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: qi < questions.length - 1 ? 20 : 0 }}>
          <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500, color: "#1a1733", lineHeight: 1.5 }}>{q}</p>
          <AutoTextarea
            storageKey={`${slug}_w${weekNum}_b${blockIndex}_q${qi}`}
            placeholder="Write your thoughts here…"
            slug={slug} weekNum={weekNum} fieldKey={`b${blockIndex}_q${qi}`}
            question={q}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Events section ───────────────────────────────────────────────────────────
function EventsSection({ events, submitLabel, submitPrimary, note, footerNote, isOnboarding, onboardingVerified, slug, menteeName }) {
  const hasEvents = events && events.length > 0;
  if (!hasEvents && !submitLabel) return null;

  const trackEventClick = (title, url) => {
    if (!slug) return;
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: menteeName || slug, title, url }),
    }).catch(() => {});
  };

  // If onboarding has been verified, replace the session list with a confirmation
  if (isOnboarding && onboardingVerified) {
    return (
      <div style={{ background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0", padding: "22px 26px", marginBottom: 24 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#1a6e42" }}>
          ✓ Your onboarding attendance has been verified.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#2a7f5a", lineHeight: 1.65 }}>
          Looking forward to getting started. We'll connect you with your mentor soon. In the meantime, please take a moment to get into more detail about your goals below.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
      {note && (
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#5c4eb5", fontWeight: 600, background: "#f5f3ff", borderRadius: 6, padding: "8px 12px" }}>
          ℹ️ {note}
        </p>
      )}
      {hasEvents && (
        <>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
            This Week's Sessions
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#9b8fcf", fontStyle: "italic", lineHeight: 1.65 }}>
            {isOnboarding
              ? "All five onboarding sessions cover the same material — they're organized by cohort to help you meet your peers, but you're welcome to attend any one that fits your schedule. Note: onboarding sessions are separate from the 3 required educational sessions and do not count toward that requirement."
              : "All sessions are open to every mentee. You'll notice sessions are labeled by cohort (Edison, Hopper, Bardeen, Lawrence, Morrison) — these labels simply group participants to help build close relationships with peers. You are welcome and encouraged to attend any and all sessions across every cohort. Our speakers bring a wide range of expertise relevant to founders at every stage and in every industry. We also know schedules are unpredictable — Uplift is designed to be accessible and work around your life. If the time works for you, show up. Every session you attend counts toward your 3 required educational sessions."
            }
          </p>
          {events.map((ev, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 0", borderBottom: i < events.length - 1 ? "1px solid #f5f3ff" : "none",
            }}>
              <div style={{ width: 17, height: 17, border: "1.5px solid #c0b8d8", borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1733" }}>{ev.name}</span>
                {ev.required && (
                  <span style={{ marginLeft: 6, background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                    REQUIRED
                  </span>
                )}
                <span style={{ marginLeft: 6, fontSize: 13, color: "#6b6480" }}>
                  — {ev.day}{ev.time ? `, ${ev.time}` : ""} · {ev.format}
                </span>
                {ev.speaker && (
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b6480" }}>
                    Featuring special guest:{" "}
                    {ev.speaker.linkedin ? (
                      <a href={ev.speaker.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>
                        {ev.speaker.name} ↗
                      </a>
                    ) : (
                      <span style={{ fontWeight: 600, color: "#1a1733" }}>{ev.speaker.name}</span>
                    )}
                  </p>
                )}
                {ev.note && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b6480", lineHeight: 1.6, fontStyle: "italic" }}>
                    {ev.note}
                  </p>
                )}
              </div>
              <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer"
                onClick={() => trackEventClick(ev.name, ev.url || "")}
                style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                Register on Luma →
              </a>
            </div>
          ))}
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>
            {footerNote || "*Must attend a minimum of 3 virtual educational sessions by program end."}
          </p>
        </>
      )}
      {submitLabel && (
        <div style={{ marginTop: hasEvents ? 14 : 0, paddingTop: hasEvents ? 12 : 0, borderTop: hasEvents ? "1px solid #f5f3ff" : "none" }}>
          <a href="https://form.typeform.com/to/e0L62296" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block",
            padding: submitPrimary ? "10px 22px" : "0",
            background: submitPrimary ? "#5c4eb5" : "transparent",
            color: submitPrimary ? "#fff" : "#9a7200",
            borderRadius: submitPrimary ? 8 : 0,
            fontSize: 14, fontWeight: 700,
            textDecoration: submitPrimary ? "none" : "underline",
            textUnderlineOffset: "3px",
          }}>
            {submitLabel} →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Tagline banner ───────────────────────────────────────────────────────────
function Tagline({ text, type }) {
  const s = {
    warning: { background: "#fff5f5", border: "1px solid #ffc5c5", color: "#8a1a1a" },
    emphasis: { background: "#fffbeb", border: "1px solid #f5d97a", color: "#7a5c00" },
    default: { background: "#f5f3ff", border: "none", color: "#3d2f8a" },
  }[type] || { background: "#f5f3ff", border: "none", color: "#3d2f8a" };
  return (
    <p style={{
      ...s, borderRadius: 10, padding: "14px 18px", fontSize: 15,
      lineHeight: 1.6, marginBottom: 20, fontStyle: "italic",
      fontWeight: type === "warning" || type === "emphasis" ? 600 : 400,
    }}>
      {text}
    </p>
  );
}

// ─── Mentor card ──────────────────────────────────────────────────────────────
function MentorCard({ mentee, revealed, holding }) {
  if (!revealed) {
    if (holding) {
      return (
        <div style={{
          background: "#fff8f0", borderRadius: 12, border: "2px solid #f59e0b",
          padding: "28px 32px", marginBottom: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>⏳</div>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 16, color: "#92400e" }}>
            Your match is in progress
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#b45309", lineHeight: 1.6 }}>
            We've selected your mentor and your pairing has been approved — we're waiting on their final confirmation before making the introduction. You'll see your mentor here as soon as it's confirmed.
          </p>
        </div>
      );
    }
    return (
      <div style={{
        background: "#f7f5ff", borderRadius: 12, border: "2px dashed #c8bfef",
        padding: "28px 32px", marginBottom: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🔒</div>
        <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 16, color: "#3d2f8a" }}>
          Your mentor hasn't been revealed yet
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#9b8fcf", lineHeight: 1.6 }}>
          We'll unlock your mentor match after we've completed onboarding sessions. No action needed from you — it will appear here automatically.
        </p>
      </div>
    );
  }
  const m = mentee.mentor;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5", padding: "28px 28px 24px", marginBottom: 24, boxShadow: "0 2px 12px rgba(92,78,181,0.06)" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 19, flexShrink: 0,
        }}>
          {m.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#1a1733" }}>{m.name}</p>
            {m.linkedin && (
              <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#5c4eb5", fontWeight: 600, textDecoration: "none", background: "#f0ecff", borderRadius: 20, padding: "2px 10px" }}>
                LinkedIn ↗
              </a>
            )}
          </div>
          <p style={{ margin: "3px 0 0", fontSize: 14, color: "#6b6480" }}>{m.title} · {m.company}</p>
        </div>
      </div>

      {/* Expertise tags */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>Expertise</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {m.tags.map((tag, i) => (
            <span key={i} style={{ background: "#f0ecff", color: "#5c4eb5", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500 }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Bio */}
      {m.bio && (
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>About</p>
          <p style={{ margin: 0, fontSize: 14, color: "#3d3558", lineHeight: 1.65 }}>{m.bio}</p>
        </div>
      )}

      {/* Why they mentor */}
      {m.whyMentor && (
        <div style={{ marginBottom: 18, background: "#f7f5ff", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid #5c4eb5" }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.07em" }}>Why I Mentor</p>
          <p style={{ margin: 0, fontSize: 14, color: "#3d3558", lineHeight: 1.65, fontStyle: "italic" }}>&ldquo;{m.whyMentor}&rdquo;</p>
        </div>
      )}

      {/* Contact */}
      <div style={{ borderTop: "1px solid #f0ecff", paddingTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>Email</p>
          <a href={`mailto:${m.email}`} style={{ fontSize: 14, color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>{m.email}</a>
        </div>
        {m.linkedin && (
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>LinkedIn</p>
            <a href={m.linkedin.startsWith("http") ? m.linkedin : `https://${m.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>{m.linkedin.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "")}</a>
          </div>
        )}
        {m.availability && (
          <div style={{ flexBasis: "100%", marginTop: 4 }}>
            <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.07em" }}>Availability</p>
            <p style={{ margin: 0, fontSize: 14, color: "#3d3558" }}>{m.availability}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Password gate ────────────────────────────────────────────────────────────
function PasswordGate({ slug, onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const correctPassword = slug.split("-")[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.toLowerCase().trim() === correctPassword) {
      sessionStorage.setItem(`auth_${slug}`, "1");
      onAuthenticated();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#f7f5ff",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "44px 48px",
        maxWidth: 380, width: "calc(100% - 48px)",
        boxShadow: "0 4px 32px rgba(92,78,181,0.12)", textAlign: "center",
      }}>
        <img src="/uplift-logo.png" alt="Uplift" style={{ height: 44, margin: "0 auto 24px", display: "block" }} />
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#1a1733" }}>Uplift Summer 2026</h1>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#9b8fcf" }}>Enter your access code to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Access code"
            autoFocus
            style={{
              width: "100%", padding: "13px 14px", borderRadius: 8,
              border: error ? "1.5px solid #e05050" : "1.5px solid #d4d0e8",
              background: "#fafafa", fontSize: 16, fontFamily: "inherit",
              boxSizing: "border-box", outline: "none", marginBottom: 10,
              transition: "border-color 0.15s",
            }}
          />
          {error && (
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#e05050", fontWeight: 500 }}>
              Incorrect code — contact kennedy@techunited.co
            </p>
          )}
          <button type="submit" style={{
            width: "100%", padding: "13px", borderRadius: 8, border: "none",
            background: "#5c4eb5", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Participation confirmation widget ───────────────────────────────────────
function ParticipationWidget({ slug, onAccepted, participationConfirmed }) {
  const storageKey = `${slug}_participation`;
  const [choice, setChoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Sheet is the source of truth — if the sheet says accepted, always show accepted
    if (participationConfirmed) {
      setChoice("accepted");
      localStorage.setItem(storageKey, "accepted"); // keep local in sync
      return;
    }
    const saved = localStorage.getItem(storageKey);
    if (saved) setChoice(saved);
  }, [storageKey, participationConfirmed]);

  const handleChoice = async (val) => {
    setSubmitting(true);
    localStorage.setItem(storageKey, val);
    setChoice(val);
    await persistToSheet(slug, 1, "participation", val, "Program participation confirmation");
    if (val === "accepted") {
      try {
        await fetch("/api/update-milestone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, milestone: "participation", value: true }),
        });
      } catch (_) {}
      if (onAccepted) onAccepted();
    }
    if (val === "declined") {
      try {
        await fetch("/api/set-churned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, churned: true }),
        });
      } catch (_) {}
    }
    setSubmitting(false);
  };

  const changeBtn = (onClear) => (
    <button onClick={onClear} style={{
      background: "none", border: "none", padding: 0, fontSize: 11,
      color: "#b0a8cc", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
    }}>
      Change response
    </button>
  );

  if (choice === "accepted") {
    return (
      <div style={{
        background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0",
        padding: "20px 24px", marginBottom: 24,
      }}>
        <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "#1a6e42" }}>
          ✓ You're all set!
        </p>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#22a366", lineHeight: 1.6 }}>
          Please register for your onboarding session below. We look forward to meeting you.
        </p>
        {changeBtn(() => { localStorage.removeItem(storageKey); setChoice(null); })}
      </div>
    );
  }

  if (choice === "declined") {
    return (
      <div style={{
        background: "#fff8f0", borderRadius: 12, border: "1px solid #f5d9b8",
        padding: "20px 24px", marginBottom: 24,
      }}>
        <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "#a0600a" }}>
          Your response has been recorded.
        </p>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#c47d2a", lineHeight: 1.6 }}>
          We're sorry to hear that. If anything changes, reach out to{" "}
          <a href="mailto:uplift@techunited.co" style={{ color: "#c47d2a" }}>uplift@techunited.co</a>.
        </p>
        {changeBtn(() => { localStorage.removeItem(storageKey); setChoice(null); })}
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "2px solid #5c4eb5",
      padding: "22px 24px", marginBottom: 24,
    }}>
      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
        Confirm Your Participation
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#1a1733" }}>
        Before you begin, please confirm your participation.
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
        Accepting lets us know you're moving forward with the program. We need to hear from you by <strong style={{ color: "#1a1733" }}>Wednesday, June 3rd</strong>.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => handleChoice("accepted")}
          disabled={submitting}
          style={{
            background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)", color: "#fff",
            border: "none", borderRadius: 8, padding: "11px 24px",
            fontSize: 14, fontWeight: 600, cursor: submitting ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          ✓ I Accept
        </button>
        <button
          onClick={() => handleChoice("declined")}
          disabled={submitting}
          style={{
            background: "#fff", color: "#9b8fcf",
            border: "1.5px solid #d4d0e8", borderRadius: 8, padding: "11px 24px",
            fontSize: 14, fontWeight: 500, cursor: submitting ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          I Decline
        </button>
      </div>
    </div>
  );
}

// ─── Week 1: Welcome & Onboarding ─────────────────────────────────────────────
function Week1({ mentee, slug, prompts, mentorUnlocked, onParticipationAccepted, milestones }) {
  const week = WEEKS[0];
  const cohort = COHORTS.find((c) => c.num === mentee.cohort);
  return (
    <div>
      {/* Participation confirmation — above welcome banner */}
      <ParticipationWidget slug={slug} onAccepted={onParticipationAccepted} participationConfirmed={milestones?.participation} />

      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        borderRadius: 14, padding: "28px 32px", color: "#fff", marginBottom: 24,
      }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.65, textTransform: "uppercase" }}>
          Welcome to Uplift Summer 2026
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 21, fontWeight: 700, lineHeight: 1.3 }}>
          {mentee.first}, we're so excited to have you.
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.8, opacity: 0.9 }}>
          We're thrilled you've been accepted into this program and honored to be a small part of your entrepreneurial journey. This summer is going to be big — let's make the most of it.
        </p>
        {cohort && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 18 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6 }}>
              You've been placed in Cohort {cohort.num} — {cohort.name}
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700 }}>{cohort.namesake}</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>{cohort.why}</p>
          </div>
        )}
      </div>

      {/* Action items */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
          Action Items This Week
        </p>
        {[
          { text: "Get acclimated — review your portal and familiarize yourself with the program." },
          {
            text: "Register and attend an onboarding session.",
            sub: cohort
              ? `We encourage you to attend the Cohort ${cohort.num} — ${cohort.name} session to meet your peers. We understand everyone's schedules are different — any of the five sessions will be accepted. Register through Luma.`
              : "We encourage you to attend your cohort's session to meet your peers. We understand everyone's schedules are different — any of the five sessions will be accepted. Register through Luma.",
          },
          { text: "Start mapping your asks, your needs, and what you're looking for from your mentor.", sub: "Please review and refine your goals below and take some time to answer the prompts before your first meeting." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, marginTop: 1,
            }}>
              {i + 1}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
              {item.sub && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9b8fcf", lineHeight: 1.5, fontStyle: "italic" }}>{item.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <EventsSection events={week.events} note={week.note} footerNote="*You will only receive your mentor match after attending an onboarding session." isOnboarding onboardingVerified={milestones?.onboarding} slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />

      {/* Mentor reveal status */}
      {mentorUnlocked ? (
        <div style={{
          background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0",
          padding: "16px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#1a6e42" }}>
              Your mentor has been unlocked!
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#22a366" }}>
              Head to Week 2 to meet them and prepare for your first meeting.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          background: "#f7f5ff", borderRadius: 12, border: "2px dashed #c8bfef",
          padding: "22px 26px", marginBottom: 24,
        }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "#3d2f8a" }}>
            🔒 Your mentor reveal is pending
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
            We'll unlock your mentor match after we've completed onboarding sessions. It will appear automatically in <strong>Week 2</strong> — no action needed from you.
          </p>
        </div>
      )}

      {/* Goals card */}
      <div style={{
        background: "linear-gradient(135deg, #5c4eb5 0%, #3d2f8a 100%)",
        borderRadius: 14, padding: "28px 32px", color: "#fff", marginBottom: 24,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.75, textTransform: "uppercase" }}>
          ⭐ Your primary goal this summer
        </p>
        <p style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>
          {mentee.primaryFocus}
        </p>
        {mentee.secondaryFoci && mentee.secondaryFoci.length > 0 && (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.75, textTransform: "uppercase" }}>
              Secondary focus areas
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {mentee.secondaryFoci.map((f, i) => (
                <span key={i} style={{ background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 500 }}>
                  {f}
                </span>
              ))}
            </div>
          </>
        )}
        <p style={{ margin: 0, fontSize: 11, opacity: 0.5, fontStyle: "italic", textAlign: "right" }}>
          *As reported in your application
        </p>
      </div>

      {/* Goal-specific reflections */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #b8e8d0", padding: "24px 28px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1733" }}>
            Let's get specific about your goals
          </p>
          <span style={{ background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            REQUIRED
          </span>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#6b6480" }}>
          Based on what you've told us, here's where we'll focus this summer.
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
          Be as specific as you can — your answers here will be revisited at the end of the cohort so you can see how far you've come.
        </p>

        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
            Let's get more granular with your goals.
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Primary focus — {mentee.primaryFocus}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "#6b6480" }}>
            What does real progress on this look like for you by August?
          </p>
          <AutoTextarea
            storageKey={`${slug}_w1_primary_refine`}
            placeholder="e.g. I want to close my first 3 paying customers and have a clear pricing model…"
            slug={slug} weekNum={1} fieldKey="primary_refine" rows={3}
            question="What does real progress on your primary focus look like for you by August?"
          />
        </div>

        {mentee.secondaryFoci && mentee.secondaryFoci.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#2a7fd4", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Secondary focus — {mentee.secondaryFoci[0]}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#6b6480" }}>
              What's the one thing that would move the needle here this summer?
            </p>
            <AutoTextarea
              storageKey={`${slug}_w1_secondary_refine`}
              placeholder="e.g. I want to have at least one investor conversation and understand what they'd need to see…"
              slug={slug} weekNum={1} fieldKey="secondary_refine" rows={3}
              question="What's the one thing that would move the needle on your secondary focus this summer?"
            />
          </div>
        )}
        <div style={{ borderTop: "1px solid #d4f0e2", marginTop: 8, paddingTop: 16, textAlign: "center" }}>
          <SaveButton label="Submit" primary />
        </div>
      </div>

      {/* One personalized prompt block */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#3d2f8a" }}>
            Prompts to Think About During Onboarding Week
          </p>
          <span style={{ background: "#f0ecff", color: "#9b8fcf", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            Optional
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", lineHeight: 1.5 }}>
          Use these to start thinking about what you want to get out of this program — you'll be better prepared for your first mentor conversation.
        </p>
      </div>
      <PromptBlock
        theme={prompts[0].theme}
        questions={prompts[0].questions}
        slug={slug} weekNum={1} blockIndex={0} accentColor="#5c4eb5"
      />
    </div>
  );
}

// ─── Week 2: Meet your mentor ─────────────────────────────────────────────────
function Week2({ mentee, slug, mentorUnlocked, holding }) {
  const week = WEEKS[1];
  const [w1Goals, setW1Goals] = useState("");

  useEffect(() => {
    setW1Goals(localStorage.getItem(`${slug}_w1_primary_refine`) || "");
  }, [slug]);

  return (
    <div>
      {/* Mentor card */}
      <MentorCard mentee={mentee} revealed={mentorUnlocked} holding={holding} />

      {/* Action items */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
          Action Items This Week
        </p>
        {[
          { text: "Schedule your first meeting with your mentor." },
          { text: "Participate in your first mentorship session." },
          { text: "Attend one of this week's sessions — check them out below." },
          { text: "Take some time to think about the prompts below." },
          { text: "Submit your first mentor meeting." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 4 ? 12 : 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, marginTop: 1,
            }}>
              {i + 1}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
              {item.sub && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9b8fcf", lineHeight: 1.5, fontStyle: "italic" }}>{item.sub}</p>}
            </div>
          </div>
        ))}
        <p style={{ margin: "14px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>
          *You must attend a minimum of 3 virtual educational sessions by the end of this program.
        </p>
      </div>

      {/* Reminder — above the submit button */}
      <p style={{
        textAlign: "center", fontSize: 14, color: "#7a5c00",
        background: "#fffbeb", border: "1px solid #f5d97a",
        borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontStyle: "italic",
      }}>
        All pairs should meet for 1 hour by the end of this week.
      </p>

      {/* Submit meeting button */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <a href="https://form.typeform.com/to/e0L62296" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", padding: "14px 36px",
          background: "#5c4eb5", color: "#fff", borderRadius: 10,
          fontSize: 16, fontWeight: 700, textDecoration: "none",
          boxShadow: "0 4px 14px rgba(92,78,181,0.35)",
        }}>
          Submit your 1st mentor meeting →
        </a>
      </div>

      {/* Sessions */}
      <EventsSection events={week.events} slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />

      {/* Pre-meeting reflection */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Pre-Meeting Prompts
          </p>
          <span style={{ background: "#f0ecff", color: "#9b8fcf", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            Optional
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", lineHeight: 1.5 }}>
          Before your first meeting, take some time to think about these things:
        </p>
      </div>
      {[
        { q: "What's the single most important thing you want your mentor to understand about your company?", key: "prep_q1" },
        { q: "What's one decision you're currently stuck on that you'd love an outside perspective on?", key: "prep_q2" },
        { q: "What would make this first meeting feel like a success to you?", key: "prep_q3" },
      ].map((item, i) => (
        <div key={i} style={{
          background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
          padding: "20px 24px", marginBottom: 16, borderLeft: "4px solid #2a7fd4",
        }}>
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 500, color: "#1a1733", lineHeight: 1.5 }}>{item.q}</p>
          <AutoTextarea storageKey={`${slug}_w2_${item.key}`} placeholder="Your thoughts…" slug={slug} weekNum={2} fieldKey={item.key} question={item.q} />
        </div>
      ))}
      <p style={{ fontSize: 12, color: "#b0a8cc", fontStyle: "italic", marginBottom: 36, lineHeight: 1.6 }}>
        *These notes are not shared with your mentor — they're intended for you to help surface what you might want to talk about in your first meeting.
      </p>

      {/* Week 1 sense-check recap */}
      {w1Goals && (
        <div style={{ background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0", padding: "22px 26px" }}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: "#1a6e42" }}>
            Here's what you said in the sense check — Week 1:
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#1a4a32", lineHeight: 1.7 }}>{w1Goals}</p>
        </div>
      )}
    </div>
  );
}

// ─── Weekly pulse check-in ────────────────────────────────────────────────────
// Use new Date(y,m,d) (local midnight) — never ISO strings, which parse as UTC and shift the display date
const PULSE_WINDOWS = [
  { week: 1, start: new Date(2026, 5,  1), end: new Date(2026, 5,  6, 23, 59, 59) },
  { week: 2, start: new Date(2026, 5,  8), end: new Date(2026, 5, 13, 23, 59, 59) },
  { week: 3, start: new Date(2026, 5, 15), end: new Date(2026, 5, 20, 23, 59, 59) },
  { week: 4, start: new Date(2026, 5, 22), end: new Date(2026, 5, 27, 23, 59, 59) },
  { week: 5, start: new Date(2026, 5, 29), end: new Date(2026, 6,  4, 23, 59, 59) },
  { week: 6, start: new Date(2026, 6,  6), end: new Date(2026, 6, 11, 23, 59, 59) },
  { week: 7, start: new Date(2026, 6, 13), end: new Date(2026, 6, 18, 23, 59, 59) },
  { week: 8, start: new Date(2026, 6, 19), end: new Date(2026, 6, 25, 23, 59, 59) },
  { week: 9, start: new Date(2026, 6, 27), end: new Date(2026, 7,  4, 23, 59, 59) },
];

function fmtPulseDate(d) {
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const ord = day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
    : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${month} ${day}${ord}`;
}

const PULSE_RATINGS = [
  { value: 1, emoji: "😌", label: "Could be better" },
  { value: 2, emoji: "🙂", label: "Getting there" },
  { value: 3, emoji: "😊", label: "Feeling good" },
  { value: 4, emoji: "😄", label: "Feeling great" },
  { value: 5, emoji: "🚀", label: "Crushing it" },
];

function WeeklyPulse({ slug, weekNum }) {
  const storageKey = `${slug}_w${weekNum}_pulse`;
  const [selected, setSelected] = useState(null);
  const [isChanging, setIsChanging] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setSelected(parseInt(saved, 10));
    if (localStorage.getItem(`${storageKey}_changed`)) setHasChanged(true);
  }, [storageKey]);

  const handleSelect = (val) => {
    const wasChanging = isChanging;
    setSelected(val);
    setIsChanging(false);
    localStorage.setItem(storageKey, String(val));
    persistToSheet(slug, weekNum, "pulse", String(val), "How are you feeling this week?");
    if (wasChanging) {
      setHasChanged(true);
      localStorage.setItem(`${storageKey}_changed`, "1");
    }
  };

  // Date-window logic
  const today = new Date();
  const win = PULSE_WINDOWS.find(w => w.week === weekNum);
  const isActive = win && today >= win.start && today <= win.end;
  const isPast   = win && today > win.end;
  const isFuture = win && today < win.start;

  // Onboarding week: no pulse at all
  if (weekNum === 1) return null;

  // Future weeks: preview with disabled rating buttons
  if (isFuture) {
    return (
      <div style={{
        background: "#fafafa", borderRadius: 12, border: "1px solid #e8e4f5",
        padding: "18px 22px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#9b8fcf" }}>
            How are you feeling about the program this week?
          </p>
          <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>Optional</span>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#c0b8d8", lineHeight: 1.6 }}>
          Weekly pulse check · We use this to see where you&apos;re at in the program, how you&apos;re feeling, and how your momentum is going. It helps us gauge the cohort as a whole and spot where we can show up better for you.
        </p>
        {/* Grayed-out preview of the rating buttons */}
        <div style={{ display: "flex", gap: 8, opacity: 0.35, pointerEvents: "none", marginBottom: 10 }}>
          {PULSE_RATINGS.map(r => (
            <div key={r.value} style={{
              flex: 1, padding: "10px 4px", borderRadius: 8,
              border: "1.5px solid #e8e4f5", background: "#fff",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 20 }}>{r.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#9b8fcf" }}>{r.label}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#b0a8cc", fontStyle: "italic" }}>
          🔒 Unlocks {fmtPulseDate(win.start)} — available until {fmtPulseDate(win.end)}.
        </p>
      </div>
    );
  }

  // Past window
  if (isPast) {
    const answered = selected !== null;
    const rating = answered ? PULSE_RATINGS[selected - 1] : null;
    // Find next current week number
    const currentWin = PULSE_WINDOWS.find(w => today >= w.start && today <= w.end);
    const currentWeekNum = currentWin?.week;

    return (
      <div style={{
        background: "#fafafa", borderRadius: 12,
        border: "1px solid #e8e4f5", padding: "16px 22px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>{answered ? rating.emoji : "💬"}</span>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#6b6480" }}>
            {answered
              ? `You responded: ${rating.emoji} ${rating.label}`
              : "You didn't share your pulse this week"}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf" }}>
            This feedback window is now closed.
            {currentWeekNum && currentWeekNum !== weekNum && (
              <> Share how you&apos;re feeling in Week {currentWeekNum}.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Active window — show interactive buttons
  const showButtons = !selected || isChanging;

  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
      padding: "18px 22px", marginBottom: 20,
    }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1733" }}>
            How are you feeling about the program this week?
            {selected && !isChanging && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 500, color: "#9b8fcf" }}>
                {PULSE_RATINGS[selected - 1]?.label}
              </span>
            )}
          </p>
          <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>Optional</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf", lineHeight: 1.6 }}>
          Weekly pulse check · Available {fmtPulseDate(win.start)} – {fmtPulseDate(win.end)} · We use this to see where you&apos;re at in the program, how you&apos;re feeling, and how your momentum is going. It helps us gauge the cohort as a whole and spot where we can show up better for you.
        </p>
      </div>

      {showButtons ? (
        <div style={{ display: "flex", gap: 8 }}>
          {PULSE_RATINGS.map(r => (
            <button key={r.value} onClick={() => handleSelect(r.value)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 8, cursor: "pointer",
              border: selected === r.value ? "2px solid #5c4eb5" : "1.5px solid #e8e4f5",
              background: selected === r.value ? "#f0ecff" : "#fafafa",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              fontFamily: "inherit", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 20 }}>{r.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: selected === r.value ? 700 : 500, color: selected === r.value ? "#5c4eb5" : "#9b8fcf" }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      ) : hasChanged ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f0ecff", borderRadius: 8 }}>
          <span style={{ fontSize: 20 }}>{PULSE_RATINGS[selected - 1]?.emoji}</span>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#5c4eb5" }}>
              ✓ Response updated — you&apos;ve used your one change for this week.
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9b8fcf" }}>
              Your response: {PULSE_RATINGS[selected - 1]?.label}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8f7ff", borderRadius: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>{PULSE_RATINGS[selected - 1]?.emoji}</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#5c4eb5" }}>
              You responded: {PULSE_RATINGS[selected - 1]?.label}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setIsChanging(true)} style={{
              padding: "7px 16px", borderRadius: 7, cursor: "pointer",
              border: "1.5px solid #c8bef5", background: "#fff",
              fontSize: 12, fontWeight: 600, color: "#5c4eb5",
              fontFamily: "inherit", transition: "all 0.15s",
            }}>
              Change my response
            </button>
            <p style={{ margin: 0, fontSize: 11, color: "#b0a8cc", fontStyle: "italic" }}>
              Please note, you can only change your response once.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weekly focus one-liner ───────────────────────────────────────────────────
function WeeklyFocus({ slug, weekNum }) {
  const storageKey = `${slug}_w${weekNum}_weekly_focus`;
  const [savedValue, setSavedValue] = useState("");

  // Date-window logic (same windows as pulse)
  const today = new Date();
  const win = PULSE_WINDOWS.find(w => w.week === weekNum);
  const isActive = win && today >= win.start && today <= win.end;
  const isPast   = win && today > win.end;
  const isFuture = win && today < win.start;

  useEffect(() => {
    setSavedValue(localStorage.getItem(storageKey) || "");
  }, [storageKey]);

  // Future weeks: styled locked box
  if (isFuture) {
    return (
      <div style={{
        background: "#fafafa", borderRadius: 12, border: "1px solid #e8e4f5",
        padding: "18px 22px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#9b8fcf" }}>
            Share what you&apos;re focused on this week.
          </p>
          <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>Optional</span>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#c0b8d8", lineHeight: 1.6 }}>
          Whether it&apos;s a small goal, a project, or a deadline — share what you&apos;re building or working on. If there&apos;s a program participant working on the same thing or something similar, we&apos;ll connect you.
        </p>
        <div style={{
          background: "#f7f5ff", borderRadius: 8, padding: "12px 16px",
          fontSize: 12, color: "#b0a8cc", fontStyle: "italic", lineHeight: 1.6,
          border: "1.5px dashed #ddd8f5",
        }}>
          🔒 Unlocks the week of {fmtPulseDate(win.start)} – {fmtPulseDate(win.end)}.
        </div>
      </div>
    );
  }

  // Past window: read-only
  if (isPast) {
    return (
      <div style={{
        background: "#fafafa", borderRadius: 12,
        border: "1px solid #e8e4f5", padding: "16px 22px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: savedValue ? 8 : 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#6b6480" }}>
            Share what you&apos;re focused on this week.
          </p>
          <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
            Closed
          </span>
        </div>
        {savedValue ? (
          <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6, fontStyle: "italic" }}>{savedValue}</p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#b0a8cc", fontStyle: "italic" }}>You didn&apos;t share a focus this week.</p>
        )}
      </div>
    );
  }

  // Active window: editable
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
      padding: "18px 22px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
          Share what you&apos;re focused on this week.
        </p>
        <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
          Optional
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9b8fcf", lineHeight: 1.7 }}>
        Whether it&apos;s a small goal, a project, or a deadline — share what you&apos;re building or working on. If there&apos;s a program participant working on the same thing or something similar, we&apos;ll connect you. · Available {fmtPulseDate(win.start)} – {fmtPulseDate(win.end)}.
      </p>
      <AutoTextarea
        storageKey={storageKey}
        placeholder="e.g. closing my first customer, improving onboarding, prepping for a pitch…"
        slug={slug}
        weekNum={weekNum}
        fieldKey="weekly_focus"
        rows={2}
        question="What are you focused on this week?"
      />
    </div>
  );
}

// ─── Journey progress bar ─────────────────────────────────────────────────────
function JourneyProgressBar({ slug, activeWeek }) {
  const [completedWeeks, setCompletedWeeks] = useState(0);
  const [weekPrompts, setWeekPrompts] = useState(0);

  useEffect(() => {
    let done = 0;
    let thisWeekFilled = 0;
    for (let w = 1; w <= 9; w++) {
      let weekHasAny = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${slug}_w${w}_`)) {
          const val = localStorage.getItem(key);
          if (val && val.trim()) {
            weekHasAny = true;
            if (w === activeWeek) thisWeekFilled++;
          }
        }
      }
      if (weekHasAny) done++;
    }
    setCompletedWeeks(done);
    setWeekPrompts(thisWeekFilled);
  }, [slug, activeWeek]);

  const pct = (completedWeeks / 9) * 100;

  return (
    <div style={{
      background: "#fff", borderRadius: 10, border: "1px solid #e8e4f5",
      padding: "14px 20px", marginBottom: 20,
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5c4eb5" }}>
            {completedWeeks} of 9 weeks with responses
          </span>
          <span style={{ fontSize: 11, color: "#9b8fcf" }}>
            {weekPrompts} {weekPrompts === 1 ? "prompt" : "prompts"} filled this week
          </span>
        </div>
        <div style={{ height: 6, background: "#f0ecff", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #5c4eb5, #9b8fcf)",
            borderRadius: 3, transition: "width 0.6s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Generic reflection week ──────────────────────────────────────────────────
function WeekReflection({ weekNum, slug, prompts, menteeName }) {
  const trackEventClick = (title, url) => {
    if (!slug) return;
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: menteeName || slug, title, url }),
    }).catch(() => {});
  };
  const week = WEEKS.find((w) => w.num === weekNum);

  // Week 9: closing / Summit content
  if (weekNum === 9) {
    const summit = week.events.find((e) => e.required);
    const bonusSessions = week.events.filter((e) => !e.required);
    return (
      <div>
        {/* Attendance required banner */}
        <div style={{
          background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
          borderRadius: 14, padding: "28px 32px", color: "#fff", marginBottom: 24,
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
            Required to complete the program
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>
            🎓 Uplift Summit &amp; Graduation
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.7, opacity: 0.9 }}>
            You <strong>must attend the Summit and Graduation to complete the program</strong> and receive your certificate. This is the finish line — we can't wait to celebrate everything you've built this summer.
          </p>
          {summit && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {summit.day} · In-Person
                </p>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>Details and location TBD — register to stay updated.</p>
              </div>
              <a href={summit.url || "#"} target="_blank" rel="noopener noreferrer"
                onClick={() => trackEventClick(summit.name || "Uplift Summit & Graduation", summit.url || "")}
                style={{
                  background: "#fff", color: "#3d2f8a", borderRadius: 8,
                  padding: "10px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0,
                }}>
                Register on Luma →
              </a>
            </div>
          )}
        </div>

        {/* By now checklist */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#3d2f8a" }}>By now you should have:</p>
          <ul style={{ margin: "0 0 18px", paddingLeft: 22, lineHeight: 2.2 }}>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Met with your mentor for a minimum of 3 hours</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Attended 3 virtual educational sessions</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Logged all 3 mentor meetings</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Completed your end report</li>
          </ul>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
            If anything above is outstanding, contact <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600 }}>uplift@techunited.co</a> before the Summit.
          </p>
        </div>

        {/* Bonus session */}
        {bonusSessions.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
              Bonus Session
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
              If you still need one more virtual educational session to hit your 3, this is your chance.
            </p>
            {bonusSessions.map((ev, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <div style={{ width: 17, height: 17, border: "1.5px solid #c0b8d8", borderRadius: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1733" }}>{ev.name}</span>
                  <span style={{ marginLeft: 6, fontSize: 13, color: "#6b6480" }}>— {ev.day}, {ev.time} · {ev.format}</span>
                </div>
                <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEventClick(ev.name, ev.url || "")}
                  style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                  Register on Luma →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Quote */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24, borderLeft: "4px solid #5c4eb5" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reflection</p>
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 500, color: "#1a1733", lineHeight: 1.5 }}>
            If you'd like, we would love to share a quote from you on our <a href="https://techunited.org" target="_blank" rel="noopener noreferrer" style={{ color: "#5c4eb5" }}>webpage</a> — your name will be linked.
          </p>
          <AutoTextarea storageKey={`${slug}_w9_quote`} placeholder="Share a quote about your Uplift experience…" slug={slug} weekNum={9} fieldKey="quote" rows={3} question="Share a quote about your Uplift experience" />
        </div>
      </div>
    );
  }

  // Week 4: separate Midpoint Meetup (in-person, Hoboken) from Industry Q&A
  if (weekNum === 4) {
    const midpoint = week.events.find((e) => e.required);
    const others = week.events.filter((e) => !e.required);
    return (
      <div>
        {/* Action items */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Action Items This Week
          </p>
          {[
            { text: "Register and attend the Midpoint Meetup — it's required and in-person. Details below." },
            { text: "Join us on Friday for a virtual session." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 1 ? 12 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Weekly focus */}
        <WeeklyFocus slug={slug} weekNum={4} />

        {midpoint && (
          <div style={{ background: "#f0faf5", borderRadius: 12, border: "2px solid #b8e8d0", padding: "24px 28px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                REQUIRED · IN-PERSON
              </span>
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 16, color: "#1a1733" }}>
              🤝 Midpoint Meetup — {midpoint.day}, {midpoint.time}
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "#1a6e42", lineHeight: 1.7, fontStyle: "italic" }}>
              📍 In-person in Hoboken. This is the halfway mark — and though we LOVE your virtual faces, we can't wait to see you in person!
            </p>
            <a href={midpoint.url || "#"} target="_blank" rel="noopener noreferrer"
              onClick={() => trackEventClick(midpoint.name || "Midpoint Meetup", midpoint.url || "")}
              style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none" }}>
              Register on Luma →
            </a>
          </div>
        )}
        <Tagline text={week.tagline} type={week.taglineType} />
        {others.length > 0 && (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 15, color: "#3d2f8a", lineHeight: 1.6, fontStyle: "italic" }}>
              Take the additional opportunity to attend this virtual event:
            </p>
            <EventsSection events={others} slug={slug} menteeName={menteeName} />
          </div>
        )}

        {/* Midpoint reflection prompts */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginTop: 24, borderLeft: "4px solid #5c4eb5" }}>
          <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
            Reflection
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Ahead of the Midpoint Meetup
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
            We'd love to hear from you before you arrive. Take a moment to set your intentions.
          </p>

          <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>
            What's the most important thing you want to walk away from the Midpoint Meetup with?
          </p>
          <AutoTextarea
            storageKey={`${slug}_w4_midpoint_primary`}
            placeholder="The one thing I most want to gain or accomplish at the meetup is…"
            slug={slug} weekNum={4} fieldKey="midpoint_primary" rows={3}
            question="What's the most important thing you want to walk away from the Midpoint Meetup with?"
          />

          <p style={{ margin: "20px 0 8px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>
            Beyond that, what's a secondary goal you're bringing to the Midpoint Meetup?
          </p>
          <AutoTextarea
            storageKey={`${slug}_w4_midpoint_secondary`}
            placeholder="A secondary goal I'm hoping to accomplish is…"
            slug={slug} weekNum={4} fieldKey="midpoint_secondary" rows={3}
            question="Beyond that, what's a secondary goal you're bringing to the Midpoint Meetup?"
          />
        </div>
      </div>
    );
  }

  // Week 3: tagline + action items + sessions + share a win + reflection
  if (weekNum === 3) {
    return (
      <div>
        <p style={{
          background: "#f5f3ff", borderRadius: 10, padding: "14px 18px",
          fontSize: 15, lineHeight: 1.6, marginBottom: 24, fontStyle: "italic",
          color: "#3d2f8a",
        }}>
          We know everyone's schedules look different —{" "}
          <span style={{ textDecoration: "underline" }}>by this time you should have met with your mentor for at least an hour</span>
          . If you have not done so, this is an opportunity to catch up. If you have already done so, we encourage you to continue communication with your mentor and to attend one of this week's virtual sessions.
        </p>

        {/* Action items */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Action Items This Week
          </p>
          {[
            { text: "Confirm you've had your first meeting with your mentor. If you haven't, make sure it's scheduled." },
            { text: "If you need extra support, reach out via the Support tab — we're here." },
            { text: "Take some time to check out this week's sessions below and register for them." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
        </div>
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} />

        {/* Weekly focus */}
        <WeeklyFocus slug={slug} weekNum={3} />

        {/* Share a Win */}
        <div style={{
          background: "linear-gradient(135deg, #fef9e7 0%, #fffde7 100%)",
          borderRadius: 14, border: "2px solid #f9d94a",
          padding: "24px 28px", marginTop: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#5a3e00" }}>
              Share a Win
            </p>
            <span style={{ marginLeft: "auto", background: "#fff3b0", color: "#7a5c00", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              Shared with the group
            </span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.7, color: "#5a3e00" }}>
            We're pumped about your momentum — and we know you're putting in the work. If you've had a chance to meet with your mentor, made real progress on your company, or experienced a win — big or small — we'd love to celebrate it with you. Wins get shared with your fellow founders and mentors as a group update. Don't hold back. 🚀
          </p>
          <AutoTextarea
            storageKey={`${slug}_w3_win`}
            placeholder="e.g. I landed my first paying customer this week, closed a partnership, hit a growth milestone, had a breakthrough conversation with my mentor…"
            slug={slug} weekNum={3} fieldKey="week3_win" rows={3}
            question="Share a Win — this will be shared with the group"
          />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9b7a00", fontStyle: "italic" }}>
            ✨ Your win will be shared as an Uplift update with your fellow founders and mentors.
          </p>
        </div>

        {/* Reflection prompt */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginTop: 24, borderLeft: "4px solid #5c4eb5" }}>
          <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Reflection
          </p>

          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#1a1733", lineHeight: 1.5 }}>
              Who do you want to build like?
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
              Every founder has a company, a leader, or a story they keep coming back to — someone whose trajectory, decisions, or values feel like a north star. Who's yours, and what is it about them that resonates with where you're trying to go?
            </p>
            <AutoTextarea
              storageKey={`${slug}_w3_role_model`}
              placeholder="e.g. I think a lot about how Patagonia built a brand around values first — I want to build something with that kind of conviction…"
              slug={slug} weekNum={3} fieldKey="role_model" rows={4}
              question="Who do you want to build like?"
            />
          </div>

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#1a1733", lineHeight: 1.5 }}>
              What's one thing they're doing that you could deploy this week?
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
              Not eventually — this week. Look at how your north star operates and find one tactic, habit, or move you can steal and test right now.
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#b0a8cc", fontStyle: "italic", lineHeight: 1.7 }}>
              Examples: automated outreach sequences, guerrilla marketing, content-first distribution, community building before launch, radical transparency with customers, partnerships over paid ads, founder-led sales…
            </p>
            <AutoTextarea
              storageKey={`${slug}_w3_deploy_tactic`}
              placeholder="e.g. They do a weekly founder update email to their community — I'm going to start sending one to my top 20 customers this Friday…"
              slug={slug} weekNum={3} fieldKey="deploy_tactic" rows={4}
              question="What's one thing they're doing that you could deploy this week?"
            />
          </div>

        </div>
      </div>
    );
  }

  // Locked prompt block shown on weeks 5–7 until midpoint is attended
  const LockedPrompts = () => (
    <p style={{ margin: "4px 0 16px", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
      🔒 Reflection prompts unlock after you&apos;ve attended the Midpoint Meetup on June 23rd.
    </p>
  );

  // Week 5: action items, submit button, sessions
  if (weekNum === 5) {
    return (
      <div>
        {/* Action items */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Action Items This Week
          </p>
          {[
            { text: "Have your second mentorship session with your mentor." },
            { text: "Remember to submit your mentorship meeting." },
            { text: "Check out the educational sessions happening this week." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>
            *All pairs should have met for a total of two hours by the end of this week. We're over halfway through — you must attend a minimum of 3 virtual educational sessions by program end.
          </p>
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <a href="https://form.typeform.com/to/e0L62296" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "14px 36px",
            background: "#5c4eb5", color: "#fff", borderRadius: 10,
            fontSize: 16, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 4px 14px rgba(92,78,181,0.35)",
          }}>
            {week.submitLabel} →
          </a>
        </div>
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} />
        <WeeklyFocus slug={slug} weekNum={5} />
        <LockedPrompts />
      </div>
    );
  }

  // Week 7: action items + sessions + submit button
  if (weekNum === 7) {
    return (
      <div>
        {/* Action items */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Action Items This Week
          </p>
          {[
            { text: "Have your third mentorship session with your mentor. We encourage you to meet more, but this is where you should be at minimum." },
            { text: "This is the last week to complete your virtual educational sessions — you need all 3 by end of this week to participate in graduation. There are 3 sessions available this week." },
            { text: "Submit your 3rd mentor meeting below." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: "center", fontSize: 14, color: "#7a5c00",
          background: "#fffbeb", border: "1px solid #f5d97a",
          borderRadius: 8, padding: "10px 16px", marginBottom: 24, fontStyle: "italic",
        }}>
          {week.tagline}
        </p>
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} />
        <WeeklyFocus slug={slug} weekNum={7} />
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <a href="https://form.typeform.com/to/e0L62296" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "14px 36px",
            background: "#5c4eb5", color: "#fff", borderRadius: 10,
            fontSize: 16, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 4px 14px rgba(92,78,181,0.35)",
          }}>
            {week.submitLabel} →
          </a>
        </div>
        <LockedPrompts />
      </div>
    );
  }

  // Week 8: action items + tagline + end report button
  if (weekNum === 8) {
    return (
      <div>
        {/* Action items */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Action Items This Week
          </p>
          {[
            { text: "Verify you've completed three hours of mentoring sessions and that it's reflected on your milestones." },
            { text: "If you have outstanding meetings or educational sessions that need to be made up, contact ", link: { label: "uplift@techunited.co", href: "mailto:uplift@techunited.co" }, suffix: " immediately." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 1 ? 12 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>
                {item.text}
                {item.link && <a href={item.link.href} style={{ color: "#5c4eb5", fontWeight: 600 }}>{item.link.label}</a>}
                {item.suffix}
              </p>
            </div>
          ))}
        </div>

        <Tagline text={week.tagline} />
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-block", padding: "14px 36px",
            background: "#e8e4f5", color: "#9b8fcf", borderRadius: 10,
            fontSize: 16, fontWeight: 700, cursor: "default",
          }}>
            🔒 {week.submitLabel}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
            This link will be unlocked on <strong style={{ color: "#6b6480" }}>July 18th</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Week 6: tagline + action items + sessions
  if (weekNum === 6) {
    return (
      <div>
        <Tagline text={week.tagline} />

        {/* Action items */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Action Items This Week
          </p>
          {[
            { text: "Review your milestones — make sure they're up to date and complete any outstanding items." },
            { text: "Remember to submit your mentorship meeting." },
            { text: "Check out the educational sessions happening this week." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{item.text}</p>
            </div>
          ))}
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>
            *By this time you should have met with your mentor for a minimum of two sessions. Only 2 weeks until the Summit &amp; Graduation — make sure you're on track with your educational sessions.
          </p>
        </div>

        <EventsSection events={week.events} slug={slug} menteeName={menteeName} />
        <WeeklyFocus slug={slug} weekNum={6} />
        <LockedPrompts />
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  const weekPrompts = {};
  const config = weekPrompts[weekNum];
  if (!config) return null;

  return (
    <div>
      {week?.tagline && <Tagline text={week.tagline} type={week.taglineType} />}
      {week && <EventsSection events={week.events} submitLabel={week.submitLabel} submitPrimary={week.submitPrimary} slug={slug} menteeName={menteeName} />}

      <p style={{
        background: "#f5f3ff", borderRadius: 10, padding: "14px 18px",
        fontSize: 15, color: "#3d2f8a", lineHeight: 1.6, fontStyle: "italic",
        margin: "0 0 24px",
      }}>
        {config.intro}
      </p>

      {config.questions.map((item, i) => (
        <div key={i} style={{
          background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
          padding: "20px 24px", marginBottom: 16,
          borderLeft: `4px solid ${["#5c4eb5", "#2a7fd4", "#e07b39"][i % 3]}`,
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reflection</p>
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 500, color: "#1a1733", lineHeight: 1.5 }}>{item.q}</p>
          <AutoTextarea storageKey={`${slug}_w${weekNum}_${item.key}`} placeholder="Your thoughts…" slug={slug} weekNum={weekNum} fieldKey={item.key} />
        </div>
      ))}

      <p style={{ margin: "28px 0 4px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Prompt
      </p>
      <PromptBlock
        theme={prompts[0].theme}
        questions={prompts[0].questions}
        slug={slug} weekNum={weekNum} blockIndex={0} accentColor="#5c4eb5"
      />
    </div>
  );
}

// ─── Meetings tab ─────────────────────────────────────────────────────────────
function fmtDate(raw) {
  if (!raw) return "";
  // Handle YYYY-MM-DD from Typeform date fields
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  return raw;
}

function MeetingsSection({ slug, milestones, onMilestoneUpdate }) {
  const [meetings, setMeetings] = useState(null);

  useEffect(() => {
    fetch(`/api/meetings?slug=${slug}`)
      .then(r => r.json())
      .then(async d => {
        const list = d.meetings || [];
        setMeetings(list);

        // Count qualifying sessions with half-credit for sub-60min sessions
        const count = list
          .filter(m => !m.denied && (m.notes?.trim() || m.manuallyVerified))
          .reduce((sum, m) => sum + (m.sixtyMin === false ? 0.5 : 1.0), 0);

        // Auto-check mentor session milestones as they're earned
        const toCheck = [
          { key: "mentorSession1", earned: count >= 1 },
          { key: "mentorSession2", earned: count >= 2 },
          { key: "mentorSession3", earned: count >= 3 },
        ];

        for (const { key, earned } of toCheck) {
          if (earned && !milestones?.[key]) {
            try {
              await fetch("/api/update-milestone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, milestone: key, value: true }),
              });
              if (onMilestoneUpdate) onMilestoneUpdate(key);
            } catch (_) {}
          }
        }
      })
      .catch(() => setMeetings([]));
  }, [slug]);

  if (meetings === null) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9b8fcf", fontSize: 14 }}>
        Loading meetings…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 700, color: "#1a1733" }}>
            My Logged Mentorship Meetings
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf" }}>
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
        <a
          href="https://form.typeform.com/to/e0L62296"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
            color: "#fff", borderRadius: 8, padding: "10px 18px",
            fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0,
          }}
        >
          + Log a meeting
        </a>
      </div>

      {/* Session progress tracker */}
      {(() => {
        const verifiedCount = meetings
          .filter(m => !m.denied && (m.notes?.trim() || m.manuallyVerified))
          .reduce((sum, m) => sum + (m.sixtyMin === false ? 0.5 : 1.0), 0);
        const REQUIRED = 3;
        const pct = Math.min(Math.round((verifiedCount / REQUIRED) * 100), 100);
        const over = verifiedCount > REQUIRED ? verifiedCount - REQUIRED : 0;
        return (
          <div style={{
            background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
            borderRadius: 14, padding: "22px 26px", marginBottom: 20, color: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, opacity: 0.75 }}>
                  Verified Sessions
                </p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                  {pct}<span style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>%</span>
                  {over > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginLeft: 6 }}>
                      +{over} bonus
                    </span>
                  )}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, opacity: 0.75 }}>Toward goal</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                  {Math.min(verifiedCount, REQUIRED)}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7 }}> / {REQUIRED}</span>
                </p>
              </div>
            </div>
            {/* Progress bar with 3 segment markers */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 10 }}>
                <div style={{
                  background: pct >= 100 ? "linear-gradient(90deg, #34d399, #10b981)" : "linear-gradient(90deg, #a78bfa, #60a5fa)",
                  height: 10, borderRadius: 8,
                  width: `${pct}%`,
                  transition: "width 0.6s ease",
                  minWidth: verifiedCount > 0 ? 10 : 0,
                }} />
              </div>
              {/* Segment tick marks at 33% and 66% */}
              {[33, 66].map(p => (
                <div key={p} style={{
                  position: "absolute", top: 0, left: `${p}%`,
                  width: 2, height: 10,
                  background: "rgba(255,255,255,0.4)",
                  transform: "translateX(-1px)",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Session 1</p>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Session 2</p>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Session 3</p>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 11, opacity: 0.55, fontStyle: "italic", lineHeight: 1.5 }}>
              * Sessions of 60+ min count as 1 credit. Sessions under 60 min count as ½ credit and require a follow-up session. Sessions still pending internal review are not yet reflected here.
            </p>
          </div>
        );
      })()}

      {/* Not seeing your meeting notice — always shown */}
      <div style={{
        background: "#f7f5ff", borderRadius: 10, border: "1px solid #e0dbf5",
        padding: "16px 20px", marginBottom: 20,
      }}>
        <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#3d2f8a" }}>
          Not seeing your meeting?
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a
            href="https://form.typeform.com/to/e0L62296"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", padding: "8px 18px",
              background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
              color: "#fff", borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}
          >
            Submit a meeting →
          </a>
          <span style={{ fontSize: 13, color: "#6b6480" }}>
            or contact{" "}
            <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>
              uplift@techunited.co
            </a>
          </span>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>
          *Submissions may take up to 15 minutes to appear here.
        </p>
      </div>

      {meetings.length === 0 ? (
        <div style={{
          background: "#fafafa", borderRadius: 12, border: "1px dashed #d4d0e8",
          padding: "36px 28px", textAlign: "center",
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 22 }}>📋</p>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#6b6480" }}>
            No meetings logged yet
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", lineHeight: 1.6 }}>
            After each mentor session, submit your meeting report to keep track of your progress.
          </p>
        </div>
      ) : (() => {
        const isVerified = m => !m.denied && (m.notes?.trim() || m.manuallyVerified);
        const isHalfCredit = m => isVerified(m) && m.sixtyMin === false;
        const denied    = meetings.filter(m => m.denied);
        const verified  = meetings.filter(isVerified);
        const pending   = meetings.filter(m => !isVerified(m) && !m.denied);
        return (
          <>
            {/* Verified sessions */}
            {verified.length === 0 && (
              <div style={{
                background: "#fafafa", borderRadius: 12, border: "1px dashed #d4d0e8",
                padding: "28px", textAlign: "center", marginBottom: 16,
              }}>
                <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#6b6480" }}>
                  No auto-verified sessions yet
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", lineHeight: 1.6 }}>
                  Sessions with a Granola transcript and 60+ minutes will appear here and count toward your milestones.
                </p>
              </div>
            )}
            {verified.map((m, i) => {
              const half = isHalfCredit(m);
              return (
              <div key={m.id} style={{
                background: half ? "#fffbf0" : "#fff",
                borderRadius: 12,
                border: `1px solid ${half ? "#f5c842" : "#e8e4f5"}`,
                padding: "22px 26px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: half ? "linear-gradient(135deg, #f5a623, #e67e22)" : "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
                      Session {i + 1}{half ? " *" : ""}
                    </p>
                  </div>
                  <span style={{
                    background: half ? "#fff3cd" : m.manuallyVerified ? "#fff8e6" : "#e8f8f0",
                    color: half ? "#7a5c00" : m.manuallyVerified ? "#7a5c00" : "#1a6e42",
                    borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700,
                  }}>
                    {half ? "½ Credit — Action Required" : `✓ ${m.manuallyVerified ? "Manually Verified" : "Verified"}`}
                  </span>
                </div>
                {half && (
                  <div style={{
                    background: "#fff8e6", border: "1px solid #f5c842", borderRadius: 8,
                    padding: "10px 14px", marginBottom: 14,
                    fontSize: 13, color: "#7a5c00", lineHeight: 1.5,
                  }}>
                    * This session was recorded as under 60 minutes and counts as ½ credit toward your goal. If you believe this is an error, please contact <a href="mailto:uplift@techunited.co" style={{color:"#7a5c00",fontWeight:600,textDecoration:"none"}}>uplift@techunited.co</a> and we'll get it corrected.
                  </div>
                )}

                {/* Confirmed details row */}
                <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
                  {m.date && (
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
                        Confirmed Date
                      </p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{fmtDate(m.date)}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
                      Confirmed Duration
                    </p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a6e42" }}>60 minutes or more</p>
                  </div>
                </div>

                {m.notes && (
                  <div style={{ marginBottom: m.takeaways ? 14 : 0 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
                      Meeting Notes
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {m.notes}
                    </p>
                  </div>
                )}
                {m.takeaways && (
                  <div>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#2a7fd4" }}>
                      Key Takeaways
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {m.takeaways}
                    </p>
                  </div>
                )}
              </div>
              ); })}

            {/* Pending + Denied sessions — unified section */}
            {(pending.length > 0 || denied.length > 0) && (
              <div style={{ marginTop: verified.length > 0 ? 28 : 8 }}>
                {/* Session received notice */}
                <div style={{
                  background: "#f0f4ff", borderRadius: 10, border: "1px solid #c7d4f5",
                  padding: "16px 20px", marginBottom: 14,
                }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#2a3d8f" }}>
                    ✓ Session received — under review
                  </p>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#3d54a8", lineHeight: 1.6 }}>
                    Don't worry if these aren't getting checked off automatically — sessions without a Granola transcript or that were under 60 minutes are reviewed internally by the program team.
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#3d54a8", lineHeight: 1.6 }}>
                    If we need more information we'll contact you directly. If you believe a denied session is an error, contact{" "}
                    <a href="mailto:uplift@techunited.co" style={{ color: "#2a3d8f", fontWeight: 600, textDecoration: "none" }}>
                      uplift@techunited.co
                    </a>.
                  </p>
                </div>

                {/* Pending cards */}
                {pending.map((m, i) => (
                  <div key={m.id} style={{
                    background: "#fff", borderRadius: 12,
                    border: "1px solid #f0e8c8",
                    padding: "18px 22px", marginBottom: 12, opacity: 0.92,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "#f0e0a0",
                          color: "#7a5c00", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
                          Session {verified.length + i + 1}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{
                          background: "#eef1fb", color: "#3d54a8",
                          borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700,
                          border: "1px solid #c7d4f5",
                        }}>
                          Under review
                        </span>
                        {m.sixtyMin !== null && !m.sixtyMin && (
                          <span style={{
                            background: "#f5f5f5", color: "#555",
                            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500,
                          }}>
                            Session under 60 min — requires manual review
                          </span>
                        )}
                        {!m.notes?.trim() && (
                          <span style={{
                            background: "#f5f5f5", color: "#555",
                            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500,
                          }}>
                            No Granola transcript — requires manual review
                          </span>
                        )}
                      </div>
                    </div>
                    {m.date && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
                          Meeting Date
                        </p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{fmtDate(m.date)}</p>
                      </div>
                    )}
                    {m.takeaways && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#b38a00" }}>
                          Key Takeaways
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                          {m.takeaways}
                        </p>
                      </div>
                    )}
                    <p style={{ margin: "12px 0 0", fontSize: 10, color: "#c0b8d8", fontFamily: "monospace", letterSpacing: "0.03em" }}>
                      ID: {m.id}
                    </p>
                  </div>
                ))}

                {/* Denied cards — same layout, red number bubble + red badge */}
                {denied.map((m, i) => (
                  <div key={m.id} style={{
                    background: "#fff", borderRadius: 12,
                    border: "1px solid #f5c5c5",
                    padding: "18px 22px", marginBottom: 12, opacity: 0.9,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "#e74c3c", color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {verified.length + pending.length + i + 1}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
                          Session {verified.length + pending.length + i + 1}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{
                          background: "#fef0f0", color: "#8a1a1a",
                          borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700,
                          border: "1px solid #f5c5c5",
                        }}>
                          ✗ Denied
                        </span>
                        {m.sixtyMin !== null && (
                          <span style={{
                            background: m.sixtyMin ? "#e8f8f0" : "#fff3e0",
                            color: m.sixtyMin ? "#1a6e42" : "#b35c00",
                            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                          }}>
                            {m.sixtyMin ? "✓ 60+ min" : "Under 60 min"}
                          </span>
                        )}
                        {!m.notes?.trim() && (
                          <span style={{
                            background: "#fef0f0", color: "#c0392b",
                            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                          }}>
                            No transcript
                          </span>
                        )}
                      </div>
                    </div>
                    {m.date && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
                          Meeting Date
                        </p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1733" }}>{fmtDate(m.date)}</p>
                      </div>
                    )}
                    {m.notes?.trim() && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
                          Meeting Notes
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                          {m.notes}
                        </p>
                      </div>
                    )}
                    {m.takeaways && (
                      <div style={{ marginTop: 10 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
                          Key Takeaways
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                          {m.takeaways}
                        </p>
                      </div>
                    )}
                    <p style={{ margin: "12px 0 0", fontSize: 10, color: "#d4b8b8", fontFamily: "monospace", letterSpacing: "0.03em" }}>
                      ID: {m.id}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

    </div>
  );
}

// ─── Educational Sessions tab ─────────────────────────────────────────────────
function EduSessionsSection({ milestones, slug }) {
  const REQUIRED = 3;
  const completed = [milestones?.edu1, milestones?.edu2, milestones?.edu3].filter(Boolean).length;
  const pct = Math.min(Math.round((completed / REQUIRED) * 100), 100);
  const over = completed > REQUIRED ? completed - REQUIRED : 0;

  // All educational events across weeks
  const eduEvents = WEEKS.flatMap(w =>
    (w.events || [])
      .filter(e => e.name.includes("Expert") || e.name.includes("Industry") || e.name.includes("Peer Development") || e.name.includes("Pitch Without a Deck"))
      .map(e => ({ ...e, weekNum: w.num, weekLabel: w.label, dateRange: w.dateRange }))
  );

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0",
        padding: "18px 22px", marginBottom: 16,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#1a4a32" }}>
          👋 Hi there — thank you for participating in Uplift!
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#2d6e50", lineHeight: 1.7 }}>
          Educational session attendance is one of the few things that needs to be manually verified by our team. We appreciate your patience — if your attendance hasn't been updated within a week, please reach out to{" "}
          <a href="mailto:uplift@techunited.co" style={{ color: "#1a6e42", fontWeight: 600, textDecoration: "none" }}>
            uplift@techunited.co
          </a>{" "}
          and we'll get it sorted.
        </p>
      </div>

      {/* Open attendance notice */}
      <div style={{
        background: "linear-gradient(135deg, #f3f0ff 0%, #eef6ff 100%)",
        borderRadius: 12, border: "1px solid #d4cef5",
        padding: "18px 22px", marginBottom: 16,
        display: "flex", gap: 14, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🎟️</span>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
            All sessions are open to everyone
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.75 }}>
            You'll notice sessions are labeled by cohort — <strong>Edison, Hopper, Bardeen, Lawrence,</strong> and <strong>Morrison</strong> — but these are simply a way to group participants and help you build closer relationships with your peers. You are welcome and encouraged to attend <em>any and all</em> sessions across every cohort.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4a4060", lineHeight: 1.75 }}>
            Our speakers bring a wide range of expertise that's relevant to founders at every stage and in every industry. We also know that schedules are unpredictable — Uplift is designed to be accessible and work around your life. If a time works for you, show up. Every session you attend counts toward your 3 required educational sessions.
          </p>
        </div>
      </div>

      {/* Session format explainer */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
        padding: "18px 22px", marginBottom: 20,
      }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
          About our educational session formats
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              label: "Expert Insight",
              color: "#5c4eb5",
              bg: "#f3f0ff",
              desc: "A structured fireside chat or lecture centered on a specific topic. These sessions feature a guest speaker and are more presentation-driven — you can submit questions live, but the format is curated to maximize what you take away.",
            },
            {
              label: "Industry Q&A",
              color: "#2a7fd4",
              bg: "#f0f7ff",
              desc: "A more open and conversational session with a guest. There's still some light structure, but the emphasis is on real dialogue — you'll have a genuine opportunity to ask questions, share your perspective, and engage directly with the speaker.",
            },
            {
              label: "Peer Development",
              color: "#0f9d6e",
              bg: "#f0faf5",
              desc: "A hands-on workshop designed to sharpen your professional skills. These sessions may or may not feature a guest, but they always put you and your cohort at the center — expect active participation, discussion, and practical takeaways.",
            },
          ].map(({ label, color, bg, desc }) => (
            <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                background: bg, color, borderRadius: 6,
                padding: "3px 10px", fontSize: 11, fontWeight: 700,
                whiteSpace: "nowrap", marginTop: 2, flexShrink: 0,
              }}>
                {label}
              </span>
              <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress card */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        borderRadius: 14, padding: "22px 26px", marginBottom: 20, color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, opacity: 0.75 }}>Verified Sessions</p>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
              {pct}<span style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>%</span>
              {over > 0 && <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginLeft: 6 }}>+{over} bonus</span>}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, opacity: 0.75 }}>Toward goal</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              {Math.min(completed, REQUIRED)}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7 }}> / {REQUIRED}</span>
            </p>
          </div>
        </div>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 10 }}>
            <div style={{
              background: pct >= 100 ? "linear-gradient(90deg, #34d399, #10b981)" : "linear-gradient(90deg, #a78bfa, #60a5fa)",
              height: 10, borderRadius: 8, width: `${pct}%`,
              transition: "width 0.6s ease", minWidth: completed > 0 ? 10 : 0,
            }} />
          </div>
          {[33, 66].map(p => (
            <div key={p} style={{
              position: "absolute", top: 0, left: `${p}%`,
              width: 2, height: 10, background: "rgba(255,255,255,0.4)",
              transform: "translateX(-1px)",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Session 1</p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Session 2</p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Session 3</p>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11, opacity: 0.55, fontStyle: "italic", lineHeight: 1.5 }}>
          * Educational session attendance is verified manually by the program team and updated every Tuesday. Sessions pending review are not automatically reflected here — they may take additional time to be updated.
        </p>
      </div>

      {/* Milestone checkmarks */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {[
          { key: "edu1", label: "Educational Session 1" },
          { key: "edu2", label: "Educational Session 2" },
          { key: "edu3", label: "Educational Session 3" },
        ].map(({ key, label }) => {
          const done = !!milestones?.[key];
          return (
            <div key={key} style={{
              flex: 1, background: done ? "#e8f8f0" : "#fafafa",
              border: done ? "1px solid #b8e8d0" : "1px solid #e8e4f5",
              borderRadius: 10, padding: "12px 14px", textAlign: "center",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 20 }}>{done ? "✅" : "⬜"}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: done ? "#1a6e42" : "#9b8fcf" }}>{label}</p>
            </div>
          );
        })}
      </div>

      {/* Upcoming educational events */}
      <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>Program Educational Events</p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b6480", lineHeight: 1.6 }}>
        Attend any Expert Insight, Industry Q&amp;A, or Peer Development session to earn credit. Contact{" "}
        <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>
          uplift@techunited.co
        </a>{" "}
        if your attendance isn't reflected after a Tuesday update.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {eduEvents.map((ev, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
            padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>{ev.name}</p>
              <p style={{ margin: "0 0 2px", fontSize: 12, color: "#9b8fcf" }}>
                {ev.weekLabel} · {ev.day}{ev.time ? `, ${ev.time}` : ""} · {ev.format}
              </p>
              {ev.speaker && (
                <p style={{ margin: 0, fontSize: 12, color: "#6b6480" }}>
                  Featuring:{" "}
                  {ev.speaker.linkedin ? (
                    <a href={ev.speaker.linkedin} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>
                      {ev.speaker.name} ↗
                    </a>
                  ) : (
                    <span style={{ fontWeight: 600, color: "#1a1733" }}>{ev.speaker.name}</span>
                  )}
                </p>
              )}
            </div>
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 12, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0,
              }}>
                Register →
              </a>
            )}
          </div>
        ))}
      </div>

      {/* ─── Event Attendance log ─────────────────────────────────────── */}
      <div style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid #e8e4f5" }}>
        <LumaAttendanceSection slug={slug} />
      </div>
    </div>
  );
}

// ─── Goals tab ────────────────────────────────────────────────────────────────
function GoalsSection({ mentee, slug }) {
  const [responses, setResponses] = useState({});
  const [weeklyFocus, setWeeklyFocus] = useState({});

  useEffect(() => {
    const keys = {
      // Week 1
      primary_refine:   `${slug}_w1_primary_refine`,
      secondary_refine: `${slug}_w1_secondary_refine`,
      w1_q0:            `${slug}_w1_b0_q0`,
      w1_q1:            `${slug}_w1_b0_q1`,
      w1_q2:            `${slug}_w1_b0_q2`,
      // Week 2
      w2_prep_q1:       `${slug}_w2_prep_q1`,
      w2_prep_q2:       `${slug}_w2_prep_q2`,
      w2_prep_q3:       `${slug}_w2_prep_q3`,
      // Week 3
      w3_role_model:    `${slug}_w3_role_model`,
      w3_deploy_tactic: `${slug}_w3_deploy_tactic`,
      w3_win:           `${slug}_w3_win`,
    };
    const loaded = {};
    for (const [k, storageKey] of Object.entries(keys)) {
      const val = localStorage.getItem(storageKey) || "";
      if (val.trim()) loaded[k] = val.trim();
    }
    setResponses(loaded);

    // Load weekly focus for all 9 weeks
    const focus = {};
    for (let w = 1; w <= 9; w++) {
      const val = localStorage.getItem(`${slug}_w${w}_weekly_focus`) || "";
      if (val.trim()) focus[w] = val.trim();
    }
    setWeeklyFocus(focus);
  }, [slug]);

  const hasAnyResponse = Object.values(responses).some(v => v.trim()) || Object.values(weeklyFocus).some(v => v);

  return (
    <div>
      {/* Primary goal */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        borderRadius: 14, padding: "28px 32px", color: "#fff", marginBottom: 20,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65 }}>
          ⭐ Primary goal this summer
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>
          {mentee.primaryFocus}
        </p>
        {mentee.secondaryFoci && mentee.secondaryFoci.length > 0 && (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.65 }}>
              Secondary focus areas
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {mentee.secondaryFoci.map((f, i) => (
                <span key={i} style={{
                  background: "rgba(255,255,255,0.15)", borderRadius: 20,
                  padding: "5px 14px", fontSize: 13, fontWeight: 500,
                }}>
                  {f}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Weekly focus entries */}
      {Object.keys(weeklyFocus).length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "22px 26px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5c4eb5" }}>
            🎯 Weekly Focus
          </p>
          {WEEKS.filter(w => weeklyFocus[w.num]).map((w, i, arr) => (
            <div key={w.num} style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 600, color: "#6b6480" }}>
                Week {w.num} — {w.title}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>
                {weeklyFocus[w.num]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Written goals from Week 1 */}
      {responses.primary_refine && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "22px 26px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5c4eb5" }}>
            What real progress looks like by August
          </p>
          <p style={{ margin: 0, fontSize: 15, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {responses.primary_refine}
          </p>
        </div>
      )}

      {responses.secondary_refine && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "22px 26px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2a7fd4" }}>
            Moving the needle on secondary focus
          </p>
          <p style={{ margin: 0, fontSize: 15, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {responses.secondary_refine}
          </p>
        </div>
      )}

      {/* Week 1 prompt block responses */}
      {(responses.w1_q0 || responses.w1_q1 || responses.w1_q2) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "22px 26px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
            Week 1 — Pre-Meeting Reflections
          </p>
          {[
            { key: "w1_q0", q: "Who is your ideal first customer, and why?" },
            { key: "w1_q1", q: "What does your current customer acquisition process look like?" },
            { key: "w1_q2", q: "What assumptions about your market have you not yet tested?" },
          ].filter(item => responses[item.key]).map((item, i, arr) => (
            <div key={item.key} style={{ marginBottom: i < arr.length - 1 ? 20 : 0 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#6b6480" }}>{item.q}</p>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{responses[item.key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Week 2 pre-meeting prep */}
      {(responses.w2_prep_q1 || responses.w2_prep_q2 || responses.w2_prep_q3) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "22px 26px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
            Week 2 — Before Your First Mentor Meeting
          </p>
          {[
            { key: "w2_prep_q1", q: "What's the single most important thing you want your mentor to understand about your company?" },
            { key: "w2_prep_q2", q: "What's one decision you're currently stuck on that you'd love an outside perspective on?" },
            { key: "w2_prep_q3", q: "What would make this first meeting feel like a success to you?" },
          ].filter(item => responses[item.key]).map((item, i, arr) => (
            <div key={item.key} style={{ marginBottom: i < arr.length - 1 ? 20 : 0 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#6b6480" }}>{item.q}</p>
              <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{responses[item.key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Week 3 reflections */}
      {(responses.w3_win || responses.w3_role_model || responses.w3_deploy_tactic) && (
        <div style={{ borderRadius: 12, border: "1px solid #e8e4f5", overflow: "hidden", marginBottom: 16 }}>
          {responses.w3_win && (
            <div style={{ background: "linear-gradient(135deg, #fef9e7 0%, #fffde7 100%)", borderBottom: "1px solid #f9d94a", padding: "16px 22px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b7a00" }}>
                🏆 Week 3 — Win Shared with the Group
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#5a3e00", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{responses.w3_win}</p>
            </div>
          )}
          {(responses.w3_role_model || responses.w3_deploy_tactic) && (
            <div style={{ background: "#fff", padding: "16px 22px" }}>
              <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
                Week 3 — Building With Intention
              </p>
              {[
                { key: "w3_role_model",    q: "Who do you want to build like?" },
                { key: "w3_deploy_tactic", q: "What's one thing they're doing that you could deploy this week?" },
              ].filter(item => responses[item.key]).map((item, i, arr) => (
                <div key={item.key} style={{ marginBottom: i < arr.length - 1 ? 20 : 0 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#6b6480" }}>{item.q}</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{responses[item.key]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasAnyResponse && (
        <div style={{
          background: "#fafafa", borderRadius: 12, border: "1px dashed #d4d0e8",
          padding: "32px 28px", textAlign: "center",
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#6b6480" }}>
            No reflections yet
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", lineHeight: 1.6 }}>
            Head to <strong>My Journey</strong> to fill in your weekly focus and reflections — they'll appear here once saved.
          </p>
        </div>
      )}

      <p style={{ margin: "16px 0 0", fontSize: 11, color: "#c0b8d8", fontStyle: "italic", textAlign: "right" }}>
        Goals reflect your application responses. Reflections are pulled from Week 1.
      </p>
    </div>
  );
}

// ─── Milestone check section ──────────────────────────────────────────────────
function parseDueDate(dueStr) {
  if (!dueStr) return null;
  const cleaned = dueStr.replace(/^By\s+/i, "").trim();
  const d = new Date(`${cleaned} 2026`);
  return isNaN(d.getTime()) ? null : d;
}

function MilestoneSection({ milestones, onNavigate, slug }) {
  const isHolding = HOLDING_SLUGS.has(slug);
  const isLateMatch = LATE_MATCH_SLUGS.has(slug);
  const items = [
    { key: "participation",   label: "Confirmed Participation",        auto: true, due: "By Jun 3",  week: 1 },
    { key: "onboarding",      label: "Onboarding Session Attended",  due: "By Jun 7",  contactMsg: "If you haven't attended an onboarding session yet, please reach out to us directly — we can help get you sorted." },
    { key: "mentorMatched",   label: "Matched with a Mentor",        due: isHolding ? "By Jun 16" : "By Jun 9",  contactMsg: "If you haven't been matched with a mentor yet, it likely means we don't have you recorded for an onboarding session. Please contact us directly so we can help." },
    { key: "edu1",            label: "Educational Session 1",                       due: "By Aug 4",  week: 2 },
    { key: "edu2",            label: "Educational Session 2",                       due: "By Aug 4",  week: 3 },
    { key: "edu3",            label: "Educational Session 3",                       due: "By Aug 4",  week: 8 },
    { key: "mentorSession1",  label: "Mentor Session 1",                            due: isLateMatch ? "By Jun 30" : isHolding ? "By Jun 23" : "By Jun 13", week: 2 },
    { key: "mentorSession2",  label: "Mentor Session 2",                            due: isLateMatch ? "By Jul 11" : "By Jul 4",  week: 5 },
    { key: "mentorSession3",  label: "Mentor Session 3",                            due: isLateMatch ? "By Jul 25" : "By Jul 18", week: 7 },
    { key: "midpoint",        label: "Midpoint Meetup Attended",                    due: "Jun 23",    week: 4 },
    { key: "endSurvey",       label: "End of Program Survey Completed",             due: "By Jul 25", week: 8 },
    { key: "summit",          label: "Summit & Graduation Attended",                due: "Aug 4",     week: 9 },
    { key: "certificate",     label: "Certificate Received" },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completed = items.filter((i) => milestones[i.key]).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div>
      {/* Progress summary card */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        borderRadius: 14, padding: "22px 26px", marginBottom: 20, color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, opacity: 0.75 }}>
              Overall Progress
            </p>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
              {pct}<span style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>%</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, opacity: 0.75 }}>Completed</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              {completed}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7 }}> / {total}</span>
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 10 }}>
          <div style={{
            background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
            height: 10, borderRadius: 8,
            width: `${pct}%`,
            transition: "width 0.6s ease",
            minWidth: pct > 0 ? 10 : 0,
          }} />
        </div>
      </div>

      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#9b8fcf" }}>
        Milestones are manually confirmed by a TechUnited team member every Tuesday. No action needed from you — they'll update automatically. If something seems wrong here, please contact{" "}
        <a href="mailto:uplift@techunited.co" style={{ color: "#9b8fcf", fontWeight: 600 }}>uplift@techunited.co</a>.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => {
          const done = !!milestones[item.key];
          const dueDate = parseDueDate(item.due);
          const overdue = !done && dueDate && today > dueDate;
          const daysPastDue = overdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
          const severelyOverdue = daysPastDue > 5;
          return (
            <div key={item.key} style={{
              background: severelyOverdue ? "#fff5f5" : overdue ? "#fffbf5" : "#fff",
              borderRadius: 12,
              border: done ? "1px solid #b8e8d0" : severelyOverdue ? "1px solid #f5a0a0" : overdue ? "1px solid #f5c97a" : "1px solid #e8e4f5",
              padding: "14px 20px",
              display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#22a366" : severelyOverdue ? "#fee2e2" : overdue ? "#fef3c7" : "#f0ecff",
                color: done ? "#fff" : severelyOverdue ? "#c0392b" : overdue ? "#b45309" : "#c0b8d8",
                fontSize: done ? 14 : overdue ? 15 : 18,
                fontWeight: 700,
                marginTop: 2,
              }}>
                {done ? "✓" : overdue ? "!" : "○"}
              </div>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 15, fontWeight: done ? 600 : 400,
                  color: done ? "#1a4a32" : severelyOverdue ? "#c0392b" : overdue ? "#92400e" : "#6b6480",
                }}>
                  {item.label}
                </span>
                {item.due && (
                  <span style={{ fontSize: 11, fontStyle: "italic", color: done ? "#6abf97" : overdue ? "#d97706" : "#b0a8cc" }}>
                    {item.due}
                  </span>
                )}
                {overdue && (item.week || item.contactMsg) && (
                  <span style={{ marginTop: 4, fontSize: 12, color: severelyOverdue ? "#c0392b" : "#b45309", lineHeight: 1.6 }}>
                    ⚠️ This is past due.{" "}
                    {item.contactMsg ? (
                      <>
                        {item.contactMsg}{" "}
                        <a href="mailto:uplift@techunited.co" style={{ color: "#b45309", fontWeight: 700 }}>
                          uplift@techunited.co
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={() => onNavigate && onNavigate(item.week)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          color: severelyOverdue ? "#c0392b" : "#b45309", fontWeight: 700, fontSize: 12,
                          cursor: "pointer", textDecoration: "underline",
                          fontFamily: "inherit",
                        }}
                      >
                        Visit Week {item.week} in My Journey →
                      </button>
                    )}
                  </span>
                )}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {done && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#22a366", background: "#f0faf5", borderRadius: 4, padding: "2px 8px" }}>
                    COMPLETED
                  </span>
                )}
                {severelyOverdue && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#c0392b", background: "#fee2e2", borderRadius: 4, padding: "2px 8px" }}>
                    OVERDUE · {daysPastDue}d past due
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar section ─────────────────────────────────────────────────────────
function CalendarSection({ milestones = {} }) {
  // Map week number → the milestone key that marks it "done"
  const WEEK_MILESTONE = {
    1: "onboarding",
    2: "mentorSession1",
    4: "midpoint",
    5: "mentorSession2",
    7: "mentorSession3",
    8: "endSurvey",
    9: "summit",
  };

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: "#6b6480" }}>
        All program sessions and milestones across the 9-week Uplift Summer 2026 schedule.
      </p>

      {/* Open attendance notice */}
      <div style={{
        background: "linear-gradient(135deg, #f3f0ff 0%, #eef6ff 100%)",
        borderRadius: 12, border: "1px solid #d4cef5",
        padding: "18px 22px", marginBottom: 16,
        display: "flex", gap: 14, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🎟️</span>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
            All sessions are open to everyone
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.75 }}>
            You'll notice sessions are labeled by cohort — <strong>Edison, Hopper, Bardeen, Lawrence,</strong> and <strong>Morrison</strong> — but these are simply a way to group participants and help you build closer relationships with your peers. You are welcome and encouraged to attend <em>any and all</em> sessions across every cohort.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4a4060", lineHeight: 1.75 }}>
            Our speakers bring a wide range of expertise that's relevant to founders at every stage and in every industry — no session is off-limits based on your cohort. We also know that schedules are unpredictable. Uplift is designed to be accessible and work around your life, which means you should never have to miss a session just because it's labeled for a different group. If a time works for you, show up.
          </p>
        </div>
      </div>

      {/* Session format explainer */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
        padding: "18px 22px", marginBottom: 20,
      }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
          About our session formats
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              label: "Expert Insight",
              color: "#5c4eb5",
              bg: "#f3f0ff",
              desc: "A structured fireside chat or lecture centered on a specific topic. These sessions feature a guest speaker and are more presentation-driven — you can submit questions live, but the format is curated to maximize what you take away.",
            },
            {
              label: "Industry Q&A",
              color: "#2a7fd4",
              bg: "#f0f7ff",
              desc: "A more open and conversational session with a guest. There's still some light structure, but the emphasis is on real dialogue — you'll have a genuine opportunity to ask questions, share your perspective, and engage directly with the speaker.",
            },
            {
              label: "Peer Development",
              color: "#0f9d6e",
              bg: "#f0faf5",
              desc: "A hands-on workshop designed to sharpen your professional skills. These sessions may or may not feature a guest, but they always put you and your cohort at the center — expect active participation, discussion, and practical takeaways.",
            },
          ].map(({ label, color, bg, desc }) => (
            <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                background: bg, color, borderRadius: 6,
                padding: "3px 10px", fontSize: 11, fontWeight: 700,
                whiteSpace: "nowrap", marginTop: 2, flexShrink: 0,
              }}>
                {label}
              </span>
              <p style={{ margin: 0, fontSize: 13, color: "#4a4060", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {WEEKS.map((week) => {
        const milestoneKey = WEEK_MILESTONE[week.num];
        const isCompleted = milestoneKey && !!milestones[milestoneKey];
        return (
        <div key={week.num} style={{
          background: "#fff", borderRadius: 12,
          border: isCompleted ? "1px solid #b8e8d0" : "1px solid #e8e4f5",
          padding: "20px 24px", marginBottom: 14,
          position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
              WEEK {week.num} · {week.dateRange}
            </span>
            {week.taglineType === "warning" && (
              <span style={{ background: "#fff0f0", color: "#c00", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>IMPORTANT</span>
            )}
            {isCompleted && (
              <span style={{
                marginLeft: "auto",
                background: "#e6f9ef", color: "#1a7a4a",
                borderRadius: 6, padding: "3px 10px",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                display: "flex", alignItems: "center", gap: 4,
                flexShrink: 0,
              }}>
                ✓ Completed
              </span>
            )}
          </div>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#1a1733" }}>{week.title}</p>
          {week.tagline && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b6480", fontStyle: "italic", lineHeight: 1.5 }}>{week.tagline}</p>
          )}
          {week.events && week.events.length > 0 ? (
            <div style={{ borderTop: "1px solid #f5f3ff", paddingTop: 10 }}>
              {week.events.map((ev, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: i < week.events.length - 1 ? "1px solid #fafafa" : "none" }}>
                  <div style={{ width: 15, height: 15, border: "1.5px solid #c0b8d8", borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1733" }}>{ev.name}</span>
                      {ev.required && (
                        <span style={{ background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>REQUIRED</span>
                      )}
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9b8fcf" }}>
                      {ev.day}{ev.time ? `, ${ev.time}` : ""} · {ev.format}
                    </p>
                    {ev.speaker && (
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b6480" }}>
                        Featuring:{" "}
                        {ev.speaker.linkedin ? (
                          <a href={ev.speaker.linkedin} target="_blank" rel="noopener noreferrer"
                            style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>
                            {ev.speaker.name} ↗
                          </a>
                        ) : (
                          <span style={{ fontWeight: 600, color: "#1a1733" }}>{ev.speaker.name}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0, marginTop: 2 }}>Register on Luma →</a>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#c0b8d8", fontStyle: "italic" }}>No group sessions this week.</p>
          )}
          {week.submitLabel && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f5f3ff" }}>
              <a href="https://form.typeform.com/to/e0L62296" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: week.submitPrimary ? "#5c4eb5" : "#9a7200", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                {week.submitLabel} →
              </a>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ─── Resources section ────────────────────────────────────────────────────────
function ResourcesSection({ slug, menteeName }) {
  const storageKey = `${slug}_resource_favorites`;
  const [favorites, setFavorites] = useState([]);
  const [communityResources, setCommunityResources] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setFavorites(JSON.parse(saved));
    } catch (_) {}
  }, [storageKey]);

  useEffect(() => {
    fetch("/api/community-resources")
      .then(r => r.json())
      .then(d => { if (d.resources?.length) setCommunityResources(d.resources); })
      .catch(() => {});
  }, []);

  const toggleFavorite = (itemKey) => {
    setFavorites(prev => {
      const next = prev.includes(itemKey)
        ? prev.filter(k => k !== itemKey)
        : [...prev, itemKey];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const trackClick = (title, url) => {
    fetch("/api/track-resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: menteeName, title, url }),
    }).catch(() => {});
  };

  // Collect all items across categories
  const allItems = RESOURCES.flatMap(cat =>
    cat.items.map(item => ({ ...item, _key: `${cat.category}::${item.title}` }))
  );
  const favoriteItems = allItems.filter(item => favorites.includes(item._key));

  const ResourceRow = ({ item, showHeart = true }) => {
    const itemKey = item._key;
    const isDisabled = item.locked || item.comingSoon;
    const isFav = favorites.includes(itemKey);
    const Tag = isDisabled ? "div" : "a";
    const extraProps = isDisabled ? {} : { href: item.url, target: "_blank", rel: "noopener noreferrer" };
    return (
      <Tag {...extraProps}
        onClick={isDisabled ? undefined : () => trackClick(item.title, item.url)}
        style={{
          background: isDisabled ? "#fafafa" : "#fff",
          borderRadius: 10,
          border: `1px solid ${isDisabled ? "#ede9f8" : "#e8e4f5"}`,
          padding: "14px 18px", display: "flex", justifyContent: "space-between",
          alignItems: "center", textDecoration: "none", gap: 12,
          opacity: isDisabled ? 0.7 : 1,
          cursor: isDisabled ? "default" : "pointer",
          position: "relative",
        }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: isDisabled ? "#6b6183" : "#1a1733" }}>{item.title}</p>
            {item.locked && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf", background: "#f0ecff", borderRadius: 4, padding: "2px 7px" }}>
                🔒 {item.lockedLabel || "Locked"}
              </span>
            )}
            {item.comingSoon && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf", background: "#f0ecff", borderRadius: 4, padding: "2px 7px" }}>
                Coming soon
              </span>
            )}
            {item.star && <span style={{ fontSize: 13 }}>⭐</span>}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf" }}>{item.description}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {showHeart && !isDisabled && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(itemKey); }}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
                fontSize: 16, lineHeight: 1, color: isFav ? "#e74c3c" : "#c0b8d8",
                transition: "color 0.15s", flexShrink: 0,
              }}
            >
              {isFav ? "❤️" : "🤍"}
            </button>
          )}
          <span style={{ fontSize: 14, color: isDisabled ? "#c4b8e8" : "#5c4eb5" }}>→</span>
        </div>
      </Tag>
    );
  };

  return (
    <div>
      {/* Pro tip */}
      <p style={{ margin: "0 0 20px", fontSize: 12, color: "#b0a8cc", fontStyle: "italic" }}>
        💡 Pro tip — heart any resource below to instantly pin it to your own Favorites section at the top.
      </p>

      {/* My Favorites */}
      {favoriteItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#e74c3c" }}>
            ❤️ My Favorites
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {favoriteItems.map((item, i) => (
              <ResourceRow key={i} item={item} showHeart={true} />
            ))}
          </div>
        </div>
      )}

      {/* All categories */}
      {RESOURCES.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            {cat.category}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {cat.items.map((item, i) => (
              <ResourceRow key={i} item={{ ...item, _key: `${cat.category}::${item.title}` }} showHeart={true} />
            ))}
          </div>
        </div>
      ))}

      {/* Mentor-submitted community resources */}
      {communityResources.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            From Your Mentors
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {communityResources.map((item, i) => (
              <ResourceRow key={i} item={{
                title: item.title,
                url: item.url || "#",
                description: item.note || item.type,
                _key: `community::${item.title}`,
              }} showHeart={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Emails section ───────────────────────────────────────────────────────────
function EmailsSection() {
  const [expanded, setExpanded] = useState(null);

  const tagColors = {
    "Welcome":        { bg: "#f0ecff", color: "#5c4eb5" },
    "Program Info":   { bg: "#e8f4ff", color: "#2a7fd4" },
    "Action Required":{ bg: "#fff3e0", color: "#b35c00" },
    "Mentor Match":   { bg: "#f0faf5", color: "#22a366" },
  };

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: "#6b6480" }}>
        All program communications sent to your cohort.
      </p>
      {PROGRAM_EMAILS.map((email) => {
        const tagStyle = tagColors[email.tag] || { bg: "#f5f3ff", color: "#5c4eb5" };
        const isOpen = expanded === email.id;
        return (
          <div key={email.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", marginBottom: 10, overflow: "hidden" }}>
            <button
              onClick={() => setExpanded(isOpen ? null : email.id)}
              style={{
                width: "100%", padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 12,
                background: "none", border: "none", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#9b8fcf" }}>{email.date}</span>
                  <span style={{ background: tagStyle.bg, color: tagStyle.color, borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                    {email.tag}
                  </span>
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#1a1733" }}>{email.subject}</p>
              </div>
              <span style={{
                fontSize: 16, color: "#9b8fcf", flexShrink: 0,
                transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s",
              }}>
                ↓
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f5f3ff" }}>
                <div style={{ paddingTop: 14, fontSize: 14, color: "#3a3550", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {email.body}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Profile / About Me section ───────────────────────────────────────────────
function FounderCard({ m, isSelf }) {
  const mi = `${m.first[0]}${m.last.split(" ")[0][0]}`;
  const [selfLinkedin, setSelfLinkedin] = useState("");
  const [linkedinInput, setLinkedinInput] = useState("");
  const [linkedinSaved, setLinkedinSaved] = useState(false);

  useEffect(() => {
    if (!isSelf) return;
    const saved = localStorage.getItem(`${m.slug}_profile_linkedin`);
    if (saved) setSelfLinkedin(saved);
  }, [isSelf, m.slug]);

  const effectiveLinkedin = m.linkedin || selfLinkedin;

  // Profile completeness ring
  const fields = [m.photo, effectiveLinkedin, m.company, m.stage, m.industry, m.county];
  const filledCount = fields.filter(Boolean).length;
  const ringPct = filledCount / fields.length;
  const R = 14, STROKE = 3;
  const circ = 2 * Math.PI * (R - STROKE / 2);
  const dashOffset = circ * (1 - ringPct);

  const handleLinkedinSave = () => {
    const url = linkedinInput.trim();
    if (!url) return;
    localStorage.setItem(`${m.slug}_profile_linkedin`, url);
    setSelfLinkedin(url);
    persistToSheet(m.slug, 0, "linkedin_url", url, "LinkedIn URL");
    setLinkedinSaved(true);
    setTimeout(() => setLinkedinSaved(false), 3000);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: isSelf ? "2px solid #5c4eb5" : "1px solid #e8e4f5",
      padding: "16px 14px", textAlign: "center",
      position: "relative",
    }}>
      {/* Completeness ring — own card only */}
      {isSelf && (
        <div style={{ position: "absolute", top: 8, right: 8 }} title={`Profile ${Math.round(ringPct * 100)}% complete`}>
          <svg width={R * 2} height={R * 2}>
            <circle cx={R} cy={R} r={R - STROKE / 2} fill="none" stroke="#f0ecff" strokeWidth={STROKE} />
            <circle cx={R} cy={R} r={R - STROKE / 2} fill="none" stroke="#5c4eb5" strokeWidth={STROKE}
              strokeDasharray={circ} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform={`rotate(-90 ${R} ${R})`} />
            <text x={R} y={R + 3.5} textAnchor="middle" fill="#5c4eb5" fontSize={6} fontWeight="700">
              {Math.round(ringPct * 100)}%
            </text>
          </svg>
        </div>
      )}

      {m.photo ? (
        <img src={m.photo} alt={m.first} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }} />
      ) : (
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: isSelf
            ? "linear-gradient(135deg, #5c4eb5, #3d2f8a)"
            : "linear-gradient(135deg, #9b8fcf, #6b5fa5)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 18, margin: "0 auto 10px",
        }}>
          {mi}
        </div>
      )}
      {effectiveLinkedin ? (
        <a href={effectiveLinkedin} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontWeight: 700, fontSize: 13, color: "#1a1733", textDecoration: "none", marginBottom: 3 }}>
          {m.first} {m.last} ↗
        </a>
      ) : (
        <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 13, color: "#1a1733" }}>{m.first} {m.last}</p>
      )}
      <p style={{ margin: "0 0 3px", fontSize: 11, color: "#9b8fcf" }}>{m.company}</p>
      {m.county && (
        <p style={{ margin: "0 0 2px", fontSize: 10, color: "#b0a8cc" }}>📍 {m.county} Co., NJ</p>
      )}
      {m.stage && <p style={{ margin: "0 0 1px", fontSize: 10, color: "#b0a8cc" }}>{m.stage}</p>}
      {m.industry && <p style={{ margin: 0, fontSize: 10, color: "#b0a8cc" }}>{m.industry}</p>}
      {isSelf && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#5c4eb5", fontWeight: 700 }}>YOU</p>}

      {/* LinkedIn self-entry — own card, no LinkedIn on file */}
      {isSelf && !effectiveLinkedin && (
        <div style={{ marginTop: 10, borderTop: "1px solid #f0ecff", paddingTop: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, color: "#9b8fcf" }}>Add your LinkedIn ↓</p>
          <input
            type="url"
            value={linkedinInput}
            onChange={e => setLinkedinInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLinkedinSave()}
            placeholder="linkedin.com/in/yourname"
            style={{
              width: "100%", fontSize: 10, padding: "5px 7px",
              borderRadius: 5, border: "1px solid #d4d0e8",
              boxSizing: "border-box", fontFamily: "inherit", marginBottom: 5,
              outline: "none",
            }}
          />
          <button
            onClick={handleLinkedinSave}
            style={{
              width: "100%", fontSize: 10, padding: "5px 0",
              borderRadius: 5, border: "none",
              background: linkedinSaved ? "#22a366" : "#5c4eb5",
              color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            {linkedinSaved ? "✓ Saved!" : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileSection({ mentee, slug, cohortMates, allCohortMembers }) {
  const [browseTab, setBrowseTab] = useState(null);
  const initials = `${mentee.first[0]}${mentee.last.split(" ")[0][0]}`;
  const myCohort = COHORTS.find((c) => c.num === mentee.cohort);
  const otherCohorts = COHORTS.filter((c) => c.num !== mentee.cohort);

  // Default browse tab to first other cohort
  const activeBrowse = browseTab ?? otherCohorts[0]?.num;

  return (
    <div>
      {/* Cohort namesake banner */}
      {myCohort && (
        <div style={{
          background: "linear-gradient(135deg, #3d2f8a 0%, #5c4eb5 100%)",
          borderRadius: 14, padding: "22px 28px", marginBottom: 24, color: "#fff",
        }}>
          <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65 }}>
            Cohort {myCohort.num} — {myCohort.name}
          </p>
          <p style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700 }}>{myCohort.namesake}</p>
          <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>{myCohort.bio}</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
            <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Why this cohort carries that name</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>{myCohort.why}</p>
          </div>
        </div>
      )}

      {/* Profile card */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5",
        padding: "24px 28px", marginBottom: 24,
        display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start",
      }}>
        {mentee.photo ? (
          <img src={mentee.photo} alt={`${mentee.first} ${mentee.last}`} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 28,
          }}>
            {initials}
          </div>
        )}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            {mentee.linkedin ? (
              <a href={mentee.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 22, color: "#1a1733", textDecoration: "none" }}>
                {mentee.first} {mentee.last} ↗
              </a>
            ) : (
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1733" }}>{mentee.first} {mentee.last}</h2>
            )}
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 15, color: "#6b6480" }}>{mentee.company}</p>
          {mentee.county && <p style={{ margin: "0 0 10px", fontSize: 13, color: "#9b8fcf" }}>📍 {mentee.county} County, NJ</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ background: "#f0ecff", color: "#5c4eb5", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>{mentee.stage}</span>
            <span style={{ background: "#e8f4ff", color: "#2a7fd4", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>{mentee.industry}</span>
            <span style={{ background: "#f0faf5", color: "#22a366", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>Cohort {mentee.cohort} — {myCohort?.name}</span>
          </div>
        </div>
      </div>

      {/* Cohort directory — own cohort */}
      <p style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>
        Cohort {mentee.cohort} — {myCohort?.name} — Your Fellow Founders
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 40 }}>
        {cohortMates.map((m) => (
          <FounderCard key={m.slug} m={m} isSelf={m.slug === slug} />
        ))}
      </div>

      {/* Browse other cohorts */}
      <div style={{ borderTop: "2px solid #e8e4f5", paddingTop: 32 }}>
        <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>Browse Other Cohorts</p>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "#9b8fcf" }}>
          Explore all 5 cohorts building this summer across New Jersey.
        </p>

        {/* Cohort tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {otherCohorts.map((c) => (
            <button
              key={c.num}
              onClick={() => setBrowseTab(c.num)}
              style={{
                padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
                background: activeBrowse === c.num ? "#5c4eb5" : "#f0ecff",
                color: activeBrowse === c.num ? "#fff" : "#5c4eb5",
                border: `1.5px solid ${activeBrowse === c.num ? "#5c4eb5" : "#d4cff0"}`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Selected cohort info + grid */}
        {otherCohorts.filter((c) => c.num === activeBrowse).map((c) => {
          const members = (allCohortMembers || []).filter((m) => m.cohort === c.num);
          return (
            <div key={c.num}>
              <div style={{
                background: "#f8f7ff", borderRadius: 12, border: "1px solid #e8e4f5",
                padding: "18px 22px", marginBottom: 18,
              }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#5c4eb5" }}>
                  Cohort {c.num} — {c.namesake}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#3d2f8a", lineHeight: 1.6 }}>{c.bio}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b6480", lineHeight: 1.6, fontStyle: "italic" }}>{c.why}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                {members.map((m) => (
                  <FounderCard key={m.slug} m={m} isSelf={false} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Luma Attendance Section ─────────────────────────────────────────────────
function LumaAttendanceSection({ slug }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/luma-mentee-attendance?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => setAttendance(d.attendance || []))
      .catch(() => setAttendance([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const typeBadge = (type) => {
    const map = {
      onboarding:     { label: "Onboarding",       bg: "#e0f0ff", color: "#1a6fa8" },
      edu:            { label: "Expert Session",    bg: "#f0e8ff", color: "#5c4eb5" },
      peer_discussion:{ label: "Peer Discussion",  bg: "#e8f5ee", color: "#1a6e42" },
    };
    const t = map[type] || { label: "Event", bg: "#f0f0f4", color: "#6b6480" };
    return (
      <span style={{ background: t.bg, color: t.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
        {t.label}
      </span>
    );
  };

  const statusPill = (row) => {
    const { status, reviewStatus } = row;
    // Fully verified
    if (reviewStatus === "approved") return (
      <span style={{ background: "#e8f8f0", color: "#1a6e42", borderRadius: 4, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
        ✓ Verified
      </span>
    );
    // Denied / no-show
    if (reviewStatus === "denied" || reviewStatus === "no_show") return (
      <span style={{ background: "#fef0f0", color: "#c0392b", borderRadius: 4, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
        ✗ Not verified
      </span>
    );
    // Attended (joined virtual / checked in) but awaiting admin verification
    if (status === "checked_in") {
      const joinTime = row.joinedAt
        ? new Date(row.joinedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : null;
      return (
        <span style={{ background: "#fff8e1", color: "#b35c00", borderRadius: 4, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
          ⏳ Attended{joinTime ? ` · Joined ${joinTime}` : ""} · Pending verification
        </span>
      );
    }
    // Registered but not checked in (event may still be upcoming)
    return (
      <span style={{ background: "#f0eef8", color: "#6b6480", borderRadius: 4, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
        📌 Registered
      </span>
    );
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>Event Attendance</p>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: "#6b6480", lineHeight: 1.6 }}>
        A log of every Uplift event you've registered for or attended. Attendance is verified manually by the program team — you'll see the status update here once it's confirmed.
      </p>

      {loading ? (
        <div style={{ color: "#9b8fcf", fontSize: 14, padding: "16px 0" }}>Loading your attendance…</div>
      ) : attendance.length === 0 ? (
        <div style={{ background: "#f7f5ff", borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#9b8fcf" }}>No events recorded yet. Register for an upcoming session using the links in your weekly view.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {attendance.map((row, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8e4f5", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>{row.eventName}</p>
                {row.eventDate && <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf" }}>{fmtDate(row.eventDate)}</p>}
              </div>
              {typeBadge(row.eventType)}
              {statusPill(row)}
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: "20px 0 0", fontSize: 12, color: "#9b8fcf", lineHeight: 1.5 }}>
        ⏳ <strong>Pending verification</strong> means we have your attendance on record and are in the process of confirming it. This typically updates within a few days. Questions? Email <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", textDecoration: "none" }}>uplift@techunited.co</a>.
      </p>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function MenteePage({ menteeData, cohortMates, allCohortMembers }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("journey");
  const [activeWeek, setActiveWeek] = useState(() => {
    const today = new Date();
    const starts = [
      [1, "2026-06-01"], [2, "2026-06-08"], [3, "2026-06-15"],
      [4, "2026-06-22"], [5, "2026-06-29"], [6, "2026-07-06"],
      [7, "2026-07-13"], [8, "2026-07-19"], [9, "2026-07-27"],
    ];
    for (let i = starts.length - 1; i >= 0; i--) {
      if (today >= new Date(starts[i][1])) return starts[i][0];
    }
    return 1;
  });
  const [liveMilestones, setLiveMilestones] = useState(null);

  // Fetch live milestone data from Google Sheets on load
  useEffect(() => {
    if (!menteeData) return;
    fetch(`/api/milestones?slug=${menteeData.slug}`)
      .then((r) => r.json())
      .then((data) => { if (data.milestones) setLiveMilestones(data.milestones); })
      .catch(() => {});
  }, [menteeData]);

  if (!menteeData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 8 }}>🔍</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#1a1733" }}>Mentee not found</p>
          <p style={{ color: "#6b6480" }}>Double-check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const mentee = menteeData;
  const slug = mentee.slug;
  // Driven by live milestones (Admin tab "Unlock Mentor" checkbox) — falls back to static data
  const mentorUnlocked = liveMilestones?.mentorMatched ?? mentee.mentorUnlocked;
  const myCohortHeader = COHORTS.find((c) => c.num === mentee.cohort);

  useEffect(() => {
    const stored = sessionStorage.getItem(`auth_${slug}`);
    if (stored) setIsAuthenticated(true);
  }, [slug]);

  // Track portal visit once per browser session (fire-and-forget)
  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    const trackKey = `visit_tracked_${slug}`;
    if (sessionStorage.getItem(trackKey)) return;
    sessionStorage.setItem(trackKey, "1");
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: `${mentee.first} ${mentee.last}`.trim() }),
    }).catch(() => {});
  }, [isAuthenticated, slug]);

  // Cross-device sync: seed localStorage from Google Sheet on first login
  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    const syncKey = `synced_${slug}`;
    if (sessionStorage.getItem(syncKey)) return; // already synced this session
    sessionStorage.setItem(syncKey, "1");
    fetch(`/api/get-responses?slug=${slug}`)
      .then(r => r.json())
      .then(({ responses }) => {
        if (!responses) return;
        for (const [key, val] of Object.entries(responses)) {
          const storageKey = `${slug}_${key}`;
          // Only seed if not already set locally (don't overwrite local edits)
          if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, val);
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated, slug]);

  if (!isAuthenticated) {
    return <PasswordGate slug={slug} onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (liveMilestones?.churned) {
    return (
      <div style={{
        minHeight: "100vh", background: "#f7f5ff",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: "44px 48px",
          maxWidth: 420, width: "calc(100% - 48px)",
          boxShadow: "0 4px 32px rgba(92,78,181,0.12)", textAlign: "center",
        }}>
          <img src="/uplift-logo.png" alt="Uplift" style={{ height: 44, margin: "0 auto 24px", display: "block" }} />
          <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
          <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#1a1733" }}>
            Hi there, {mentee.first}
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 15, color: "#6b6480", lineHeight: 1.7 }}>
            We haven't heard from you in a while. To continue with the program, please reach out to us at:
          </p>
          <a
            href="mailto:uplift@techunited.co"
            style={{
              display: "inline-block", padding: "12px 28px", borderRadius: 8,
              background: "#5c4eb5", color: "#fff", fontWeight: 700,
              fontSize: 15, textDecoration: "none",
            }}
          >
            uplift@techunited.co
          </a>
        </div>
      </div>
    );
  }

  const primaryKey = getFocusKey(mentee.primaryFocus);
  const secondaryKey = mentee.secondaryFoci && mentee.secondaryFoci.length > 0
    ? getFocusKey(mentee.secondaryFoci[0]) : null;
  const stageKey =
    mentee.stage === "Idea stage" ? "founder-decisions"
    : mentee.stage?.includes("revenue") ? "operational-scaling"
    : "sounding-board";

  const promptBlocks = [
    PROMPTS[primaryKey] || PROMPTS["sounding-board"],
    PROMPTS[secondaryKey && secondaryKey !== primaryKey ? secondaryKey : "go-to-market"] || PROMPTS["go-to-market"],
    PROMPTS[stageKey !== primaryKey && stageKey !== secondaryKey ? stageKey : "nj-ecosystem"] || PROMPTS["nj-ecosystem"],
  ];

  const renderWeekContent = () => {
    if (activeWeek === "certificate") {
      return (
        <div style={{
          background: "#fff", borderRadius: 14, border: "2px dashed #d4d0e8",
          padding: "48px 32px", textAlign: "center", maxWidth: 520, margin: "0 auto",
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎓</div>
          <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1a1733" }}>
            Your Certificate
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#f0ecff", borderRadius: 20, padding: "4px 14px",
            fontSize: 12, fontWeight: 600, color: "#5c4eb5", marginBottom: 20,
          }}>
            🔒 Locked
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#6b6480", lineHeight: 1.8 }}>
            After completing your end-of-program report and receiving approval from the Uplift team, your certificate of completion will be available here to download.
          </p>
        </div>
      );
    }
    if (activeWeek === "wrapped") {
      return (
        <div style={{
          background: "linear-gradient(160deg, #0d0020 0%, #4a0077 38%, #b8005a 72%, #ff4b8b 100%)",
          borderRadius: 20, padding: "44px 28px 48px", color: "#fff",
          position: "relative", overflow: "hidden", textAlign: "center",
        }}>
          {/* Decorative orbs */}
          {[["18%","−5%",100],["82%","25%",60],["5%","65%",70],["88%","78%",45],["50%","88%",55]].map(([left, top, sz], i) => (
            <div key={i} style={{
              position: "absolute", left, top, width: sz, height: sz,
              borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none",
            }} />
          ))}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✨</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1 }}>
              Uplift Wrapped
            </h2>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.55 }}>
              Summer 2026
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 15, opacity: 0.8, lineHeight: 1.5 }}>
              Your summer, by the numbers.
            </p>

            {/* Lock badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.13)", borderRadius: 24,
              padding: "9px 22px", marginBottom: 36,
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              <span style={{ fontSize: 15 }}>🔒</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Unlocks after graduation · August 10th</span>
            </div>

            {/* Blurred preview cards */}
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.4 }}>
              A peek at what&apos;s inside
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
              {[
                { emoji: "💫", label: "Your Mood Journey",  preview: "Week-by-week pulse: the highs, the grinds, the breakthroughs." },
                { emoji: "🧠", label: "Your Founder Type",  preview: "We decoded your archetype from your reflections and goals." },
                { emoji: "🎯", label: "Your Top Themes",    preview: "What your summer was really about, in your own words." },
                { emoji: "👥", label: "Cohort Vibes",       preview: "How the whole cohort felt week by week. It gets good." },
              ].map((card, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.08)", borderRadius: 12,
                  padding: "16px 14px", textAlign: "left",
                  filter: "blur(3.5px)", userSelect: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 7 }}>{card.emoji}</div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700 }}>{card.label}</p>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>{card.preview}</p>
                </div>
              ))}
            </div>

            {/* Teaser copy */}
            <div style={{
              background: "rgba(255,255,255,0.07)", borderRadius: 14,
              padding: "20px 22px", textAlign: "left",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>What to expect</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.82, lineHeight: 1.8 }}>
                Some weeks you were moody. Some you were sky high. Some had strong takeaways — others you were deep in the grind. Based on every reflection, prompt response, mood check-in, and connection you made this summer, we&apos;ve built your personalized Uplift Wrapped — complete with your founder character type, the themes that defined your summer, cohort-wide patterns, and all the moments that made this program yours.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const week = WEEKS.find((w) => w.num === activeWeek);
    if (!week) return null;
    let weekContent;
    switch (week.type) {
      case "onboarding":
        weekContent = <Week1 mentee={mentee} slug={slug} prompts={promptBlocks} mentorUnlocked={mentorUnlocked}
          milestones={liveMilestones || mentee.milestones || {}}
          onParticipationAccepted={() => setLiveMilestones(prev => ({ ...(prev || mentee.milestones || {}), participation: true }))} />;
        break;
      case "mentor-meeting":
        weekContent = <Week2 mentee={mentee} slug={slug} mentorUnlocked={mentorUnlocked} holding={HOLDING_SLUGS.has(slug)} />;
        break;
      default:
        weekContent = <WeekReflection weekNum={week.num} slug={slug} prompts={promptBlocks} menteeName={`${mentee.first} ${mentee.last}`.trim()} />;
    }
    return (
      <>
        <WeeklyPulse slug={slug} weekNum={week.num} />
        {weekContent}
      </>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "journey": return renderWeekContent();
      case "calendar": return <CalendarSection milestones={liveMilestones || mentee.milestones || {}} />;
      case "resources": return <ResourcesSection slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />;
      case "milestones": return <MilestoneSection milestones={liveMilestones || mentee.milestones || {}} onNavigate={(week) => { setActiveTab("journey"); setActiveWeek(week); }} slug={slug} />;
      case "goals": return <GoalsSection mentee={mentee} slug={slug} />;
      case "meetings": return <MeetingsSection slug={slug} milestones={liveMilestones || mentee.milestones || {}} onMilestoneUpdate={(key) => setLiveMilestones(prev => ({ ...(prev || mentee.milestones || {}), [key]: true }))} />;
      case "edu": return <EduSessionsSection milestones={liveMilestones || mentee.milestones || {}} slug={slug} />;
      case "profile": return <ProfileSection mentee={mentee} slug={slug} cohortMates={cohortMates} allCohortMembers={allCohortMembers} />;
      case "support": return (
        <div style={{ maxWidth: 520 }}>
          <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>Need help?</p>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
            Email <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>uplift@techunited.co</a> with your support question and someone from our team will get back to you within 48 hours.
          </p>
        </div>
      );
      default: return null;
    }
  };

  const activeWeekData = WEEKS.find((w) => w.num === activeWeek);

  return (
    <>
      <Head>
        <title>{mentee.first} {mentee.last} · Uplift Summer 2026</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/uplift-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", padding: "28px 24px 24px", color: "#fff" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <img src="/uplift-logo-white.png" alt="Uplift" style={{ height: 36, marginBottom: 18, display: "block" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Cohort {mentee.cohort}{myCohortHeader ? ` — ${myCohortHeader.name}` : ""}
              </div>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Uplift Summer 2026
              </div>
              <div style={{ marginLeft: "auto" }}>
                <TabTooltip tip="Share any suggestions via this form" direction="down">
                  <a
                    href="https://form.typeform.com/to/tHKCNXhN"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(255,255,255,0.18)", borderRadius: 20,
                      padding: "5px 12px", fontSize: 12, fontWeight: 700,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
                      boxShadow: "0 0 0 1.5px rgba(255,255,255,0.75)",
                      display: "inline-block",
                    }}
                  >
                    💡 Make a Suggestion
                  </a>
                </TabTooltip>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
              {mentee.photo ? (
                <img
                  src={mentee.photo}
                  alt={mentee.first}
                  style={{
                    width: 64, height: 64, borderRadius: "50%", objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.4)", flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700,
                }}>
                  {mentee.first[0]}{mentee.last[0]}
                </div>
              )}
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
                {mentee.first} {mentee.last}
              </h1>
            </div>
            <p style={{ margin: "0 0 16px", opacity: 0.8, fontSize: 15 }}>
              {mentee.company} · {mentee.stage} · {mentee.industry}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13,
                }}>
                  {mentorUnlocked ? mentee.mentor.initials : "?"}
                </div>
                <div>
                  {mentorUnlocked ? (
                    <>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{mentee.mentor.name}</p>
                      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>{mentee.mentor.title}</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Mentor TBD</p>
                      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>Unlocks after onboarding week</p>
                    </>
                  )}
                </div>
              </div>

              {/* Utility nav — header links */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {TAB_ROW_2.map(id => {
                  const tab = PRIMARY_TABS.find(t => t.id === id);
                  const active = activeTab === id;
                  return (
                    <TabTooltip key={id} tip={tab.tip}>
                      <button
                        onClick={() => setActiveTab(id)}
                        style={{
                          padding: "5px 12px",
                          border: "1px solid rgba(255,255,255,0.3)",
                          borderRadius: 20,
                          background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                          color: "#fff",
                          fontSize: 12, fontWeight: active ? 700 : 500,
                          cursor: "pointer", whiteSpace: "nowrap",
                          fontFamily: "inherit",
                          transition: "background 0.15s",
                          opacity: active ? 1 : 0.85,
                        }}
                      >
                        {tab.label}
                      </button>
                    </TabTooltip>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Primary tab nav — personal tabs only */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e4f5", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
            {TAB_ROW_1.map(id => {
              const tab = PRIMARY_TABS.find(t => t.id === id);
              const active = activeTab === id;
              return (
                <TabTooltip key={id} tip={tab.tip} direction="down">
                  <button
                    onClick={() => setActiveTab(id)}
                    style={{
                      flex: "0 0 auto", padding: "13px 14px 11px",
                      border: "none", background: "none",
                      borderBottom: active ? "3px solid #5c4eb5" : "3px solid transparent",
                      color: active ? "#5c4eb5" : "#6b6480",
                      fontWeight: active ? 700 : 500,
                      fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                      fontFamily: "inherit", transition: "color 0.15s, border-color 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                </TabTooltip>
              );
            })}
          </div>
        </div>

        {/* Week sub-nav (only in journey tab) */}
        {activeTab === "journey" && (
          <div style={{ background: "#fff", borderBottom: "1px solid #f0ecff", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ display: "flex", maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
              {WEEKS.map((week) => {
                const active = activeWeek === week.num;
                return (
                  <button
                    key={week.num}
                    onClick={() => setActiveWeek(week.num)}
                    style={{
                      flex: "0 0 auto", padding: "10px 12px 8px",
                      border: "none", background: "none",
                      borderBottom: active ? "2px solid #9b8fcf" : "2px solid transparent",
                      color: active ? "#5c4eb5" : "#9b8fcf",
                      fontWeight: active ? 700 : 400,
                      fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                      fontFamily: "inherit", transition: "color 0.15s, border-color 0.15s",
                    }}
                  >
                    {week.label}
                  </button>
                );
              })}
              <button
                onClick={() => setActiveWeek("certificate")}
                style={{
                  flex: "0 0 auto", padding: "10px 12px 8px",
                  border: "none", background: "none",
                  borderBottom: activeWeek === "certificate" ? "2px solid #9b8fcf" : "2px solid transparent",
                  color: activeWeek === "certificate" ? "#5c4eb5" : "#9b8fcf",
                  fontWeight: activeWeek === "certificate" ? 700 : 400,
                  fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                  fontFamily: "inherit", transition: "color 0.15s, border-color 0.15s",
                }}
              >
                🎓 Certificate
              </button>
              <button
                onClick={() => setActiveWeek("wrapped")}
                style={{
                  flex: "0 0 auto", padding: "10px 12px 8px",
                  border: "none", background: "none",
                  borderBottom: activeWeek === "wrapped" ? "2px solid #c0006e" : "2px solid transparent",
                  color: activeWeek === "wrapped" ? "#c0006e" : "#9b8fcf",
                  fontWeight: activeWeek === "wrapped" ? 700 : 400,
                  fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                  fontFamily: "inherit", transition: "color 0.15s, border-color 0.15s",
                }}
              >
                <em>✨ Uplift Wrapped</em>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>
          {/* Section header */}
          {activeTab === "journey" && activeWeek === "certificate" && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1733" }}>
                Certificate of Completion
              </h2>
            </div>
          )}
          {activeTab === "journey" && activeWeek !== "certificate" && activeWeek !== "wrapped" && activeWeekData && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a1733" }}>
                {activeWeekData.title}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#9b8fcf" }}>{activeWeekData.dateRange}</p>
            </div>
          )}
          {activeTab !== "journey" && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a1733" }}>
                {PRIMARY_TABS.find(t => t.id === activeTab)?.label}
              </h2>
            </div>
          )}

          {renderTabContent()}
        </div>

        {/* Footer */}
        <div style={{ background: "#1a0e4f", padding: "20px 24px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          TechUnited:NJ · Uplift Summer 2026 · Your responses sync to Google Sheets
        </div>

      </div>
    </>
  );
}

// ─── Static generation ────────────────────────────────────────────────────────
export async function getStaticPaths() {
  const paths = MENTEES.map((m) => ({ params: { mentee: m.slug } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const mentee = getMenteeBySlug(params.mentee);
  if (!mentee) return { notFound: true };

  const directoryFields = (m) => ({
    slug: m.slug,
    first: m.first,
    last: m.last,
    company: m.company,
    cohort: m.cohort,
    stage: m.stage || null,
    industry: m.industry || null,
    county: m.county || null,
    linkedin: m.linkedin || null,
    photo: m.photo || null,
  });

  const TEST_SLUGS = ["kennedy", "jackie", "aaron", "mj"];

  const cohortMates = MENTEES
    .filter((m) => m.cohort === mentee.cohort && !TEST_SLUGS.includes(m.slug))
    .map(directoryFields);

  const allCohortMembers = MENTEES
    .filter((m) => m.cohort !== mentee.cohort && !TEST_SLUGS.includes(m.slug))
    .map(directoryFields);

  return { props: { menteeData: { ...mentee, milestones: mentee.milestones }, cohortMates, allCohortMembers } };
}
