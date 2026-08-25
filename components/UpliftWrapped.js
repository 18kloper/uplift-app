// Uplift Wrapped — Spotify-Wrapped-style story experience.
// Full-height slides you tap through: segmented progress bar, one idea per
// screen, loud per-slide color blocks, oversized type, and a shareable
// summary card at the end. Rendered by pages/[mentee].js when the mentee's
// slug has an entry in WRAPPED_DATA; slides are skipped automatically when a
// founder's data is too sparse to support them.

import { useState, useEffect, useCallback } from "react";
import { COHORT_PULSE_AVG, COHORT_STATS } from "../lib/wrapped-data";

const PULSE_EMOJI = ["😌", "🙂", "😊", "😄", "🚀"];
const DISPLAY_FONT = "'Archivo Black', 'Inter', system-ui, sans-serif";
const BODY_FONT = "'Inter', system-ui, sans-serif";

// Loud flat color blocks, Spotify style, anchored to the Uplift palette
const THEMES = {
  navy:   { bg: "#16123a", fg: "#ffffff", accent: "#ff4b8b", dim: "rgba(255,255,255,0.55)" },
  pink:   { bg: "#e8256d", fg: "#ffffff", accent: "#ffd166", dim: "rgba(255,255,255,0.65)" },
  lime:   { bg: "#d4f24b", fg: "#16123a", accent: "#7c3aed", dim: "rgba(22,18,58,0.6)" },
  purple: { bg: "#5b21b6", fg: "#ffffff", accent: "#d4f24b", dim: "rgba(255,255,255,0.6)" },
  gold:   { bg: "#ffd166", fg: "#16123a", accent: "#e8256d", dim: "rgba(22,18,58,0.6)" },
  cobalt: { bg: "#2743e0", fg: "#ffffff", accent: "#d4f24b", dim: "rgba(255,255,255,0.6)" },
  cream:  { bg: "#fbf7ef", fg: "#16123a", accent: "#e8256d", dim: "rgba(22,18,58,0.55)" },
};

// ─── Decorative shapes ────────────────────────────────────────────────────────

function Starburst({ color, size = 340, style = {} }) {
  return (
    <div className="uw-spin" style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      background: `repeating-conic-gradient(${color} 0deg 7deg, transparent 7deg 26deg)`,
      opacity: 0.22, pointerEvents: "none", ...style,
    }} />
  );
}

function Checker({ color, style = {} }) {
  return (
    <div style={{
      position: "absolute", height: 56, left: 0, right: 0,
      background: `repeating-conic-gradient(${color} 0% 25%, transparent 0% 50%)`,
      backgroundSize: "28px 28px", opacity: 0.18, pointerEvents: "none", ...style,
    }} />
  );
}

function Arcs({ color, size = 300, style = {} }) {
  return (
    <div style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      background: `repeating-radial-gradient(circle at center, transparent 0 16px, ${color} 16px 19px)`,
      opacity: 0.16, pointerEvents: "none", ...style,
    }} />
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

function Kicker({ t, children }) {
  return (
    <p className="uw-rise" style={{
      margin: "0 0 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.22em",
      textTransform: "uppercase", color: t.dim, fontFamily: BODY_FONT,
    }}>
      {children}
    </p>
  );
}

function BigNumber({ t, children, delay = 0.15 }) {
  return (
    <p className="uw-pop" style={{
      margin: 0, fontFamily: DISPLAY_FONT, color: t.fg, lineHeight: 0.95,
      fontSize: "clamp(72px, 26vw, 112px)", letterSpacing: "-2px",
      animationDelay: `${delay}s`,
    }}>
      {children}
    </p>
  );
}

