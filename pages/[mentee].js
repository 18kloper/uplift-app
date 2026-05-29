import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import Head from "next/head";
import { getMenteeBySlug, MENTEES, PROMPTS, getFocusKey } from "../lib/mentees";
import { PROGRAM_EMAILS, RESOURCES, COHORTS } from "../lib/program-data";

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
      { name: "Onboarding — Bardeen", day: "Wed Jun 3", time: "12:30–1:15pm", format: "Virtual", url: "" },
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
      { name: "Expert Insight — Edison", day: "Mon Jun 8", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/vxnzwket" },
      { name: "Industry Q&A — Edison", day: "Fri Jun 12", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/0dh6bt4o" },
    ],
  },
  {
    num: 3, label: "Week 3", title: "Keep the Momentum", dateRange: "Jun 15–20",
    tagline: "We know everyone's schedules look different — by this time you should have met with your mentor for at least an hour. If you have not done so, this is an opportunity to catch up. If you have already done so, we encourage you to continue communication with your mentor and to attend one of this week's virtual sessions.",
    type: "reflection",
    events: [
      { name: "Expert Insight — Hopper", day: "Mon Jun 15", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/nj4xfgv6" },
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
      { name: "Industry Q&A — Hopper", day: "Fri Jun 26", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/e0sayfyh" },
    ],
  },
  {
    num: 5, label: "Week 5", title: "Deepen the Conversation", dateRange: "Jun 29–Jul 4",
    tagline: "All pairs should meet for an additional hour this week (total of 2 hours to date).",
    taglineType: "emphasis",
    type: "reflection",
    submitLabel: "Submit your 2nd mentor meeting",
    events: [
      { name: "Expert Insight — Bardeen", day: "Mon Jun 29", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/mvcaeaiu" },
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
      { name: "Expert Insight — Morrison", day: "Mon Jul 13", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/oh01c8fi" },
      { name: "Peer Development — Lawrence", day: "Tue Jul 14", time: "5:30–6:00pm", format: "Virtual", url: "https://lu.ma/jgqgpyvx" },
      { name: "Industry Q&A — Lawrence", day: "Fri Jul 17", time: "12:30–1:00pm", format: "Virtual", url: "https://lu.ma/ekk5ycbt" },
    ],
  },
  {
    num: 8, label: "Week 8", title: "Makeup Week + End Report", dateRange: "Jul 19–25",
    tagline: "Final makeup week before the Summit. Make sure you've completed your 3 hours with your mentor.",
    type: "reflection",
    submitLabel: "Submit your End Report (5 min)",
    submitPrimary: true,
    events: [],
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
  { id: "journey", label: "My Journey" },
  { id: "milestones", label: "Milestones" },
  { id: "calendar", label: "Calendar" },
  { id: "resources", label: "Resources" },
  { id: "profile", label: "Cohort Directory" },
  { id: "support", label: "Support" },
];

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
  const timerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setValue(saved);
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
      setTimeout(() => setStatus("idle"), 2000);
    }, 900);
  }, [storageKey, slug, weekNum, fieldKey, question]);

  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 8,
          border: "1.5px solid #d4d0e8", background: "#fafafa",
          fontSize: 15, lineHeight: 1.6, resize: "vertical",
          fontFamily: "inherit", boxSizing: "border-box", outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#5c4eb5")}
        onBlur={(e) => (e.target.style.borderColor = "#d4d0e8")}
      />
      {status !== "idle" && (
        <span style={{
          position: "absolute", bottom: 10, right: 12, fontSize: 11,
          color: status === "saved" ? "#22a366" : "#9b8fcf",
          fontWeight: 500, pointerEvents: "none",
        }}>
          {status === "saving" ? "Syncing…" : "✓ Synced"}
        </span>
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
function EventsSection({ events, submitLabel, submitPrimary, note, footerNote }) {
  const hasEvents = events && events.length > 0;
  if (!hasEvents && !submitLabel) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
      {note && (
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#5c4eb5", fontWeight: 600, background: "#f5f3ff", borderRadius: 6, padding: "8px 12px" }}>
          ℹ️ {note}
        </p>
      )}
      {hasEvents && (
        <>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
            This Week's Sessions
          </p>
          {events.map((ev, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
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
              </div>
              <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
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
function MentorCard({ mentee, revealed }) {
  if (!revealed) {
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
          Once we confirm your orientation attendance, your mentor will appear here automatically. No action needed from you — just attend and we'll take care of the rest.
        </p>
      </div>
    );
  }
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
      padding: "24px 28px", marginBottom: 24,
      display: "flex", alignItems: "flex-start", gap: 20,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 18, flexShrink: 0,
      }}>
        {mentee.mentor.initials}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 17, color: "#1a1733" }}>{mentee.mentor.name}</p>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#6b6480" }}>{mentee.mentor.title} · {mentee.mentor.company}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {mentee.mentor.tags.map((tag, i) => (
            <span key={i} style={{ background: "#f0ecff", color: "#5c4eb5", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>
              {tag}
            </span>
          ))}
        </div>
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
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
          margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26,
        }}>
          🔐
        </div>
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
function ParticipationWidget({ slug, onAccepted }) {
  const storageKey = `${slug}_participation`;
  const [choice, setChoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setChoice(saved);
  }, [storageKey]);

  const handleChoice = async (val) => {
    setSubmitting(true);
    localStorage.setItem(storageKey, val);
    setChoice(val);
    await persistToSheet(slug, 1, "participation", val, "Program participation confirmation");
    // Auto-check the participation milestone in the Dashboard + update portal state instantly
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
function Week1({ mentee, slug, prompts, mentorUnlocked, onParticipationAccepted }) {
  const week = WEEKS[0];
  const cohort = COHORTS.find((c) => c.num === mentee.cohort);
  return (
    <div>
      {/* Participation confirmation — above welcome banner */}
      <ParticipationWidget slug={slug} onAccepted={onParticipationAccepted} />

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

      <EventsSection events={week.events} note={week.note} footerNote="*You will only receive your mentor match after attending an onboarding session." />

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
            After you attend one of the orientation sessions above, we'll confirm your attendance and unlock your mentor match. It will appear automatically in <strong>Week 2</strong> — no action needed from you.
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
            Prompts to Think About Before Your First Meeting
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
      <div style={{ textAlign: "right", marginTop: -8, marginBottom: 8 }}>
        <SaveButton label="Save" />
      </div>
    </div>
  );
}

// ─── Week 2: Meet your mentor ─────────────────────────────────────────────────
function Week2({ mentee, slug, mentorUnlocked }) {
  const week = WEEKS[1];
  const [w1Goals, setW1Goals] = useState("");

  useEffect(() => {
    setW1Goals(localStorage.getItem(`${slug}_w1_primary_refine`) || "");
  }, [slug]);

  return (
    <div>
      {/* Mentor card */}
      <MentorCard mentee={mentee} revealed={mentorUnlocked} />

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
      <EventsSection events={week.events} />

      {/* Pre-meeting reflection */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#3d2f8a" }}>
            Before your first meeting, take some time to think about these things:
          </p>
          <span style={{ background: "#f0ecff", color: "#9b8fcf", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            Optional
          </span>
        </div>
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
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <SaveButton label="Save" />
      </div>
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

// ─── Generic reflection week ──────────────────────────────────────────────────
function WeekReflection({ weekNum, slug, prompts }) {
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
              <a href={summit.url || "#"} target="_blank" rel="noopener noreferrer" style={{
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
                <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                  Register on Luma →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Quote */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24, borderLeft: "4px solid #5c4eb5" }}>
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
            <a href={midpoint.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none" }}>
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
            <EventsSection events={others} />
          </div>
        )}

        {/* Midpoint reflection prompts */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginTop: 24 }}>
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

  // Week 3: tagline + action items + sessions + prompt
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
        <EventsSection events={week.events} />

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

          <div style={{ textAlign: "right", marginTop: 14 }}>
            <SaveButton label="Save" />
          </div>
        </div>
      </div>
    );
  }

  // Locked prompt block shown on weeks 5–7 until midpoint is attended
  const LockedPrompts = () => (
    <div style={{
      background: "#fafafa", borderRadius: 12, border: "1px solid #ede9f8",
      padding: "24px 28px", marginTop: 24, opacity: 0.7,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9b8fcf" }}>
          Reflection Prompts
        </p>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9b8fcf", background: "#ede9f8", borderRadius: 4, padding: "2px 7px" }}>
          🔒 Unlocked after the Midpoint Meetup
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "#b0a8cc", lineHeight: 1.6, fontStyle: "italic" }}>
        These prompts will become available after you've attended the Midpoint Meetup on June 23rd.
      </p>
    </div>
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
        <EventsSection events={week.events} />
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
        <EventsSection events={week.events} />
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

        <EventsSection events={week.events} />
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
      {week && <EventsSection events={week.events} submitLabel={week.submitLabel} submitPrimary={week.submitPrimary} />}

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
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 500, color: "#1a1733", lineHeight: 1.5 }}>{item.q}</p>
          <AutoTextarea storageKey={`${slug}_w${weekNum}_${item.key}`} placeholder="Your thoughts…" slug={slug} weekNum={weekNum} fieldKey={item.key} />
        </div>
      ))}

      <p style={{ margin: "28px 0 14px", fontSize: 15, fontWeight: 600, color: "#3d2f8a" }}>
        Your personal prompt
      </p>
      <PromptBlock
        theme={prompts[0].theme}
        questions={prompts[0].questions}
        slug={slug} weekNum={weekNum} blockIndex={0} accentColor="#5c4eb5"
      />
    </div>
  );
}

