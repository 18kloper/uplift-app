// The founder one-pager itself: a fixed 8.5 x 11 sheet, shared by the
// single-founder link (/fall/profile/<id>) and the print-them-all stack
// (/fall/profiles/print) so both always show the same page.

import { useEffect, useRef, useState } from "react";

export const PAGE_W = 8.5 * 96; // one letter sheet at CSS 96dpi
export const PAGE_H = 11 * 96;

const NAVY = "#110465";
const PINK = "#d86697";
const PURPLE = "#5c4eb5";
const GREEN = "#1a6e42";
const INK = "#37324e";
const MUTED = "#6b6480";
const LINE = "#e8e4f5";

// "Minimum program commitment (3 one-hour sessions)" is the Typeform label,
// which reads as fine print rather than as the commitment it is.
function sessionLabel(tier) {
  if (!tier) return null;
  return /minimum/i.test(tier) ? "3 sessions (program minimum)" : tier;
}

// Typeform choice labels carry a parenthetical or dashed gloss ("MVP / Early
// build (product in development or testing)", "Founder — Actively building
// and leading a company") that reads as noise in a fact rail.
function tight(v) {
  return typeof v === "string" ? v.replace(/\s*\([^)]*\)\s*$/, "").split(/\s+[—–-]\s+/)[0].trim() : v;
}

// Typeform hands back E.164 (+18623336049); a mentor reading a printed page
// wants the shape they would dial.
function formatPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return raw;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

