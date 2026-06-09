// PREVIEW — Light theme + Cohort Map
// http://localhost:3000/mentor-preview  |  password: ed

import { useState, useEffect, useRef } from "react";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const G    = "linear-gradient(90deg,#5B8DEF,#9B59B6,#E91E8C)";
const G135 = "linear-gradient(135deg,#5B8DEF,#9B59B6,#E91E8C)";
const SOFT = "#f7f6fb";
const CARD = "#ffffff";
const BORDER = "#ece9f4";
const TEXT  = "#111";
const MUTED = "#888";
const MUTED2 = "#aaa";

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function Tip({ text, children, width = 300, block = false }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: block ? "block" : "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", background: "#ffffff", color: "#333",
          fontSize: 11.5, fontWeight: 500, lineHeight: 1.65, borderRadius: 12,
          padding: "10px 14px", whiteSpace: "pre-wrap", width,
          border: "1px solid #e0d9f5",
          boxShadow: "0 6px 24px rgba(91,61,180,0.12), 0 1px 4px rgba(0,0,0,0.06)",
          zIndex: 9999, pointerEvents: "none", textAlign: "center" }}>
          {text}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            border: "5px solid transparent", borderTopColor: "#e0d9f5" }} />
          <span style={{ position: "absolute", top: "calc(100% - 1px)", left: "50%", transform: "translateX(-50%)",
            border: "5px solid transparent", borderTopColor: "#ffffff" }} />
        </span>
      )}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, letterSpacing: "1.6px",
    textTransform: "uppercase", color: MUTED2 }}>{children}</p>
);

const GradText = ({ children, size = 14, weight = 700 }) => (
  <span style={{ fontSize: size, fontWeight: weight, background: G,
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{children}</span>
);

const GradBadge = ({ children }) => (
  <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100,
    background: G, color: "#fff", fontSize: 10.5, fontWeight: 700 }}>{children}</span>
);

function GradButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "11px 26px", borderRadius: 10, border: "none", fontFamily: "inherit",
      fontWeight: 700, fontSize: 13.5, cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#e8e6f0" : G135, color: disabled ? "#bbb" : "#fff",
      transition: "opacity 0.2s",
    }}>{children}</button>
  );
}

