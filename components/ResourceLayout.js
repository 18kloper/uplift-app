// Shared layout for all /resources/* pages
import { useState } from "react";

const G    = "linear-gradient(90deg,#5B8DEF,#9B59B6,#E91E8C)";
const G135 = "linear-gradient(135deg,#5B8DEF,#9B59B6,#E91E8C)";
const SOFT = "#f7f6fb";
const CARD = "#ffffff";
const BORDER = "#ece9f4";
const TEXT  = "#111";
const MUTED = "#888";

export default function ResourceLayout({ icon, title, subtitle, badge, sections = [], timeline = [] }) {
  return (
    <div style={{ background: SOFT, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "0 36px",
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <a href="/mentor-preview" style={{ display: "flex", alignItems: "center", gap: 8,
          textDecoration: "none", color: TEXT, fontSize: 13.5, fontWeight: 600 }}>
          <span style={{ fontSize: 16 }}>←</span> Back to Portal
        </a>
        <span style={{ fontSize: 12, color: MUTED }}>Uplift Summer 2026 · TechUnited NJ</span>
      </div>

      {/* Hero */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "44px 40px 48px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100,
            background: G, color: "#fff", fontSize: 10.5, fontWeight: 700, marginBottom: 16 }}>
            {badge}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: G135, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{icon}</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: TEXT, letterSpacing: "-0.8px" }}>{title}</h1>
              <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* Timeline mode */}
        {timeline.length > 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: "26px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            <div style={{ position: "relative", paddingLeft: 28 }}>
              <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2,
                background: "linear-gradient(180deg,#5B8DEF,#E91E8C)", borderRadius: 1 }} />
              {timeline.map((t, i) => (
                <div key={i} style={{ position: "relative", paddingBottom: 24 }}>
                  <div style={{ position: "absolute", left: -22, top: 3, width: 16, height: 16, borderRadius: 8,
                    background: t.active ? G135 : t.done ? G135 : CARD,
                    border: t.active || t.done ? "none" : `2px solid ${BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {t.done && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
                    {t.active && <div style={{ width: 5, height: 5, borderRadius: 3, background: "#fff" }} />}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.active ? "#9B59B6" : MUTED,
                      textTransform: "uppercase", letterSpacing: "0.6px", marginRight: 8 }}>{t.week}</span>
                    <span style={{ fontSize: 10.5, color: MUTED }}>· {t.dates}</span>
                    {t.active && <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 700,
                      background: G, color: "#fff", borderRadius: 100, padding: "2px 8px" }}>Now</span>}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: t.done ? MUTED : TEXT }}>
                    {t.title}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {t.items.map((item, j) => (
                      <li key={j} style={{ fontSize: 13.5, color: t.done ? MUTED : "#444",
                        lineHeight: 1.7, marginBottom: 2 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections mode */}
        {sections.map((s, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: "22px 26px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: TEXT,
              borderLeft: "3px solid", borderImage: G, borderImageSlice: 1,
              paddingLeft: 12 }}>{s.heading}</h2>
            {s.body && (
              <div style={{ fontSize: 14, color: "#444", lineHeight: 1.8 }}>
                {s.body.split("\n\n").map((para, pi) => (
                  <p key={pi} style={{ margin: "0 0 12px" }}
                    dangerouslySetInnerHTML={{ __html: para
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>") }} />
                ))}
              </div>
            )}
            {s.items && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {s.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 13.5, color: "#444", lineHeight: 1.75, marginBottom: 4 }}
                    dangerouslySetInnerHTML={{ __html: item
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/^'(.*)'$/, "<em style='color:#5B2D8E'>$1</em>") }} />
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 0 0" }}>
          <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
            TechUnited NJ · Uplift Summer 2026 ·{" "}
            <a href="mailto:uplift@techunited.co" style={{ color: MUTED }}>uplift@techunited.co</a>
          </p>
        </div>
      </div>
    </div>
  );
}
