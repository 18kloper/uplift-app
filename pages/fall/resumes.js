// /fall/resumes (and /fallfounderresumes) — the Fall 2026 founder resume
// book: the same one-pager a prospective mentor gets sent (/fall/profile/<id>),
// stacked into one document with every accepted founder in it.
//
// This is the mentor-facing companion to the lookbook. The lookbook is the
// magazine; this is the stack of sheets. Both read the same public feed
// (/api/fall-lookbook), which is where the privacy line already lives: that
// endpoint ships approved, non-test founders with mentor-safe fields only,
// and it never ships an email, a phone number, or a location. So there is no
// contact code on this page and nothing to unlock. A mentor gets contact
// details when their own match lands, not from the book.
//
// Printing lays the whole stack out, one letter sheet per founder.

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { FounderSheet, SheetStyles } from "../../components/FounderSheet";

const NAVY = "#110465";
const COVER = "#1a1733"; // the ground the uplift mark is drawn on, so the logo sits flush
const PINK = "#d86697";
const PURPLE = "#5c4eb5";
const MUTED = "#6b6480";
const LINE = "#e8e4f5";
const DISPLAY = "'Red Hat Display', system-ui, sans-serif";
const SANS = "'Red Hat Text', system-ui, sans-serif";

// Names arrive exactly as they were typed into the application, which means
// some are all lowercase. Same rule the lookbook uses: a word that already
// carries a capital is left alone, so "JT" and "Khasky-Levy" survive while
// "ceana santori" gets its capitals.
const properName = (v) => String(v || "")
  .split(/(\s+)/)
  .map(part => (/[A-Z]/.test(part) ? part : part.replace(/(^|[-'\u2019])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase())))
  .join("");

// A few founders answered the company question with a placeholder. On a sheet
// headed "Founder resumes" a byline reading "NA" is worse than no byline.
const PLACEHOLDER_CO = /^(n\/?a|none|na|tbd|no company|n\/a yet)$/i;
const realCompany = (v) => (v && !PLACEHOLDER_CO.test(String(v).trim()) ? v : null);

// The feed drops the revenue and fundraising keys rather than blanking them,
// and a founder with no snapshot at all comes back with a null. FounderSheet
// reads f.snapshot.* directly, so give it an object to read.
const normalize = (f) => ({
  ...f,
  first: properName(f.first),
  last: properName(f.last),
  company: realCompany(f.company),
  snapshot: f.snapshot || {},
});

const fullName = (f) => `${f.first} ${f.last}`.trim();
const anchor = (f) => `f-${f.id}`;

export default function FounderResumes() {
  const [founders, setFounders] = useState(null);
  const [failed, setFailed] = useState(false);
  const generatedAt = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let live = true;
    fetch("/api/fall-lookbook")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (live) setFounders((d.founders || []).map(normalize)); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const title = "Fall 2026 Founder Resumes · Uplift";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="One page per founder in the Fall 2026 Uplift cohort: what they are building, where they are, and what they are looking for from a mentor." />
        <link rel="icon" href="/uplift-logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Red+Hat+Text:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </Head>
      <SheetStyles multi />

      <div style={{ fontFamily: SANS, paddingBottom: 40 }}>

        {/* Cover. Not a sheet: the book opens on screen, and printing starts
            at the first founder so nobody prints a title page. */}
        <div className="noprint" style={{ background: COVER, padding: "44px 24px 38px" }}>
          <div style={{ maxWidth: "8.5in", margin: "0 auto" }}>
            <img src="/uplift-mark-b1.png" alt="Uplift" style={{ display: "block", width: 168, height: "auto", marginBottom: 26 }} />
            <p style={{ margin: "0 0 6px", fontFamily: DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: PINK }}>
              Fall 2026 · Mentor copy
            </p>
            <h1 style={{ margin: "0 0 12px", fontFamily: DISPLAY, fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.05 }}>
              Founder resumes
            </h1>
            <p style={{ margin: "0 0 22px", fontSize: 15, color: "#c8c0e8", lineHeight: 1.65, maxWidth: "5.4in" }}>
              One page per founder accepted into the cohort so far. Each sheet is the same
              one-pager we would hand you ahead of a match: what they are building, where
              the business actually is, and what they are hoping a mentor helps them do.
              Contact details arrive with your match on September 14.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => window.print()}
                style={{ border: "none", background: "#fff", color: NAVY, borderRadius: 100, padding: "11px 22px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: DISPLAY }}
              >
                Print / save the book as PDF
              </button>
              <a
                href="/fallfounderlookbook"
                style={{ border: "1px solid #4a4470", background: "transparent", color: "#fff", borderRadius: 100, padding: "11px 22px", fontSize: 14, fontWeight: 800, textDecoration: "none", fontFamily: DISPLAY }}
              >
                Open the lookbook instead
              </a>
            </div>
          </div>
        </div>

        {/* Contents */}
        {founders && founders.length > 0 && (
          <div className="noprint" style={{ background: "#fff", borderBottom: `1px solid ${LINE}`, padding: "26px 24px" }}>
            <div style={{ maxWidth: "8.5in", margin: "0 auto" }}>
              <p style={{ margin: "0 0 14px", fontFamily: DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>
                {founders.length} founders
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "4px 22px" }}>
                {founders.map((f, i) => (
                  <a
                    key={f.id}
                    href={`#${anchor(f)}`}
                    style={{ display: "flex", gap: 9, alignItems: "baseline", padding: "5px 0", fontSize: 13.5, color: NAVY, textDecoration: "none", lineHeight: 1.4, borderBottom: `1px solid ${LINE}` }}
                  >
                    <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 800, color: PINK, minWidth: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <strong style={{ fontFamily: DISPLAY, fontWeight: 700 }}>{fullName(f)}</strong>
                      {f.company && <span style={{ color: MUTED }}>{` · ${f.company}`}</span>}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* The stack */}
        {founders === null && !failed && (
          <p className="noprint" style={{ textAlign: "center", padding: "60px 24px", fontSize: 14, color: MUTED }}>
            Loading the book…
          </p>
        )}

        {failed && (
          <div className="noprint" style={{ maxWidth: 460, margin: "60px auto", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "30px 34px", textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontFamily: DISPLAY, fontSize: 18, fontWeight: 800, color: NAVY }}>The book is taking a moment</p>
            <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
              Refresh in a few seconds and it should come right back. If it doesn&rsquo;t, email{" "}
              <a href="mailto:uplift@techunited.co" style={{ color: PURPLE, fontWeight: 700 }}>uplift@techunited.co</a>.
            </p>
          </div>
        )}

        {founders && founders.map((f, i) => (
          <div
            key={f.id}
            id={anchor(f)}
            className={i === founders.length - 1 ? "lastpage" : undefined}
            style={{ scrollMarginTop: 12 }}
          >
            <FounderSheet founder={f} generatedAt={generatedAt} />
          </div>
        ))}

      </div>

      <style jsx global>{`
        @media print { .noprint { display: none !important; } }
      `}</style>
    </>
  );
}