// ─── Milestone check section ──────────────────────────────────────────────────
function MilestoneSection({ milestones }) {
  const items = [
    { key: "participation",   label: "Confirmed Participation", auto: true },
    { key: "onboarding",      label: "Onboarding Session Attended" },
    { key: "mentorMatched",   label: "Matched with a Mentor" },
    { key: "edu1",            label: "Educational Session 1" },
    { key: "edu2",            label: "Educational Session 2" },
    { key: "edu3",            label: "Educational Session 3" },
    { key: "mentorSession1",  label: "Mentor Session 1" },
    { key: "mentorSession2",  label: "Mentor Session 2" },
    { key: "mentorSession3",  label: "Mentor Session 3" },
    { key: "midpoint",        label: "Midpoint Meetup Attended" },
    { key: "endSurvey",       label: "End of Program Survey Completed" },
    { key: "summit",          label: "Summit & Graduation Attended" },
    { key: "certificate",     label: "Certificate Received" },
  ];

  const completed = items.filter((i) => milestones[i.key]).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 14, color: "#6b6480" }}>
        Milestones are manually confirmed by a TechUnited team member every Tuesday. No action needed from you — they'll update automatically.
      </p>
      {/* Progress bar */}
      <div style={{ background: "#e8e4f5", borderRadius: 8, height: 8, marginBottom: 6 }}>
        <div style={{ background: "linear-gradient(90deg, #5c4eb5, #2a7fd4)", height: 8, borderRadius: 8, width: `${pct}%`, transition: "width 0.4s" }} />
      </div>
      <p style={{ margin: "0 0 24px", fontSize: 12, color: "#9b8fcf" }}>{completed} of {total} milestones completed</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => {
          const done = !!milestones[item.key];
          return (
            <div key={item.key} style={{
              background: "#fff", borderRadius: 12,
              border: done ? "1px solid #b8e8d0" : "1px solid #e8e4f5",
              padding: "14px 20px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#22a366" : "#f0ecff",
                color: done ? "#fff" : "#c0b8d8",
                fontSize: done ? 14 : 18,
                fontWeight: 700,
              }}>
                {done ? "✓" : "○"}
              </div>
              <span style={{
                fontSize: 15, fontWeight: done ? 600 : 400,
                color: done ? "#1a4a32" : "#6b6480",
                textDecoration: done ? "none" : "none",
              }}>
                {item.label}
              </span>
              {done && (
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#22a366", background: "#f0faf5", borderRadius: 4, padding: "2px 8px" }}>
                  COMPLETED
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar section ─────────────────────────────────────────────────────────
function CalendarSection() {
  return (
    <div>
      <p style={{ margin: "0 0 24px", fontSize: 15, color: "#6b6480" }}>
        All program sessions and milestones across the 9-week Uplift Summer 2026 schedule.
      </p>
      {WEEKS.map((week) => (
        <div key={week.num} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
              WEEK {week.num} · {week.dateRange}
            </span>
            {week.taglineType === "warning" && (
              <span style={{ background: "#fff0f0", color: "#c00", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>IMPORTANT</span>
            )}
          </div>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#1a1733" }}>{week.title}</p>
          {week.tagline && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b6480", fontStyle: "italic", lineHeight: 1.5 }}>{week.tagline}</p>
          )}
          {week.events && week.events.length > 0 ? (
            <div style={{ borderTop: "1px solid #f5f3ff", paddingTop: 10 }}>
              {week.events.map((ev, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < week.events.length - 1 ? "1px solid #fafafa" : "none" }}>
                  <div style={{ width: 15, height: 15, border: "1.5px solid #c0b8d8", borderRadius: 3, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1733" }}>{ev.name}</span>
                  {ev.required && (
                    <span style={{ background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>REQUIRED</span>
                  )}
                  <span style={{ fontSize: 12, color: "#9b8fcf" }}>{ev.day}{ev.time ? `, ${ev.time}` : ""} · {ev.format}</span>
                  <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: 12, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>Register on Luma →</a>
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
      ))}
    </div>
  );
}

// ─── Resources section ────────────────────────────────────────────────────────
function ResourcesSection() {
  return (
    <div>
      {RESOURCES.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            {cat.category}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {cat.items.map((item, i) => {
              const isDisabled = item.locked || item.comingSoon;
              const Tag = isDisabled ? "div" : "a";
              const extraProps = isDisabled ? {} : { href: item.url, target: "_blank", rel: "noopener noreferrer" };
              return (
                <Tag key={i} {...extraProps} style={{
                  background: isDisabled ? "#fafafa" : "#fff",
                  borderRadius: 10,
                  border: `1px solid ${isDisabled ? "#ede9f8" : "#e8e4f5"}`,
                  padding: "14px 18px", display: "flex", justifyContent: "space-between",
                  alignItems: "center", textDecoration: "none", gap: 12,
                  opacity: isDisabled ? 0.7 : 1,
                  cursor: isDisabled ? "default" : "pointer",
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
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#9b8fcf" }}>{item.description}</p>
                  </div>
                  <span style={{ fontSize: 14, color: isDisabled ? "#c4b8e8" : "#5c4eb5", flexShrink: 0 }}>→</span>
                </Tag>
              );
            })}
          </div>
        </div>
      ))}
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
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: isSelf ? "2px solid #5c4eb5" : "1px solid #e8e4f5",
      padding: "16px 14px", textAlign: "center",
    }}>
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
      {m.linkedin ? (
        <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontWeight: 700, fontSize: 13, color: "#1a1733", textDecoration: "none", marginBottom: 3 }}>
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
          74 founders across 5 cohorts are building this summer across New Jersey.
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

// ─── Main page component ──────────────────────────────────────────────────────
export default function MenteePage({ menteeData, cohortMates, allCohortMembers }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("journey");
  const [activeWeek, setActiveWeek] = useState(1);
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
  const mentorUnlocked = mentee.mentorUnlocked;
  const myCohortHeader = COHORTS.find((c) => c.num === mentee.cohort);

  useEffect(() => {
    const stored = sessionStorage.getItem(`auth_${slug}`);
    if (stored) setIsAuthenticated(true);
  }, [slug]);

  if (!isAuthenticated) {
    return <PasswordGate slug={slug} onAuthenticated={() => setIsAuthenticated(true)} />;
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
    const week = WEEKS.find((w) => w.num === activeWeek);
    if (!week) return null;
    switch (week.type) {
      case "onboarding":
        return <Week1 mentee={mentee} slug={slug} prompts={promptBlocks} mentorUnlocked={mentorUnlocked}
          onParticipationAccepted={() => setLiveMilestones(prev => ({ ...(prev || mentee.milestones || {}), participation: true }))} />;
      case "mentor-meeting":
        return <Week2 mentee={mentee} slug={slug} mentorUnlocked={mentorUnlocked} />;
      default:
        return <WeekReflection weekNum={week.num} slug={slug} prompts={promptBlocks} />;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "journey": return renderWeekContent();
      case "calendar": return <CalendarSection />;
      case "resources": return <ResourcesSection />;
      case "milestones": return <MilestoneSection milestones={liveMilestones || mentee.milestones || {}} />;
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", padding: "28px 24px 24px", color: "#fff" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Cohort {mentee.cohort}{myCohortHeader ? ` — ${myCohortHeader.name}` : ""}
              </div>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Uplift Summer 2026
              </div>
            </div>
            <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700 }}>
              {mentee.first} {mentee.last}
            </h1>
            <p style={{ margin: "0 0 16px", opacity: 0.8, fontSize: 15 }}>
              {mentee.company} · {mentee.stage} · {mentee.industry}
            </p>
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
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>Unlocks after orientation</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Primary tab nav */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e4f5", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
            {PRIMARY_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>
          {/* Section header */}
          {activeTab === "journey" && activeWeekData && (
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

  const cohortMates = MENTEES
    .filter((m) => m.cohort === mentee.cohort)
    .map(directoryFields);

  const allCohortMembers = MENTEES
    .filter((m) => m.cohort !== mentee.cohort && m.slug !== "kennedy")
    .map(directoryFields);

  return { props: { menteeData: { ...mentee, milestones: mentee.milestones }, cohortMates, allCohortMembers } };
}
