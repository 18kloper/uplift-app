// /fall/lookbook (and /fallfounderlookbook) — the Fall 2026 program as a
// magazine you click through: cover, contents, at a glance, the two
// open-door indexes, a page of faces, then a feature per founder.
//
// The pages themselves live in components/LookbookPages.js. This file is the
// binding: it loads the founders, works out what goes on the index pages, and
// turns the pages. Printing lays the whole issue out, one letter sheet each.
//
// Admin-gated like the rest of the fall board. Founders load after the gate
// rather than being server-rendered, so the whole set is never sitting in the
// page source. The single-founder handout (/fall/profile/<id>) is a separate,
// plainer document, and that is the link a mentor gets.

import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { SheetStyles, pickMentorSafe } from "../../components/FounderSheet";
import {
  CoverPage, ContentsPage, GlancePage, IndexPage, MosaicPage, FeaturePage,
  PAPER, INK, INK_SOFT, RULE, ACCENT, DISPLAY, SANS,
} from "../../components/LookbookPages";

// Typeform's choice labels carry a parenthetical gloss that is useful in the
// form and noise in a tally.
const short = (v) => String(v || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/:$/, "").trim();
const isSoon = (v) => /^yes$/i.test(v || "") || /next 6 months/i.test(v || "");

function tally(founders, pick) {
  const counts = new Map();
  for (const f of founders) {
    const key = pick(f);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function PasswordGate({ onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const attempt = () => {
    if (input.trim().toLowerCase() === "admin") onAuthenticated();
    else setError(true);
  };
  return (
    <div style={{ minHeight: "100vh", background: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
      <div style={{ background: PAPER, borderRadius: 4, padding: "40px 44px", width: 380, textAlign: "center" }}>
        <p style={{ margin: "0 0 6px", fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, color: INK }}>Uplift</p>
        <p style={{ margin: "0 0 22px", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: INK_SOFT }}>The Founder Lookbook</p>
        <input
          type="password" value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Access code"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 3, border: error ? "1.5px solid #c0392b" : `1px solid ${RULE}`, fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 12, background: "#fff" }}
        />
        <button onClick={attempt} style={{ width: "100%", border: "none", borderRadius: 3, padding: "11px 0", background: INK, color: PAPER, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
          Enter
        </button>
      </div>
    </div>
  );
}

export default function Lookbook() {
  const [authed, setAuthed] = useState(false);
  const [founders, setFounders] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(0);
  const [generatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (sessionStorage.getItem("auth_admin_fall") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/admin/fall-people")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setFounders((d.mentees || [])
          .filter(m => m.decision === "approved" && !m.isTest)
          .sort((a, b) => `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`))
          .map(f => pickMentorSafe(f)));
      })
      .catch(e => setErr(e.message));
  }, [authed]);

  // Cover, contents, at a glance, seeking, hiring, faces, then the features.
  const FRONT = 6;
  const pageCount = founders ? FRONT + founders.length : 0;

  const openFounder = useCallback((id) => {
    if (!founders) return;
    const i = founders.findIndex(f => f.id === id);
    if (i >= 0) setPage(FRONT + i);
  }, [founders]);

  const turn = useCallback((delta) => {
    setPage(p => Math.min(Math.max(p + delta, 0), Math.max(pageCount - 1, 0)));
  }, [pageCount]);

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") turn(1);
      if (e.key === "ArrowLeft") turn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  // A #f-<id> link opens straight to that founder's feature.
  useEffect(() => {
    if (!founders) return;
    const hash = window.location.hash.replace("#f-", "");
    if (hash) openFounder(hash);
  }, [founders, openFounder]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  const seeking = useMemo(() => (founders || [])
    .filter(f => f.snapshot?.lookingForCustomers === true || f.snapshot?.seekingPartnerships === true)
    .map(f => ({
      founder: f,
      note: [f.snapshot?.lookingForCustomers === true && "Customers and pilots",
        f.snapshot?.seekingPartnerships === true && "Partnerships"].filter(Boolean).join(" · "),
    })), [founders]);

  const hiring = useMemo(() => (founders || [])
    .filter(f => isSoon(f.snapshot?.hiring))
    .map(f => ({
      founder: f,
      note: /^yes$/i.test(f.snapshot?.hiring || "") ? "Hiring now" : "Hiring within six months",
    })), [founders]);

  const glance = useMemo(() => {
    const fs = founders || [];
    return {
      stats: [
        { n: fs.filter(f => f.snapshot?.generatingRevenue === true).length, label: "generating revenue" },
        { n: fs.filter(f => isSoon(f.snapshot?.raising)).length, label: "raising now or within six months" },
        { n: fs.filter(f => isSoon(f.snapshot?.hiring)).length, label: "hiring now or within six months" },
        { n: fs.filter(f => f.snapshot?.lookingForCustomers === true).length, label: "looking for customers or pilots" },
      ],
      columns: [
        { title: "Stage", rows: tally(fs, f => short(f.stage)) },
        { title: "Industry", rows: tally(fs, f => short(f.industry)) },
        { title: "Where they are", rows: tally(fs, f => f.county && `${f.county} County`) },
        { title: "What they want help with", rows: tally(fs, f => f.primaryFocus) },
      ],
    };
  }, [founders]);

  if (!authed) {
    return (
      <>
        <Head>
          <title>Uplift · The Founder Lookbook</title>
          <meta name="robots" content="noindex,nofollow" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&display=swap" rel="stylesheet" />
        </Head>
        <PasswordGate onAuthenticated={() => { sessionStorage.setItem("auth_admin_fall", "1"); setAuthed(true); }} />
      </>
    );
  }

  const chrome = {
    border: `1px solid ${RULE}`, background: PAPER, color: INK,
    borderRadius: 2, padding: "6px 13px", fontSize: 9, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", fontFamily: SANS,
  };
  const sections = [
    { label: "At a glance", page: 2 },
    { label: "Looking for customers and partners", page: 3 },
    { label: "Hiring in the next six months", page: 4 },
    { label: "The full class", page: 5 },
  ];

  return (
    <>
      <Head>
        <title>Uplift · The Founder Lookbook</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="icon" href="/uplift-logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&display=swap" rel="stylesheet" />
      </Head>
      <SheetStyles multi />
      <style jsx global>{`
        body { background: #e9e4dc; }
        /* On screen the book shows one page; printing lays out all of them. */
        .book .stage { display: none; margin-top: 0; }
        .book .stage.on { display: flex; }
        .book .sheet { box-shadow: 0 10px 40px rgba(23,20,31,0.22); }
        @media print { .book .stage { display: block !important; } }
      `}</style>

      <div style={{ fontFamily: SANS, minHeight: "100vh" }}>
        <div className="noprint" style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(233,228,220,0.95)", backdropFilter: "blur(6px)", borderBottom: `1px solid ${RULE}` }}>
          <div style={{ maxWidth: "8.5in", margin: "0 auto", padding: "8px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setPage(1)} style={{ ...chrome, border: "none", background: "none", padding: 0, fontFamily: DISPLAY, fontSize: 15, fontWeight: 900, letterSpacing: "-0.01em", textTransform: "none" }}>
              Uplift <span style={{ fontStyle: "italic", fontWeight: 400, color: ACCENT }}>Lookbook</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {founders && (
                <select
                  value=""
                  onChange={e => { if (e.target.value) openFounder(e.target.value); }}
                  style={{ ...chrome, letterSpacing: "0.06em", textTransform: "none", fontSize: 11, maxWidth: 180 }}
                >
                  <option value="">Jump to a founder</option>
                  {founders.map(f => <option key={f.id} value={f.id}>{f.first} {f.last}</option>)}
                </select>
              )}
              <button onClick={() => turn(-1)} disabled={page === 0} style={{ ...chrome, opacity: page === 0 ? 0.4 : 1 }}>‹ Prev</button>
              <span style={{ fontFamily: DISPLAY, fontSize: 12, color: INK_SOFT, minWidth: 66, textAlign: "center" }}>
                {founders ? `${page + 1} / ${pageCount}` : "…"}
              </span>
              <button onClick={() => turn(1)} disabled={page >= pageCount - 1} style={{ ...chrome, opacity: page >= pageCount - 1 ? 0.4 : 1 }}>Next ›</button>
              <button onClick={() => window.print()} disabled={!founders} style={{ ...chrome, background: INK, color: PAPER, borderColor: INK }}>Print</button>
            </div>
          </div>
        </div>

        {founders && (
          <div className="book" style={{ padding: "18px 0 40px" }}>
            <CoverPage founders={founders} generatedAt={generatedAt} active={page === 0} />
            <ContentsPage
              founders={founders}
              sections={sections}
              onOpen={{ page: setPage, founder: openFounder }}
              active={page === 1}
              pageNumber={2}
            />
            <GlancePage founders={glance.columns} stats={glance.stats} active={page === 2} pageNumber={3} />
            <IndexPage
              active={page === 3}
              kicker="Open doors"
              title="Looking for customers and partners"
              standfirst="Founders actively seeking customers, pilot partners, or strategic partnerships. Click a name to read their feature."
              rows={seeking}
              onOpen={openFounder}
              empty="Nobody has flagged this yet."
              pageNumber={4}
            />
            <IndexPage
              active={page === 4}
              kicker="Open doors"
              title="Hiring in the next six months"
              standfirst="Founders hiring today or planning to within six months. Click a name to read their feature."
              rows={hiring}
              onOpen={openFounder}
              empty="Nobody has flagged this yet."
              pageNumber={5}
            />
            <MosaicPage founders={founders} onOpen={openFounder} active={page === 5} pageNumber={6} />
            {founders.map((f, i) => (
              <div key={f.id} id={`f-${f.id}`} className={i === founders.length - 1 ? "lastpage" : undefined}>
                <FeaturePage founder={f} active={page === FRONT + i} pageNumber={FRONT + i + 1} />
              </div>
            ))}
          </div>
        )}
        {!founders && (
          <p style={{ maxWidth: "8.5in", margin: "80px auto", textAlign: "center", fontFamily: DISPLAY, fontSize: 16, color: INK_SOFT }}>
            {err ? `Could not load the fall program: ${err}` : "Loading the issue…"}
          </p>
        )}
      </div>
    </>
  );
}