function MoodChart({ t, pulses }) {
  const weeks = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="uw-rise" style={{ animationDelay: "0.25s", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
        {weeks.map((w, i) => {
          const mine = pulses[w];
          const cohort = COHORT_PULSE_AVG[w];
          return (
            <div key={w} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
              {mine ? (
                <>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{PULSE_EMOJI[mine - 1]}</span>
                  <div className="uw-grow" style={{
                    width: "100%", maxWidth: 24, height: mine * 19,
                    borderRadius: "6px 6px 2px 2px", background: t.fg,
                    transformOrigin: "bottom", animationDelay: `${0.3 + i * 0.05}s`,
                  }} />
                </>
              ) : (
                <div style={{ width: "100%", maxWidth: 24, height: 5, borderRadius: 3, background: t.dim, opacity: 0.5 }} />
              )}
              <div style={{ width: "100%", maxWidth: 24, position: "relative", height: 0 }}>
                <div style={{
                  position: "absolute", left: "-18%", right: "-18%",
                  bottom: cohort * 19 + 3, height: 3, borderRadius: 2, background: t.accent,
                }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
        {weeks.map((w) => (
          <span key={w} style={{ flex: 1, textAlign: "center", fontSize: 9, fontWeight: 700, color: t.dim, fontFamily: BODY_FONT }}>W{w}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: t.dim, fontFamily: BODY_FONT }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: t.fg, display: "inline-block" }} /> You
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 3, background: t.accent, display: "inline-block" }} /> Cohort average
        </span>
      </div>
    </div>
  );
}

// ─── Slide contents ───────────────────────────────────────────────────────────

function SlideContent({ kind, t, mentee, wrapped }) {
  const { stats, pulses, moodNarrative, founderType, themes = [], moments = [], quote, sparse } = wrapped;

  switch (kind) {
    case "intro":
      return (
        <>
          <Starburst color="#ff4b8b" style={{ top: -110, right: -110 }} />
          <Starburst color="#ffd166" size={240} style={{ bottom: -80, left: -90 }} />
          <div className="uw-pop" style={{ fontSize: 58, marginBottom: 18 }}>✨</div>
          <p className="uw-pop" style={{ margin: "0 0 10px", fontFamily: DISPLAY_FONT, fontSize: 44, lineHeight: 1.02, letterSpacing: "-1px", animationDelay: "0.1s" }}>
            Uplift<br />Wrapped
          </p>
          <p className="uw-rise" style={{ margin: "0 0 26px", fontSize: 12, fontWeight: 800, letterSpacing: "0.24em", textTransform: "uppercase", color: t.accent, animationDelay: "0.3s" }}>
            Summer 2026
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 15, color: t.dim, animationDelay: "0.45s" }}>
            Made for {mentee.first}.
          </p>
          <p className="uw-rise" style={{ position: "absolute", bottom: 26, left: 0, right: 0, margin: 0, fontSize: 12, fontWeight: 700, color: t.dim, animationDelay: "0.8s" }}>
            Tap to begin →
          </p>
        </>
      );

    case "weeks":
      return (
        <>
          <Checker color={t.fg} style={{ top: 0 }} />
          <Kicker t={t}>The season</Kicker>
          <p className="uw-rise" style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800 }}>You showed up.</p>
          <BigNumber t={t}>{stats.weeksActive}</BigNumber>
          <p className="uw-rise" style={{ margin: "10px 0 22px", fontSize: 17, fontWeight: 800, color: t.accent, animationDelay: "0.35s" }}>
            weeks in the arena
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 14, color: t.dim, animationDelay: "0.5s" }}>
            {stats.reflections} reflections · {stats.checkIns} pulse check-ins
          </p>
        </>
      );

    case "finish":
      return (
        <>
          <Checker color={t.fg} style={{ top: 0 }} />
          <Kicker t={t}>The finish line</Kicker>
          <BigNumber t={t}>100%</BigNumber>
          <p className="uw-rise" style={{ margin: "10px 0 24px", fontSize: 17, fontWeight: 800, color: t.accent, animationDelay: "0.35s" }}>
            of the program completed
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 14.5, color: t.dim, lineHeight: 1.8, animationDelay: "0.5s" }}>
            Three mentor sessions. Three educational sessions. The Midpoint Meetup. The Summit. Every milestone, done.
          </p>
        </>
      );

    case "words":
      return (
        <>
          <Arcs color={t.fg} style={{ top: -90, left: -90 }} />
          <Kicker t={t}>The receipts</Kicker>
          <p className="uw-rise" style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800 }}>You wrote</p>
          <BigNumber t={t}>{stats.words.toLocaleString()}</BigNumber>
          <p className="uw-rise" style={{ margin: "10px 0 22px", fontSize: 17, fontWeight: 800, color: t.accent, animationDelay: "0.35s" }}>
            words of strategy
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 14, color: t.dim, animationDelay: "0.5s" }}>
            Goals, reflections, wins, and hard questions. All of it yours.
          </p>
        </>
      );

    case "mood":
      return (
        <>
          <Kicker t={t}>💫 Your mood journey</Kicker>
          <MoodChart t={t} pulses={pulses} />
          {moodNarrative && (
            <p className="uw-rise" style={{ margin: "20px 0 0", fontSize: 13.5, color: t.fg, opacity: 0.9, lineHeight: 1.65, textAlign: "left", animationDelay: "0.5s" }}>
              {moodNarrative}
            </p>
          )}
        </>
      );

    case "typeTease":
      return (
        <>
          <Arcs color="#ff4b8b" size={380} style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          <p className="uw-rise" style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 800, lineHeight: 1.4 }}>
            Every founder has a type.
          </p>
          <p className="uw-pop" style={{ margin: 0, fontFamily: DISPLAY_FONT, fontSize: 34, color: t.accent, animationDelay: "0.5s" }}>
            Yours is…
          </p>
        </>
      );

    case "typeReveal":
      return (
        <>
          <Starburst color="#e8256d" size={420} style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          <Kicker t={t}>🧠 Your founder type</Kicker>
          <div className="uw-pop" style={{ fontSize: 54, marginBottom: 10, animationDelay: "0.1s" }}>{founderType.emoji}</div>
          <p className="uw-pop" style={{ margin: "0 0 12px", fontFamily: DISPLAY_FONT, fontSize: "clamp(26px, 8vw, 34px)", lineHeight: 1.05, letterSpacing: "-0.5px", animationDelay: "0.2s" }}>
            {founderType.name}
          </p>
          <p className="uw-rise" style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: t.accent, animationDelay: "0.45s" }}>
            {founderType.tagline}
          </p>
          <p className="uw-rise" style={{ margin: "0 0 18px", fontSize: 13, color: t.fg, opacity: 0.85, lineHeight: 1.6, textAlign: "left", animationDelay: "0.6s" }}>
            {founderType.description}
          </p>
          <div className="uw-rise" style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", animationDelay: "0.75s" }}>
            {founderType.traits.map((tr, i) => (
              <span key={i} style={{
                fontSize: 11.5, fontWeight: 800, padding: "6px 13px", borderRadius: 20,
                border: `2px solid ${t.fg}`, color: t.fg,
              }}>
                {tr}
              </span>
            ))}
          </div>
        </>
      );

    case "themes":
      return (
        <>
          <Checker color={t.fg} style={{ bottom: 0 }} />
          <Kicker t={t}>🎯 Your top themes</Kicker>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left", width: "100%" }}>
            {themes.map((th, i) => (
              <div key={i} className="uw-rise" style={{ display: "flex", alignItems: "center", gap: 16, animationDelay: `${0.15 + i * 0.15}s` }}>
                <span style={{ fontFamily: DISPLAY_FONT, fontSize: 42, color: t.accent, lineHeight: 1, minWidth: 34 }}>{i + 1}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{th.emoji} {th.title}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="uw-rise" style={{ margin: "24px 0 0", fontSize: 12.5, color: t.dim, animationDelay: "0.8s" }}>
            Straight from your own reflections.
          </p>
        </>
      );

    case "themeOne": {
      const th = themes[0];
      return (
        <>
          <Kicker t={t}>Your #1 theme</Kicker>
          <div className="uw-pop" style={{ fontSize: 44, marginBottom: 8 }}>{th.emoji}</div>
          <p className="uw-pop" style={{ margin: "0 0 14px", fontFamily: DISPLAY_FONT, fontSize: "clamp(24px, 7.5vw, 32px)", lineHeight: 1.08, animationDelay: "0.15s" }}>
            {th.title}
          </p>
          <p className="uw-rise" style={{ margin: "0 0 18px", fontSize: 13.5, color: t.fg, opacity: 0.9, lineHeight: 1.6, animationDelay: "0.4s" }}>
            {th.blurb}
          </p>
          <p className="uw-rise" style={{
            margin: 0, fontSize: 14, lineHeight: 1.6, fontStyle: "italic", color: t.accent,
            borderLeft: `3px solid ${t.accent}`, paddingLeft: 14, textAlign: "left", animationDelay: "0.55s",
          }}>
            &ldquo;{th.quote}&rdquo;
          </p>
        </>
      );
    }

    case "moments":
      return (
        <>
          <Starburst color="#ffd166" size={220} style={{ top: -70, left: -70 }} />
          <Kicker t={t}>📸 Moments that made it yours</Kicker>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, textAlign: "left", width: "100%" }}>
            {moments.map((m, i) => (
              <div key={i} className="uw-rise" style={{ display: "flex", gap: 12, alignItems: "flex-start", animationDelay: `${0.15 + i * 0.18}s` }}>
                <span style={{ fontSize: 24, lineHeight: 1.2 }}>{m.emoji}</span>
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: t.dim }}>{m.label}</p>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, opacity: 0.92 }}>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      );

    case "cohort":
      return (
        <>
          <Arcs color={t.fg} style={{ bottom: -100, right: -100 }} />
          <Kicker t={t}>👥 You were not alone</Kicker>
          <p className="uw-pop" style={{ margin: 0, fontFamily: DISPLAY_FONT, fontSize: 64, lineHeight: 1, animationDelay: "0.1s" }}>
            {COHORT_STATS.founders}
          </p>
          <p className="uw-rise" style={{ margin: "6px 0 20px", fontSize: 14, fontWeight: 800, color: t.accent, animationDelay: "0.3s" }}>
            founders in the program
          </p>
          <p className="uw-pop" style={{ margin: 0, fontFamily: DISPLAY_FONT, fontSize: 64, lineHeight: 1, animationDelay: "0.45s" }}>
            {COHORT_STATS.mentorshipMinutes}
          </p>
          <p className="uw-rise" style={{ margin: "6px 0 22px", fontSize: 14, fontWeight: 800, color: t.accent, animationDelay: "0.6s" }}>
            mentorship minutes logged
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 13, color: t.dim, lineHeight: 1.65, animationDelay: "0.75s" }}>
            {COHORT_STATS.narrative}
          </p>
        </>
      );

    case "closer":
      return quote ? (
        <>
          <div className="uw-pop" style={{ fontSize: 40, marginBottom: 16 }}>🎓</div>
          <p className="uw-rise" style={{ margin: "0 0 18px", fontSize: 16.5, fontWeight: 600, lineHeight: 1.7, fontStyle: "italic", animationDelay: "0.2s" }}>
            &ldquo;{quote}&rdquo;
          </p>
          <p className="uw-rise" style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 800, color: t.accent, animationDelay: "0.45s" }}>
            &mdash; {mentee.first} {mentee.last}, {mentee.company}
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 12.5, color: t.dim, animationDelay: "0.6s" }}>
            You said that. We just wrote it down. 💜
          </p>
        </>
      ) : (
        <>
          <div className="uw-pop" style={{ fontSize: 40, marginBottom: 16 }}>🎓</div>
          <p className="uw-pop" style={{ margin: "0 0 16px", fontFamily: DISPLAY_FONT, fontSize: 30, lineHeight: 1.1, animationDelay: "0.15s" }}>
            You did the thing.
          </p>
          <p className="uw-rise" style={{ margin: 0, fontSize: 14.5, color: t.dim, lineHeight: 1.7, animationDelay: "0.4s" }}>
            {mentee.first}, you started this summer with an idea and finished it as an Uplift graduate. {mentee.company} is lucky to have you at the wheel. 💜
          </p>
        </>
      );

    case "summary":
      return (
        <>
          <div style={{
            width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div className="uw-rise" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: DISPLAY_FONT, fontSize: 17 }}>Uplift Wrapped</span>
              <span style={{ fontSize: 20 }}>✨</span>
            </div>
            <div className="uw-rise" style={{ borderTop: `3px solid ${t.fg}`, paddingTop: 12, animationDelay: "0.15s" }}>
              <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: t.dim }}>Founder type</p>
              <p style={{ margin: 0, fontFamily: DISPLAY_FONT, fontSize: 21, color: t.accent }}>{founderType.emoji} {founderType.name}</p>
            </div>
            <div className="uw-rise" style={{ animationDelay: "0.3s" }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: t.dim }}>
                {themes.length ? "Top themes" : "The record"}
              </p>
              {(themes.length ? themes.map((th) => th.title) : [
                "Three mentor sessions", "Three educational sessions", "Every milestone complete",
              ]).map((line, i) => (
                <p key={i} style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800 }}>
                  <span style={{ color: t.accent, marginRight: 8 }}>{i + 1}</span>{line}
                </p>
              ))}
            </div>
            <div className="uw-rise" style={{ display: "flex", gap: 10, animationDelay: "0.45s" }}>
              {(sparse ? [
                { v: "3", l: "mentor sessions" }, { v: "3", l: "edu sessions" }, { v: "100%", l: "milestones" },
              ] : [
                { v: stats.weeksActive, l: "weeks" }, { v: stats.words.toLocaleString(), l: "words" }, { v: stats.checkIns, l: "check-ins" },
              ]).map((st, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: DISPLAY_FONT, fontSize: 19 }}>{st.v}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: t.dim, fontWeight: 700 }}>{st.l}</p>
                </div>
              ))}
            </div>
            <div className="uw-rise" style={{ borderTop: `2px solid ${t.fg}`, paddingTop: 10, display: "flex", justifyContent: "space-between", animationDelay: "0.6s" }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: t.dim }}>{mentee.first} {mentee.last} · {mentee.company}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: t.dim }}>Summer 2026</span>
            </div>
          </div>
          <p className="uw-rise" style={{ margin: "18px 0 0", fontSize: 11.5, color: t.dim, animationDelay: "0.75s" }}>
            Screenshot this one. 📱
          </p>
        </>
      );

    default:
      return null;
  }
}