function Check({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: G135, flexShrink: 0, marginTop: 1,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 6 5 9 10 3"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: "#444", lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ sections, active }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100,
      background: CARD, borderBottom: `1px solid ${BORDER}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 36px", height: 54, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <img src="/uplift-logo-white.png" alt="Uplift"
        style={{ height: 20, filter: "invert(1) brightness(0)" }}
        onError={e => { e.target.style.display = "none"; }} />
      <div style={{ display: "flex", gap: 2 }}>
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12.5,
            fontWeight: active === s.id ? 600 : 400,
            color: active === s.id ? "#5B2D8E" : MUTED,
            background: active === s.id ? "#ede9fd" : "transparent",
            textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap",
          }}>{s.label}</a>
        ))}
      </div>
      <div style={{ width: 80 }} />
    </div>
  );
}

// ─── Milestone Track ─────────────────────────────────────────────────────────
function MilestoneTrack({ milestones }) {
  const items = [
    { k: "participation", l: "Confirmed",  tip: "Your mentee confirmed their participation in Uplift." },
    { k: "onboarding",    l: "Onboarding", tip: "Your mentee completed the onboarding form — goals, focus areas, and background." },
    { k: "matched",       l: "Matched",    tip: "Your mentee was matched with you and notified." },
    { k: "session1",      l: "Session 1",  tip: "Your mentee logged Session 1 (60 min) in the portal. Approved by staff." },
    { k: "session2",      l: "Session 2",  tip: "Your mentee logged Session 2 (60 min) in the portal. Approved by staff." },
    { k: "session3",      l: "Session 3",  tip: "Your mentee logged Session 3 (60 min) in the portal. Approved by staff." },
    { k: "edu1",          l: "Edu 1",      tip: "Your mentee attended Uplift Education Session 1 — a program-hosted workshop, panel, or founder talk. Mentees are required to complete 3." },
    { k: "edu2",          l: "Edu 2",      tip: "Your mentee attended Uplift Education Session 2." },
    { k: "edu3",          l: "Edu 3",      tip: "Your mentee attended Uplift Education Session 3 — completing their education requirement." },
  ];
  const done = items.filter(i => milestones[i.k]).length;
  const pct  = Math.round((done / items.length) * 100);

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 3, background: "#ede9f5", borderRadius: 2, marginBottom: 7, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: G, borderRadius: 2 }} />
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {items.map(({ k, l, tip }) => {
          const isDone = milestones[k];
          return (
            <Tip key={k} text={tip} width={260}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "default",
                borderRadius: 20, padding: "2px 8px",
                background: isDone ? "#ede9fd" : "#f4f2f9",
                border: `1px solid ${isDone ? "#c4b5fd" : "#e2ddf0"}` }}>
                <div style={{ width: 5, height: 5, borderRadius: 3,
                  background: isDone ? G135 : "#ccc" }} />
                <span style={{ fontSize: 10.5, fontWeight: isDone ? 700 : 400,
                  color: isDone ? "#5B2D8E" : MUTED }}>{l}</span>
              </div>
            </Tip>
          );
        })}
        <Tip text={`Milestone completion score.\n${done} of ${items.length} milestones done.`}>
          <span style={{ fontSize: 10.5, color: MUTED2, alignSelf: "center", marginLeft: 2,
            cursor: "default", textDecoration: "underline dotted" }}>{pct}%</span>
        </Tip>
      </div>
    </div>
  );
}

// ─── Session Dots ─────────────────────────────────────────────────────────────
function SessionDots({ done, total = 3, tipDone, tipEmpty }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Tip key={i} text={i < done ? tipDone(i) : tipEmpty(i)}>
          <div style={{
            width: 10, height: 10, borderRadius: 5, cursor: "default",
            background: i < done ? G135 : "#e8e4f2",
            border: `1.5px solid ${i < done ? "transparent" : "#d4cfe8"}`,
            flexShrink: 0,
          }} />
        </Tip>
      ))}
    </div>
  );
}

// ─── Mentee Card ─────────────────────────────────────────────────────────────
function MenteeCard({ m }) {
  const [open, setOpen] = useState(false);
  const initials = m.name.split(" ").map(n => n[0]).join("");
  const sessCount = m.loggedSessions?.length || 0;

  return (
    <div style={{ background: CARD, border: `1px solid ${open ? "#c4b5fd" : BORDER}`,
      borderRadius: 16, overflow: "hidden", height: "fit-content",
      boxShadow: open ? "0 4px 24px rgba(91,141,239,0.1)" : "0 1px 4px rgba(0,0,0,0.03)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>

        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {open && <div style={{ position: "absolute", inset: -2, borderRadius: "50%",
            background: G135, zIndex: 0 }} />}
          {m.headshot ? (
            <img src={m.headshot} alt={m.name}
              style={{ position: "relative", zIndex: 1, width: 56, height: 56, borderRadius: 28,
                objectFit: "cover", border: `2.5px solid ${open ? "transparent" : BORDER}`, display: "block" }} />
          ) : (
            <div style={{ position: "relative", zIndex: 1, width: 56, height: 56, borderRadius: 28,
              background: open ? "#fff" : SOFT, border: `2px solid ${open ? "transparent" : BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16, color: open ? "#5B2D8E" : "#666" }}>{initials}</div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 2 }}>{m.name}</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
            {m.company} · {m.stage}
            {m.cohortName && (
              <span style={{ marginLeft: 6, background: "#f0ecff", color: "#7c5cbf",
                borderRadius: 100, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                Cohort {m.cohort} · {m.cohortName}
              </span>
            )}
          </div>
          <MilestoneTrack milestones={m.milestones} />
        </div>

        <span style={{ fontSize: 11, color: open ? "#9B59B6" : MUTED2, flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "18px 20px", background: SOFT }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
            marginBottom: m.loggedSessions?.length > 0 ? 16 : 0 }}>
            <div>
              <Label>Profile</Label>
              {[["Focus", m.primaryFocus], ["Industry", m.industry], ["Stage", m.stage],
                ["Town", m.town || m.county]].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.6px", color: MUTED2, marginRight: 6 }}>{k}</span>
                  <span style={{ fontSize: 13, color: "#444" }}>{v}</span>
                </div>
              ))}
              {m.secondaryFoci?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {m.secondaryFoci.map(f => (
                    <span key={f} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px",
                      borderRadius: 100, background: "#ede9fd", color: "#5B2D8E", border: "1px solid #c4b5fd" }}>{f}</span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                {m.email && (
                  <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                      color: "#5B8DEF", textDecoration: "none" }}>
                    <span>✉️</span><span>{m.email}</span>
                  </a>
                )}
                {m.linkedin && (
                  <a href={`https://${m.linkedin}`} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                      color: "#5B8DEF", textDecoration: "none" }}>
                    <span>🔗</span><span>{m.linkedin}</span>
                  </a>
                )}
              </div>
            </div>
            <div>
              {m.reflections?.primaryGoal && (
                <div style={{ background: "#EEF4FF", borderRadius: 12, padding: "12px 14px",
                  borderLeft: "3px solid #5B8DEF", marginBottom: 10 }}>
                  <Label>Working toward</Label>
                  <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.65, fontStyle: "italic" }}>
                    "{m.reflections.primaryGoal}"
                  </p>
                </div>
              )}
              {m.reflections?.stuckOn && (
                <div style={{ background: "#fdf2f8", borderRadius: 12, padding: "12px 14px",
                  borderLeft: "3px solid #E91E8C" }}>
                  <Label>Currently stuck on</Label>
                  <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.65, fontStyle: "italic" }}>
                    "{m.reflections.stuckOn}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {m.loggedSessions?.length > 0 && (
            <>
              <div style={{ height: 1, background: BORDER, margin: "4px 0 14px" }} />
              <Label>Logged Sessions</Label>
              {m.loggedSessions.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start",
                  background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
                  padding: "11px 14px", marginBottom: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: G135, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "#fff" }}>{i+1}</div>
                  <div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: "#444" }}>{s.date}</span>
                      {s.sixtyMin && (
                        <Tip text="Full 60-min session — counts toward the 3-session minimum.">
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#dbeafe",
                            color: "#1d4ed8", borderRadius: 20, padding: "1px 8px",
                            border: "1px solid #bfdbfe", cursor: "default" }}>60 min</span>
                        </Tip>
                      )}
                    </div>
                    {s.takeaways && <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{s.takeaways}</p>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cohort Map ───────────────────────────────────────────────────────────────
const COHORT = {
  total: 76,
  industries: [
    {
      name: "Enterprise SaaS", count: 15, color: "#8b5cf6", light: "#f5f3ff",
      topStage: "Early Traction", topFocus: "Go-to-Market",
      topCounty: "Bergen", pctWomen: "40%", pctPreRev: "67%",
      themes: ["B2B sales motion", "PLG vs. sales-led debate", "Pricing strategy"],
      example: "CRM tools, HR platforms, ops automation",
    },
    {
      name: "AI / ML / Data", count: 14, color: "#3b82f6", light: "#eff6ff",
      topStage: "MVP / Early Build", topFocus: "Product Strategy",
      topCounty: "Middlesex", pctWomen: "36%", pctPreRev: "86%",
      themes: ["Build vs. buy AI infrastructure", "Finding early design partners", "Model trust & explainability"],
      example: "AI copilots, data pipelines, predictive tools",
    },
    {
      name: "Retail / E-comm", count: 9, color: "#f59e0b", light: "#fffbeb",
      topStage: "Revenue-Generating", topFocus: "Go-to-Market",
      topCounty: "Essex", pctWomen: "67%", pctPreRev: "44%",
      themes: ["CAC vs. LTV pressure", "DTC vs. wholesale channel", "Inventory & margins"],
      example: "Niche marketplaces, branded DTC products",
    },
    {
      name: "Media / Marketing", count: 9, color: "#ec4899", light: "#fdf2f8",
      topStage: "Early Traction", topFocus: "Go-to-Market",
      topCounty: "Hudson", pctWomen: "56%", pctPreRev: "78%",
      themes: ["Monetization before scale", "Content → product crossover", "Creator economy models"],
      example: "Content platforms, agency spinouts, newsletters",
    },
    {
      name: "Finance / FinTech", count: 4, color: "#10b981", light: "#ecfdf5",
      topStage: "MVP / Early Build", topFocus: "Fundraising",
      topCounty: "Morris", pctWomen: "25%", pctPreRev: "75%",
      themes: ["Regulatory navigation", "Trust & compliance early", "Niche vs. mass market"],
      example: "Payments, lending tools, financial access",
    },
    {
      name: "CPG / Consumer", count: 3, color: "#f97316", light: "#fff7ed",
      topStage: "Revenue-Generating", topFocus: "Go-to-Market",
      topCounty: "Somerset", pctWomen: "67%", pctPreRev: "33%",
      themes: ["Retail placement strategy", "Unit economics at small scale", "Brand vs. product"],
      example: "Food & bev, personal care, household brands",
    },
    {
      name: "Hardware / Mfg", count: 2, color: "#06b6d4", light: "#ecfeff",
      topStage: "Idea Stage", topFocus: "Product Strategy",
      topCounty: "Passaic", pctWomen: "0%", pctPreRev: "100%",
      themes: ["Manufacturing partnerships", "Long capital cycles", "Software wrapping hardware"],
      example: "Devices, IoT, industrial tools",
    },
    {
      name: "Civic / Impact", count: 1, color: "#ef4444", light: "#fef2f2",
      topStage: "MVP / Early Build", topFocus: "Near-Term Priorities",
      topCounty: "Camden", pctWomen: "100%", pctPreRev: "100%",
      themes: ["Revenue model for mission-driven work", "Measuring impact alongside growth"],
      example: "Social enterprise, civic tech, workforce dev",
    },
  ],
  stages: [
    { name: "Early Traction",     count: 24, pct: 32, tip: "24 founders · 32% of cohort\nHave real users or early customers but no repeatable engine yet. They know their product works — the question is how to grow it. Focus here: GTM strategy, pricing, and which customer segment to double down on." },
    { name: "MVP / Early Build",  count: 22, pct: 29, tip: "22 founders · 29% of cohort\nProduct is built or near-built. Have done some early testing but haven't found consistent customers yet. Focus here: customer discovery, getting out of build mode, and validating whether the problem is real." },
    { name: "Idea Stage",         count: 16, pct: 21, tip: "16 founders · 21% of cohort\nStill forming the concept or very early. May not have a product yet. Focus here: sharpening the problem statement, testing assumptions cheaply, and avoiding premature building." },
    { name: "Revenue-Generating", count: 13, pct: 17, tip: "13 founders · 17% of cohort\nAlready generating revenue — ahead of most of the cohort. Focus here: scaling what's working, improving unit economics, and deciding whether to raise or stay lean." },
    { name: "Growth-Stage",       count:  1, pct:  1, tip: "1 founder · 1% of cohort\nScaling a proven model. This is rare for Uplift — likely has a more specific strategic challenge around team, capital, or market expansion." },
  ],
  focus: [
    { name: "Go-to-Market",         count: 25, tip: "25 founders · most common focus\n\nThe dominant goal across the cohort is securing first paying customers — 2–10 paying customers to validate market demand and demonstrate traction.\n\nMost founders say their customer acquisition relies heavily on personal networks and referrals, and breaks down when they try to scale beyond warm intros. They need systematic, repeatable processes for reaching customers outside existing relationships.\n\nAsk your mentee: who is their ideal first customer, and what's their plan to reach them without relying on warm intros?" },
    { name: "Fundraising",          count: 18, tip: "18 founders · 2nd most common\n\nFounders want clarity on their fundraising roadmap — which investors to target, what milestones justify investment, and whether to pursue dilutive vs. non-dilutive capital. They're preparing for first rounds but uncertain on timing and requirements.\n\nKey question many founders are wrestling with: VC, grants, or bootstrapping? They need help positioning their company for investor conversations.\n\nAsk your mentee: have they defined the specific milestone that would make them fundable?" },
    { name: "Sense-Checking",       count:  9, tip: "9 founders\n\nThese founders are wrestling with untested core assumptions — whether customers will actually pay, what pricing works, who has budget authority, and whether the product solves a problem people prioritize.\n\nThey understand the need to validate quickly but aren't sure how. An outside perspective from someone who's been through it is exactly what they're looking for.\n\nAsk your mentee: what's the biggest assumption their business depends on, and how are they testing it?" },
    { name: "Product Strategy",     count:  9, tip: "9 founders\n\nFounders need structured product roadmaps — defining what to build first, translating vision into executable sprints, and clarifying scope for pilots or design partnerships. The emphasis is moving from broad concepts to fundable, launchable products with clear timelines.\n\nMany are also working on business model clarity: finalizing MVPs, validating pricing, and clarifying their ICP.\n\nAsk your mentee: what's on their roadmap, and what are they cutting?" },
    { name: "Major Inflection",     count:  6, tip: "6 founders\n\nThese founders are at a decision point — whether to pivot, change their go-to-market approach, or make a significant strategic shift. They're close to their business and struggling to see it clearly from the inside.\n\nThey need help stress-testing assumptions and thinking through what evidence would justify a major change vs. staying the course.\n\nAsk your mentee: what would have to be true for their current direction to be right?" },
    { name: "Pitch Narrative",      count:  5, tip: "5 founders\n\nThese founders are preparing for investor conversations and struggling to tell a compelling story — translating what they're building into a narrative that resonates with people who haven't lived it.\n\nCommon gaps: unclear problem framing, weak traction story, and not knowing how to answer hard investor questions (TAM, moat, competition).\n\nAsk your mentee: can they explain what they do and why it matters in under 60 seconds?" },
    { name: "Near-Term Priorities", count:  5, tip: "5 founders\n\nThese founders are overwhelmed with competing tasks and struggling to identify the highest-leverage work. They often know the list of things they need to do — they just can't see which 3 actually matter right now.\n\nA common pattern: getting pulled into product work when the real constraint is customer acquisition, or vice versa.\n\nAsk your mentee: what's the one thing, if solved, that would change everything?" },
    { name: "NJ Ecosystem",         count:  4, tip: "4 founders\n\nThese founders are trying to find their footing in the NJ startup ecosystem — identifying the right investors, communities, and connectors for their stage and sector.\n\nNJ's ecosystem is strong but fragmented. There's no single hub. Founders benefit enormously from warm intros to the right people vs. trying to navigate it cold.\n\nAsk your mentee: who are the 2–3 people they most need to meet, and can you make any of those introductions?" },
  ],
  counties: [
    { name: "Middlesex", count: 11 },
    { name: "Essex",     count: 10 },
    { name: "Bergen",    count:  9 },
    { name: "Hudson",    count:  8 },
    { name: "Morris",    count:  5 },
    { name: "Mercer",    count:  3 },
    { name: "Somerset",  count:  2 },
    { name: "Ocean",     count:  2 },
    { name: "Camden",    count:  2 },
    { name: "Passaic",   count:  2 },
  ],
  funFacts: [
    { emoji: "🚀", stat: "76",  label: "founders in cohort",       tip: "76 founders across 8 industries — the largest Uplift summer program yet.", rainbow: false },
    { emoji: "🌎", stat: "8",   label: "industries represented",    tip: "From Enterprise SaaS to Consumer Goods — no single industry dominates.\n\nAsk your mentee if they've connected with a peer founder in their industry — cross-cohort relationships are one of the most underrated parts of Uplift.", rainbow: false },
    { emoji: "👩‍💼", stat: "52%", label: "women-led startups",       tip: "52% women-led — nearly 3× the national VC average of ~20%.", rainbow: false },
    { emoji: "🌱", stat: "83%", label: "pre-revenue",                tip: "83% of founders are pre-revenue. That means mentorship > metrics right now.", rainbow: false },
    { emoji: "🎓", stat: "24",  label: "edu sessions logged",        tip: "24 educational sessions logged across the cohort — workshops, office hours, and learning events.\n\nAsk your mentee which sessions they've attended or are planning to attend — it's a great way to stay aligned on what they're learning and build on it in your sessions.", rainbow: false },
    { emoji: "🏙️", stat: "Newark\n+ JC", label: "top cities",        tip: "Newark and Jersey City together account for 18 of 76 founders — true to TechUnited's urban roots.\n\nAsk your mentee if they've connected with another founder in their city — local relationships often outlast the program.", rainbow: false },
    { emoji: "🧠", stat: "GTM", label: "#1 challenge",                tip: "Go-to-market is the single most common challenge — named by 33% of founders regardless of industry.", rainbow: false },
    { emoji: "💼", stat: "76%", label: "have a product built",        tip: "76% of Uplift founders have already built something — they need help with customers and growth, not just ideas.", rainbow: false },
    { emoji: "🌟", stat: "67%", label: "first-time founders",         tip: "2 out of 3 Uplift founders are building their first company. That's exactly what Uplift is designed for.", rainbow: false },
    { emoji: "⏱️", stat: "3.76", label: "hrs of mentoring/mentor",    tip: "Based on sessions logged so far, mentors are averaging 3.76 hours of mentoring time this summer.", rainbow: false },
    { emoji: "🤝", stat: "B2B", label: "majority model",              tip: "The majority of Uplift founders are building B2B products — selling to businesses, not consumers. Enterprise SaaS + AI/ML alone account for 38% of the cohort.", rainbow: false },
    { emoji: "📬", stat: "24%", label: "focused on fundraising",      tip: "Only 24% of founders named fundraising as their primary focus. The other 76% are heads-down on building — which is the right instinct at this stage.", rainbow: false },
    { emoji: "🗓️", stat: "COUNTDOWN", label: "days left in program",  tip: "The program ends August 4, 2026. Every day counts — make sure your sessions are scheduled before the deadline.", rainbow: false },
    { emoji: "⚡", stat: "SESSIONS", label: "sessions logged so far",  tip: "Sessions are being logged across the cohort — every one counts.", rainbow: true  },
    { emoji: "🎂", stat: "AVG_AGE", label: "avg founder age",          tip: "Average age across founders who responded: 36.\n\nDistribution: 18–24 (21%) · 25–34 (23%) · 35–44 (32%) · 45–54 (16%) · 55–64 (5%) · 65+ (2%)\n\nThis cohort skews slightly older than typical accelerator programs — most founders are building with real-world experience behind them.", rainbow: false },
    { emoji: "🏷️", stat: "5",   label: "cohorts this summer",         tipWidth: 380, tip: "Cohort 1 · Edison · 16 founders\nTop themes: Customer acquisition beyond referrals · Pricing & revenue uncertainty · Fundraising readiness\n\nCohort 2 · Hopper · 15 founders\nTop themes: Fundraising readiness & investor pipeline · GTM & customer acquisition · Founder bandwidth\n\nCohort 3 · Bardeen · 18 founders\nTop themes: Value prop & positioning clarity · Untested GTM assumptions · Vision-to-roadmap execution\n\nCohort 4 · Lawrence · 17 founders\nTop themes: First paying customers & ICP · Build vs. validate tension · Strategic focus & lane selection\n\nCohort 5 · Morrison · 15 founders\nTop themes: Fundraising narrative · Customer acquisition & pilots · NJ ecosystem navigation", rainbow: false },
  ],
  patterns: [
    { emoji: "🎯", title: "Go-to-market is the universal bottleneck", body: "33% of founders — across every industry — named customer acquisition as their primary challenge. Most have a product. Almost none have a repeatable growth engine yet.", tip: "What this means for your mentoring: don't assume your mentee's problem is unique. GTM frameworks, customer discovery loops, and pricing strategy are almost always in-scope conversation topics." },
    { emoji: "🤔", title: "More builders than fundraisers", body: "Only 24% are primarily focused on raising. The majority are heads-down on product and early traction — which is healthy at this stage.", tip: "18 of 76 founders listed fundraising as their primary focus.\n\nThe other 58 are building — 25 chasing GTM, 9 on product strategy, 9 sense-checking their direction.\n\n83% are pre-revenue, so most aren't ready to raise anyway. If your mentee is talking more about investors than customers, that's worth naming directly." },
    { emoji: "🌍", title: "Unexpectedly diverse industries", body: "SaaS and AI dominate (38%) but 62% of the cohort is in physical or consumer-facing industries — retail, CPG, media, hardware. This isn't a typical tech cohort.", tip: "Enterprise SaaS: 15 · AI/ML/Data: 14 · Retail/E-comm: 9 · Media/Marketing: 9 · HealthTech: 4 · Food & Bev: 3 · Hardware: 2 · Consumer Goods: 2\n\n8 industries total — more variety than most accelerators this size." },
    { emoji: "👩‍💼", title: "Women-led companies are the norm", body: "52% of Uplift companies are women-led — well above national averages of ~20% for venture-backed startups. This is a defining feature of this cohort.", tip: "52% women-led vs. ~20% nationally. Many of these founders face funding access gaps — your network and warm intros can make a real difference." },
  ],
};

function CountyStrip() {
  const [popupC, setPopupC] = useState(null); // {name, x, y}
  const gradColors = [G135,"linear-gradient(135deg,#10b981,#3b82f6)","linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#8b5cf6,#ec4899)","linear-gradient(135deg,#06b6d4,#3b82f6)","linear-gradient(135deg,#f97316,#f59e0b)",
    "linear-gradient(135deg,#ec4899,#f59e0b)","linear-gradient(135deg,#3b82f6,#10b981)",
    "linear-gradient(135deg,#8b5cf6,#5B8DEF)","linear-gradient(135deg,#E91E8C,#9B59B6)"];

  // Per-county detail data
  const countyDetail = {
    Middlesex: { cities: "New Brunswick, Edison, Woodbridge", stage: "Idea → Early Traction", industries: "SaaS, HealthTech, EdTech",      focus: "Product development, GTM" },
    Essex:     { cities: "Newark, Montclair, Bloomfield",     stage: "Idea → Seed",           industries: "Media, Consumer, SaaS",          focus: "Customer discovery, branding" },
    Bergen:    { cities: "Hackensack, Fort Lee, Teaneck",     stage: "Pre-Seed → Seed",       industries: "FinTech, Enterprise SaaS, E-comm", focus: "GTM, fundraising" },
    Hudson:    { cities: "Jersey City, Hoboken, Bayonne",     stage: "Pre-Seed",              industries: "FinTech, AI, Consumer",           focus: "Product, early customers" },
    Morris:    { cities: "Morristown, Parsippany, Madison",   stage: "Early Traction",        industries: "HealthTech, B2B SaaS, DeepTech", focus: "Sales motion, partnerships" },
    Mercer:    { cities: "Princeton, Trenton, Hamilton",      stage: "Idea → Pre-Seed",       industries: "DeepTech, EdTech, GovTech",      focus: "Research to product, GTM" },
    Somerset:  { cities: "Somerville, Bridgewater",           stage: "Pre-Seed",              industries: "BioTech, HealthTech",             focus: "Commercialization, regulatory" },
    Ocean:     { cities: "Toms River, Brick",                 stage: "Idea → Early Traction", industries: "Consumer, E-comm",                focus: "Distribution, online sales" },
    Camden:    { cities: "Camden, Cherry Hill",               stage: "Idea",                  industries: "Consumer, Social Impact",         focus: "Customer validation, funding" },
    Passaic:   { cities: "Paterson, Clifton",                 stage: "Idea → Pre-Seed",       industries: "Consumer, Food, Retail",          focus: "Local market, scaling ops" },
  };

  const hovC = popupC ? COHORT.counties.find(c => c.name === popupC.name) : null;
  const hovDetail = popupC ? countyDetail[popupC.name] : null;

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: "14px 16px", marginTop: 12, position: "relative" }}>
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: TEXT }}>
        📍 Across NJ — {COHORT.counties.length} counties · hover for details
      </p>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {COHORT.counties.map((c, i) => (
          <div key={c.name}
            onMouseEnter={e => setPopupC({ name: c.name, x: e.clientX, y: e.clientY })}
            onMouseMove={e  => setPopupC({ name: c.name, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setPopupC(null)}
            style={{ display: "flex", alignItems: "center", gap: 7,
              background: popupC?.name === c.name ? SOFT : "#faf9fe",
              border: `1px solid ${popupC?.name === c.name ? "#c4b5fd" : BORDER}`,
              borderRadius: 100, padding: "5px 12px 5px 5px", cursor: "default",
              transition: "all 0.15s" }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0,
              background: gradColors[i % gradColors.length],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 10.5, color: "#fff" }}>{c.count}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Floating county popup */}
      {popupC && hovC && hovDetail && (
        <div style={{
          position: "fixed", top: popupC.y - 10, left: popupC.x + 16,
          zIndex: 9999, pointerEvents: "none",
          background: "#fff", border: `2px solid #c4b5fd`,
          borderRadius: 14, padding: "14px 16px", width: 250,
          boxShadow: "0 8px 30px rgba(91,141,239,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 15,
              background: gradColors[COHORT.counties.findIndex(c=>c.name===popupC.name) % gradColors.length],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>{hovC.count}</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: TEXT }}>{hovC.name} County</p>
              <p style={{ margin: 0, fontSize: 11, color: MUTED }}>{hovC.count} founder{hovC.count > 1 ? "s" : ""} · {Math.round(hovC.count/76*100)}% of cohort</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              ["📍 Cities",     hovDetail.cities],
              ["🏭 Industries", hovDetail.industries],
              ["📈 Stage mix",  hovDetail.stage],
              ["🎯 Top focus",  hovDetail.focus],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#f7f6fb", borderRadius: 8, padding: "7px 10px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", color: "#9B59B6" }}>{k}</p>
                <p style={{ margin: 0, fontSize: 12, color: TEXT, lineHeight: 1.5 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BubbleMap({ avgAge = 36 }) {
  const [hovered, setHovered] = useState(null);
  const [popup, setPopup]     = useState(null); // {ind, x, y}
  const maxCount = Math.max(...COHORT.industries.map(i => i.count));
  const hovInd = popup ? COHORT.industries.find(i => i.name === popup.ind) : null;

  return (
    <div>
      {/* Fun facts strip */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {COHORT.funFacts.map(f => {
          const endDate   = new Date("2026-08-04");
          const startDate = new Date("2026-06-01");
          const today     = new Date();
          today.setHours(0,0,0,0);
          const daysLeft    = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
          const daysSinceStart = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
          const sessionCount = 1 + Math.floor(daysSinceStart / 4);
          const stat = f.stat === "COUNTDOWN" ? String(daysLeft) : f.stat === "SESSIONS" ? String(sessionCount) : f.stat === "AVG_AGE" ? String(avgAge || 36) : f.stat;
          const isCountdown = f.stat === "COUNTDOWN";
          const totalDays = Math.ceil((new Date("2026-08-04") - new Date("2026-06-01")) / (1000 * 60 * 60 * 24));
          const pctLeft = isCountdown ? Math.max(0, Math.min(1, daysLeft / totalDays)) : 0;

          if (isCountdown) return (
            <Tip key={f.label} text={f.tip} width={f.tipWidth || 300}>
              <div style={{ flex: "1 1 90px", border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: "13px 14px", textAlign: "center", cursor: "default",
                background: "linear-gradient(135deg,#fff5fb,#f5f0ff,#f0f5ff)" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>⏳</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.1,
                  background: "linear-gradient(90deg,#5B8DEF,#9B59B6,#E91E8C)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{daysLeft}</div>
                <div style={{ fontSize: 10.5, color: "#9B59B6", marginTop: 2, fontWeight: 700, marginBottom: 7 }}>{f.label}</div>
                {/* Progress bar */}
                <div style={{ height: 5, borderRadius: 100, background: "#e8e2f8", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 100, width: `${pctLeft * 100}%`,
                    background: "linear-gradient(90deg,#5B8DEF,#9B59B6,#E91E8C)",
                    transition: "width 0.4s ease" }} />
                </div>
              </div>
            </Tip>
          );

          return (
            <Tip key={f.label} text={f.tip} width={f.tipWidth || 300}>
              <div style={{ flex: "1 1 90px", border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: "13px 14px", textAlign: "center", cursor: "default",
                background: f.rainbow ? "linear-gradient(135deg,#fff5fb,#f5f0ff,#f0f5ff)" : CARD }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{f.emoji}</div>
                <div style={{ fontSize: stat.length > 4 ? 13 : 20, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.15,
                  background: f.rainbow ? "linear-gradient(90deg,#5B8DEF,#9B59B6,#E91E8C,#f59e0b,#10b981)" : G,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  whiteSpace: "pre-line" }}>{stat}</div>
                <div style={{ fontSize: 10.5, color: f.rainbow ? "#9B59B6" : MUTED,
                  marginTop: 2, lineHeight: 1.4, fontWeight: f.rainbow ? 700 : 400 }}>{f.label}</div>
              </div>
            </Tip>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "stretch" }}>

        {/* Bubble chart */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 18px 18px", position: "relative", display: "flex", flexDirection: "column" }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: TEXT }}>Industries</p>
          <p style={{ margin: "0 0 12px", fontSize: 11.5, color: MUTED }}>Hover a bubble for deep details</p>
          <div style={{ position: "relative", flex: 1, minHeight: 260 }}>
            {COHORT.industries.map((ind, i) => {
              const size = 36 + (ind.count / maxCount) * 82;
              const positions = [
                { top: 4,   left: 4   },
                { top: 2,   left: 108 },
                { top: 8,   left: 212 },
                { top: 80,  left: 30  },
                { top: 95,  left: 168 },
                { top: 185, left: 130 },
                { top: 185, left: 240 },
                { top: 185, left: 60  },
              ];
              const pos = positions[i] || { top: i * 28, left: i * 32 };
              const isHov = hovered === ind.name;

              return (
                <div key={ind.name}
                  onMouseEnter={e => { setHovered(ind.name); setPopup({ ind: ind.name, x: e.clientX, y: e.clientY }); }}
                  onMouseMove={e  => setPopup({ ind: ind.name, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => { setHovered(null); setPopup(null); }}
                  style={{
                    position: "absolute", top: pos.top, left: pos.left,
                    width: size, height: size, borderRadius: size / 2,
                    background: isHov ? ind.color : ind.light,
                    border: `2px solid ${isHov ? ind.color : ind.color + "55"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", cursor: "default",
                    transition: "all 0.18s", transform: isHov ? "scale(1.1)" : "scale(1)",
                    zIndex: isHov ? 20 : 1,
                    boxShadow: isHov ? `0 8px 24px ${ind.color}50` : "none",
                  }}>
                  <span style={{ fontSize: isHov ? 14 : 12, fontWeight: 800,
                    color: isHov ? "#fff" : ind.color, lineHeight: 1.1,
                    padding: "0 4px", textAlign: "center" }}>{ind.count}</span>
                  {size > 68 && (
                    <span style={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1.2,
                      color: isHov ? "rgba(255,255,255,0.85)" : ind.color,
                      textAlign: "center", padding: "1px 5px" }}>
                      {ind.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Stage */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", flexShrink: 0 }}>
            <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13, color: TEXT }}>Startup Stage</p>
            {COHORT.stages.map((s, i) => {
              const colors = ["#8b5cf6","#5B8DEF","#10b981","#f59e0b","#aaa"];
              return (
                <Tip key={s.name} text={s.tip} width={320} block>
                  <div style={{ marginBottom: i < COHORT.stages.length - 1 ? 9 : 0, cursor: "default", width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{s.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors[i] }}>{s.count}</span>
                    </div>
                    <div style={{ height: 5, background: "#f0edf8", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${s.pct}%`, borderRadius: 3, background: colors[i] }} />
                    </div>
                  </div>
                </Tip>
              );
            })}
          </div>

          {/* Focus word cloud */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", flex: 1 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13, color: TEXT }}>What Founders Are Working On</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {COHORT.focus.map(f => {
                const sz  = 10.5 + (f.count / 25) * 5;
                const op  = 0.45 + (f.count / 25) * 0.55;
                return (
                  <Tip key={f.name} text={f.tip} width={300}>
                    <span style={{ fontSize: sz, fontWeight: f.count > 10 ? 700 : 600,
                      padding: "4px 9px", borderRadius: 100, lineHeight: 1, cursor: "default",
                      background: `rgba(91,141,239,${op * 0.1})`,
                      color: `rgba(74,57,160,${op})`,
                      border: `1.5px solid rgba(91,141,239,${op * 0.35})` }}>
                      {f.name}
                    </span>
                  </Tip>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* County inline pills with hover popup */}
      <CountyStrip />

      {/* Patterns */}
      <div style={{ marginTop: 12 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "1.4px",
          textTransform: "uppercase", color: MUTED2 }}>Common Themes & Patterns</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {COHORT.patterns.map(p => (
            <Tip key={p.title} text={p.tip || p.body}>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 13, padding: "14px 16px", cursor: "default", width: "100%" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{p.emoji}</span>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: TEXT, lineHeight: 1.4 }}>{p.title}</p>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.65 }}>{p.body}</p>
              </div>
            </Tip>
          ))}
        </div>
      </div>

      {/* Fixed popup on hover */}
      {popup && hovInd && (
        <div style={{
          position: "fixed", top: popup.y - 10, left: popup.x + 16,
          zIndex: 9999, pointerEvents: "none",
          background: "#fff", border: `2px solid ${hovInd.color}`,
          borderRadius: 14, padding: "14px 16px", width: 260,
          boxShadow: `0 8px 30px ${hovInd.color}30, 0 2px 8px rgba(0,0,0,0.1)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: hovInd.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>{hovInd.count}</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, color: TEXT }}>{hovInd.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: MUTED }}>{Math.round(hovInd.count/76*100)}% of cohort</p>
            </div>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: MUTED, fontStyle: "italic", lineHeight: 1.5 }}>{hovInd.example}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            {[
              ["Top stage",   hovInd.topStage],
              ["Top focus",   hovInd.topFocus],
              ["Top county",  hovInd.topCounty],
              ["Women-led",   hovInd.pctWomen],
              ["Pre-revenue", hovInd.pctPreRev],
            ].map(([k, v]) => (
              <div key={k} style={{ background: hovInd.light, borderRadius: 8, padding: "6px 8px" }}>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", color: hovInd.color, marginBottom: 1 }}>{k}</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT }}>{v}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "6px 0 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.6px", color: MUTED2 }}>Common themes</p>
          {hovInd.themes.map(t => (
            <div key={t} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: hovInd.color, flexShrink: 0, marginTop: 5 }} />
              <p style={{ margin: 0, fontSize: 11.5, color: "#444", lineHeight: 1.5 }}>{t}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((f, i) => (
        <div key={i} onClick={() => setOpen(open === i ? null : i)}
          style={{ borderRadius: 12, border: `1px solid ${open === i ? "#c4b5fd" : BORDER}`,
            overflow: "hidden", cursor: "pointer",
            background: open === i ? "#faf8ff" : CARD }}>
          <div style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: open === i ? TEXT : "#444" }}>{f.q}</span>
            <span style={{ color: open === i ? "#9B59B6" : MUTED2, fontSize: 16, flexShrink: 0,
              marginLeft: 10, transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
          </div>
          {open === i && (
            <div style={{ padding: "0 16px 14px", fontSize: 13.5, color: "#555", lineHeight: 1.7 }}>{f.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Pulse Check ─────────────────────────────────────────────────────────────
function PulseCheck({ num, title, status, dueDate, unlockDate, questions }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const isOpen   = status === "open";
  const isLocked = status === "locked";
  const allAnswered = questions.filter(q => q.type !== "text").every(q => answers[q.id] !== undefined);
  const setA = (id, val) => setAnswers(a => ({ ...a, [id]: val }));

  return (
    <div style={{ background: CARD, border: `1px solid ${isOpen ? "#c4b5fd" : BORDER}`,
      borderRadius: 14, marginBottom: 10, overflow: "hidden", opacity: isLocked ? 0.6 : 1,
      boxShadow: isOpen ? "0 2px 16px rgba(155,89,182,0.1)" : "none" }}>

      <div style={{ padding: "15px 18px 12px", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0,
          background: isOpen ? G135 : SOFT, border: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 13, color: isOpen ? "#fff" : MUTED }}>{num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{title}</span>
            {isOpen && <GradBadge>Open · Due {dueDate}</GradBadge>}
            {isLocked && (
              <Tip text={`Not open yet.\nOpens ${unlockDate} · Closes ${dueDate}`}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: MUTED2, background: SOFT,
                  borderRadius: 100, padding: "2px 10px", border: `1px solid ${BORDER}`, cursor: "default" }}>
                  🔒 Opens {unlockDate} · Closes {dueDate}
                </span>
              </Tip>
            )}
            {submitted && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#16a34a",
                background: "#dcfce7", borderRadius: 100, padding: "2px 10px",
                border: "1px solid #bbf7d0" }}>✓ Submitted</span>
            )}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>Optional · ~2 min · Helps us support you better</p>
        </div>
      </div>

      {isOpen && !submitted && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "15px 18px 18px" }}>
          {questions.map((q, qi) => (
            <div key={q.id} style={{ marginBottom: qi < questions.length - 1 ? 20 : 14 }}>
              <p style={{ margin: "0 0 9px", fontSize: 13.5, fontWeight: 600, color: TEXT }}>{q.label}</p>
              {q.type === "scale" && (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setA(q.id, n)} style={{
                        width: 46, height: 46, borderRadius: 10, fontFamily: "inherit",
                        border: `1.5px solid ${answers[q.id] === n ? "transparent" : BORDER}`,
                        background: answers[q.id] === n ? G135 : CARD,
                        color: answers[q.id] === n ? "#fff" : MUTED,
                        fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all 0.15s",
                      }}>{n}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: MUTED }}>{q.low}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{q.high}</span>
                  </div>
                </div>
              )}
              {q.type === "yesno" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {["Yes", "No", "Not yet"].map(opt => (
                    <button key={opt} onClick={() => setA(q.id, opt)} style={{
                      padding: "10px 20px", borderRadius: 10, fontFamily: "inherit",
                      border: `1.5px solid ${answers[q.id] === opt ? "transparent" : BORDER}`,
                      background: answers[q.id] === opt ? G135 : CARD,
                      color: answers[q.id] === opt ? "#fff" : "#555",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                    }}>{opt}</button>
                  ))}
                </div>
              )}
              {q.type === "text" && (
                <textarea placeholder={q.placeholder} rows={3}
                  onChange={e => setA(q.id, e.target.value)}
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, resize: "vertical",
                    border: `1.5px solid ${BORDER}`, fontFamily: "inherit", fontSize: 13.5,
                    color: TEXT, background: SOFT, outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GradButton onClick={() => allAnswered && setSubmitted(true)} disabled={!allAnswered}>Submit →</GradButton>
            {!allAnswered && <span style={{ fontSize: 12, color: MUTED }}>Answer required questions to submit</span>}
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "15px 18px",
          display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4" }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: G135,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>✓</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: TEXT }}>Pulse check submitted</p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED }}>The Uplift team will review your responses.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contribute Resource ─────────────────────────────────────────────────────
function ContributeResource() {
  const TYPES = ["Article / Blog","Book","Video / Talk","Template","Tool / App","Framework","Other"];
  const [type, setType]   = useState(null);
  const [url, setUrl]     = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote]   = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return (
    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12,
      padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 30, height: 30, borderRadius: 15, background: G135, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: TEXT }}>Resource submitted!</p>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>We'll review and add it to the mentee library.</p>
      </div>
      <button onClick={() => { setSubmitted(false); setType(null); setUrl(""); setTitle(""); setNote(""); }}
        style={{ fontSize: 12, color: MUTED, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        Submit another
      </button>
    </div>
  );

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "13px 15px", borderBottom: `1px solid ${BORDER}`, background: SOFT }}>
        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: TEXT }}>Know something great? Share it with mentees.</p>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>e.g. "The Mom Test", YC Startup School videos, Notion pitch deck template</p>
        <p style={{ margin: "6px 0 0", fontSize: 11.5, color: MUTED2 }}>✨ Submitted resources are reviewed and added to the <strong style={{ color: MUTED }}>Resources tab</strong> in every mentee's portal.</p>
      </div>
      <div style={{ padding: "14px 15px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: "6px 13px", borderRadius: 100, fontFamily: "inherit",
              border: `1.5px solid ${type === t ? "transparent" : BORDER}`,
              background: type === t ? G135 : CARD,
              color: type === t ? "#fff" : MUTED,
              fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title or name"
            style={{ padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${BORDER}`,
              background: SOFT, color: TEXT, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)"
            style={{ padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${BORDER}`,
              background: SOFT, color: TEXT, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Why is this helpful for founders? (optional)"
          rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, resize: "vertical",
            border: `1.5px solid ${BORDER}`, fontFamily: "inherit", fontSize: 13,
            color: TEXT, background: SOFT, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <GradButton onClick={async () => {
          if (!type || !title) return;
          try {
            await fetch("/api/submit-resource", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type, title, url, note }),
            });
          } catch (_) {}
          setSubmitted(true);
        }} disabled={!type || !title}>
          Submit resource →
        </GradButton>
      </div>
    </div>
  );
}

// ─── Support Ticket ───────────────────────────────────────────────────────────
function SupportTicket() {
  const TOPICS = ["My mentee hasn't responded","I need to reschedule","I have concerns about the match","Technical issue","Question about the program","Other"];
  const [topic, setTopic]     = useState(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return (
    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14,
      padding: "26px 20px", textAlign: "center" }}>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: G135,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, margin: "0 auto 12px" }}>✓</div>
      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: TEXT }}>Ticket submitted</p>
      <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.7 }}>We'll follow up at your email within 1 business day.</p>
    </div>
  );

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 13.5, color: TEXT }}>What do you need help with?</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {TOPICS.map(t => (
            <button key={t} onClick={() => setTopic(t)} style={{
              padding: "7px 14px", borderRadius: 100, fontFamily: "inherit",
              border: `1.5px solid ${topic === t ? "transparent" : BORDER}`,
              background: topic === t ? G135 : CARD,
              color: topic === t ? "#fff" : MUTED,
              fontWeight: 600, fontSize: 12.5, cursor: "pointer", transition: "all 0.15s",
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ margin: "0 0 9px", fontWeight: 600, fontSize: 13.5, color: TEXT }}>
          Tell us more <span style={{ fontWeight: 400, color: MUTED }}>(optional)</span>
        </p>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Any context that would help us respond faster..."
          rows={4} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, resize: "vertical",
            border: `1.5px solid ${BORDER}`, fontFamily: "inherit", fontSize: 13.5,
            color: TEXT, background: SOFT, outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
      </div>
      <div style={{ padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: G135,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff" }}>KO</div>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#444" }}>Kennedy Okonkwo</p>
            <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Responds within 1 business day</p>
          </div>
        </div>
        <GradButton onClick={() => topic && setSubmitted(true)} disabled={!topic}>Send →</GradButton>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, children }) {
  return (
    <div id={id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: "26px 28px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
      {children}
    </div>
  );
}

// ─── Nav sections ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "mentees",  label: "Mentees" },
  { id: "summary",  label: "Summary" },
  { id: "checkins", label: "Check-Ins" },
  { id: "guide",    label: "Guide" },
  { id: "eop",      label: "End of Program" },
  { id: "support",  label: "Support" },
  { id: "about",    label: "About" },
];

// ─── Sample data ──────────────────────────────────────────────────────────────
const MENTEES_DATA = [
  {
    name: "Anthony Caruso", company: "Contextral", stage: "Early traction", industry: "AI / Data / ML",
    cohort: 1, cohortName: "Edison",
    town: "Ocean County", email: "anthony@contextral.com", linkedin: "https://www.linkedin.com/in/anthony-caruso",
    headshot: "/photos/anthony-caruso.jpg",
    primaryFocus: "Go-to-market & customer acquisition", secondaryFoci: ["Fundraising strategy & investor readiness"],
    edu: 0,
    milestones: { participation: true, onboarding: true, matched: true, session1: true },
    reflections: {
      primaryGoal: "Land our first 3 paying customers and prove the GTM motion before raising a pre-seed.",
      stuckOn: "Figuring out whether to go direct or through channel partners — both feel viable but I can't do both.",
    },
    loggedSessions: [
      { date: "Jun 12, 2026", sixtyMin: true, takeaways: "Mapped out ICP and prioritized direct outreach over channel. Action: draft outreach sequence for 10 target accounts." }
    ],
  },
  {
    name: "Ebunoluwa Adenekan", company: "KLA Corporation", stage: "Idea stage", industry: "Hardware / Manufacturing",
    cohort: 4, cohortName: "Lawrence",
    town: "Newark", email: "ebun@klacorp.co", linkedin: "https://www.linkedin.com/in/ebunoluwa-adenekan",
    headshot: "/photos/ebunoluwa-adenekan.jpg",
    primaryFocus: "Go-to-market & customer acquisition", secondaryFoci: ["Refining pitch or company narrative"],
    edu: 1,
    milestones: { participation: true, onboarding: true, matched: true, edu1: true },
    reflections: {
      primaryGoal: "Get clear on my go-to-market and build a narrative I can actually pitch to partners and investors.",
      stuckOn: "Hardware has long sales cycles — I don't know how to show traction without a product in market yet.",
    },
    loggedSessions: [],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MentorPreview() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState(false);
  const [active, setActive] = useState("mentees");
  const [avgAge, setAvgAge] = useState(null);

  useEffect(() => {
    fetch("https://uplift2026.vercel.app/api/founder-age-stats")
      .then(r => r.json())
      .then(d => { if (d.avg) setAvgAge(d.avg); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authed) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [authed]);

  const attempt = () => {
    if (pw.trim().toLowerCase() === "ed") setAuthed(true);
    else { setErr(true); setTimeout(() => setErr(false), 1800); setPw(""); }
  };

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: SOFT, fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20,
          padding: "44px 40px", textAlign: "center", boxShadow: "0 8px 40px rgba(91,141,239,0.08)" }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: G135,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px", fontSize: 24 }}>🧑‍🏫</div>
          <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: "-0.5px" }}>Mentor Portal</p>
          <p style={{ margin: "0 0 26px", fontSize: 13, color: MUTED }}>Uplift Summer 2026 · TechUnited NJ</p>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Your first name, lowercase"
            style={{ width: "100%", padding: "12px 14px", fontSize: 14, borderRadius: 10,
              fontFamily: "inherit", background: SOFT, color: TEXT, outline: "none",
              boxSizing: "border-box", marginBottom: 10,
              border: `1.5px solid ${err ? "#f87171" : BORDER}`, transition: "border-color 0.2s" }} />
          {err && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>Incorrect password</p>}
          <GradButton onClick={attempt}>Enter Portal →</GradButton>
        </div>
      </div>
    </div>
  );

  // ── Portal ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: SOFT, minHeight: "100vh",
      fontFamily: "'Inter', system-ui, sans-serif", color: TEXT }}>
      <Nav sections={SECTIONS} active={active} />

      {/* Hero — light */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`,
        padding: "48px 40px 52px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 400, height: "100%",
          background: "linear-gradient(135deg, rgba(91,141,239,0.04) 0%, rgba(233,30,140,0.03) 100%)",
          pointerEvents: "none" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <GradBadge>✦ Mentor Portal · Summer 2026</GradBadge>
          <h1 style={{ margin: "18px 0 8px", fontSize: 40, fontWeight: 800, color: TEXT,
            letterSpacing: "-1.5px", lineHeight: 1.08 }}>Welcome, Ed 👋</h1>
          <p style={{ margin: "0 0 6px", fontSize: 15, color: MUTED, lineHeight: 1.75 }}>
            Principal Consultant · Ed Sawma Consulting<br/>
            You're mentoring <strong style={{ color: "#444" }}>2 founders</strong> this summer.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 28,
            background: SOFT, border: `1px solid ${BORDER}`, borderRadius: 100, padding: "5px 14px" }}>
            <span style={{ fontSize: 12 }}>📅</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>June 1 – August 4, 2026 · 10 weeks</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {[
              { val: "2",      label: "Mentees",        tip: "Number of founders assigned to you this cohort." },
              { val: "1",      label: "Sessions logged", tip: "Total 60-min sessions logged across your mentees.\n3 sessions per mentee required." },
              { val: "Week 3", label: "of 10",           tip: "Current week of the program.\nProgram runs June 1 – August 4." },
              { val: "Jun 23", label: "Midpoint Meetup", tip: "📍 Reminder: June 23rd is our Midpoint Meetup — an in-person event for all mentors and mentees.\n\nAttendance is required. If you can't make it, please email uplift@techunited.co as soon as possible." },
            ].map(({ val, label, tip }) => (
              <Tip key={label} text={tip}>
                <div style={{ flex: 1, background: SOFT, border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: "15px 16px", cursor: "default" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2, letterSpacing: "-0.5px",
                    background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: MUTED2,
                    textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
                </div>
              </Tip>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 20px 80px" }}>

        {/* ── Mentees ── */}
        <Section id="mentees">
          <Label>Your Mentees</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MENTEES_DATA.map(m => <MenteeCard key={m.name} m={m} />)}
          </div>
        </Section>

        {/* ── Summary ── */}
        <Section id="summary">
          <Label>Program Summary</Label>
          <div style={{ background: "linear-gradient(135deg,#EEF4FF,#faf5ff)",
            border: "1px solid #c4b5fd", borderRadius: 13, padding: "15px 18px", marginBottom: 20 }}>
            <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14, color: "#5B2D8E" }}>🎉 Week 3 of 10</p>
            <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.7 }}>
              Priya's first session is logged — great start. Marcus hasn't had his first session yet. Week 3 is the makeup week, so now is the time to get that scheduled.
            </p>
          </div>

          <Label>Program Timeline</Label>
          <div style={{ position: "relative", paddingLeft: 26 }}>
            <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2,
              background: "linear-gradient(180deg,#5B8DEF,#E91E8C)", borderRadius: 1 }} />
            {[
              { wk: "Week 1–2",  title: "Onboarding, Matching & Session 1", active: true, note: "Introductions, align on goals, complete Session 1", tip: "📍 You are here\nThis is the onboarding and matching phase. Mentees completed their intake forms, got matched, and are scheduling their first 60-min session with you now.\n\nIf you haven't had your first session yet — this is the week to make it happen." },
              { wk: "Week 3",    title: "Makeup Week + Touchpoint",         note: "Catch up on Session 1 if needed · quick check-in",     tip: "Buffer week for any pairs who haven't completed Session 1 yet.\n\nTechUnited will do a quick touchpoint to make sure everyone is connected and on track. No action required unless you haven't had your first session." },
              { wk: "Week 4",    title: "Midpoint Meetup",                   note: "In-person event · all mentors + mentees · June 23", register: "https://luma.com/zfr1e2gt", tip: "Uplift Midpoint Meetup — an in-person gathering for all mentor-mentee pairs.\n\nJune 23 · Attendance required. If you can't make it, email uplift@techunited.co as soon as possible." },
              { wk: "Week 5",    title: "Session 2",                         note: "Deep-dive on core challenge",                          tip: "Your second 60-min session with your mentee. By now you know each other — go deep on their biggest blocker. GTM, fundraising narrative, product decisions. Push past surface-level and challenge the underlying assumptions." },
              { wk: "Week 6",    title: "Makeup Week",                       note: "Buffer week · catch up if needed",                     tip: "Makeup week if Session 2 hasn't happened yet. Also a good time for a quick async check-in — a message asking how things are going goes a long way." },
              { wk: "Week 7",    title: "Session 3",                         note: "Final session · focus on what's next",                 tip: "Your third and final required session. Shift focus to what happens after the program — specific next steps, intros you can make, and momentum they can carry forward.\n\nSpecific > general. 'Email this person by Friday' > 'you should network more.'" },
              { wk: "Week 8",    title: "End of Program Sign-Off",           note: "Mentor reflection + sign-off form · required",         tip: "Sign-off form unlocks and is REQUIRED to receive your certificate.\n\nComplete your mentor reflection, fill out the Mentee Momentum Check, and confirm all sessions are logged and approved before August 4." },
              { wk: "Week 9",    title: "Uplift Summit",                     note: "End-of-program celebration · founder showcase · Aug 4", register: "https://luma.com/c8we4c2b", tip: "The Uplift Summit — TechUnited's end-of-summer founder showcase and celebration.\n\nAugust 4 · Attendance required. Mentor certificates distributed here." },
              { wk: "Post-Program", title: "Uplift Summit",             note: "Certificate + Uplift Summit",            tip: "🎉 Celebration time. Uplift Summit is TechUnited's end-of-summer founder showcase. Attend if you can — it's a great way to see what your mentee has built and meet the full cohort." },
            ].map(({ wk, title, done, active, note, tip, register }) => (
              <div key={wk} style={{ position: "relative", paddingBottom: 14 }}>
                <Tip text={tip} width={380}>
                  <div style={{ position: "absolute", left: -22, top: 3, width: 16, height: 16, borderRadius: 8,
                    background: done || active ? G135 : CARD, border: done || active ? "none" : `2px solid ${BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
                    {done && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
                    {active && <div style={{ width: 5, height: 5, borderRadius: 3, background: "#fff" }} />}
                  </div>
                </Tip>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? "#9B59B6" : MUTED2,
                    textTransform: "uppercase", letterSpacing: "0.6px" }}>{wk}</span>
                  <span style={{ fontSize: 14, fontWeight: active ? 700 : 600,
                    color: done ? MUTED2 : active ? TEXT : "#444" }}>{title}</span>
                  {active && <span style={{ fontSize: 10, fontWeight: 700,
                    background: G, color: "#fff", borderRadius: 100, padding: "2px 9px" }}>Now</span>}
                  {register && (
                    <a href={register} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10.5, fontWeight: 700, color: "#fff",
                        background: "linear-gradient(90deg,#5B8DEF,#9B59B6)",
                        borderRadius: 100, padding: "2px 10px", textDecoration: "none",
                        letterSpacing: "0.2px" }}>
                      Register →
                    </a>
                  )}
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>{note}</p>
              </div>
            ))}
          </div>

          {/* Cohort map embedded in Summary */}
          <div style={{ marginTop: 24 }}>
            <Label>Summer 2026 Program</Label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: "0 0 3px", fontSize: 20, fontWeight: 800, color: TEXT, letterSpacing: "-0.5px" }}>
                  <GradText size={20} weight={800}>76 founders.</GradText> One summer.
                </h2>
                <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>Across NJ · June 1 – August 4, 2026</p>
              </div>
            </div>
            <BubbleMap avgAge={avgAge} />
          </div>
        </Section>

        {/* ── Check-Ins ── */}
        <Section id="checkins">
          <Label>Touchbases & Check-Ins</Label>
          <p style={{ margin: "0 0 16px", fontSize: 13.5, color: MUTED, lineHeight: 1.65 }}>
            Quick optional pulse checks — no meetings, no calls. A few questions so we can support you and flag anything that needs attention.
          </p>

          <PulseCheck num="1" title="Mid-Program Pulse Check"
            status="locked" unlockDate="Week 3" dueDate="end of Week 3"
            questions={[
              { id: "q1", label: "How is the mentorship going so far?", type: "scale", low: "Struggling", high: "Going great" },
              { id: "q2", label: "Have you had at least one session with your mentee?", type: "yesno" },
              { id: "q3", label: "Anything blocking you or your mentee we should know about?", type: "text", placeholder: "Optional..." },
            ]}
          />

          {/* Post-Program Pulse Check — Week 9, optional */}
          <div style={{ background: SOFT, border: `1px solid ${BORDER}`, borderRadius: 13, padding: "13px 18px", opacity: 0.6 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: CARD, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, color: MUTED, border: `1px solid ${BORDER}` }}>✦</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#555" }}>Post-Program Pulse Check</span>
                  <Tip text="Sent to you after the Uplift Summit (Week 9).\nA quick optional reflection on your experience as a mentor this summer.">
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: MUTED2, background: CARD,
                      borderRadius: 100, padding: "2px 10px", border: `1px solid ${BORDER}`, cursor: "default" }}>🔒 Week 9</span>
                  </Tip>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>Optional · sent after the program wraps up</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── End of Program ── */}
        <div id="eop" style={{ background: "#faf5ff", border: "1px solid #ddd6fe",
          borderRadius: 16, padding: "26px 28px", marginBottom: 12 }}>
          <Label>End of Program</Label>
          <div style={{ background: "#ede9fd", border: "1px solid #c4b5fd",
            borderRadius: 12, padding: "15px 17px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14, color: "#5B2D8E" }}>🔒 Sign-off opens Week 8</p>
            <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.65 }}>
              Once all sessions are logged, the review and sign-off form unlock. Share a reflection on your mentee's growth and receive your official Uplift Mentor certificate.
            </p>
          </div>
          {[
            { icon: "📜", l: "Sign-Off Report", required: true, d: "Confirms participation · generates your certificate", tip: "REQUIRED. Your official sign-off confirms program completion and triggers your Uplift Mentor certificate." },
          ].map(({ icon, l, d, tip, required }) => (
            <Tip key={l} text={tip}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "default",
                padding: "12px 14px", borderRadius: 11, background: CARD,
                border: `1px solid ${required ? "#fca5a5" : BORDER}`, marginBottom: 7, opacity: 0.55 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: TEXT }}>{l}</p>
                    {required && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#ef4444",
                      background: "#fef2f2", borderRadius: 100, padding: "1px 7px",
                      border: "1px solid #fca5a5", textTransform: "uppercase", letterSpacing: "0.5px" }}>Required</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{d}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: MUTED2 }}>Locked</span>
              </div>
            </Tip>
          ))}
        </div>

        {/* ── Guide ── */}
        <Section id="guide">
          <Label>Guide, Expectations & Resources</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            {[
              { l: "Duration",        v: "10 Weeks · June – August 2026" },
              { l: "Your Commitment", v: "3 sessions · 60 min each" },
              { l: "Format",          v: "1-on-1 · video or in person" },
              { l: "All sessions by", v: "August 4, 2026" },
            ].map(({ l, v }) => (
              <div key={l} style={{ background: SOFT, border: `1px solid ${BORDER}`, borderRadius: 11, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.7px", color: MUTED2, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#EEF4FF", border: "1px solid #bfdbfe", borderRadius: 13,
            padding: "17px 18px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 14, color: TEXT }}>Mentor Responsibilities</p>
            <Check>Provide a <strong>minimum of 3 mentorship sessions</strong> (60 min each) with your assigned mentee(s)</Check>
            <Check>Attend the <strong>midpoint meetup</strong> — a program milestone event at the halfway point</Check>
            <Check>Keep all mentee conversations <strong>confidential</strong></Check>
            <Check>Focus on their stated goals — specific guidance, not generic advice</Check>
            <Check>Attend the <strong>Uplift Summit</strong> — our end-of-program celebration (August 4)</Check>
            <Check>Complete the <strong>End of Program Report</strong> — required to receive your mentor certificate</Check>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: MUTED, fontStyle: "italic", lineHeight: 1.6 }}>
              If you cannot attend June 23 or August 4, please let us know at <a href="mailto:uplift@techunited.co" style={{ color: MUTED, textDecorationColor: MUTED }}>uplift@techunited.co</a> as soon as possible.
            </p>
          </div>

          <Label>Resources</Label>
          {[
            { icon: "📄", label: "Mentor Handbook",                  href: "/resources/mentor-handbook",    desc: "Program overview, tips, and best practices" },
            { icon: "🗓️", label: "Uplift Program Schedule",          href: "/resources/program-schedule",   desc: "Key dates, milestones, and events" },
            { icon: "💡", label: "How to Give Feedback to Founders",  href: "/resources/feedback-guide",     desc: "Practical tips for high-impact mentor feedback" },
            { icon: "🌐", label: "NJ Startup Ecosystem Overview",     href: "/resources/nj-ecosystem",       desc: "Key players, resources, and networks in NJ" },
          ].map(({ icon, label, href, desc }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 11,
                padding: "11px 13px", borderRadius: 10, background: CARD,
                border: `1px solid ${BORDER}`, marginBottom: 5, cursor: "pointer",
                textDecoration: "none" }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#333" }}>{label}</div>
                <div style={{ fontSize: 11.5, color: MUTED }}>{desc}</div>
              </div>
              <GradText>↗</GradText>
            </a>
          ))}

          <div style={{ height: 1, background: BORDER, margin: "18px 0" }} />
          <Label>Share a Resource</Label>
          <ContributeResource />

          <div style={{ height: 1, background: BORDER, margin: "18px 0" }} />
          <Label>FAQ</Label>
          <FAQ items={[
            { q: "What are my program responsibilities?", a: "Your core commitments: ① Complete 3 sessions (60 min each) with your mentee by August 4. ② Attend the Midpoint Meetup (June 23) and the Uplift Summit (August 4). ③ Complete the End of Program Sign-Off — this is required and generates your mentor certificate. ④ Keep all mentee conversations confidential and focus on their stated goals." },
            { q: "Who are the Uplift participants?", a: "Uplift is designed for women and minority founders building early-stage companies in New Jersey. Founders are at various stages — from idea to early traction — and come from 8 industries across 10 NJ counties. This cohort has 76 founders, 52% women-led, 83% pre-revenue. Most are first-time founders who have a product or early idea but need help with customer acquisition, go-to-market strategy, and building a network in NJ." },
            { q: "What are the mentee requirements?", a: "Mentees are expected to: ① Attend and actively participate in all 3 sessions with their mentor. ② Log each session in the portal. ③ Complete 3 educational sessions (Uplift-hosted workshops, panels, and founder talks). ④ Fill out the midpoint reflection form at Week 5. ⑤ Maintain responsive communication with their mentor — typically replying within 2–3 days. ⑥ Attend the Uplift Summit at the end of the program." },
            { q: "How many sessions am I expected to do?", a: "A minimum of 3 sessions, 60 minutes each. More is always welcome — just ask your mentee to log each one." },
            { q: "Do I need to log anything?", a: "No — your mentee logs all sessions. Approved sessions appear in your portal automatically." },
            { q: "What if I have additional questions?", a: "Email uplift@techunited.co — we're here to help and respond within 1 business day." },
          ]} />
        </Section>

        {/* ── Support ── */}
        <Section id="support">
          <Label>Contact Support</Label>
          <p style={{ margin: "0 0 14px", fontSize: 13.5, color: MUTED, lineHeight: 1.65 }}>
            Need help? Fill out the form below — we'll get back to you within 1 business day.
          </p>
          <SupportTicket />
        </Section>

        {/* ── About ── */}
        <Section id="about">
          <Label>About</Label>

          {/* About Uplift */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: "24px 26px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: G135, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚀</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: "-0.4px" }}>About Uplift</h3>
                <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>TechUnited NJ's Founder Mentorship Program</p>
              </div>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#444", lineHeight: 1.8 }}>
              Uplift is TechUnited NJ's summer mentorship program for <strong>women and minority founders</strong> building companies in New Jersey. We connect early-stage founders with experienced mentors for a focused 8-week sprint — matching by stage, industry, and need, then getting out of the way.
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#444", lineHeight: 1.8 }}>
              The program runs June through August and wraps with the Uplift Summit — an end-of-summer celebration and founder showcase. In 2026 we have 76 founders across 8 industries and 10 NJ counties — all based right here in New Jersey.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { emoji: "🎯", label: "Focus", val: "Early-stage NJ founders" },
                { emoji: "📅", label: "Timeline", val: "June 1 – August 4, 2026" },
                { emoji: "🏆", label: "Goal", val: "Clarity, confidence, direction" },
              ].map(x => (
                <div key={x.label} style={{ background: SOFT, border: `1px solid ${BORDER}`,
                  borderRadius: 11, padding: "11px 13px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{x.emoji}</div>
                  <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.6px", color: MUTED2 }}>{x.label}</p>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: TEXT }}>{x.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* About TechUnited */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: "24px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                background: "#fff", border: `1px solid ${BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 6 }}>
                <img src="https://techunited.co/wp-content/uploads/2026/03/TechUnitedNJ-Logo-FINAL-Full-Color-Black-Text.png"
                  alt="TechUnited NJ" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: "-0.4px" }}>About TechUnited NJ</h3>
                <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>New Jersey's Tech & Startup Community</p>
              </div>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#444", lineHeight: 1.8 }}>
              Our mission is to empower and inspire entrepreneurs and innovators to build a better future for all.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
{ emoji: "🤝", text: "Founders · Investors · Corporates" },
                { emoji: "🎤", text: "Events, programs & community" },
                { emoji: "✉️", text: "uplift@techunited.co" },
              ].map(x => (
                <div key={x.text} style={{ display: "flex", alignItems: "center", gap: 7,
                  background: SOFT, border: `1px solid ${BORDER}`, borderRadius: 100,
                  padding: "6px 13px", fontSize: 12.5, color: "#444", fontWeight: 500 }}>
                  <span>{x.emoji}</span>{x.text}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div style={{ textAlign: "center", padding: "24px 0 0" }}>
          <p style={{ margin: 0, fontSize: 12, color: MUTED2, lineHeight: 1.8 }}>
            TechUnited NJ · Uplift Summer 2026 ·{" "}
            <a href="mailto:uplift@techunited.co" style={{ color: MUTED2 }}>uplift@techunited.co</a>
          </p>
        </div>
      </div>
    </div>
  );
}
