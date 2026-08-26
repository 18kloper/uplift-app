// Public landing page for Ulrike, the Uplift chat bot. No gate: this is for
// people who are INTERESTED in the program. The chat runs /api/portal-chat in
// visitor mode (knowledge-only, no founder data, apply links encouraged).

import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const SUGGESTED = [
  "What is Uplift?",
  "What do founders actually get?",
  "How does mentor matching work?",
  "What's the time commitment?",
  "How do I apply?",
];

export default function UlrikePage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm Ulrike, the Uplift chat bot. I know this program inside and out, and impressively little else. Curious whether Uplift is right for you? Ask away.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? draft).trim();
    if (!q || busy) return;
    setDraft("");
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "visitor", question: q, history: next.slice(1, -1).slice(-8) }),
      });
      const data = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer || "Something glitched on my end. Email uplift@techunited.co and a human will help." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something glitched on my end. Email uplift@techunited.co and a human will help." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Meet Ulrike · Uplift by TechUnited:NJ</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Ulrike is the Uplift mentorship program's chat bot. Ask her anything about the Fall 2026 program for New Jersey founders." />
        <link rel="icon" href="/uplift-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", padding: "40px 24px 100px", color: "#fff" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <img src="/uplift-logo-white.png" alt="Uplift" style={{ height: 34, marginBottom: 30, display: "block" }} />
            <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
              <img src="/deck-img/ulrike.jpg" alt="The real Ulrike" style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.55)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginBottom: 6 }}>
                  Uplift Fall 2026 · TechUnited:NJ&apos;s founder mentorship program
                </div>
                <h1 style={{ margin: "0 0 10px", fontSize: 36, fontWeight: 800, lineHeight: 1.15 }}>
                  Meet Ulrike. <span style={{ opacity: 0.75, fontWeight: 600 }}>Ask her anything about Uplift.</span>
                </h1>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, opacity: 0.85, maxWidth: 560 }}>
                  She&apos;s named after a real 102-year-old New Yorker with more zest and sharpness than most people half her age. She embodies uplift. The bot version knows this program inside and out, and impressively little else.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat card */}
        <div style={{ maxWidth: 860, margin: "-64px auto 0", padding: "0 24px" }}>
          <div style={{ borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 18px 50px rgba(26,14,79,0.22)", border: "1px solid #e6e2f5" }}>
            <div style={{ background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)", color: "#fff", padding: "13px 18px" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🤖 Ulrike · Uplift Chat Bot</div>
              <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>Automated. Knows the program, and impressively little else.</div>
            </div>
            <div ref={scrollRef} style={{ height: 380, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "#f7f5ff" }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%", padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap",
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
                <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 14, borderBottomLeftRadius: 4, background: "#fff", border: "1px solid #e6e2f5", fontSize: 14, color: "#8a84a3" }}>
                  thinking...
                </div>
              )}
            </div>
            <div style={{ borderTop: "1px solid #ece8f8", background: "#fff", padding: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={busy} style={{
                    border: "1.5px solid #d9d3ef", borderRadius: 20, padding: "5px 12px", background: "#f7f5ff",
                    color: "#4a3d99", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>{s}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Ask about the program..."
                  maxLength={600}
                  style={{ flex: 1, border: "1.5px solid #d9d3ef", borderRadius: 10, padding: "11px 13px", fontSize: 14, fontFamily: "inherit", outline: "none", color: "#1a0e4f" }}
                />
                <button onClick={() => send()} disabled={busy || !draft.trim()} style={{
                  border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
                  cursor: busy || !draft.trim() ? "default" : "pointer",
                  background: busy || !draft.trim() ? "#d9d3ef" : "linear-gradient(135deg, #c0006e, #ff2d87)", color: "#fff",
                }}>Send</button>
              </div>
              <div style={{ fontSize: 11, color: "#8a84a3", marginTop: 8, textAlign: "center" }}>
                I&apos;m a bot. For real humans: uplift@techunited.co
              </div>
            </div>
          </div>
        </div>

        {/* Program strip + CTAs */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 70px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginBottom: 28 }}>
            {[
              ["8 weeks", "Sept 9 to Nov 6, 2026. Tight on purpose: momentum beats drift."],
              ["Matched mentorship", "Every founder-mentor pair scored on five factors, confirmed by a human."],
              ["Completely free", "For New Jersey founders. 22 live educational sessions included."],
            ].map(([t, d]) => (
              <div key={t} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e6e2f5", padding: "18px 20px" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#1a0e4f", marginBottom: 5 }}>{t}</div>
                <div style={{ fontSize: 13.5, color: "#6b6480", lineHeight: 1.55 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="https://form.typeform.com/to/hAbo7Jdh" target="_blank" rel="noopener noreferrer" style={{
              background: "linear-gradient(135deg, #c0006e, #ff2d87)", color: "#fff", borderRadius: 12, padding: "14px 26px",
              fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 24px rgba(192,0,110,0.3)",
            }}>Apply as a founder →</a>
            <a href="https://form.typeform.com/to/AayoroO1" target="_blank" rel="noopener noreferrer" style={{
              background: "#1a0e4f", color: "#fff", borderRadius: 12, padding: "14px 26px",
              fontSize: 15, fontWeight: 800, textDecoration: "none",
            }}>Apply as a mentor →</a>
            <a href="/uplift-fall2026-linkedin.html" target="_blank" rel="noopener noreferrer" style={{
              background: "#fff", color: "#3d2f8a", border: "1.5px solid #d9d3ef", borderRadius: 12, padding: "14px 26px",
              fontSize: 15, fontWeight: 800, textDecoration: "none",
            }}>See the program deck →</a>
          </div>
          <p style={{ textAlign: "center", fontSize: 12.5, color: "#8a84a3", marginTop: 34 }}>
            Uplift by TechUnited:NJ · questions a bot shouldn&apos;t answer: uplift@techunited.co
          </p>
        </div>
      </div>
    </>
  );
}