// ─── Story container ──────────────────────────────────────────────────────────

function buildSlides(wrapped) {
  const { stats, moodNarrative, themes = [], moments = [], sparse } = wrapped;
  const slides = [{ kind: "intro", theme: "navy" }];
  slides.push(sparse ? { kind: "finish", theme: "pink" } : { kind: "weeks", theme: "pink" });
  if (!sparse && stats.words >= 50) slides.push({ kind: "words", theme: "lime" });
  if (stats.checkIns >= 3 && moodNarrative) slides.push({ kind: "mood", theme: "purple" });
  slides.push({ kind: "typeTease", theme: "navy" });
  slides.push({ kind: "typeReveal", theme: "gold" });
  if (themes.length >= 2) slides.push({ kind: "themes", theme: "cobalt" });
  if (themes.length >= 1) slides.push({ kind: "themeOne", theme: "pink" });
  if (moments.length) slides.push({ kind: "moments", theme: "navy" });
  slides.push({ kind: "cohort", theme: "purple" });
  slides.push({ kind: "closer", theme: "navy" });
  slides.push({ kind: "summary", theme: "cream" });
  return slides;
}

export default function UpliftWrapped({ mentee, wrapped }) {
  const [idx, setIdx] = useState(0);
  const slides = buildSlides(wrapped);
  const slide = slides[idx];
  const t = THEMES[slide.theme];

  const go = useCallback((dir) => {
    setIdx((cur) => Math.max(0, Math.min(slides.length - 1, cur + dir)));
  }, [slides.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px", fontFamily: BODY_FONT }}>
      <style>{`
        @keyframes uwPop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes uwRise { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes uwGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes uwSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .uw-pop { animation: uwPop 0.55s cubic-bezier(0.22, 1.2, 0.36, 1) both; }
        .uw-rise { animation: uwRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .uw-grow { animation: uwGrow 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .uw-spin { animation: uwSpin 60s linear infinite; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div
          style={{
            position: "relative", width: "100%",
            height: "clamp(560px, 74vh, 720px)",
            borderRadius: 24, overflow: "hidden",
            backgroundImage: slide.kind === "closer" ? "linear-gradient(160deg, #0d0020 0%, #4a0077 45%, #b8005a 100%)" : "none",
            backgroundColor: t.bg,
            color: t.fg,
            boxShadow: "0 20px 60px rgba(13,0,32,0.35)",
            transition: "background-color 0.35s ease",
            userSelect: "none",
          }}
        >
          {/* Progress segments */}
          <div style={{ position: "absolute", top: 14, left: 16, right: 16, display: "flex", gap: 4, zIndex: 5 }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= idx ? t.fg : "transparent",
                border: `1px solid ${i <= idx ? t.fg : t.dim}`,
                opacity: i <= idx ? 0.95 : 0.5,
                transition: "background 0.25s ease",
              }} />
            ))}
          </div>

          {/* Slide content */}
          <div key={idx} style={{
            position: "absolute", inset: 0, padding: "56px 30px 54px",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            textAlign: "center", overflowY: "auto",
          }}>
            <SlideContent kind={slide.kind} t={t} mentee={mentee} wrapped={wrapped} />
          </div>

          {/* Tap zones */}
          <div onClick={() => go(-1)} style={{ position: "absolute", top: 40, bottom: 40, left: 0, width: "32%", cursor: "pointer", zIndex: 4 }} />
          <div onClick={() => go(1)} style={{ position: "absolute", top: 40, bottom: 40, right: 0, width: "45%", cursor: "pointer", zIndex: 4 }} />
        </div>

        {/* Desktop controls */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginTop: 12 }}>
          <button onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous"
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "2px solid #d4d0e8",
              background: "#fff", color: "#5c4eb5", fontSize: 16, fontWeight: 800,
              cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.4 : 1, fontFamily: "inherit",
            }}>
            ‹
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9b8fcf", minWidth: 52, textAlign: "center" }}>
            {idx + 1} / {slides.length}
          </span>
          <button onClick={() => go(1)} disabled={idx === slides.length - 1} aria-label="Next"
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "2px solid #d4d0e8",
              background: "#fff", color: "#5c4eb5", fontSize: 16, fontWeight: 800,
              cursor: idx === slides.length - 1 ? "default" : "pointer", opacity: idx === slides.length - 1 ? 0.4 : 1, fontFamily: "inherit",
            }}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
