import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import Head from "next/head";
import { getMenteeBySlug, MENTEES, PROMPTS, getFocusKey } from "../../lib/mentees";
import { PROGRAM_EMAILS, RESOURCES_FALL as RESOURCES, COHORTS } from "../../lib/program-data";
import { CERTIFICATES } from "../../lib/certificates";

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

// Slugs matched even later — session due dates pushed an additional 8 days beyond LATE_MATCH
const VERY_LATE_MATCH_SLUGS = new Set([
  "favio-jasso",
  "gifty-anane",
]);

// ─── Week definitions (Fall 2026) ─────────────────────────────────────────────
const WEEKS = [
  {
    num: 1, label: "Week 1", title: "Welcome & Onboarding", dateRange: "Sept 9\u201313",
    tagline: "Get acclimated. Attend one of the seven onboarding sessions, and start mapping your asks, your needs, and what you're looking for from your mentor.",
    note: "All seven sessions cover the same material. Pick whichever slot works for you. Luma links land here once created.",
    type: "onboarding",
    events: [
      { name: "Welcome & Onboarding 1 (Edison)", day: "Wed Sept 9", time: "10:00\u201310:45 AM", format: "Virtual", url: "https://luma.com/techun-q0gf" },
      { name: "Welcome & Onboarding 2 (Hopper)", day: "Wed Sept 9", time: "12:30\u20131:15 PM", format: "Virtual", url: "https://luma.com/0ajrxrma" },
      { name: "Welcome & Onboarding 3 (Bardeen)", day: "Wed Sept 9", time: "5:30\u20136:15 PM", format: "Virtual", url: "https://luma.com/1joflzni" },
      { name: "Welcome & Onboarding 4 (Lawrence)", day: "Thu Sept 10", time: "10:00\u201310:45 AM", format: "Virtual", url: "https://luma.com/2egw051q" },
      { name: "Welcome & Onboarding 5 (Morrison)", day: "Thu Sept 10", time: "12:30\u20131:15 PM", format: "Virtual", url: "https://luma.com/zchii8yf" },
      { name: "AI Demo Night \ud83c\udf89", day: "Thu Sept 10", time: "Evening", format: "In-Person", optional: true, url: "", note: "Bonus event. Not directly connected to the program, but a head start on connecting with our community. Your ticket is free: use code UPLIFT to claim it." },
      { name: "Welcome & Onboarding 6", day: "Fri Sept 11", time: "10:00\u201310:45 AM", format: "Virtual", url: "https://luma.com/hw8z03dq" },
      { name: "Welcome & Onboarding 7", day: "Fri Sept 11", time: "11:30 AM\u201312:15 PM", format: "Virtual", url: "https://luma.com/4lw55vqz" },
      { name: "Educational Session 1", day: "Fri Sept 11", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/techun-lfmg" , note: "Double up: finish Welcome & Onboarding 7 at 12:15, then go straight into this session and get a head start on your 3 educational sessions." },
    ],
  },
  {
    num: 2, label: "Week 2", title: "Meet Your Mentor \u00b7 Discover", dateRange: "Sept 14\u201320",
    tagline: "Your mentor match lands this week. Discover (Meeting 1) is due within 7 days of your match.",
    taglineType: "emphasis",
    type: "mentor-meeting",
    submitLabel: "Submit your first meeting",
    events: [
      { name: "Educational Session 2", day: "Mon Sept 14", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/3qg5eegx" },
      { name: "Educational Session 3", day: "Tue Sept 15", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/vxh6h310" },
      { name: "Educational Session 4", day: "Fri Sept 18", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/smzvhwxk" },
    ],
  },
  {
    num: 3, label: "Week 3", title: "Act", dateRange: "Sept 21\u201327",
    tagline: "Act (Meeting 2) is due within 10 days of your Discover meeting. Momentum is the whole point of the shorter program.",
    taglineType: "emphasis",
    type: "reflection",
    submitLabel: "Submit your second meeting",
    events: [
      { name: "Educational Session 5", day: "Mon Sept 21", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/zkb2rc8p" },
      { name: "Educational Session 6", day: "Tue Sept 22", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/de3y5zeu" },
      { name: "Educational Session 7", day: "Fri Sept 25", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/k1mvgwvs" },
    ],
  },
  {
    num: 4, label: "Week 4", title: "Find Your Rhythm", dateRange: "Sept 28\u2013Oct 4",
    tagline: "Deep Work begins. At least 1 of your 3 educational sessions should be done by October 1.",
    type: "reflection",
    events: [
      { name: "Educational Session 8", day: "Mon Sept 28", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/pidrg7sw" },
      { name: "Educational Session 9", day: "Tue Sept 29", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/bruqh9hf" },
      { name: "Educational Session 10", day: "Fri Oct 2", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/rjxdyml0" },
    ],
  },
  {
    num: 5, label: "Week 5", title: "Keep Building", dateRange: "Oct 5\u201311",
    tagline: "The middle of the program. Keep the rhythm: sessions, pulse checks, and momentum with your mentor.",
    type: "reflection",
    events: [
      { name: "Educational Session 11", day: "Mon Oct 5", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/7ajm07pv" },
      { name: "Educational Session 12", day: "Tue Oct 6", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/6fqmptfu" },
      { name: "Educational Session 13", day: "Fri Oct 9", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/872810d3" },
    ],
  },
  {
    num: 6, label: "Week 6", title: "Roadmap", dateRange: "Oct 12\u201325",
    tagline: "Roadmap (Meeting 3) is due by October 23. Hard deadline.",
    taglineType: "warning",
    type: "reflection",
    submitLabel: "Submit your third meeting",
    events: [
      { name: "Educational Session 14", day: "Mon Oct 12", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/g2j1tlk4" },
      { name: "Educational Session 15", day: "Fri Oct 16", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/mbjuraiq" },
      { name: "Educational Session 16", day: "Mon Oct 19", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/6droguib" },
      { name: "Educational Session 17", day: "Tue Oct 20", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/krpytz6i" },
      { name: "Educational Session 18", day: "Tue Oct 20", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/hbm2pxfg" },
      { name: "Educational Session 19", day: "Wed Oct 21", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/widxhy78" },
      { name: "Educational Session 20", day: "Fri Oct 23", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/s012hqvf" },
    ],
  },
  {
    num: 7, label: "Week 7", title: "Uplift at OverdriveAI \u2605", dateRange: "Oct 26\u2013Nov 1",
    tagline: "Your required in-person moment. All things future of AI, future of tech, future of New Jersey.",
    type: "reflection",
    events: [
      { name: "Uplift at OverdriveAI", day: "Tue Oct 27", time: "Details TBD", format: "In-Person", required: true, url: "" },
    ],
  },
  {
    num: 8, label: "Week 8", title: "Final Stretch & Completion", dateRange: "Nov 2\u20136",
    tagline: "Last week of programming. Close out your meetings and sessions, then finish the paperwork.",
    taglineType: "emphasis",
    type: "reflection",
    submitLabel: "Submit your End Report (5 min)",
    events: [
      { name: "Educational Session 21", day: "Tue Nov 3", time: "5:30 PM ET", format: "Virtual", url: "https://luma.com/c5o9r8zg" },
      { name: "Educational Session 22", day: "Wed Nov 4", time: "12:30 PM ET", format: "Virtual", url: "https://luma.com/b7bf0c6h" },
    ],
  },
];

const PRIMARY_TABS = [
  { id: "journey",    label: "My Journey",                   tip: "Week-by-week action items for the program, follow along to see where you should be and what's coming up next." },
  { id: "milestones", label: "Milestones",                   tip: "A high-level overview of every task to complete in the program. See at a glance what's been checked off and what still needs to happen." },
  { id: "goals",      label: "My Goals & Reflections",       tip: "Everything you've written in the portal lives here, your goals, reflections, and responses all in one place, building as you go." },
  { id: "meetings",   label: "Logged Mentorship Sessions",   tip: "Track every mentor session you've submitted, view transcripts, see which sessions have been verified, monitor your progress toward the 3-hour requirement, and check on any pending or denied sessions." },
  { id: "edu",        label: "Logged Educational Sessions",  tip: "Track the educational sessions you've attended and browse everything that's available across the full program schedule." },
  { id: "calendar",   label: "Program Roadmap",              tip: "A high-level view of the entire 8-week program, all sessions, milestones, and key dates in one place." },
  { id: "resources",  label: "Resources",                    tip: "External links, tools, and resources curated for you, things you should know about as a founder in this program." },
  { id: "profile",    label: "Cohort Directory",             tip: "See who's in your cohort and explore the other cohorts too, get to know your fellow founders." },
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
          Your response has been recorded. A full collection of everything you've written lives in the <strong style={{ fontStyle: "normal", fontWeight: 600 }}>My Goals &amp; Reflections</strong> tab, consider it your personal journal for this program. This field stays editable, so feel free to come back and update your thinking anytime.
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
      <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
        🧠 Deep Work
      </p>
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
function EventsSection({ events: allEvents, submitLabel, submitPrimary, note, footerNote, intro, isOnboarding, onboardingVerified, slug, menteeName, eduDone }) {
  // Connect events (office hours, in-person meetups) are not educational sessions — they render in ConnectBlock instead.
  const events = (allEvents || []).filter((e) => e.kind !== "connect");
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
      {typeof eduDone === "number" && (
        <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 700, color: "#9b8fcf", letterSpacing: "0.03em" }}>
          🎓 {eduDone} of 3 educational sessions done · {Math.max(0, 3 - eduDone)} to go
        </p>
      )}
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
            {intro || (isOnboarding
              ? "All seven onboarding sessions cover the same material, so attend whichever one fits your schedule. Note: onboarding sessions are separate from the 3 required educational sessions and do not count toward that requirement."
              : "We vary the format. Educational sessions rotate between three formats (Expert Insights, Peer Development, and Industry Q&A) based on the guest speaker's preference and the needs and wants you've communicated across the program. You can attend any of them, and you must attend three. If the time works for you, show up: every session counts toward your 3."
            )}
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
                  · {ev.day}{ev.time ? `, ${ev.time}` : ""} · {ev.format}
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
            {footerNote || "*Must attend a minimum of 3 virtual educational sessions by program end. Additional virtual educational sessions will continue to be added."}
          </p>
        </>
      )}
      {submitLabel && (
        <div style={{ marginTop: hasEvents ? 14 : 0, paddingTop: hasEvents ? 12 : 0, borderTop: hasEvents ? "1px solid #f5f3ff" : "none" }}>
          <a href={`https://form.typeform.com/to/e0L62296?slug=${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" style={{
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

// ─── Ways to connect block (office hours + in-person meetups — not educational) ─
function ConnectGroup({ title, note, items, isLast, trackEventClick }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: isLast ? 0 : 18 }}>
      <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 700, color: "#1a1733" }}>
        {title}
      </p>
      {note && (
        <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#6b6480", fontStyle: "italic", lineHeight: 1.55 }}>
          {note}
        </p>
      )}
      {items.map((ev, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 0", borderBottom: i < items.length - 1 ? "1px solid #f5f3ff" : "none",
        }}>
          <div style={{ width: 17, height: 17, border: "1.5px solid #c0b8d8", borderRadius: 3, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1733" }}>{ev.name}</span>
            {ev.optional && (
              <span style={{ marginLeft: 6, background: "#eafaf2", color: "#1a7a4a", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                OPTIONAL
              </span>
            )}
            <span style={{ marginLeft: 6, fontSize: 13, color: "#6b6480" }}>
              · {ev.day}{ev.time ? `, ${ev.time}` : ""} · {ev.format}
            </span>
          </div>
          <a href={ev.url || "#"} target="_blank" rel="noopener noreferrer"
            onClick={() => trackEventClick(ev.name, ev.url || "")}
            style={{ fontSize: 13, color: "#2a7fd4", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
            Register on Luma →
          </a>
        </div>
      ))}
    </div>
  );
}

// Parses "Mon Jul 21" (weekday + month + day, always 2026) into a Date at end-of-day,
// so an event still shows on its own day and drops off the list once it's truly passed.
const CONNECT_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseConnectEventDate(dayStr) {
  const parts = (dayStr || "").trim().split(/\s+/);
  if (parts.length < 3) return null;
  const month = CONNECT_MONTHS[parts[1]];
  const day = parseInt(parts[2], 10);
  if (month == null || Number.isNaN(day)) return null;
  return new Date(2026, month, day, 23, 59, 59);
}

function ConnectBlock({ events, slug, menteeName }) {
  const now = new Date();
  const connect = (events || []).filter((e) => e.kind === "connect").filter((e) => {
    const d = parseConnectEventDate(e.day);
    return !d || d >= now; // keep undated events rather than risk hiding something real
  });
  if (connect.length === 0) return null;

  const officeHours = connect.filter((e) => e.name.includes("Office Hours"));
  const coffeeMeetups = connect.filter((e) => e.name.includes("Coffee Meetup"));
  const other = connect.filter((e) => !e.name.includes("Office Hours") && !e.name.includes("Coffee Meetup"));

  const trackEventClick = (title, url) => {
    if (!slug) return;
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: menteeName || slug, title, url }),
    }).catch(() => {});
  };

  const groups = [
    {
      title: "Mentor Office Hours",
      note: "These don't count toward your three educational sessions, they're here to ease the scheduling friction so you and your mentor can get your one-on-one time in. Invite your mentor, join on the same link, and we'll break you into a private room (30 minutes counts as half a mentor session, a full hour counts as a whole one).",
      items: officeHours,
    },
    {
      title: "Coffee Meetups",
      note: "Optional · Mondays, 5:30–7:00 PM at Haraz Coffee in Hoboken. Coffee, tea, and decaf are on us.",
      items: coffeeMeetups,
    },
    { title: "Other", note: null, items: other },
  ].filter((g) => g.items.length > 0);

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", borderLeft: "4px solid #2a9d6e", padding: "20px 24px", marginBottom: 24 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#2a9d6e" }}>
        New · More Ways to Get Your 1:1 Time
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b6480", fontStyle: "italic", lineHeight: 1.65 }}>
        You asked for more ways to connect, so we added these to help.
      </p>
      {groups.map((g, i) => (
        <ConnectGroup key={g.title} title={g.title} note={g.note} items={g.items} isLast={i === groups.length - 1} trackEventClick={trackEventClick} />
      ))}
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
  // Guard: a match can be flagged revealed via the live sheet even when the
  // static record has no mentor object yet — fall back to the pending UI
  // instead of dereferencing an undefined mentor below.
  if (!revealed || !mentee.mentor) {
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
            We've selected your mentor and your pairing has been approved, we're waiting on their final confirmation before making the introduction. You'll see your mentor here as soon as it's confirmed.
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
          Your mentor unlocks once you've attended an onboarding session, completed your Week 1 Deep Work, and passed the onboarding quiz. No action needed from you, it will appear here automatically.
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
// Server-checked via /api/portal-auth. First login uses the access code from
// the welcome email; the founder then sets their own password (8+ characters).
// The team's master password opens any portal.
function PasswordGate({ slug, onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("enter"); // "enter" | "create"
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const fail = (msg) => {
    setErrorMsg(msg);
    setError(true);
    setTimeout(() => setError(false), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/portal-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password: input, action: "check" }),
      });
      const data = await r.json();
      if (data.ok && data.needsSetup) {
        setStep("create");
      } else if (data.ok) {
        sessionStorage.setItem(`auth_${slug}`, "1");
        onAuthenticated();
      } else {
        fail("Incorrect code. Contact uplift@techunited.co");
      }
    } catch {
      // Auth API unreachable: fall back to the legacy access code so a blip
      // never locks a founder out.
      if (input.toLowerCase().trim() === slug.split("-")[0]) {
        sessionStorage.setItem(`auth_${slug}`, "1");
        onAuthenticated();
      } else {
        fail("Incorrect code. Contact uplift@techunited.co");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (newPw.length < 8) return fail("Use at least 8 characters.");
    if (newPw !== confirmPw) return fail("Those don't match. One more try.");
    setBusy(true);
    try {
      const r = await fetch("/api/portal-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password: input, action: "set", newPassword: newPw }),
      });
      const data = await r.json();
      if (data.ok) {
        sessionStorage.setItem(`auth_${slug}`, "1");
        onAuthenticated();
      } else {
        fail(data.error || "Could not save that password. Contact uplift@techunited.co");
      }
    } catch {
      fail("Could not save that password. Contact uplift@techunited.co");
    } finally {
      setBusy(false);
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
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#1a1733" }}>Uplift Fall 2026</h1>
        {step === "enter" ? (
          <>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#9b8fcf" }}>Enter your access code or password to continue</p>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Access code or password"
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
                  {errorMsg || "Incorrect code. Contact uplift@techunited.co"}
                </p>
              )}
              <button type="submit" disabled={busy} style={{
                width: "100%", padding: "13px", borderRadius: 8, border: "none",
                background: busy ? "#a89ede" : "#5c4eb5", color: "#fff", fontWeight: 700, fontSize: 15, cursor: busy ? "default" : "pointer",
              }}>
                {busy ? "Checking..." : "Enter"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#3a3555", fontWeight: 600 }}>Welcome! One quick thing.</p>
            <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "#9b8fcf", lineHeight: 1.5 }}>
              Create your own password for this portal. You&apos;ll use it from now on instead of the access code.
            </p>
            <form onSubmit={handleCreate}>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password (8+ characters)"
                autoFocus
                style={{
                  width: "100%", padding: "13px 14px", borderRadius: 8,
                  border: error ? "1.5px solid #e05050" : "1.5px solid #d4d0e8",
                  background: "#fafafa", fontSize: 16, fontFamily: "inherit",
                  boxSizing: "border-box", outline: "none", marginBottom: 10,
                }}
              />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm password"
                style={{
                  width: "100%", padding: "13px 14px", borderRadius: 8,
                  border: error ? "1.5px solid #e05050" : "1.5px solid #d4d0e8",
                  background: "#fafafa", fontSize: 16, fontFamily: "inherit",
                  boxSizing: "border-box", outline: "none", marginBottom: 10,
                }}
              />
              {error && (
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#e05050", fontWeight: 500 }}>
                  {errorMsg}
                </p>
              )}
              <button type="submit" disabled={busy} style={{
                width: "100%", padding: "13px", borderRadius: 8, border: "none",
                background: busy ? "#a89ede" : "#5c4eb5", color: "#fff", fontWeight: 700, fontSize: 15, cursor: busy ? "default" : "pointer",
              }}>
                {busy ? "Saving..." : "Set password & enter"}
              </button>
            </form>
          </>
        )}
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
        Accepting lets us know you're moving forward with the program. We need to hear from you by <strong style={{ color: "#1a1733" }}>Wednesday, September 9th</strong>.
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

// ─── Onboarding quiz (10/10 to pass; part of the Week 1 gate) ────────────────
const ONBOARDING_QUIZ = [
  { q: "How many 1:1 mentor meetings does the program require?", options: ["1", "2", "3", "5"], answer: 2 },
  { q: "When is Discover (Meeting 1) due?", options: ["Within 7 days of your match", "By October 1", "Whenever works for you both", "Within 30 days"], answer: 0 },
  { q: "When is Act (Meeting 2) due?", options: ["By October 23", "Within 10 days of Discover", "Within 72 hours of Discover", "By November 6"], answer: 1 },
  { q: "Roadmap (Meeting 3) is due by:", options: ["September 27", "October 1", "October 23", "November 20"], answer: 2 },
  { q: "How many educational sessions must you attend, and when is your first due?", options: ["2 total, no deadline", "3 total, first by October 1", "5 total, first by October 23", "1 total, by November 6"], answer: 1 },
  { q: "What is the required in-person event?", options: ["AI Demo Night, September 10", "The Midpoint Meetup", "Uplift at OverdriveAI, October 27", "The Summit, August 4"], answer: 2 },
  { q: "A yellow pulse check means:", options: ["Things are not going as planned", "A-okay", "Okay, but a check-in would be nice", "You skipped the week"], answer: 2 },
  { q: "How quickly do you commit to responding to your mentor and the program?", options: ["Within 24 hours", "Within 72 hours", "Within a week", "Whenever you can"], answer: 1 },
  { q: "How do you log a mentor meeting?", options: ["Your mentor logs it for you", "Email your notes to TechUnited", "Submit it in the portal: date, length, and notes", "It's tracked automatically"], answer: 2 },
  { q: "What do you sign at the end of the program?", options: ["Nothing, attendance is enough", "BreezeDoc forms verifying your logged sessions and meetings are accurate", "A liability waiver", "Your certificate"], answer: 1 },
];

function QuizModal({ slug, onPassed, onClose }) {
  const [picks, setPicks] = useState({});
  const [result, setResult] = useState(null);
  const answered = Object.keys(picks).length;

  const grade = () => {
    const score = ONBOARDING_QUIZ.reduce((n, item, i) => n + (picks[i] === item.answer ? 1 : 0), 0);
    setResult(score);
    if (score === ONBOARDING_QUIZ.length) {
      localStorage.setItem(`${slug}_quiz_passed`, "1");
      persistToSheet(slug, 1, "quiz_passed", `${score}/${ONBOARDING_QUIZ.length}`, "Onboarding quiz");
      if (onPassed) onPassed();
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(16,9,45,0.62)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, width: "min(640px, 96vw)", maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 24px 80px rgba(16,9,45,0.45)", padding: "26px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1733" }}>📝 The Onboarding Quiz</p>
          <button onClick={onClose} style={{ border: "none", background: "#f0ecff", color: "#5c4eb5", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕ Close</button>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "#6b6480", lineHeight: 1.6 }}>
          Ten questions on how the program works. You need 10 out of 10, and you can retake it as many times as you like.
        </p>
        {ONBOARDING_QUIZ.map((item, i) => (
          <div key={i} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: i < ONBOARDING_QUIZ.length - 1 ? "1px solid #f0edf9" : "none" }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>{i + 1}. {item.q}</p>
            {item.options.map((opt, oi) => {
              const picked = picks[i] === oi;
              const wrong = result !== null && result < ONBOARDING_QUIZ.length && picked && oi !== item.answer;
              return (
                <button key={oi} onClick={() => { setPicks(p => ({ ...p, [i]: oi })); setResult(null); }} style={{
                  display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                  padding: "8px 14px", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", cursor: "pointer",
                  border: picked ? (wrong ? "1.5px solid #e74c3c" : "1.5px solid #5c4eb5") : "1.5px solid #e8e4f5",
                  background: picked ? (wrong ? "#fef0f0" : "#f5f3ff") : "#fff",
                  color: "#1a1733", fontWeight: picked ? 600 : 400,
                }}>
                  {opt}
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {result === ONBOARDING_QUIZ.length ? (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1a7a4a" }}>🎉 10/10. You passed. This counts toward unlocking your mentor.</p>
          ) : (
            <>
              <button onClick={grade} disabled={answered < ONBOARDING_QUIZ.length} style={{
                border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                background: answered === ONBOARDING_QUIZ.length ? "#5c4eb5" : "#e8e4f5",
                color: answered === ONBOARDING_QUIZ.length ? "#fff" : "#9b8fcf",
                cursor: answered === ONBOARDING_QUIZ.length ? "pointer" : "default",
              }}>
                {result === null ? "Submit answers" : "Submit again"}
              </button>
              {result !== null && result < ONBOARDING_QUIZ.length && (
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#c0392b" }}>{result}/{ONBOARDING_QUIZ.length}. You need 10/10: fix the highlighted picks and resubmit.</span>
              )}
              {result === null && answered < ONBOARDING_QUIZ.length && (
                <span style={{ fontSize: 12.5, color: "#9b8fcf", fontStyle: "italic" }}>{answered}/{ONBOARDING_QUIZ.length} answered</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizCheck({ slug }) {
  const [show, setShow] = useState(false);
  const [passed, setPassed] = useState(false);
  useEffect(() => { setPassed(!!localStorage.getItem(`${slug}_quiz_passed`)); }, [slug]);
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
        You cannot do your Deep Work or unlock your mentor until you get a <strong style={{ color: "#1a1733" }}>10 out of 10</strong> on this quiz. Ten quick questions on how the program works; retakes unlimited.
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9b8fcf", fontStyle: "italic" }}>
        Pro tip: need to reference the deck? You'll find it under your Resources tab.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button onClick={() => setShow(true)} style={{
          border: "none", borderRadius: 8, padding: "9px 18px",
          background: "#5c4eb5", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>
          {passed ? "Review the quiz" : "Take the quiz"}
        </button>
        {passed && <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7a4a" }}>✓ Passed 10/10</span>}
      </div>
      {show && <QuizModal slug={slug} onPassed={() => setPassed(true)} onClose={() => setShow(false)} />}
    </div>
  );
}

// ─── Collapsible step (Week 1 flow) ──────────────────────────────────────────
function Step({ num, title, chip, defaultOpen, locked, lockedNote, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  if (locked) {
    return (
      <div style={{ background: "#fafafa", border: "1.5px dashed #d4d0e8", borderRadius: 14, marginBottom: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: "#e8e4f5", color: "#9b8fcf",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
        }}>{num}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#9b8fcf" }}>🔒 {title}</p>
          {lockedNote && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#b0a8cc", fontStyle: "italic" }}>{lockedNote}</p>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e4f5", borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
        border: "none", background: open ? "#f7f5ff" : "#fff", cursor: "pointer",
        fontFamily: "inherit", textAlign: "left",
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
        }}>{num}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1733", flex: 1 }}>{title}</span>
        {chip && <span style={{ fontSize: 10, fontWeight: 700, color: "#9b8fcf", background: "#f0ecff", borderRadius: 4, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>{chip}</span>}
        <span style={{ color: "#9b8fcf", fontSize: 12, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "16px 18px 6px" }}>{children}</div>}
    </div>
  );
}

// ─── Week 1: Welcome & Onboarding ─────────────────────────────────────────────
function Week1({ mentee, slug, prompts, mentorUnlocked, onParticipationAccepted, milestones }) {
  const [quizPassed, setQuizPassed] = useState(false);
  useEffect(() => {
    const check = () => setQuizPassed(!!localStorage.getItem(`${slug}_quiz_passed`));
    check();
    const t = setInterval(check, 1500);
    return () => clearInterval(t);
  }, [slug]);
  const week = WEEKS[0];
  const cohort = COHORTS.find((c) => c.num === mentee.cohort);
  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
        borderRadius: 14, padding: "28px 32px", color: "#fff", marginBottom: 24,
      }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.65, textTransform: "uppercase" }}>
          Welcome to Uplift Fall 2026
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 21, fontWeight: 700, lineHeight: 1.3 }}>
          {mentee.first}, we're so excited to have you.
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.8, opacity: 0.9 }}>
          We're thrilled you've been accepted into this program and honored to be a small part of your entrepreneurial journey. This fall is going to be big. Let's make the most of it.
        </p>
        {cohort && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 18 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6 }}>
              You've been placed in Cohort {cohort.num} · {cohort.name}
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700 }}>{cohort.namesake}</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>{cohort.why}</p>
          </div>
        )}
      </div>

      {/* Confirm participation, right after the welcome */}
      <ParticipationWidget slug={slug} onAccepted={onParticipationAccepted} participationConfirmed={milestones?.participation} />


      {/* Week 1 flow: welcome → confirm → session → deep work → bonuses */}
      <Step num={2} title="Pick your onboarding session" chip="Required" defaultOpen>
      <ActionItems slug={slug} weekNum={1} items={[
        { text: "Get acclimated, review your portal and familiarize yourself with the program." },
        {
          text: "Register and attend an onboarding session.",
          sub: "Seven sessions across Wednesday, Thursday, and Friday, all covering the same material. Pick whichever fits your schedule and register through Luma.",
        },
        { text: "Complete your onboarding verification quiz and answer your Deep Work to unlock your mentor.", sub: "Steps 2 and 3 below. Your mentor match reveals automatically once all three action items are done." },
      ]} />

      <EventsSection events={week.events.filter((e) => e.name.startsWith("Welcome & Onboarding"))} note={week.note} footerNote="*You will only receive your mentor match after attending an onboarding session." isOnboarding onboardingVerified={milestones?.onboarding} slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />

      {/* Get a head start — bonus block, tucked under this week's sessions */}
      <div style={{ background: "#f7f5ff", borderRadius: 12, border: "1.5px dashed #c8bfef", padding: "16px 20px 4px", marginBottom: 24 }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
          🎁 Psst. Get a head start
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b6480", lineHeight: 1.6 }}>
          Two ways to get ahead in Week 1. Neither is required; both are worth it.
        </p>
        <EventsSection events={week.events.filter((e) => !e.name.startsWith("Welcome & Onboarding"))} slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />
      </div>

      </Step>

      <Step num={3} title="📝 The Onboarding Quiz" chip="Required">
        <QuizCheck slug={slug} />
      </Step>

      <Step num={3} title="🧠 Deep Work · Your action items from onboarding" chip="Required" locked={!quizPassed} lockedNote="Unlocks after a 10/10 on the onboarding quiz above.">
      {/* Application snapshot — pulled straight from the fall Typeform, the ingest reference */}
      {mentee.application && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
            A quick reminder from your application
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>
            {mentee.company} · {mentee.application.title}
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6b6480", fontStyle: "italic", lineHeight: 1.6 }}>
            &ldquo;{mentee.application.bio}&rdquo;
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {[mentee.application.journeyStage, mentee.stage, mentee.industry,
              mentee.application.snapshot?.revenueRange,
              mentee.application.snapshot?.lookingForCustomers && "Looking for customers",
              mentee.application.snapshot?.seekingPartnerships && "Seeking partnerships",
            ].filter(Boolean).map((chip, i) => (
              <span key={i} style={{ background: "#f0ecff", color: "#5c4eb5", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>{chip}</span>
            ))}
          </div>
          {[
            ["Hoping to accomplish", mentee.application.hopingToAccomplish],
            ["What success looks like", (mentee.application.successCriteria || []).join(" · ")],
            ["Your mentor ask", mentee.application.valueSought],
            ["Logistics", [mentee.application.sessionTier, (mentee.application.timePreference || []).join(", "), (mentee.application.meetingMethod || []).join(", ")].filter(Boolean).join(" · ")],
          ].map(([label, val]) => val ? (
            <div key={label} style={{ borderTop: "1px solid #f0edf9", paddingTop: 10, marginTop: 10 }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5c4eb5" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 13.5, color: "#37324e", lineHeight: 1.6 }}>{val}</p>
            </div>
          ) : null)}
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>
            Something changed since you applied? Update it in your goals reflection below, or tell us at uplift@techunited.co.
          </p>
        </div>
      )}

      {/* The five guarantees — every founder leaves with these */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginBottom: 24, borderLeft: "4px solid #5c4eb5" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
          A reminder from onboarding
        </p>
        <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>
          Every founder leaves Uplift with five things.
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
          Define what each one means to you, in a sentence or less. This helps us better curate a program that is ultimately self-guided, and put the right tools in front of you.
        </p>
        {[
          { key: "five_relationship", emoji: "🤝", label: "A stronger relationship" },
          { key: "five_clarity",      emoji: "🎯", label: "Greater clarity" },
          { key: "five_resources",    emoji: "🛠️", label: "New resources" },
          { key: "five_mentor",       emoji: "👤", label: "A trusted mentor" },
          { key: "five_community",    emoji: "🏠", label: "A community" },
        ].map((g) => (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#1a1733" }}>
              <span style={{ marginRight: 8 }}>{g.emoji}</span>{g.label}
            </p>
            <AutoTextarea
              storageKey={`${slug}_w1_${g.key}`}
              placeholder="In a sentence: what this means to me…"
              slug={slug} weekNum={1} fieldKey={g.key} rows={2}
              question={`What does "${g.label}" mean to you? A sentence or less.`}
            />
          </div>
        ))}
      </div>

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
          A reminder: in your application you told us your focus areas. Now let's get specific and more granular on your primary and secondary focus. Your answers here will be revisited at the end of the program so you can see how far you've come.
        </p>

        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
            Let's get more granular with your goals.
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Primary focus · {mentee.primaryFocus}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "#6b6480" }}>
            What does real progress on this look like for you by November?
          </p>
          <AutoTextarea
            storageKey={`${slug}_w1_primary_refine`}
            placeholder="e.g. I want to close my first 3 paying customers and have a clear pricing model…"
            slug={slug} weekNum={1} fieldKey="primary_refine" rows={3}
            question="What does real progress on your primary focus look like for you by November?"
          />
        </div>

        {mentee.secondaryFoci && mentee.secondaryFoci.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#2a7fd4", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Secondary focus · {mentee.secondaryFoci[0]}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#6b6480" }}>
              What's the one thing that would move the needle here this fall?
            </p>
            <AutoTextarea
              storageKey={`${slug}_w1_secondary_refine`}
              placeholder="e.g. I want to have at least one investor conversation and understand what they'd need to see…"
              slug={slug} weekNum={1} fieldKey="secondary_refine" rows={3}
              question="What's the one thing that would move the needle on your secondary focus this fall?"
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
            Deep Work · Prompts to Think About During Week 1
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", lineHeight: 1.5 }}>
          No longer optional. Take a moment with these; there are no right answers. These prompts are all deep work: the more you put in, the more you get out.
        </p>
      </div>
      <PromptBlock
        theme={prompts[0].theme}
        questions={prompts[0].questions}
        slug={slug} weekNum={1} blockIndex={0} accentColor="#5c4eb5"
      />
      </Step>

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
              Head to Week 2 to meet them and prepare for your Discover meeting.
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
            Your mentor unlocks once you've attended an onboarding session, completed your Week 1 Deep Work, and passed the onboarding quiz. It will appear automatically in <strong>Week 2</strong>, no action needed from you. Once everything is wrapped, we cross-reference your Week 1 Deep Work to double-check and validate the match, and to flag anything that might need adjusting.
          </p>
        </div>
      )}




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

      <ActionItems slug={slug} weekNum={2} footnote="*You must attend a minimum of 3 virtual educational sessions by the end of this program." items={[
        { text: "Verify you completed all the prompts and Deep Work in Week 1. This is required to unlock your mentor." },
        { text: "Review the suggested structure of your meetings, in the guide below, then confirm you've reviewed it." },
        { text: "Respond to your mentor within 72 hours of being matched." },
        { text: "Schedule your first meeting within 7 days of that." },
        { text: "Attend one of this week's sessions, check them out below." },
        { text: "Continue your deep work in the portal." },
        { text: "Submit your meeting after you have it." },
        { text: "Do your 10-second pulse check at the top of this page (required)." },
        { text: "Share a Win of the Week (optional): any win you submit goes out in Tuesday's update." },
      ]} />

      {/* Reminder — above the submit button */}
      <p style={{
        textAlign: "center", fontSize: 14, color: "#7a5c00",
        background: "#fffbeb", border: "1px solid #f5d97a",
        borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontStyle: "italic",
      }}>
        Discover (Meeting 1) is due within 7 days of your match.
      </p>

      {/* Submit meeting button */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <a href={`https://form.typeform.com/to/e0L62296?slug=${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", padding: "14px 36px",
          background: "#5c4eb5", color: "#fff", borderRadius: 10,
          fontSize: 16, fontWeight: 700, textDecoration: "none",
          boxShadow: "0 4px 14px rgba(92,78,181,0.35)",
        }}>
          Submit your first meeting →
        </a>
      </div>

      {/* Sessions */}
      <MeetingStructureCheck slug={slug} />
      <EventsSection events={week.events} slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />

      {/* Pre-meeting reflection */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5c4eb5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Deep Work · Pre-Meeting Prompts
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
        *These notes are not shared with your mentor. They're intended for you, to help surface what you might want to talk about in your first meeting.
      </p>

      {/* Week 1 sense-check recap */}
      {w1Goals && (
        <div style={{ background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0", padding: "22px 26px" }}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: "#1a6e42" }}>
            Here's what you said in the sense check · Week 1:
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
  // Pulse checks open and close on Fridays: each week's pulse opens the prior
  // Friday and closes that week's Friday night.
  { week: 2, start: new Date(2026, 8, 11), end: new Date(2026, 8, 18, 23, 59, 59) },
  { week: 3, start: new Date(2026, 8, 18), end: new Date(2026, 8, 25, 23, 59, 59) },
  { week: 4, start: new Date(2026, 8, 25), end: new Date(2026, 9,  2, 23, 59, 59) },
  { week: 5, start: new Date(2026, 9,  2), end: new Date(2026, 9,  9, 23, 59, 59) },
  { week: 6, start: new Date(2026, 9,  9), end: new Date(2026, 9, 23, 23, 59, 59) },
  { week: 7, start: new Date(2026, 9, 23), end: new Date(2026, 9, 30, 23, 59, 59) },
  { week: 8, start: new Date(2026, 9, 30), end: new Date(2026, 10, 6, 23, 59, 59) },
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
  { value: 3, emoji: "🟢", label: "A-okay" },
  { value: 2, emoji: "🟡", label: "Okay, but a check-in would be nice" },
  { value: 1, emoji: "🔴", label: "Not going as planned" },
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
          🔒 Unlocks {fmtPulseDate(win.start)}, available until {fmtPulseDate(win.end)}.
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
              ✓ Response updated, you&apos;ve used your one change for this week.
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
            Deep Work · What are you focused on this week?
          </p>
          <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>Optional</span>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#c0b8d8", lineHeight: 1.6 }}>
          Whether it&apos;s a small goal, a project, or a deadline, share what you&apos;re building or working on. If there&apos;s a program participant working on the same thing or something similar, we&apos;ll connect you.
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
            Deep Work · What are you focused on this week?
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
          Deep Work · What are you focused on this week?
        </p>
        <span style={{ fontSize: 10, color: "#9b8fcf", fontWeight: 600, background: "#f0ecff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
          Optional
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9b8fcf", lineHeight: 1.7 }}>
        Whether it&apos;s a small goal, a project, or a deadline, share what you&apos;re building or working on. If there&apos;s a program participant working on the same thing or something similar, we&apos;ll connect you. · Available {fmtPulseDate(win.start)} – {fmtPulseDate(win.end)}.
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
// ─── Win of the Week ──────────────────────────────────────────────────────────
// Any submitted win goes out in the Tuesday update to all mentors and mentees.
function WinOfTheWeek({ slug, weekNum }) {
  const storageKey = `${slug}_w${weekNum}_win_of_week`;
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setValue(saved || "");
    setSubmitted(!!(saved && saved.trim()));
    setEditing(false);
  }, [storageKey]);

  const handleSubmit = () => {
    if (!value.trim()) return;
    localStorage.setItem(storageKey, value);
    persistToSheet(slug, weekNum, "win_of_week", value, "Win of the Week");
    setSubmitted(true);
    setEditing(false);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5",
      borderLeft: "4px solid #c99a2e", padding: "18px 22px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#a37c1f" }}>
          🏆 Win of the Week
        </p>
        <span style={{ background: "#fdf6e3", color: "#a37c1f", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
          OPTIONAL
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b6480", lineHeight: 1.6 }}>
        Big or small, share a win. Every win submitted goes out in our <strong style={{ color: "#1a1733" }}>Tuesday update to all mentors and mentees</strong>, so the whole community sees what you&apos;re building.
      </p>
      {submitted && !editing ? (
        <div>
          <div style={{ background: "#fdf6e3", borderRadius: 8, padding: "12px 16px", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#1a1733", lineHeight: 1.6 }}>{value}</p>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#1a7a4a", fontWeight: 600 }}>
            ✓ In! Your win goes out in Tuesday&apos;s update.{" "}
            <button onClick={() => setEditing(true)} style={{
              border: "none", background: "none", color: "#5c4eb5", fontWeight: 600,
              fontSize: 12.5, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0,
            }}>
              Edit
            </button>
          </p>
        </div>
      ) : (
        <div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            placeholder="e.g. Landed my first paying customer, closed a partnership, had a breakthrough mentor conversation…"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1.5px solid #e8e4f5", fontSize: 14, lineHeight: 1.5,
              fontFamily: "inherit", boxSizing: "border-box", outline: "none", resize: "vertical",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#c99a2e"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#e8e4f5"}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button onClick={handleSubmit} disabled={!value.trim()} style={{
              border: "none", borderRadius: 8, padding: "8px 18px",
              background: value.trim() ? "#c99a2e" : "#e8e4f5",
              color: value.trim() ? "#fff" : "#9b8fcf",
              fontSize: 13, fontWeight: 700, cursor: value.trim() ? "pointer" : "default",
              fontFamily: "inherit",
            }}>
              Submit my win
            </button>
            <span style={{ fontSize: 11.5, color: "#9b8fcf", fontStyle: "italic" }}>
              Goes out Tuesday. Skip any week you like.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function JourneyProgressBar({ slug, activeWeek }) {
  const [completedWeeks, setCompletedWeeks] = useState(0);
  const [weekPrompts, setWeekPrompts] = useState(0);

  useEffect(() => {
    let done = 0;
    let thisWeekFilled = 0;
    for (let w = 1; w <= 8; w++) {
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

  const pct = (completedWeeks / 8) * 100;

  return (
    <div style={{
      background: "#fff", borderRadius: 10, border: "1px solid #e8e4f5",
      padding: "14px 20px", marginBottom: 20,
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5c4eb5" }}>
            {completedWeeks} of 8 weeks with responses
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

// ─── Generic reflection week (Fall 2026) ─────────────────────────────────────
function ActionItems({ slug, weekNum, items, footnote }) {
  const storageKey = `${slug}_w${weekNum}_actions`;
  const [checked, setChecked] = useState({});
  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { setChecked({}); }
  }, [storageKey]);
  const toggle = (i, label) => {
    setChecked(prev => {
      const next = { ...prev, [i]: !prev[i] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      persistToSheet(slug, weekNum, `action_${i + 1}`, next[i] ? "done" : "", label);
      return next;
    });
  };
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
        Action Items This Week
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f5f3ff", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg, #5c4eb5, #3d2f8a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>1</span>
          <span style={{ fontSize: 11, color: "#9b8fcf", fontWeight: 700 }}>→</span>
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#22a366", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>✓</span>
        </span>
        <p style={{ margin: 0, fontSize: 11.5, color: "#3d2f8a", lineHeight: 1.5 }}>
          Tap each item to check it off; it saves as you go. These are yours to do, and your way to verify what you&apos;re getting done.
        </p>
      </div>
      {items.map((item, i, arr) => (
        <div key={i} onClick={() => toggle(i, item.text)} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < arr.length - 1 ? 12 : 0, cursor: "pointer" }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            background: checked[i] ? "#22a366" : "linear-gradient(135deg, #5c4eb5, #3d2f8a)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, marginTop: 1,
          }}>
            {checked[i] ? "✓" : i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: checked[i] ? "#9b8fcf" : "#1a1733", lineHeight: 1.6 }}>
              {item.text}
              {item.link && <a href={item.link.href} onClick={(e) => e.stopPropagation()} style={{ color: "#5c4eb5", fontWeight: 600 }}>{item.link.label}</a>}
              {item.suffix}
            </p>
            {item.sub && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9b8fcf", lineHeight: 1.5, fontStyle: "italic" }}>{item.sub}</p>}
          </div>
        </div>
      ))}
      {footnote && (
        <p style={{ margin: "14px 0 0", fontSize: 11, color: "#9b8fcf", fontStyle: "italic" }}>{footnote}</p>
      )}
    </div>
  );
}

function SubmitMeetingButton({ label, slug }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <a href={`https://form.typeform.com/to/e0L62296?slug=${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" style={{
        display: "inline-block", padding: "14px 36px",
        background: "#5c4eb5", color: "#fff", borderRadius: 10,
        fontSize: 16, fontWeight: 700, textDecoration: "none",
        boxShadow: "0 4px 14px rgba(92,78,181,0.35)",
      }}>
        {label} →
      </a>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>
        The form asks for the date, the length, and your notes. Works with your AI note-taker or your own written notes.
      </p>
    </div>
  );
}

function SessionsTBD() {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px dashed #d4d0e8", padding: "16px 22px", marginBottom: 24 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#6b6480", lineHeight: 1.6 }}>
        📅 Educational sessions run Mon 12:30&ndash;1, Tue 5:30&ndash;6, and Fri 12:30&ndash;1. This week&apos;s lineup gets announced on TechUnited&apos;s Luma page and will appear here once booked.
      </p>
    </div>
  );
}

function WeekReflection({ weekNum, slug, prompts, menteeName, milestones }) {
  const trackEventClick = (title, url) => {
    if (!slug) return;
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: menteeName || slug, title, url }),
    }).catch(() => {});
  };
  const week = WEEKS.find((w) => w.num === weekNum);
  const eduDone = [milestones?.edu1, milestones?.edu2, milestones?.edu3].filter(Boolean).length;

  // Week 2 (Act): the second meeting, on a 10-day clock from Discover
  if (weekNum === 3) {
    return (
      <div>
        <Tagline text={week.tagline} type={week.taglineType} />
        <ActionItems slug={slug} weekNum={weekNum} items={[
          { text: "Hold your Act meeting (Meeting 2): turn Discover (Meeting 1) into a move. One decision made, or one experiment shipped." },
          { text: "Submit the meeting below right after it happens." },
          { text: "Educational sessions continue to be live this week. Register through Luma and lock them into your calendar." },
          { text: "Do your 10-second pulse check at the top of this page (required)." },
          { text: "Share a Win of the Week (optional): any win you submit goes out in Tuesday's update." },
        ]} />
        <SubmitMeetingButton label={week.submitLabel} slug={slug} />
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} eduDone={eduDone} />
        <WeeklyFocus slug={slug} weekNum={3} />

      </div>
    );
  }

  // Week 3 (Deep Work begins)
  if (weekNum === 4) {
    return (
      <div>
        <Tagline text={week.tagline} />

        {/* Deep Work intro */}
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            The Middle Stretch
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#3d2f8a", lineHeight: 1.7 }}>
            The next three weeks are the middle stretch: educational sessions every week, a pulse check every week, and your Roadmap meeting on the horizon. The prompts in this stretch are all deep work. <strong>The more you put in, the more you get out.</strong>
          </p>
        </div>

        <ActionItems slug={slug} weekNum={weekNum} items={[
          { text: "Complete at least 1 of your 3 educational sessions by October 1." },
          { text: "Keep momentum with your mentor between meetings: a quick email update beats silence." },
          { text: "Do your 10-second pulse check at the top of this page (required)." },
          { text: "Share a Win of the Week (optional): any win you submit goes out in Tuesday's update." },
        ]} />
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} eduDone={eduDone} />
        <WeeklyFocus slug={slug} weekNum={4} />

        {prompts && prompts[0] && (
          <PromptBlock
            theme={prompts[0].theme}
            questions={prompts[0].questions}
            slug={slug} weekNum={4} blockIndex={0} accentColor="#5c4eb5"
          />
        )}
      </div>
    );
  }

  // Week 4 (Deep Work, middle)
  if (weekNum === 5) {
    return (
      <div>
        <Tagline text={week.tagline} />
        <ActionItems slug={slug} weekNum={weekNum} items={[
          { text: "Knock out your second educational session if you haven't yet." },
          { text: "Start thinking about Roadmap: what changed since September, and what the next quarter needs." },
          { text: "Do your 10-second pulse check at the top of this page (required)." },
          { text: "Share a Win of the Week (optional): any win you submit goes out in Tuesday's update." },
        ]} />
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} eduDone={eduDone} />
        <WeeklyFocus slug={slug} weekNum={5} />


        {prompts && prompts[1] && (
          <>
            <PromptBlock
              theme={prompts[1].theme}
              questions={prompts[1].questions}
              slug={slug} weekNum={5} blockIndex={1} accentColor="#2a7fd4"
            />
          </>
        )}
      </div>
    );
  }

  // Week 5 (Deep Work · Roadmap due)
  if (weekNum === 6) {
    return (
      <div>
        <Tagline text={week.tagline} type={week.taglineType} />
        <ActionItems
          slug={slug} weekNum={weekNum}
          items={[
            { text: "Schedule and hold your Roadmap meeting before October 23. This is the one hard deadline in the program." },
            { text: "Bring your results from Act, an honest read on what changed since September, and your biggest open question for the next quarter." },
            { text: "Submit the meeting below right after it happens." },
            { text: "Do your 10-second pulse check at the top of this page (required)." },
            { text: "Share a Win of the Week (optional): any win you submit goes out in Tuesday's update." },
          ]}
          footnote="*By the end of this stretch you should have all 3 mentor meetings and at least 2 educational sessions done."
        />
        <SubmitMeetingButton label={week.submitLabel} slug={slug} />
        <EventsSection events={week.events} slug={slug} menteeName={menteeName} eduDone={eduDone} />
        <WeeklyFocus slug={slug} weekNum={6} />
      </div>
    );
  }

  // Week 6 (OverdriveAI, required in-person)
  if (weekNum === 7) {
    const overdrive = week.events.find((e) => e.required);
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
            🚀 Uplift at OverdriveAI
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.7, opacity: 0.9 }}>
            TechUnited&apos;s marquee event, and your <strong>required in-person moment</strong>. All things future of AI, future of tech, future of New Jersey, and a room full of the exact people who can move your mission forward. This is why Discover, Act, and Roadmap come first.
          </p>
          {overdrive && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {overdrive.day} · In-Person · Newark, NJ
                </p>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>Venue details and agenda land here as they are confirmed.</p>
              </div>
              <a href={overdrive.url || "#"} target="_blank" rel="noopener noreferrer"
                onClick={() => trackEventClick(overdrive.name || "OverdriveAI", overdrive.url || "")}
                style={{
                  background: "#fff", color: "#3d2f8a", borderRadius: 8,
                  padding: "10px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0,
                }}>
                RSVP on Luma →
              </a>
            </div>
          )}
        </div>

        <SubmitMeetingButton label="Submit additional meetings" slug={slug} />

        {/* A good kind of uncomfortable — deck wording */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", borderLeft: "4px solid #c99a2e", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#a37c1f" }}>A Good Kind of Uncomfortable</p>
          <p style={{ margin: 0, fontSize: 14.5, color: "#333", lineHeight: 1.75 }}>
            Growth is a pressure test. OverdriveAI is your chance to show up a little uncomfortable, on purpose, and put your work in front of people before it feels ready. <strong>Share the ugly baby. That&apos;s how it grows up.</strong>
          </p>
        </div>

        {/* Rocket fuel — deck wording */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>Your Mission, With Rocket Fuel</p>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#333", lineHeight: 1.75 }}>
            By Oct 27 you&apos;ll walk in with a mission from your Roadmap. Use OverdriveAI as rocket fuel for it:
          </p>
          <ul style={{ margin: "0 0 14px", paddingLeft: 22, lineHeight: 2 }}>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Meet more people</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Sell more things</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Practice your CTA</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Practice your pitch</li>
          </ul>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
            Attendance is checked in through the portal on the night. Conflict on October 27? Tell us now: <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600 }}>uplift@techunited.co</a>.
          </p>
        </div>

        {/* Intentions ahead of Overdrive */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", borderLeft: "4px solid #5c4eb5" }}>
          <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
            🧠 Deep Work
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Ahead of OverdriveAI
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
            Set your intentions before you walk in. Rooms reward people who know what they came for.
          </p>

          <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>
            What&apos;s the most important thing you want to walk away from OverdriveAI with?
          </p>
          <AutoTextarea
            storageKey={`${slug}_w7_overdrive_primary`}
            placeholder="The one thing I most want to gain or accomplish at OverdriveAI is…"
            slug={slug} weekNum={7} fieldKey="overdrive_primary" rows={3}
            question="What's the most important thing you want to walk away from OverdriveAI with?"
          />

          <p style={{ margin: "20px 0 8px", fontSize: 14, fontWeight: 600, color: "#1a1733" }}>
            Who do you want to meet, and what would you ask them?
          </p>
          <AutoTextarea
            storageKey={`${slug}_w7_overdrive_secondary`}
            placeholder="A person or kind of person I want to meet, and my opening question…"
            slug={slug} weekNum={7} fieldKey="overdrive_secondary" rows={3}
            question="Who do you want to meet at OverdriveAI, and what would you ask them?"
          />
        </div>
      </div>
    );
  }

  // Week 7 (Final Stretch & Completion)
  if (weekNum === 8) {
    return (
      <div>
        <Tagline text={week.tagline} type={week.taglineType} />
        <ActionItems slug={slug} weekNum={weekNum} items={[
          { text: "Close out all 3 mentor meetings and 3 educational sessions by November 6." },
          { text: "Submit your End Report below: 5 minutes, tells us what moved for you and your company.", sub: "There's also an exit survey for founders and one for mentors; both unlock November 2nd below." },
          { text: "Reach out to ", link: { label: "uplift@techunited.co", href: "mailto:uplift@techunited.co" }, suffix: " if you're behind. We want to see you finish." },
          { text: "Watch your email for forms sent through BreezeDoc: you'll be asked to verify by signature the 3 educational sessions and 3 mentor meetings you attended, and your mentor signs off on them too." },
          { text: "Do your 10-second pulse check at the top of this page (required)." },
          { text: "Share a Win of the Week (optional): any win you submit goes out in Tuesday's update." },
        ]} />

        <EventsSection events={week.events} slug={slug} menteeName={menteeName} eduDone={eduDone} />

        <SubmitMeetingButton label="Submit additional meetings" slug={slug} />

        {/* End report */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-block", padding: "14px 36px",
            background: "#e8e4f5", color: "#9b8fcf", borderRadius: 10,
            fontSize: 16, fontWeight: 700, cursor: "default",
          }}>
            🔒 {week.submitLabel}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
            This link unlocks on <strong style={{ color: "#6b6480" }}>November 2nd</strong>.
          </p>
        </div>

        {/* Exit surveys, attached but locked */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
            Exit Surveys
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b6480", lineHeight: 1.6 }}>
            Same surveys as the summer cohort. They unlock the week of November 2nd.
          </p>
          {["Exit Survey · Founders (about 3 minutes, mirrors your application)", "Exit Survey · Mentors (verification sign-off plus feedback)"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid #f0edf9" : "none" }}>
              <span style={{ fontSize: 15 }}>🔒</span>
              <span style={{ fontSize: 14, color: "#9b8fcf", fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* By now checklist */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", padding: "24px 28px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#3d2f8a" }}>By November 6 you should have:</p>
          <ul style={{ margin: "0 0 18px", paddingLeft: 22, lineHeight: 2.2 }}>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Held and logged a minimum of 3 mentor meetings: Discover, Act, Roadmap</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Attended 3 educational sessions</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Attended OverdriveAI on October 27</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Completed your end report</li>
            <li style={{ fontSize: 14, color: "#1a1733" }}>Be anticipating a BreezeDoc to sign and confirm your program completion</li>
          </ul>
          <p style={{ margin: 0, fontSize: 13, color: "#9b8fcf", fontStyle: "italic" }}>
            If anything above is outstanding, contact <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600 }}>uplift@techunited.co</a> before November 6.
          </p>
        </div>

        {/* Completion window */}
        <div style={{ background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#1a6e42" }}>
            Completion &amp; Documentation · Nov 7&ndash;20
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.75 }}>
            After programming ends, the paperwork window opens. Forms arrive by email through BreezeDoc: you verify by signature that your logged educational sessions and mentor meetings are accurate, your mentor signs off too, and then your certificate of completion lands in the <strong>🎓 Certificate</strong> tab above. Keep clean logs and it&apos;s a two-minute task.
          </p>
        </div>

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
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9b8fcf", textTransform: "uppercase", letterSpacing: "0.08em" }}>🧠 Deep Work</p>
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

// ─── Fall announcement modals (the floating chip pop-ups) ────────────────────
function FallChipModal({ kicker, title, cta, ctaHref, onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(16,9,45,0.62)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, width: "min(520px, 96vw)", maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 24px 80px rgba(16,9,45,0.45)", padding: "26px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>{kicker}</p>
            <p style={{ margin: "0 0 12px", fontSize: 19, fontWeight: 800, color: "#1a1733" }}>{title}</p>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f0ecff", color: "#5c4eb5", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>✕ Close</button>
        </div>
        {children}
        {cta && (
          <a href={ctaHref} target="_blank" rel="noopener noreferrer" style={{
            display: "block", textAlign: "center", marginTop: 16, padding: "12px 20px",
            background: "#5c4eb5", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            {cta}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Ulrike, the Uplift chat box ──────────────────────────────────────────────────────
// Closed-book support chat over /api/portal-chat. Knows the program rulebook
// and this founder's live state, and routes everything else to
// uplift@techunited.co. Lives in the bottom-right stack with the event chips
// (passed in as children); opening the panel swaps the stack out, minimizing
// brings it back with the conversation kept.
function PortalBotWidget({ slug, firstName, children }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi ${firstName}! I'm the Uplift chat box. My name is Ulrike. I know this program inside and out, and impressively little else. Ask me questions from onboarding, about program requirements, resources, or how to structure your mentor meetings.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, busy]);

  const send = async () => {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft("");
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, question: q, history: next.slice(1, -1).slice(-8) }),
      });
      const data = await r.json();
      setMessages(m => [...m, {
        role: "assistant",
        content: data.answer || "Something glitched on my end. Email uplift@techunited.co and a human will help.",
      }]);
    } catch {
      setMessages(m => [...m, {
        role: "assistant",
        content: "Something glitched on my end. Email uplift@techunited.co and a human will help.",
      }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9998,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {open && (
        <div style={{
          width: "min(360px, calc(100vw - 40px))", height: "min(460px, calc(100vh - 120px))", borderRadius: 18, overflow: "hidden",
          background: "#fff", boxShadow: "0 18px 50px rgba(26,14,79,0.35)",
          display: "flex", flexDirection: "column", border: "1px solid #e6e2f5",
        }}>
          <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", color: "#fff", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🤖 Ulrike · Uplift Chat Box</div>
              <button onClick={() => setOpen(false)} title="Minimize (your chat is saved)" style={{
                border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 8,
                width: 30, height: 26, cursor: "pointer", fontSize: 16, fontWeight: 800, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 4,
              }}>–</button>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 3 }}>
              Automated. Knows the program, your progress, and impressively little else.
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "#f7f5ff" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "9px 13px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "linear-gradient(135deg, #3d2f8a, #5c4eb5)" : "#fff",
                color: m.role === "user" ? "#fff" : "#37324e",
                border: m.role === "user" ? "none" : "1px solid #e6e2f5",
                borderBottomRightRadius: m.role === "user" ? 4 : 14,
                borderBottomLeftRadius: m.role === "user" ? 14 : 4,
              }}>
                {m.content}
              </div>
            ))}
            {busy && (
              <div style={{
                alignSelf: "flex-start", padding: "9px 13px", borderRadius: 14, borderBottomLeftRadius: 4,
                background: "#fff", border: "1px solid #e6e2f5", fontSize: 13.5, color: "#8a84a3",
              }}>
                thinking<span className="botdots">...</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #ece8f8", background: "#fff", padding: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") send(); }}
                placeholder="Ask about the program or your progress..."
                maxLength={600}
                style={{
                  flex: 1, border: "1.5px solid #d9d3ef", borderRadius: 10, padding: "9px 12px",
                  fontSize: 13.5, fontFamily: "inherit", outline: "none", color: "#1a0e4f",
                }}
              />
              <button onClick={send} disabled={busy || !draft.trim()} style={{
                border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 700, fontSize: 13.5,
                fontFamily: "inherit", cursor: busy || !draft.trim() ? "default" : "pointer",
                background: busy || !draft.trim() ? "#d9d3ef" : "linear-gradient(135deg, #c0006e, #ff2d87)",
                color: "#fff",
              }}>Send</button>
            </div>
            <div style={{ fontSize: 10.5, color: "#8a84a3", marginTop: 7, textAlign: "center" }}>
              I&apos;m a bot. For real humans: uplift@techunited.co
            </div>
          </div>
        </div>
      )}

      {!open && (
        <>
          {children}
          <button onClick={() => setOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 17px", borderRadius: 30, border: "none",
            background: "linear-gradient(135deg, #1a0e4f 0%, #5c4eb5 100%)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 6px 20px rgba(26,14,79,0.4)",
          }}>
            🤖 Ask Ulrike
          </button>
        </>
      )}
    </div>
  );
}

// ─── Meeting structure check (Week 1) ────────────────────────────────────────
// Founders must open the Discover/Act/Roadmap guide before they can acknowledge it.
function MeetingStructureCheck({ slug }) {
  const [show, setShow] = useState(false);
  const [opened, setOpened] = useState(false);
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    setOpened(!!localStorage.getItem(`${slug}_meeting_guide_opened`));
    setAcked(!!localStorage.getItem(`${slug}_w2_structure_ack`));
  }, [slug]);

  const openGuide = () => {
    setShow(true);
    setOpened(true);
    localStorage.setItem(`${slug}_meeting_guide_opened`, "1");
  };
  const acknowledge = () => {
    setAcked(true);
    localStorage.setItem(`${slug}_w2_structure_ack`, "1");
    persistToSheet(slug, 2, "structure_ack", "I reviewed the structure", "Meeting structure reviewed (Discover / Act / Roadmap)");
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4f5", borderLeft: "4px solid #5c4eb5", padding: "20px 24px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
          📋 How should I structure my meetings?
        </p>
        <span style={{ background: "#fff3e0", color: "#b35c00", borderRadius: 4, padding: "1px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 }}>REQUIRED</span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6b6480", lineHeight: 1.6 }}>
        Your three meetings follow <strong style={{ color: "#3d2f8a" }}>Discover → Act → Roadmap</strong>. Review the one-pager before your first meeting: it tells you what to bring and what to leave with, meeting by meeting.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={openGuide} style={{
          border: "none", borderRadius: 8, padding: "9px 18px",
          background: "#5c4eb5", color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Open the guide
        </button>
        {acked ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7a4a" }}>✓ Structure reviewed and acknowledged</span>
        ) : (
          <>
            <button onClick={acknowledge} disabled={!opened} style={{
              borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700,
              fontFamily: "inherit",
              border: opened ? "1.5px solid #5c4eb5" : "1.5px solid #e8e4f5",
              background: "#fff", color: opened ? "#5c4eb5" : "#c0b8d8",
              cursor: opened ? "pointer" : "default",
            }}>
              I reviewed the structure
            </button>
            {!opened && (
              <span style={{ fontSize: 12, color: "#9b8fcf", fontStyle: "italic" }}>Open the guide first</span>
            )}
          </>
        )}
      </div>
      {show && <MeetingGuideModal onClose={() => setShow(false)} />}
    </div>
  );
}

// ─── Company at a glance modal (application snapshot) ────────────────────────
function CompanySnapshotModal({ mentee, onClose }) {
  const app = mentee.application || {};
  const snap = app.snapshot || {};
  const yn = (v) => v === true ? "Yes" : v === false ? "No" : (v ?? "\u2014");
  const rows = [
    ["Stage", mentee.stage],
    ["Industry", mentee.industry],
    ["Revenue (last 12 months)", snap.revenueRange],
    ["Generating revenue", yn(snap.generatingRevenue)],
    ["Employees", yn(snap.employees)],
    ["Hiring", snap.hiring],
    ["Raising capital", snap.raising],
    ["Previously raised outside capital", yn(snap.priorOutsideCapital)],
    ["Looking for customers or pilots", yn(snap.lookingForCustomers)],
    ["Seeking strategic partnerships", yn(snap.seekingPartnerships)],
    ["Based in", [app.city, mentee.county ? `${mentee.county} County` : null].filter(Boolean).join(", ")],
    ["Founder journey", app.journeyStage],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(16,9,45,0.62)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "min(560px, 96vw)", maxHeight: "90vh",
          overflowY: "auto", boxShadow: "0 24px 80px rgba(16,9,45,0.45)", padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
              🏢 My Company at a Glance
            </p>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#1a1733" }}>
              {mentee.company}{app.title ? ` · ${app.title}` : ""}
            </p>
          </div>
          <button onClick={onClose} style={{
            border: "none", background: "#f0ecff", color: "#5c4eb5", borderRadius: 8,
            padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
          }}>
            ✕ Close
          </button>
        </div>
        {app.bio && (
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#6b6480", fontStyle: "italic", lineHeight: 1.6 }}>
            &ldquo;{app.bio}&rdquo;
          </p>
        )}
        <div style={{ border: "1px solid #e8e4f5", borderRadius: 12, overflow: "hidden" }}>
          {rows.map(([label, val], i) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
              padding: "10px 16px", borderTop: i > 0 ? "1px solid #f0edf9" : "none",
              background: i % 2 ? "#fafafa" : "#fff",
            }}>
              <span style={{ fontSize: 13, color: "#6b6480", fontWeight: 500 }}>{label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: val === "Yes" ? "#1a6e42" : val === "No" ? "#9b8fcf" : "#1a1733",
                textAlign: "right",
              }}>{val}</span>
            </div>
          ))}
        </div>
        {app.hopingToAccomplish && (
          <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "12px 16px", marginTop: 14 }}>
            <p style={{ margin: "0 0 2px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>Hoping to accomplish</p>
            <p style={{ margin: 0, fontSize: 13, color: "#3d2f8a", lineHeight: 1.6 }}>{app.hopingToAccomplish}</p>
          </div>
        )}
        {app.valueSought && (
          <div style={{ background: "#fdf6e3", borderRadius: 10, padding: "12px 16px", marginTop: 10 }}>
            <p style={{ margin: "0 0 2px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#a37c1f" }}>What you want from mentorship</p>
            <p style={{ margin: 0, fontSize: 13, color: "#5c4a10", lineHeight: 1.6 }}>{app.valueSought}</p>
          </div>
        )}
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "#9b8fcf", fontStyle: "italic", lineHeight: 1.6 }}>
          From your application{app.submittedAt ? `, submitted ${app.submittedAt}` : ""}. Something changed? Tell us at{" "}
          <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600 }}>uplift@techunited.co</a> and we&apos;ll update it.
        </p>
      </div>
    </div>
  );
}

// ─── Meeting structure guide modal (Discover / Act / Roadmap one-pager) ──────
function MeetingGuideModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(16,9,45,0.62)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "min(920px, 96vw)", height: "min(92vh, 1100px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 80px rgba(16,9,45,0.45)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e8e4f5", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1733" }}>
            📋 How should I structure my meetings?
          </p>
          <button onClick={onClose} style={{
            border: "none", background: "#f0ecff", color: "#5c4eb5", borderRadius: 8,
            padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            ✕ Close
          </button>
        </div>
        <iframe
          src="/uplift-three-meetings-one-pager.html"
          title="Discover, Act, Roadmap: your three mentor meetings"
          style={{ border: "none", width: "100%", flex: 1 }}
        />
      </div>
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

  // Defined at component scope so both the effect and the render below can use them.
  const INVALID_NOTES = new Set(["n/a", "na", "none", "no", "nothing", "-", "n.a.", "n/a."]);
  const validNotes = n => { const t = n?.trim().toLowerCase(); return t && !INVALID_NOTES.has(t); };

  useEffect(() => {
    fetch(`/api/meetings?slug=${slug}`)
      .then(r => r.json())
      .then(async d => {
        // Fall cohort: ignore submissions from before the fall test window opened
        const FALL_CUTOFF = new Date("2026-08-26");
        const list = (d.meetings || []).filter(m => !m.submittedAt || new Date(m.submittedAt) >= FALL_CUTOFF);
        setMeetings(list);

        // Count qualifying sessions with half-credit for sub-60min sessions
        const count = list
          .filter(m => !m.denied && (validNotes(m.notes) || m.manuallyVerified))
          .reduce((sum, m) => sum + (m.minutes != null ? Math.round((m.minutes / 60) * 100) / 100 : 1.0), 0);

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
      <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "12px 18px", marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#3d2f8a", lineHeight: 1.6 }}>
          We review every one of these. AI vetted, human verified. Please give us some time to go through them; there are a lot of you. 😉
        </p>
      </div>
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
          href={`https://form.typeform.com/to/e0L62296?slug=${encodeURIComponent(slug)}`}
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
        const verifiedMeetings = meetings.filter(m => !m.denied && (validNotes(m.notes) || m.manuallyVerified));
        const verifiedCount = verifiedMeetings
          .reduce((sum, m) => sum + (m.minutes != null ? Math.round((m.minutes / 60) * 100) / 100 : 1.0), 0);
        const REQUIRED = 3;
        const pct = Math.min(Math.round((verifiedCount / REQUIRED) * 100), 100);
        const over = verifiedCount > REQUIRED ? verifiedCount - REQUIRED : 0;
        // Estimate: ceiling on remaining credit — even 2.99/3 still needs 1 more session
        const additionalNeeded = Math.ceil(Math.max(0, REQUIRED - verifiedCount));
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
            {additionalNeeded > 0 ? (
              <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, opacity: 0.85, lineHeight: 1.5 }}>
                ~{additionalNeeded} more session{additionalNeeded !== 1 ? "s" : ""} needed to reach your 180-minute goal
              </p>
            ) : (
              <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "#34d399", lineHeight: 1.5 }}>
                You're on track, goal reached!
              </p>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.55, fontStyle: "italic", lineHeight: 1.5 }}>
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
            href={`https://form.typeform.com/to/e0L62296?slug=${encodeURIComponent(slug)}`}
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
        const isVerified = m => !m.denied && (validNotes(m.notes) || m.manuallyVerified);
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
                    {half ? "½ Credit, Action Required" : `✓ ${m.manuallyVerified ? "Manually Verified" : "Verified"}`}
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
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: half ? "#b35c00" : "#1a6e42" }}>
                      {m.minutes != null ? `${m.minutes} minutes` : half ? "Under 60 minutes" : "60 minutes or more"}
                    </p>
                    {(() => {
                      const credit = m.minutes != null ? Math.round((m.minutes / 60) * 100) / 100 : half ? 0.5 : 1.0;
                      return (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: half ? "#b35c00" : "#1a6e42", fontWeight: 600 }}>
                          {credit} credit toward your 3.0 goal
                        </p>
                      );
                    })()}
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
                    ✓ Session received, under review
                  </p>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#3d54a8", lineHeight: 1.6 }}>
                    Don't worry if these aren't getting checked off automatically, sessions without a Granola transcript or that were under 60 minutes are reviewed internally by the program team.
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
                            Session under 60 min, requires manual review
                          </span>
                        )}
                        {!m.notes?.trim() && (
                          <span style={{
                            background: "#f5f5f5", color: "#555",
                            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500,
                          }}>
                            No Granola transcript, requires manual review
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
      .filter(e => e.name.startsWith("Educational Session"))
      .map(e => ({ ...e, weekNum: w.num, weekLabel: w.label, dateRange: w.dateRange }))
  );

  return (
    <div>
      <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "12px 18px", marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#3d2f8a", lineHeight: 1.6 }}>
          We review every one of these. AI vetted, human verified. Please give us some time to go through them; there are a lot of you. 😉
        </p>
      </div>
      {/* Welcome banner */}
      <div style={{
        background: "#f0faf5", borderRadius: 12, border: "1px solid #b8e8d0",
        padding: "18px 22px", marginBottom: 16,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#1a4a32" }}>
          👋 Hi there, thank you for participating in Uplift!
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#2d6e50", lineHeight: 1.7 }}>
          Educational session attendance is one of the few things that needs to be manually verified by our team. We appreciate your patience, if your attendance hasn't been updated within a week, please reach out to{" "}
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
            You'll notice sessions are labeled by cohort, <strong>Edison, Hopper, Bardeen, Lawrence,</strong> and <strong>Morrison</strong>, but these are simply a way to group participants and help you build closer relationships with your peers. You are welcome and encouraged to attend <em>any and all</em> sessions across every cohort.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4a4060", lineHeight: 1.75 }}>
            Our speakers bring a wide range of expertise that's relevant to founders at every stage and in every industry. We also know that schedules are unpredictable, Uplift is designed to be accessible and work around your life. If a time works for you, show up. Every session you attend counts toward your 3 required educational sessions.
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
              desc: "A structured fireside chat or lecture centered on a specific topic. These sessions feature a guest speaker and are more presentation-driven, you can submit questions live, but the format is curated to maximize what you take away.",
            },
            {
              label: "Industry Q&A",
              color: "#2a7fd4",
              bg: "#f0f7ff",
              desc: "A more open and conversational session with a guest. There's still some light structure, but the emphasis is on real dialogue, you'll have a genuine opportunity to ask questions, share your perspective, and engage directly with the speaker.",
            },
            {
              label: "Peer Development",
              color: "#0f9d6e",
              bg: "#f0faf5",
              desc: "A hands-on workshop designed to sharpen your professional skills. These sessions may or may not feature a guest, but they always put you and your cohort at the center, expect active participation, discussion, and practical takeaways.",
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
          * Educational session attendance is verified manually by the program team and updated every Tuesday. Sessions pending review are not automatically reflected here, and may take additional time to be updated.
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
    for (let w = 1; w <= 10; w++) {
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
                Week {w.num}, {w.title}
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
            What real progress looks like by November
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
            Deep Work · Week 1 Pre-Meeting Reflections
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
            Week 2, Before Your First Mentor Meeting
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
                🏆 Week 3, Win Shared with the Group
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#5a3e00", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{responses.w3_win}</p>
            </div>
          )}
          {(responses.w3_role_model || responses.w3_deploy_tactic) && (
            <div style={{ background: "#fff", padding: "16px 22px" }}>
              <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9b8fcf" }}>
                Week 3, Building With Intention
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
            Head to <strong>My Journey</strong> to fill in your weekly focus and reflections, they'll appear here once saved.
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

function MilestoneSection({ milestones, excused = {}, onNavigate, slug, meetings = [], lumaAttendance = [] }) {
  const isHolding = HOLDING_SLUGS.has(slug);
  const isVeryLateMatch = VERY_LATE_MATCH_SLUGS.has(slug);
  const isLateMatch = LATE_MATCH_SLUGS.has(slug);
  // Sheet keys unchanged from summer; labels and dues re-skinned for fall.
  const items = [
    { key: "participation",   label: "Confirmed Participation",     auto: true, due: "By Sep 9", week: 1 },
    { key: "onboarding",      label: "Onboarding Session Attended", due: "By Sep 13", contactMsg: "If you haven't attended an onboarding session yet, please reach out to us directly, we can help get you sorted." },
    { key: "mentorMatched",   label: "Matched with a Mentor",       due: "By Sep 20", contactMsg: "If you haven't been matched with a mentor yet, it likely means we don't have you recorded for an onboarding session. Please contact us directly so we can help." },
    { key: "mentorSession1",  label: "Discover · Meeting 1",        due: "Within 7 days of your match", week: 2 },
    { key: "mentorSession2",  label: "Act · Meeting 2",             due: "Within 10 days of Discover",  week: 3 },
    { key: "mentorSession3",  label: "Roadmap · Meeting 3",         due: "By Oct 23", week: 6 },
    { key: "edu1",            label: "Educational Session 1",       due: "By Oct 1",  week: 4 },
    { key: "edu2",            label: "Educational Session 2",       due: "By Nov 6",  week: 5 },
    { key: "edu3",            label: "Educational Session 3",       due: "By Nov 6",  week: 8 },
    { key: "midpoint",        label: "OverdriveAI Attended",       due: "Oct 27",    week: 7 },
    { key: "endSurvey",       label: "End Report & Exit Survey Completed", due: "By Nov 20", week: 8 },
    { key: "summit",          label: "Signature Verification Signed",      due: "By Nov 20", week: 8 },
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
        Milestones are manually confirmed by a TechUnited team member every Tuesday. No action needed from you, they'll update automatically. If something seems wrong here, please contact{" "}
        <a href="mailto:uplift@techunited.co" style={{ color: "#9b8fcf", fontWeight: 600 }}>uplift@techunited.co</a>.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => {
          const done = !!milestones[item.key];
          const isExcused = !!excused[item.key];
          const dueDate = parseDueDate(item.due);
          const overdue = !done && dueDate && today > dueDate;
          // Only participation is fully in the mentee's hands — everything else is staff-confirmed
          const menteeOwned = item.key === "participation";
          // For session milestones, check if the mentee has actually submitted something pending review
          const sessionIndex = { mentorSession1: 1, mentorSession2: 2, mentorSession3: 3 }[item.key];
          const pendingCount = meetings.filter(m => !m.denied).length;
          const hasPendingForThisSession = sessionIndex != null && pendingCount >= sessionIndex;
          const showAlert = overdue && menteeOwned && !hasPendingForThisSession;
          const daysPastDue = showAlert ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
          // For edu milestones, find registered/attended events not yet verified
          const eduIndex = { edu1: 1, edu2: 2, edu3: 3 }[item.key];
          const eduEvents = lumaAttendance.filter(e => e.eventType === "edu");
          const registeredEduEvents = eduEvents.filter(e => e.reviewStatus !== "approved" && (e.status === "registered" || e.status === "checked_in"));
          const verifiedEduCount = eduEvents.filter(e => e.reviewStatus === "approved").length;
          const registeredForThisEdu = eduIndex != null && !done && verifiedEduCount < eduIndex && registeredEduEvents.length >= (eduIndex - verifiedEduCount);
          const severelyOverdue = daysPastDue > 5;
          return (
            <div key={item.key} style={{
              background: severelyOverdue ? "#fff5f5" : showAlert ? "#fffbf5" : "#fff",
              borderRadius: 12,
              border: done ? "1px solid #b8e8d0" : severelyOverdue ? "1px solid #f5a0a0" : showAlert ? "1px solid #f5c97a" : "1px solid #e8e4f5",
              padding: "14px 20px",
              display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#22a366" : severelyOverdue ? "#fee2e2" : showAlert ? "#fef3c7" : "#f0ecff",
                color: done ? "#fff" : severelyOverdue ? "#c0392b" : showAlert ? "#b45309" : "#c0b8d8",
                fontSize: done ? 14 : 18,
                fontWeight: 700,
                marginTop: 2,
              }}>
                {done ? "✓" : "○"}
              </div>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 15, fontWeight: done ? 600 : 400,
                  color: done ? "#1a4a32" : severelyOverdue ? "#c0392b" : showAlert ? "#92400e" : "#6b6480",
                }}>
                  {item.label}
                </span>
                {item.due && (
                  <span style={{ fontSize: 11, fontStyle: "italic", color: done ? "#6abf97" : showAlert ? "#d97706" : "#b0a8cc" }}>
                    {item.due}
                  </span>
                )}
                {isExcused && (
                  <span style={{ marginTop: 4, fontSize: 12, color: "#3a7d5c", lineHeight: 1.6 }}>
                    Marked as an excused absence, this won't count against you. No action needed.
                  </span>
                )}
                {overdue && !menteeOwned && hasPendingForThisSession && (
                  <span style={{ marginTop: 4, fontSize: 12, color: "#7a7a9a", lineHeight: 1.6 }}>
                    Session received, under review. No action needed from you.
                  </span>
                )}
                {overdue && !menteeOwned && sessionIndex != null && !hasPendingForThisSession && (
                  <span style={{ marginTop: 4, fontSize: 12, color: "#b45309", lineHeight: 1.6 }}>
                    We haven't received this session yet. Please submit it or contact{" "}
                    <a href="mailto:uplift@techunited.co" style={{ color: "#b45309", fontWeight: 700, textDecoration: "none" }}>
                      uplift@techunited.co
                    </a>{" "}if you need help.
                  </span>
                )}
                {registeredForThisEdu && (
                  <span style={{ marginTop: 6, fontSize: 12, color: "#3d54a8", lineHeight: 1.6 }}>
                    Registered, pending verification:{" "}
                    {registeredEduEvents.slice(0, eduIndex - verifiedEduCount).map((e, i, arr) => (
                      <span key={i} style={{ fontWeight: 600 }}>
                        {e.eventName}{i < arr.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </span>
                )}
                {showAlert && (
                  <span style={{ marginTop: 4, fontSize: 12, color: severelyOverdue ? "#c0392b" : "#b45309", lineHeight: 1.6 }}>
                    ⚠️ This is past due. Please contact{" "}
                    <a href="mailto:uplift@techunited.co" style={{ color: severelyOverdue ? "#c0392b" : "#b45309", fontWeight: 700, textDecoration: "none" }}>
                      uplift@techunited.co
                    </a>{" "}immediately to provide a status update or request assistance.
                    {item.week && (
                      <>{" "}<button
                        onClick={() => onNavigate && onNavigate(item.week)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          color: severelyOverdue ? "#c0392b" : "#b45309", fontWeight: 700, fontSize: 12,
                          cursor: "pointer", textDecoration: "underline",
                          fontFamily: "inherit",
                        }}
                      >
                        Visit Week {item.week} →
                      </button></>
                    )}
                  </span>
                )}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {done && isExcused && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#22a366", background: "#f0faf5", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
                    EXCUSED ABSENCE
                  </span>
                )}
                {done && !isExcused && (
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
function CalendarSection({ milestones = {}, excused = {}, slug }) {
  // Map week number → the milestone key that marks it "done"
  const WEEK_MILESTONE = {
    1: "onboarding",
    2: "mentorSession1",
    3: "mentorSession2",
    6: "mentorSession3",
    7: "midpoint",
    8: "endSurvey",
  };

  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: "#6b6480" }}>
        All program sessions and milestones across the 8-week Uplift Fall 2026 schedule.
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
            You'll notice sessions are labeled by cohort, <strong>Edison, Hopper, Bardeen, Lawrence,</strong> and <strong>Morrison</strong>, but these are simply a way to group participants and help you build closer relationships with your peers. You are welcome and encouraged to attend <em>any and all</em> sessions across every cohort.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4a4060", lineHeight: 1.75 }}>
            Our speakers bring a wide range of expertise that's relevant to founders at every stage and in every industry, no session is off-limits based on your cohort. We also know that schedules are unpredictable. Uplift is designed to be accessible and work around your life, which means you should never have to miss a session just because it's labeled for a different group. If a time works for you, show up.
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
              desc: "A structured fireside chat or lecture centered on a specific topic. These sessions feature a guest speaker and are more presentation-driven, you can submit questions live, but the format is curated to maximize what you take away.",
            },
            {
              label: "Industry Q&A",
              color: "#2a7fd4",
              bg: "#f0f7ff",
              desc: "A more open and conversational session with a guest. There's still some light structure, but the emphasis is on real dialogue, you'll have a genuine opportunity to ask questions, share your perspective, and engage directly with the speaker.",
            },
            {
              label: "Peer Development",
              color: "#0f9d6e",
              bg: "#f0faf5",
              desc: "A hands-on workshop designed to sharpen your professional skills. These sessions may or may not feature a guest, but they always put you and your cohort at the center, expect active participation, discussion, and practical takeaways.",
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
        const isExcused = milestoneKey && !!excused[milestoneKey];
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
                {isExcused ? "✓ Excused" : "✓ Completed"}
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
              <a href={`https://form.typeform.com/to/e0L62296?slug=${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: week.submitPrimary ? "#5c4eb5" : "#9a7200", textDecoration: "underline", textUnderlineOffset: "3px" }}>
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
        💡 Pro tip, heart any resource below to instantly pin it to your own Favorites section at the top.
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
            Cohort {myCohort.num}, {myCohort.name}
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
            <span style={{ background: "#f0faf5", color: "#22a366", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>Cohort {mentee.cohort}, {myCohort?.name}</span>
          </div>
        </div>
      </div>

      {/* Cohort directory — own cohort */}
      <p style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#1a1733" }}>
        Cohort {mentee.cohort}, {myCohort?.name}, Your Fellow Founders
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 40 }}>
        {cohortMates.map((m) => (
          <FounderCard key={m.slug} m={m} isSelf={m.slug === slug} />
        ))}
      </div>

      {/* Browse other cohorts (hidden while the fall directory is just this cohort) */}
      {(allCohortMembers || []).length > 0 && (
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
                  Cohort {c.num}, {c.namesake}
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
      )}
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
        A log of every Uplift event you've registered for or attended. Attendance is verified manually by the program team, you'll see the status update here once it's confirmed.
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

// ─── Pitch Showcase announcement modal ────────────────────────────────────────
function PitchShowcaseModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(16, 8, 46, 0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
        animation: "upliftFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes upliftFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes upliftPopIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, maxWidth: 480,
          width: "100%", maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(16,8,46,0.4)",
          animation: "upliftPopIn 0.25s ease",
        }}
      >
        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg, #1a0e4f 0%, #4a0077 55%, #c0006e 100%)",
          borderRadius: "20px 20px 0 0", padding: "28px 28px 24px",
          color: "#fff", position: "relative", overflow: "hidden",
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 14, right: 14,
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)", border: "none",
              color: "#fff", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
          <div style={{
            display: "inline-block", background: "rgba(255,255,255,0.16)",
            borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14,
          }}>
            🎤 New · August 4th Summit
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
            The Summit is now a Pitch Showcase
          </h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.55 }}>
            Three of you get the stage to pitch your company live. Here's how to grab a slot.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          <p style={{ margin: "0 0 18px", fontSize: 14.5, color: "#3a3555", lineHeight: 1.65 }}>
            We've been blown away by this cohort, and we want to give a few of you the stage to show it off. There are <strong>three showcase slots</strong>. To apply, submit a deck plus a <strong>2–3 minute Loom video pitch</strong> on you and your company. Make it compelling and intriguing, something an audience will genuinely connect with. Our Tech United team reviews every submission and selects the top three.
          </p>

          {/* Key details */}
          <div style={{
            background: "#f7f5ff", borderRadius: 14, padding: "16px 18px", marginBottom: 18,
          }}>
            {[
              ["📅", <>Submit anytime, but <strong>all submissions due July 28th</strong>.</>],
              ["🎯", <>Finalists each get <strong>5 minutes to pitch</strong> + <strong>5 minutes of audience Q&amp;A</strong>.</>],
              ["🏆", <>The audience votes for an <strong>Audience Choice winner</strong>.</>],
              ["✅", <>To be eligible, you must have <strong>3 mentorship meetings completed by July 28th</strong>. Behind? Reach out, we'll help you get there.</>],
            ].map(([icon, text], i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i === 3 ? 0 : 11 }}>
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
                <span style={{ fontSize: 13.5, color: "#3a3555", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b6480", lineHeight: 1.55, fontStyle: "italic" }}>
            Working on your pitch might be a great reason to grab that mentor session. 😉
          </p>

          <a
            href="https://form.typeform.com/to/nKdey4RQ"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            style={{
              display: "block", textAlign: "center", padding: "14px 20px",
              borderRadius: 10, background: "linear-gradient(135deg, #5c4eb5 0%, #c0006e 100%)",
              color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 6px 20px rgba(92,78,181,0.35)",
            }}
          >
            Submit your application →
          </a>
          <button
            onClick={onClose}
            style={{
              display: "block", width: "100%", marginTop: 10, padding: "10px",
              border: "none", background: "none", color: "#9b8fcf",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coffee meetup announcement modal ─────────────────────────────────────────
function CoffeeMeetupModal({ onClose }) {
  const dates = [
    { label: "RSVP · Mon July 20", url: "https://luma.com/484rkj45" },
    { label: "RSVP · Mon July 27", url: "https://luma.com/9gvf5pkb" },
    { label: "RSVP · Mon Aug 3", url: "https://luma.com/8wd7c753" },
  ];
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(16, 8, 46, 0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
        animation: "upliftFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes upliftFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes upliftPopIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, maxWidth: 480,
          width: "100%", maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(16,8,46,0.4)",
          animation: "upliftPopIn 0.25s ease",
        }}
      >
        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg, #2d1608 0%, #7a3d14 55%, #c97b2d 100%)",
          borderRadius: "20px 20px 0 0", padding: "28px 28px 24px",
          color: "#fff", position: "relative", overflow: "hidden",
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 14, right: 14,
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)", border: "none",
              color: "#fff", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
          <div style={{
            display: "inline-block", background: "rgba(255,255,255,0.16)",
            borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14,
          }}>
            ☕ New · Every Monday
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
            Join us in person for coffee
          </h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.55 }}>
            Casual Monday meetups with your cohort, and your mentor.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 14.5, color: "#3a3555", lineHeight: 1.65 }}>
            You asked for more ways to connect, with your mentor and with the rest of the cohort. This is exactly that.
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 14.5, color: "#3a3555", lineHeight: 1.65 }}>
            There's no presentation, no agenda, and no pressure. Just a casual space to grab coffee, meet other founders, and spend time with your mentor in person.
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 14.5, color: "#3a3555", lineHeight: 1.65 }}>
            Come on your own, bring your mentor, or invite your development team if they're available. Whether you're looking to knock out some dedicated 1:1 time, expand your network, or simply have an excuse to meet face-to-face, we'd love to see you.
          </p>

          {/* Key details */}
          <div style={{ background: "#fdf6ec", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
            {[
              ["📅", <>Any of the next three Mondays, <strong>July 20, July 27, and August 3</strong>.</>],
              ["🕠", <><strong>5:30–7:00 PM</strong> at <strong>Haraz Coffee in Hoboken</strong>.</>],
              ["☕", <>Coffee, tea, and decaf are on us.</>],
              ["🎲", <>A few optional icebreakers and games to get conversations started, mostly we'll let everyone mingle naturally.</>],
            ].map(([icon, text], i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i === 3 ? 0 : 11 }}>
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
                <span style={{ fontSize: 13.5, color: "#3a3555", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          {dates.map((d, i) => (
            <a
              key={i}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", textAlign: "center", padding: "12px 20px",
                borderRadius: 10, background: "linear-gradient(135deg, #7a3d14 0%, #c97b2d 100%)",
                color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
                marginBottom: 10, boxShadow: "0 4px 14px rgba(122,61,20,0.3)",
              }}
            >
              {d.label} →
            </a>
          ))}
          <button
            onClick={onClose}
            style={{
              display: "block", width: "100%", marginTop: 4, padding: "10px",
              border: "none", background: "none", color: "#9b8fcf",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mentor office hours announcement modal ───────────────────────────────────
function OfficeHoursModal({ onClose }) {
  const sessions = [
    { day: "Tue, July 21", time: "12:30–1:00 PM", url: "https://luma.com/to3qzkei" },
    { day: "Wed, July 22", time: "8:00–9:00 AM", url: "https://luma.com/1x08hum7" },
    { day: "Thu, July 23", time: "8:00–9:00 AM", url: "https://luma.com/k5i56qxl" },
    { day: "Tue, July 28", time: "12:30–1:00 PM", url: "https://luma.com/xicbroar" },
    { day: "Wed, July 29", time: "8:00–9:00 AM", url: "https://luma.com/e2x9abad" },
    { day: "Thu, July 30", time: "8:00–9:00 AM", url: "https://luma.com/m4rr4gjj" },
  ];
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(16, 8, 46, 0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
        animation: "upliftFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes upliftFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes upliftPopIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, maxWidth: 500,
          width: "100%", maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(16,8,46,0.4)",
          animation: "upliftPopIn 0.25s ease",
        }}
      >
        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg, #0c2e24 0%, #1a6e50 55%, #2a9d6e 100%)",
          borderRadius: "20px 20px 0 0", padding: "28px 28px 24px",
          color: "#fff", position: "relative", overflow: "hidden",
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 14, right: 14,
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)", border: "none",
              color: "#fff", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
          <div style={{
            display: "inline-block", background: "rgba(255,255,255,0.16)",
            borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14,
          }}>
            🤝 New · Mentor Office Hours
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
            Need help meeting with your mentor?
          </h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.55 }}>
            Check out these semi-structured opportunities.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 14.5, color: "#3a3555", lineHeight: 1.65 }}>
            The easy way to get your 1:1 time in, no scheduling back and forth required. We've set aside <strong>six standing office hour sessions</strong> that you and your mentor can use for your required 1:1 meetings. Instead of trying to coordinate calendars, simply choose one of the times below and invite your mentor to join you.
          </p>

          {/* How it works */}
          <div style={{ background: "#f0faf5", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#1a6e50" }}>
              How it works
            </p>
            {[
              "Choose one of the office hour times below that works for you.",
              "Send your mentor the link and ask if they're available to join that session.",
              "Once your mentor confirms, both of you join using the same link at the scheduled time.",
              "We'll kick things off with a quick 5-minute welcome, icebreaker, and conversation prompt.",
              "Then, each mentor pair will be moved into a private breakout room for your normal 1:1 conversation.",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i === 4 ? 0 : 9 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: "#1a6e50", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, marginTop: 1,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13.5, color: "#3a3555", lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>

          {/* Session grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            {sessions.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", padding: "10px 12px", borderRadius: 10,
                  border: "1.5px solid #bfe8d5", background: "#fff",
                  textDecoration: "none",
                }}
              >
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1a6e50" }}>{s.day} ↗</span>
                <span style={{ display: "block", fontSize: 12, color: "#3a3555" }}>{s.time}</span>
              </a>
            ))}
          </div>

          <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "#3a3555", lineHeight: 1.6 }}>
            These sessions are optional but highly encouraged if scheduling has been a challenge. You're still welcome to meet with your mentor outside of these office hours.
          </p>

          {/* Reminders */}
          <div style={{ background: "#f7f5ff", borderRadius: 14, padding: "14px 16px", marginBottom: 6 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#5c4eb5" }}>
              A few reminders
            </p>
            {[
              <>Please <strong>confirm with your mentor before joining</strong>. These sessions depend on your mentor's availability, they won't automatically be attending.</>,
              <>You'll still <strong>submit your meeting form</strong> and key takeaways afterward, just as you would for any other mentor meeting.</>,
              <>A 30-minute meeting counts as <strong>½ session</strong>, and a full hour counts as <strong>1 full session</strong> toward your program requirements.</>,
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i === 2 ? 0 : 8 }}>
                <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.5 }}>•</span>
                <span style={{ fontSize: 13, color: "#3a3555", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              display: "block", width: "100%", marginTop: 12, padding: "10px",
              border: "none", background: "none", color: "#9b8fcf",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Got it, thanks
          </button>
        </div>
      </div>
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
      [1, "2026-09-09"], [2, "2026-09-14"], [3, "2026-09-21"],
      [4, "2026-09-28"], [5, "2026-10-05"], [6, "2026-10-12"],
      [7, "2026-10-26"], [8, "2026-11-02"],
    ];
    for (let i = starts.length - 1; i >= 0; i--) {
      if (today >= new Date(starts[i][1])) return starts[i][0];
    }
    return 1;
  });
  const [liveMilestones, setLiveMilestones] = useState(null);
  const [excusedMilestones, setExcusedMilestones] = useState({});
  const [lumaAttendance, setLumaAttendance] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // "showcase" | "coffee" | "officehours" | null

  // Fetch live milestone data from Google Sheets on load
  useEffect(() => {
    if (!menteeData) return;
    fetch(`/api/milestones?slug=${menteeData.slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.milestones) setLiveMilestones(data.milestones);
        if (data.excused) setExcusedMilestones(data.excused);
      })
      .catch(() => {});
  }, [menteeData]);

  // Fetch this mentee's meetings at page level so MilestoneSection can flag
  // sessions that are submitted but still pending review.
  useEffect(() => {
    if (!menteeData) return;
    fetch(`/api/meetings?slug=${encodeURIComponent(menteeData.slug)}`)
      .then((r) => r.json())
      .then((d) => setMeetings(Array.isArray(d.meetings) ? d.meetings : []))
      .catch(() => {});
  }, [menteeData]);

  // Fetch Luma attendance at page level so MilestoneSection can use it
  useEffect(() => {
    if (!menteeData) return;
    fetch(`/api/luma-mentee-attendance?slug=${encodeURIComponent(menteeData.slug)}`)
      .then(r => r.json())
      .then(d => setLumaAttendance(d.attendance || []))
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
  // Week 1 gate: onboarding attended (auto-verified from the Luma tag) + Deep Work
  // written (five things + primary goal) + quiz passed. Recomputed on a short poll
  // because Deep Work and the quiz persist to localStorage. Prototype-grade.
  const [week1Done, setWeek1Done] = useState(false);
  useEffect(() => {
    const DEEP_WORK_KEYS = ["five_relationship", "five_clarity", "five_resources", "five_mentor", "five_community", "primary_refine"];
    const check = () => {
      const deepWork = DEEP_WORK_KEYS.every(k => (localStorage.getItem(`${slug}_w1_${k}`) || "").trim());
      const quiz = !!localStorage.getItem(`${slug}_quiz_passed`);
      const onboarded = !!(liveMilestones?.onboarding);
      setWeek1Done(deepWork && quiz && onboarded);
    };
    check();
    const t = setInterval(check, 2000);
    return () => clearInterval(t);
  }, [slug, liveMilestones]);

  // Driven by live milestones (Admin tab "Unlock Mentor" checkbox) AND the Week 1 gate
  const mentorUnlocked = (liveMilestones?.mentorMatched ?? mentee.mentorUnlocked) && week1Done;
  // Only dereference mentee.mentor when it actually exists — a match can read as
  // unlocked from the live sheet before the static mentor record is populated.
  const hasMentor = mentorUnlocked && !!mentee.mentor;
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

  // Announcement modals — each shows once per mentee (until dismissed), in order.
  const MODAL_ORDER = []; // summer modals retired for fall; re-add fall announcements here
  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    const next = MODAL_ORDER.find((k) => {
      try { return !localStorage.getItem(`${k}_seen_${slug}`); } catch { return false; }
    });
    if (next) setActiveModal(next);
  }, [isAuthenticated, slug]);

  const dismissModal = () => {
    if (!activeModal) return;
    try { localStorage.setItem(`${activeModal}_seen_${slug}`, "1"); } catch {}
    const rest = MODAL_ORDER.slice(MODAL_ORDER.indexOf(activeModal) + 1);
    const next = rest.find((k) => {
      try { return !localStorage.getItem(`${k}_seen_${slug}`); } catch { return false; }
    });
    setActiveModal(next || null);
  };

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
      const cert = CERTIFICATES[slug];
      const ms = liveMilestones || mentee.milestones || {};
      const signed = !!ms.summit; // Signature Verification Signed (BreezeDoc)
      const awaitingSignature = !signed && !!ms.endSurvey;
      if (cert && signed) {
        return (
          <div style={{
            background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5",
            padding: "48px 32px", textAlign: "center", maxWidth: 560, margin: "0 auto",
            boxShadow: "0 2px 14px rgba(17,4,101,0.08)",
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <p style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#1a1733" }}>
              Congratulations, your certificate is here.
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b6480", lineHeight: 1.7 }}>
              {mentee.first}, your BreezeDoc signature is verified and every requirement of the
              Uplift Mentorship Program is complete. Your official certificate, signed by
              TechUnited:NJ, is ready.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 26 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#f0ecff", borderRadius: 20, padding: "5px 14px",
                fontSize: 12, fontWeight: 700, color: "#5c4eb5",
              }}>
                Certificate ID · {cert.id}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#fcf0f6", borderRadius: 20, padding: "5px 14px",
                fontSize: 12, fontWeight: 700, color: "#c0006e",
              }}>
                Awarded · {cert.date}
              </span>
            </div>
            <a
              href={encodeURI(cert.file)}
              target="_blank"
              rel="noopener noreferrer"
              download
              style={{
                display: "inline-block", padding: "13px 30px", borderRadius: 30,
                background: "linear-gradient(135deg, #5c4eb5 0%, #c0006e 100%)",
                color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none",
                boxShadow: "0 6px 20px rgba(92,78,181,0.35)",
              }}
            >
              ⬇ Download your certificate (PDF)
            </a>
            <p style={{ margin: "18px 0 0", fontSize: 12, color: "#9b8fcf", lineHeight: 1.6 }}>
              Letter size, ready to print or share on LinkedIn.
            </p>
          </div>
        );
      }
      if (signed) {
        return (
          <div style={{
            background: "#f0faf5", borderRadius: 14, border: "1px solid #b8e8d0",
            padding: "48px 32px", textAlign: "center", maxWidth: 520, margin: "0 auto",
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#1a6e42" }}>
              Congratulations, your signature is verified.
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "#2a7f5a", lineHeight: 1.8 }}>
              Your certificate is being stamped with its number and lands right here shortly.
            </p>
          </div>
        );
      }
      if (awaitingSignature) {
        return (
          <div style={{
            background: "#fff", borderRadius: 14, border: "2px solid #f5d97a",
            padding: "48px 32px", textAlign: "center", maxWidth: 520, margin: "0 auto",
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📬</div>
            <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#7a5c00" }}>
              One signature between you and your certificate.
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6b6480", lineHeight: 1.8 }}>
              Check your email: a BreezeDoc is waiting for you. It asks you to verify that your
              logged educational sessions and mentor meetings are accurate. The moment we verify
              your signature, this page unlocks with your certificate.
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: "#9b8fcf", fontStyle: "italic" }}>
              Can&apos;t find it? Search your inbox for &ldquo;BreezeDoc&rdquo; or email uplift@techunited.co.
            </p>
          </div>
        );
      }
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
            Complete the program, submit your end report and exit survey, then sign the BreezeDoc
            that lands in your email. The moment your signature is verified, your certificate
            unlocks right here.
          </p>
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
        weekContent = <WeekReflection weekNum={week.num} slug={slug} prompts={promptBlocks} menteeName={`${mentee.first} ${mentee.last}`.trim()} milestones={liveMilestones || mentee.milestones || {}} />;
    }
    return (
      <>
        <WeeklyPulse slug={slug} weekNum={week.num} />
        {week.num >= 2 && <WinOfTheWeek slug={slug} weekNum={week.num} />}
        {weekContent}
      </>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "journey": return renderWeekContent();
      case "calendar": return <CalendarSection milestones={liveMilestones || mentee.milestones || {}} excused={excusedMilestones} slug={slug} />;
      case "resources": return <ResourcesSection slug={slug} menteeName={`${mentee.first} ${mentee.last}`.trim()} />;
      case "milestones": return <MilestoneSection milestones={liveMilestones || mentee.milestones || {}} excused={excusedMilestones} onNavigate={(week) => { setActiveTab("journey"); setActiveWeek(week); }} slug={slug} meetings={meetings || []} lumaAttendance={lumaAttendance} />;
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
        <title>{mentee.first} {mentee.last} · Uplift Fall 2026</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/uplift-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Archivo+Black&display=swap" rel="stylesheet" />
      </Head>

      {activeModal === "showcase" && <PitchShowcaseModal onClose={dismissModal} />}
      {activeModal === "coffee" && <CoffeeMeetupModal onClose={dismissModal} />}
      {activeModal === "officehours" && <OfficeHoursModal onClose={dismissModal} />}
      {activeModal === "company" && <CompanySnapshotModal mentee={mentee} onClose={dismissModal} />}
      {/* Bottom-right stack: Ulrike, the Uplift chat box. The fall-hours/
          coffee/demo chips from summer (office hours, coffee meetups, AI
          Demo Night pitch submission) were removed twice now — not relevant
          to this cohort. If they reappear again, check for a stale branch
          or worktree reintroducing this block before re-removing by hand. */}
      <PortalBotWidget slug={mentee.slug} firstName={mentee.first} />

      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", padding: "28px 24px 24px", color: "#fff" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <img src="/uplift-logo-white.png" alt="Uplift" style={{ height: 36, marginBottom: 18, display: "block" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Cohort {mentee.cohort}{myCohortHeader ? `, ${myCohortHeader.name}` : ""}
              </div>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Uplift Fall 2026
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
              {mentee.application ? (
                <TabTooltip tip="Your company at a glance" direction="down">
                  <button onClick={() => setActiveModal("company")} style={{
                    border: "none", cursor: "pointer",
                    background: "rgba(255,255,255,0.18)", borderRadius: 20,
                    padding: "4px 12px", boxShadow: "0 0 0 1.5px rgba(255,255,255,0.55)",
                    color: "#fff", fontSize: 14, fontFamily: "inherit", fontWeight: 700,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                    🏢 {mentee.company}
                  </button>
                </TabTooltip>
              ) : mentee.company} · {mentee.stage} · {mentee.industry}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13,
                }}>
                  {hasMentor ? mentee.mentor.initials : "?"}
                </div>
                <div>
                  {hasMentor ? (
                    <>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{mentee.mentor.name}</p>
                      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>{mentee.mentor.title}</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Mentor TBD</p>
                      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>Unlocks after your Week 1 action items + program-wide onboarding completion</p>
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
          TechUnited:NJ · Uplift Fall 2026 · Your responses sync to Google Sheets
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

  // The fall test cohort is just the three test founders; summer alumni stay
  // out of this directory. Grows with application ingest.
  const FALL_ROSTER = ["kennedy", "mj", "hana"];

  const cohortMates = MENTEES
    .filter((m) => FALL_ROSTER.includes(m.slug))
    .map(directoryFields);

  const allCohortMembers = [];

  return { props: { menteeData: { ...mentee, milestones: mentee.milestones }, cohortMates, allCohortMembers } };
}