// linkedin.com/in/cgallc reads better on paper than the full https URL.
function shortLink(url) {
  return String(url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

function yesNo(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return v || null;
}

// The four confidence answers, lowest first. A mentor reading this profile
// mostly wants to know how big the gap is in the one area the founder asked
// for help with, so it gets a meter rather than a row in a table.
const CONFIDENCE_STEPS = ["Not confident", "Somewhat confident", "Confident", "Very confident"];


// The application fields a mentor-facing page may carry. Contact details are
// included so a mentor can reach the founder directly; the demographic
// disclosure block never leaves the server.
// The Uplift ID is deliberately absent: founders use it as their portal
// password, so it must never appear on a page or a link that goes outside.
export const MENTOR_SAFE_FIELDS = [
  "id", "first", "last", "email", "phone", "company", "title", "bio", "city", "county",
  "stage", "industry", "topics", "primaryFocus", "tier", "headshotUrl", "mentorType",
  "hoping", "valueSought", "brings", "timePref", "snapshot", "oct27", "linkedin",
  "confidence", "journey", "successCriteria", "topSuccess", "milestonesExpected",
  "milestonesText", "priorProgram", "constraints", "constraintsText", "methods",
  "demoNight",
];

// Headshots live behind Typeform's token-gated file host; the proxy attaches
// the token, converts HEIC, and downscales.
export const photoUrl = (url) => `/api/admin/tf-file?u=${encodeURIComponent(url)}`;

// Uploads that are not headshots. Kristen Chin's is a phone lock screen, so
// the book shows her initials instead of someone's wallpaper. Keyed by
// Typeform response id; drop the entry when a real photo arrives.
const NOT_A_HEADSHOT = new Set(["88lr1p1k17o20cd2bu388lr1pji23pc5"]);

// A photo we hold ourselves, used instead of (or in place of a missing)
// Typeform upload. Save the file at the path below and it appears; until the
// file exists the page falls back to the initials tile on its own. Keyed by
// Typeform response id.
const PHOTO_OVERRIDES = {
  "88lr1p1k17o20cd2bu388lr1pji23pc5": "/photos/kristen-chin.jpg", // upload was a phone lock screen
};

// Whether a founder has something worth running large. Used by the lookbook
// feature to decide between the portrait layout and the text-forward one.
export const hasPhoto = (founder) =>
  !!PHOTO_OVERRIDES[founder?.id] || (!!founder?.headshotUrl && !NOT_A_HEADSHOT.has(founder?.id));

// An image that will not load (or was never uploaded) becomes initials rather
// than a broken-image icon on a page going out to a mentor.
// fillFrame: thumbnail grids (the cover, the mosaic) always fill their tile.
// Only "show the whole photo" is ignored there, because letterboxing a
// 1-inch square leaves a hole in the grid. Focal point and zoom both apply,
// so a face can be pulled in closer on the cover.
export function FounderPhoto({ founder, style, fontSize = 22, fallbackColor = PINK, initialsColor = "#fff", showInitials = true, fillFrame = false }) {
  const [failed, setFailed] = useState(false);
  // How the face sits in the frame, set per founder in the lookbook's adjust
  // mode and stored in the PhotoCrops tab. Untouched photos are centred at
  // their natural size.
  const crop = founder?.crop || {};
  const objectPosition = crop.posX != null
    ? `${crop.posX}% ${crop.posY}%`
    : (style?.objectPosition || "center");
  const zoom = crop.zoom && crop.zoom > 1 ? crop.zoom : 1;
  const initials = `${(founder.first || "")[0] || ""}${(founder.last || "")[0] || ""}`.toUpperCase();
  const override = PHOTO_OVERRIDES[founder.id];
  if ((!override && (!founder.headshotUrl || NOT_A_HEADSHOT.has(founder.id))) || failed || crop.hidden) {
    return (
      <div style={{
        ...style, display: "flex", alignItems: "center", justifyContent: "center",
        // No usable photo: a filled brand-colour tile reads as a deliberate
        // part of the grid, where a grey blank reads as broken. The cover
        // drops the initials and runs the block plain.
        background: fallbackColor, color: initialsColor, fontWeight: 700, fontSize,
        fontFamily: "'Red Hat Display', system-ui, sans-serif", letterSpacing: "0.04em",
      }}>
        {showInitials ? initials : null}
      </div>
    );
  }
  // Zooming has to happen inside a clipping frame, or a scaled photo spills
  // over the page it sits on.
  const img = (
    <img
      src={override || photoUrl(founder.headshotUrl)}
      alt=""
      onError={() => setFailed(true)}
      style={{
        ...style, objectPosition,
        ...(!fillFrame && crop.fit === "contain" ? { objectFit: "contain" } : null),
        ...(zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: objectPosition } : null),
      }}
    />
  );
  if (zoom === 1) return img;
  const { borderRadius, width, height, aspectRatio, position, inset, background, display } = style || {};
  return (
    <span style={{ display: display === "block" ? "block" : "inline-block", overflow: "hidden", borderRadius, width, height, aspectRatio, position, inset, background, lineHeight: 0 }}>
      {img}
    </span>
  );
}

// Revenue is the one number founders are shown to everyone with, so the
// amount is withheld (not merely styled over: it never reaches the page)
// until this founder has a mentor. `reveal` opts a page back in.
export function pickMentorSafe(founder, { reveal = false } = {}) {
  const safe = {};
  for (const k of MENTOR_SAFE_FIELDS) safe[k] = founder[k] ?? null;
  const range = safe.snapshot?.revenueRange;
  if (!reveal && range) {
    safe.snapshot = { ...safe.snapshot, revenueRange: null };
    safe.revenueHidden = true;
  }
  return safe;
}

// One fixed 8.5 x 11 page. Whatever is inside is scaled to fit it exactly,
// so a founder who wrote three paragraphs and one who wrote ten both land on
// a single sheet.
export function Sheet({ children, active = true, fitViewport = false, fill = false, mark = null }) {
  const pageRef = useRef(null);
  const innerRef = useRef(null);
  const wrapRef = useRef(null);

  // The sheet is a fixed 8.5 x 11 so it prints as exactly one page. Founders
  // wrote answers of wildly different lengths, so rather than clip the long
  // ones (or leave the short ones looking padded), the content is scaled to
  // the page: widen the inner box by 1/k and scale it back down by k, which
  // reflows the text instead of just shrinking a fixed column.
  useEffect(() => {
    const page = pageRef.current, inner = innerRef.current, wrap = wrapRef.current;
    if (!page || !inner || !wrap) return;

    // Height at a given scale, with the fill-the-page minimum lifted so the
    // measurement is of the content itself. Widening by 1/k and scaling by k
    // makes this strictly decreasing in k, so a binary search finds the
    // largest scale that still fits.
    const heightAt = (k) => {
      inner.style.minHeight = "0px";
      inner.style.width = `${100 / k}%`;
      inner.style.transform = `scale(${k})`;
      return inner.getBoundingClientRect().height;
    };

    const fit = () => {
      let k = 1;
      // A page built to fill the sheet (a photo grid stretching into whatever
      // space is left) has no content height to measure: images report their
      // intrinsic size, which is enormous, and the search would shrink the
      // page to nothing. Those pages size themselves and only take the
      // window scale.
      if (!fill && heightAt(1) > PAGE_H) {
        let lo = 0.5, hi = 1;
        k = lo;
        for (let i = 0; i < 12 && hi - lo > 0.004; i++) {
          const mid = (lo + hi) / 2;
          if (heightAt(mid) <= PAGE_H) { k = mid; lo = mid; } else { hi = mid; }
        }
      }
      inner.style.width = `${100 / k}%`;
      inner.style.transform = `scale(${k})`;
      // A fill page needs a definite height, not just a minimum: its grid
      // rows are 1fr, and without a hard height they fall back to the
      // images' intrinsic size and run off the sheet.
      inner.style.minHeight = fill ? "" : `${PAGE_H / k}px`;
      inner.style.height = fill ? `${PAGE_H / k}px` : "";
      // In the book, a whole page has to be visible without scrolling, so the
      // sheet is scaled down to whatever the window leaves it. Printing
      // ignores this (see the print block in SheetStyles).
      let w = 1;
      if (fitViewport) {
        const top = wrap.parentElement.getBoundingClientRect().top + window.scrollY;
        const availH = window.innerHeight - top - 16;
        const availW = wrap.parentElement.clientWidth - 8;
        w = Math.max(0.3, Math.min(1, availH / PAGE_H, availW / PAGE_W));
      }
      wrap.style.setProperty("--wrap-scale", String(w));
      wrap.parentElement.style.height = `${PAGE_H * w}px`;
    };

    const clear = () => {
      inner.style.width = "";
      inner.style.minHeight = "";
      inner.style.height = "";
      inner.style.transform = "";
      wrap.parentElement.style.height = "";
    };

    const run = () => {
      // A page the book is not showing has no layout to measure, so fitting
      // it would compute a nonsense scale; it is measured when it is turned on.
      if (!active || page.offsetParent === null) return;
      // Below this width a scaled-down letter sheet is unreadable, so phones
      // get the same content as one flowing column (see the media query).
      // Only the fixed sheet is measured and fitted.
      if (window.matchMedia(`(max-width: ${PAGE_W + 40}px)`).matches) clear();
      else fit();
    };

    // Photos and the display face both land after first paint and both change
    // how tall the content is, so the page is re-fitted whenever its own size
    // changes rather than only once on mount. The guard keeps the observer
    // from reacting to the resize that fitting itself causes.
    let fitting = false;
    const refit = () => {
      if (fitting) return;
      fitting = true;
      run();
      requestAnimationFrame(() => { fitting = false; });
    };

    run();
    if (document.fonts?.ready) document.fonts.ready.then(refit).catch(() => {});
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refit) : null;
    ro?.observe(inner);
    inner.querySelectorAll("img").forEach(img => img.addEventListener("load", refit));
    window.addEventListener("resize", refit);
    return () => {
      window.removeEventListener("resize", refit);
      ro?.disconnect();
    };
  }, [active, fitViewport, fill]);

  return (
    <div className={`stage${active ? " on" : ""}`} style={{ padding: "0 4px" }}>
      <div className="wrap" ref={wrapRef}>
        <div className="sheet" ref={pageRef}>
          <div className="inner" ref={innerRef}>
            {children}
          </div>
          {/* The TechUnited mark rides in a top corner of every page. It
              swaps sides when the photo takes the corner it usually sits in.
              Full colour on a white plate, never inverted: the gradient glyph
              overlaps the wordmark and turns to mush knocked out. */}
          {mark && (
            <span style={{
              position: "absolute", top: "0.26in", zIndex: 5,
              ...(mark === "left" ? { left: "0.3in" } : { right: "0.3in" }),
              background: "rgba(255,255,255,0.92)", borderRadius: 2, padding: "3px 6px",
              display: "flex", alignItems: "center",
            }}>
              <img src="/techunited-logo.png" alt="TechUnited:NJ" style={{ height: 9, width: "auto", display: "block" }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function FounderSheet({ founder, generatedAt, active = true, fitViewport = false }) {
  const f = founder;
  const name = `${f.first} ${f.last}`.trim();
  const roleLine = [f.title, f.company].filter(Boolean).join(" · ");
  const place = [f.city, f.county && `${f.county} County`].filter(Boolean).join(", ");
  const confIdx = CONFIDENCE_STEPS.indexOf(f.confidence);

  const employees = f.snapshot.employees === true
    ? (f.snapshot.employeeCount ? `${f.snapshot.employeeCount} full-time` : "Yes")
    : f.snapshot.employees === false ? "Solo founder" : null;

  const facts = [
    ["Stage", tight(f.stage)],
    ["Industry", f.industry],
    ["Revenue", f.revenueHidden
      ? <BlurredAmount />
      : f.snapshot.generatingRevenue === true ? (f.snapshot.revenueRange || "Yes") : f.snapshot.generatingRevenue === false ? "Pre-revenue" : f.snapshot.revenueRange],
    ["Raised before", yesNo(f.snapshot.priorCapital)],
    ["Raising now", f.snapshot.raising],
    ["Team", employees],
    ["Hiring", f.snapshot.hiring],
    ["Seeking customers", yesNo(f.snapshot.lookingForCustomers)],
    ["Seeking partnerships", yesNo(f.snapshot.seekingPartnerships)],
  ].filter(([, v]) => v != null && v !== "");

  const working = [
    ["Ideal session count", sessionLabel(f.tier)],
    ["Best times", (f.timePref || []).join(", ")],
    ["Meets by", (f.methods || []).map(tight).join(", ")],
    ["Based in", place],
    ["Heads up", /^yes$/i.test(f.constraints || "") ? (f.constraintsText || "Has scheduling constraints") : null],
  ].filter(([, v]) => v);

  const background = [
    ["Done a program before", f.priorProgram],
    ["Demo Night", /^yes$/i.test(f.demoNight || "") ? "Wants to be considered" : null],
  ].filter(([, v]) => v);

  const prose = [
    ["What they want to accomplish", f.hoping, PURPLE],
    ["Why mentorship, right now", f.valueSought, PINK],
    ["What they bring to it", f.brings, GREEN],
  ].filter(([, v]) => v);

  const otherSuccess = (f.successCriteria || []).filter(s => s !== f.topSuccess);

  return (
    <Sheet active={active} fitViewport={fitViewport}>
          {/* Masthead */}
          <div style={{ background: NAVY, color: "#fff", padding: "14px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src="/uplift-mountain-mark.png" alt="" style={{ height: 24 }} />
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, letterSpacing: "0.02em" }}>Uplift Mentorship Program</p>
                <p style={{ margin: "1px 0 0", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#b9b2e0" }}>Fall 2026 · Founder profile</p>
              </div>
            </div>
          </div>

          {/* Name plate */}
          <div style={{ padding: "20px 26px 16px", display: "flex", gap: 18, alignItems: "center" }}>
            <FounderPhoto
              founder={f}
              fontSize={26}
              style={{ width: 82, height: 82, borderRadius: 14, objectFit: "cover", background: "#f0eef8", flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>{name}</h1>
              {roleLine && <p style={{ margin: "3px 0 0", fontSize: 14, color: MUTED, fontWeight: 600 }}>{roleLine}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 7 }}>
                {f.journey && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: PURPLE, background: "#f2f0fb", border: `1px solid ${LINE}`, borderRadius: 999, padding: "3px 9px" }}>
                    {tight(f.journey)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", alignItems: "center", marginTop: 6, fontSize: 11.5 }}>
                {f.email && <a href={`mailto:${f.email}`} style={{ color: PURPLE, fontWeight: 600, textDecoration: "none" }}>{f.email}</a>}
                {f.phone && <a href={`tel:${f.phone}`} style={{ color: PURPLE, fontWeight: 600, textDecoration: "none" }}>{formatPhone(f.phone)}</a>}
                {f.linkedin && <a href={f.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: PURPLE, fontWeight: 600, textDecoration: "none" }}>{shortLink(f.linkedin)}</a>}
              </div>
            </div>
          </div>

          {/* The three things a mentor decides on */}
          <div className="hero" style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: "#fbfaff" }}>
            <div style={{ padding: "12px 18px 14px" }}>
              <HeroLabel color={PINK}>Wants help with</HeroLabel>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>{f.primaryFocus || "Not specified"}</p>
            </div>
            <div style={{ padding: "12px 18px 14px", borderLeft: `1px solid ${LINE}` }}>
              <HeroLabel color={PINK}>Confidence there today</HeroLabel>
              {confIdx >= 0 ? (
                <>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>{f.confidence}</p>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {CONFIDENCE_STEPS.map((_, i) => (
                      <span key={i} style={{ width: 22, height: 5, borderRadius: 3, background: i <= confIdx ? PINK : "#e6e2f2" }} />
                    ))}
                  </div>
                </>
              ) : <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Not answered</p>}
            </div>
            <div style={{ padding: "12px 18px 14px", borderLeft: `1px solid ${LINE}` }}>
              <HeroLabel color={PINK}>Success by the end of the program</HeroLabel>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>{tight(f.topSuccess) || "Not specified"}</p>
            </div>
          </div>

          <div className="cols body">
            {/* Left rail: the scannable facts */}
            <div className="rail" style={{ borderRight: `1px solid ${LINE}`, padding: "16px 18px 20px", background: "#fbfaff" }}>
              <Rail title="The company">
                {facts.map(([l, v]) => <RailRow key={l} label={l} value={v} />)}
              </Rail>

              {working.length > 0 && (
                <Rail title="Working together">
                  {working.map(([l, v]) => <RailRow key={l} label={l} value={v} />)}
                </Rail>
              )}

              {(f.mentorType || []).length > 0 && (
                <Rail title="Mentor they pictured">
                  <ul style={{ margin: "5px 0 0", padding: 0, listStyle: "none" }}>
                    {f.mentorType.map(t => (
                      <li key={t} style={{ fontSize: 11.5, color: INK, lineHeight: 1.45, paddingLeft: 11, position: "relative", marginBottom: 4 }}>
                        <span style={{ position: "absolute", left: 0, color: PINK, fontWeight: 800 }}>·</span>{t}
                      </li>
                    ))}
                  </ul>
                </Rail>
              )}

              {background.length > 0 && (
                <Rail title="Background">
                  {background.map(([l, v]) => <RailRow key={l} label={l} value={v} />)}
                </Rail>
              )}
            </div>

            {/* Right column: their own words */}
            <div style={{ padding: "16px 26px 20px" }}>
              {/* A handful of founders applied on the earlier, shorter form,
                  which had no written questions. Saying so beats a page that
                  reads as though they had nothing to say. */}
              {!f.bio && prose.length === 0 && (
                <div className="block" style={{ marginBottom: 14, border: `1px solid ${LINE}`, background: "#fbfaff", borderRadius: 10, padding: "11px 13px" }}>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: MUTED }}>
                    {f.first} applied on an earlier version of the application, which did not ask the written
                    questions. The focus areas and company details here come straight from that form, and the rest is
                    worth covering in your first conversation.
                  </p>
                </div>
              )}

              {f.bio && (
                <div className="block" style={{ marginBottom: 14 }}>
                  <SectionLabel color={NAVY}>About</SectionLabel>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: INK, whiteSpace: "pre-line" }}>{f.bio}</p>
                </div>
              )}

              {/* The most actionable thing on the page: what they are trying
                  to land inside the twelve weeks the mentor is signing up for. */}
              {f.milestonesExpected === true && f.milestonesText && (
                <div className="block" style={{ marginBottom: 14, background: "#fdeef4", border: "1px solid #f6d5e3", borderRadius: 10, padding: "12px 14px" }}>
                  <SectionLabel color="#a83a68">Milestones they expect to hit during the program</SectionLabel>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "#5a1f38", fontWeight: 600, whiteSpace: "pre-line" }}>{f.milestonesText}</p>
                </div>
              )}

              {otherSuccess.length > 0 && (
                <div className="block" style={{ marginBottom: 14 }}>
                  <SectionLabel color={NAVY}>Also counts as a win</SectionLabel>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {otherSuccess.map(sname => (
                      <li key={sname} style={{ fontSize: 12, color: INK, lineHeight: 1.5, paddingLeft: 12, position: "relative", marginBottom: 3 }}>
                        <span style={{ position: "absolute", left: 0, color: PINK, fontWeight: 800 }}>·</span>{sname}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(f.topics || []).length > 0 && (
                <div className="block" style={{ marginBottom: 14 }}>
                  <SectionLabel color={NAVY}>Topics they picked</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {f.topics.map(t => (
                      <span key={t} style={{
                        fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "4px 10px",
                        background: t === f.primaryFocus ? "#fdeef4" : "#f2f0fb",
                        color: t === f.primaryFocus ? "#a83a68" : PURPLE,
                        border: `1px solid ${t === f.primaryFocus ? "#f6d5e3" : LINE}`,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {prose.map(([label, text, color]) => (
                <div className="block" key={label} style={{ marginBottom: 14 }}>
                  <SectionLabel color={color}>{label}</SectionLabel>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: INK, whiteSpace: "pre-line" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${LINE}`, padding: "11px 26px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
              Questions about this founder or the match? <a href="mailto:uplift@techunited.co" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>uplift@techunited.co</a>
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#9b93b5" }}>
              From their application · {new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
    </Sheet>
  );
}

function HeroLabel({ children, color }) {
  return <p style={{ margin: "0 0 4px", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color }}>{children}</p>;
}

function SectionLabel({ children, color }) {
  return <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color }}>{children}</p>;
}

function RailRow({ label, value }) {
  return (
    <div style={{ padding: "6px 0", borderTop: `1px solid ${LINE}` }}>
      <p style={{ margin: 0, fontSize: 10.5, color: MUTED }}>{label}</p>
      <p style={{ margin: "1px 0 0", fontSize: 12, fontWeight: 700, color: NAVY, lineHeight: 1.35 }}>
        {typeof value === "object" ? value : String(value)}
      </p>
    </div>
  );
}

// The fact of revenue is the useful signal and stays visible; only the figure
// is held back until the founder has a mentor. The blurred number is a
// stand-in, never their real one.
function BlurredAmount() {
  return (
    <span style={{ display: "inline-block" }}>
      Yes
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, marginLeft: 6 }}>
        <span aria-hidden="true" style={{ filter: "blur(3.5px)", userSelect: "none", color: "#6b6480", fontWeight: 600 }}>$000,000</span>
      </span>
      <span style={{ display: "block", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: PINK, marginTop: 1 }}>
        Amount shared at match
      </span>
    </span>
  );
}

function Rail({ title, children }) {
  return (
    <div className="block" style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: PINK }}>{title}</p>
      {children}
    </div>
  );
}


// Rendered once per page, not once per sheet. `multi` switches printing from
// "pin the body to a single sheet" to "one page break after each sheet".
export function SheetStyles({ multi = false }) {
  return (
    <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #ececf1; }
        .stage { display: flex; justify-content: center; }
        .wrap { transform: scale(var(--wrap-scale, 1)); transform-origin: top center; }
        .sheet {
          width: 8.5in; height: 11in; overflow: hidden; position: relative;
          background: #fff; box-shadow: 0 2px 14px rgba(17,4,101,.14);
        }
        .inner { transform-origin: top left; display: flex; flex-direction: column; }
        .body { flex: 1; }
        .cols { display: grid; grid-template-columns: 2.4in 1fr; gap: 0; }
        .hero { display: grid; grid-template-columns: repeat(3, 1fr); }
        .block { break-inside: avoid; }
        @media (max-width: ${PAGE_W + 40}px) {
          .sheet { width: 100%; height: auto; overflow: visible; box-shadow: none; }
          .cols, .hero { grid-template-columns: 1fr; }
          .rail { border-right: none !important; border-bottom: 1px solid ${LINE}; }
          .hero > div + div { border-left: none !important; border-top: 1px solid ${LINE}; }
        }
        ${multi ? `
        .stage { margin-top: 22px; }
        ` : ""}
        @media print {
          ${multi
            /* Every sheet breaks to a new page. The last one is tagged so the
               book doesn't end on a blank sheet. Note :last-of-type cannot do
               this job: each sheet sits in its own anchor wrapper, so every
               one of them is the last of its type. */
            ? `.stage { page-break-after: always; margin-top: 0 !important; }
               .lastpage .stage { page-break-after: auto; }`
            /* Pinning the printed body to exactly one sheet stops the phantom
               second page browsers add when a fixed-height page rounds over. */
            : `html, body { width: 8.5in; height: 11in; overflow: hidden; }`}
          body { background: #fff; }
          .stage { display: block; padding: 0 !important; height: 11in !important; }
          .wrap { transform: none !important; }
          .sheet { width: 8.5in; height: 11in; overflow: hidden; box-shadow: none; }
          .cols { grid-template-columns: 2.4in 1fr; }
          .hero { grid-template-columns: repeat(3, 1fr); }
          .noprint { display: none !important; }
          @page { size: letter; margin: 0; }
        }
    `}</style>
  );
}
