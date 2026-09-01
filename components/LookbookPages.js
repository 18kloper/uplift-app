// The editorial layer of the Fall 2026 Founder Lookbook: cover, contents,
// the index spreads, the mosaic, and the founder features.
//
// This is a magazine, not the mentor handout. The one-page profile a mentor
// is sent (components/FounderSheet.js) stays as it is; these pages share its
// fixed 8.5 x 11 Sheet and its data, and nothing else. The look is set by
// four things: cream stock, a serif display face, hairline rules with
// small-caps labels, and photography that runs to the trim edge.

import { useState } from "react";
import { Sheet, FounderPhoto, hasPhoto } from "./FounderSheet";
import { applyQuoteCuts, applyBioEdit } from "../lib/lookbook-copy-edits";

export const PAPER = "#faf7f2";
export const INK = "#17141f";
export const INK_SOFT = "#5d5766";
export const RULE = "#ded6c9";
export const ACCENT = "#d86697";
export const NAVY = "#110465";

export const DISPLAY = "'Red Hat Display', system-ui, sans-serif";
export const SANS = "'Red Hat Text', system-ui, sans-serif";

// Small caps with wide tracking: the magazine's voice for anything that is
// not prose.
export function Label({ children, color = ACCENT, size = 8.5, style }) {
  return (
    <p style={{
      margin: 0, fontFamily: SANS, fontSize: size, fontWeight: 700,
      letterSpacing: "0.2em", textTransform: "uppercase", color, ...style,
    }}>{children}</p>
  );
}

export function Rule({ color = RULE, style }) {
  return <div style={{ height: 1, background: color, ...style }} />;
}

// The mark, small enough to read as a watermark rather than a header.
export function LogoMark({ height = 11, style }) {
  return <img src="/uplift-logo.png" alt="" style={{ height, width: "auto", display: "block", opacity: 0.5, ...style }} />;
}

// Every page but the cover carries a folio.
export function Folio({ page, section }) {
  return (
    <div style={{ padding: "0 0.7in 0.42in", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <LogoMark />
        <Label size={7.5} color={INK_SOFT}>Uplift Mentorship Program</Label>
      </div>
      <Label size={7.5} color={INK_SOFT}>{section}</Label>
      <p style={{ margin: 0, fontFamily: DISPLAY, fontSize: 11, color: INK_SOFT }}>{page}</p>
    </div>
  );
}

function Page({ children, active, pad = "0.62in 0.7in 0.2in" }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: PAPER, color: INK, padding: pad }}>
      {children}
    </div>
  );
}


// Emails are not in the public payload at all until someone enters the
// contact code, so before that this shows a blurred stand-in rather than a
// blurred real address.
// Profile links are pasted straight out of the LinkedIn app, so most carry a
// utm share trail. It is noise on the page and adds nothing to the link.
export function cleanLinkedIn(url) {
  if (!url) return url;
  return String(url).split("?")[0].replace(/\/$/, "");
}

export function ContactLine({ founder: f, size = 8.5 }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
      {f.email
        ? <a href={`mailto:${f.email}`} style={{ fontFamily: SANS, fontSize: size, color: ACCENT, textDecoration: "none", fontWeight: 700 }}>{f.email}</a>
        : <span aria-label="Email hidden" style={{ fontFamily: SANS, fontSize: size, color: ACCENT, fontWeight: 700, filter: "blur(3.4px)", userSelect: "none" }}>firstname@company.com</span>}
      {f.linkedin && (
        <a href={cleanLinkedIn(f.linkedin)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: size, color: INK_SOFT, textDecoration: "none" }}>
          {cleanLinkedIn(f.linkedin).replace(/^https?:\/\//, "").replace(/^www\./, "")}
        </a>
      )}
    </div>
  );
}


// In edit mode every photo says so, otherwise the only clue that a page is
// adjustable is the cursor.

// One place that turns a saved crop into CSS. posX/posY are the focal point
// the photo was dragged to.
export function cropStyle(crop) {
  if (!crop) return {};
  const pos = crop.posX != null ? `${crop.posX}% ${crop.posY}%` : "center";
  return {
    objectFit: crop.fit === "contain" ? "contain" : "cover",
    objectPosition: pos,
    ...(crop.zoom > 1 ? { transform: `scale(${crop.zoom})`, transformOrigin: pos } : null),
  };
}

function AdjustBadge({ label = "Adjust" }) {
  return (
    <span style={{
      position: "absolute", top: 8, left: 8, zIndex: 2,
      background: ACCENT, color: "#fff", fontFamily: SANS, fontSize: 7.5,
      fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
      padding: "3px 7px", borderRadius: 2, pointerEvents: "none",
    }}>{label}</span>
  );
}

export function CoverPage({ founders, generatedAt, active, onPick }) {
  // Every founder is on the cover. The grid rows are sized to whatever space
  // is left, so the squares shrink rather than the last row falling off.
  // Prefer a column count that divides the class evenly, so the last row of
  // the cover is not half empty.
  const n = founders.length;
  const cols = [6, 7, 5, 8, 9].find(c => n % c === 0) || 6;
  // A founder with no usable photo becomes a plain tile in the stock colour.
  // They all sit at the end, so the grid opens on a face and the quiet
  // squares close it out rather than punching a hole in the top corner.
  const usable = (f) => hasPhoto(f) && !f.crop?.hidden;
  const ordered = [...founders.filter(usable), ...founders.filter(f => !usable(f))];
  return (
    <Sheet active={active} fitViewport fill mark="right">
      <div style={{ flex: 1, background: PAPER, color: INK, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "0.5in 0.7in 0.22in", textAlign: "center" }}>
          <img src="/uplift-logo.png" alt="Uplift" style={{ height: 40, display: "block", margin: "0 auto 16px" }} />
          <Label size={8} color={INK_SOFT}>TechUnited:NJ presents</Label>
          <h1 style={{
            margin: "12px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 62,
            letterSpacing: "-0.025em", lineHeight: 0.92, color: INK,
          }}>
            The Founder<br />Lookbook
          </h1>
          <p style={{ margin: "10px 0 0", fontFamily: DISPLAY, fontStyle: "italic", fontSize: 21, color: ACCENT }}>
            Fall 2026
          </p>
          <div style={{ margin: "14px auto 0", maxWidth: "4.4in" }}>
            <Rule />
            {/* textWrap balance, plus a hard space before the last word, so
                the line never ends on a lone "them". */}
            <p style={{ margin: "9px 0 0", fontFamily: SANS, fontSize: 10.5, lineHeight: 1.6, color: INK_SOFT, textWrap: "balance" }}>
              {founders.length} New Jersey founders. What they are building, what they need,
              and who should meet&nbsp;them.
            </p>
          </div>
        </div>

        {/* Faces to the trim edge, all of them. */}
        <div style={{
          flex: 1, minHeight: 0, display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: "minmax(0, 1fr)", gap: 0,
        }}>
          {ordered.map(f => (
            <button
              key={f.id}
              onClick={onPick ? () => onPick(f) : undefined}
              style={{ padding: 0, border: "none", background: "none", cursor: onPick ? "pointer" : "default", lineHeight: 0, display: "block", overflow: "hidden", position: "relative" }}
            >
              {/* A photoless founder is a quiet tile the colour of the stock,
                  not a navy block: sitting above the navy footer band, navy
                  merged into one dark mass and read as a hole in the grid. */}
              <FounderPhoto founder={f} fontSize={13} fallbackColor={PAPER} showInitials={false} fillFrame
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#efe9df" }} />
            </button>
          ))}
        </div>

        <div style={{ background: NAVY, color: "#fff", padding: "10px 0.7in", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label size={7.5} color="#c8c2e8">Uplift Mentorship Program</Label>
          <Label size={7.5} color="#c8c2e8">
            {new Date(generatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Label>
        </div>
      </div>
    </Sheet>
  );
}

export function ContentsPage({ founders, sections, pageOfFounder = {}, onOpen, active, pageNumber }) {
  const half = Math.ceil(founders.length / 2);
  const columns = [founders.slice(0, half), founders.slice(half)];
  return (
    <Sheet active={active} fitViewport mark="right">
      <Page active={active}>
        <div style={{ marginBottom: 16 }}>
          <Label>In this issue</Label>
          <h2 style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1 }}>
            Contents
          </h2>
        </div>

        <div style={{ marginBottom: 18 }}>
          {sections.map(sec => (
            <button key={sec.label} onClick={() => onOpen.page(sec.page)}
              style={{ display: "flex", width: "100%", alignItems: "baseline", gap: 8, background: "none", border: "none", padding: "7px 0", cursor: "pointer", borderTop: `1px solid ${RULE}`, textAlign: "left", fontFamily: SANS }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, color: INK }}>{sec.label}</span>
              <span style={{ flex: 1, borderBottom: `1px dotted ${RULE}`, transform: "translateY(-3px)" }} />
              <span style={{ fontFamily: DISPLAY, fontSize: 13, color: INK_SOFT }}>{sec.page + 1}</span>
            </button>
          ))}
        </div>

        <Label style={{ marginBottom: 8 }}>The founders</Label>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 26px", alignContent: "start" }}>
          {columns.map((col, ci) => (
            <div key={ci}>
              {col.map((f, i) => (
                <button key={f.id} onClick={() => onOpen.founder(f.id)}
                  style={{ display: "flex", width: "100%", alignItems: "baseline", gap: 6, background: "none", border: "none", padding: "3.5px 0", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>
                    {f.first} {f.last}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 9, color: INK_SOFT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.company}
                  </span>
                  <span style={{ flex: 1, borderBottom: `1px dotted ${RULE}`, transform: "translateY(-3px)", minWidth: 10 }} />
                  <span style={{ fontFamily: DISPLAY, fontSize: 11, color: INK_SOFT }}>
                    {(pageOfFounder[f.id] ?? 0) + 1}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <Folio page={pageNumber} section="Contents" />
      </Page>
    </Sheet>
  );
}

export function GlancePage({ founders, stats, active, pageNumber }) {
  return (
    <Sheet active={active} fitViewport mark="right">
      <Page active={active}>
        <div style={{ marginBottom: 14 }}>
          <Label>The class of Fall 2026</Label>
          <h2 style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1 }}>
            At a glance
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}`, marginBottom: 18 }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ padding: "12px 14px 12px 0", borderLeft: i ? `1px solid ${RULE}` : "none", paddingLeft: i ? 14 : 0 }}>
              <p style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 900, fontSize: 38, lineHeight: 0.95, color: INK }}>{s.n}</p>
              <p style={{ margin: "6px 0 0", fontFamily: SANS, fontSize: 9, lineHeight: 1.4, color: INK_SOFT }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 30px" }}>
          {founders.map(col => (
            <div key={col.title}>
              <Label style={{ marginBottom: 9 }}>{col.title}</Label>
              {col.rows.map(([label, n]) => (
                <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0", borderTop: `1px solid ${RULE}` }}>
                  <span style={{ fontFamily: SANS, fontSize: 10, color: INK, flex: 1 }}>{label}</span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, color: ACCENT }}>{n}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <Folio page={pageNumber} section="At a glance" />
      </Page>
    </Sheet>
  );
}

export function IndexPage({ kicker, title, standfirst, rows, onOpen, empty, active, pageNumber }) {
  return (
    <Sheet active={active} fitViewport mark="right">
      {/* A deep masthead: the title sits well down the page so it still reads
          as a title when the page is seen as a thumbnail or a screenshot. */}
      <Page active={active} pad="1.5in 0.7in 0.2in">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 26, marginBottom: 30 }}>
          <div style={{ maxWidth: "5.1in" }}>
            <Label size={9.5}>{kicker}</Label>
            <h2 style={{ margin: "14px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 52, letterSpacing: "-0.025em", lineHeight: 0.98 }}>
              {title}
            </h2>
            <p style={{ margin: "16px 0 0", fontFamily: SANS, fontSize: 12, lineHeight: 1.6, color: INK_SOFT }}>{standfirst}</p>
          </div>
          <p style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 900, fontSize: 82, lineHeight: 0.78, color: ACCENT, letterSpacing: "-0.03em" }}>
            {rows.length}
          </p>
        </div>

        <div style={{ flex: 1 }}>
          {rows.length === 0 && <p style={{ fontFamily: SANS, fontSize: 11, color: INK_SOFT }}>{empty}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 30px" }}>
            {rows.map(({ founder, note }) => (
              <button key={founder.id} onClick={() => onOpen(founder.id)}
                style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", textAlign: "left", background: "none", border: "none", borderTop: `1px solid ${RULE}`, padding: "8px 0", cursor: "pointer" }}>
                <FounderPhoto founder={founder} fontSize={10} fillFrame
                  style={{ width: 30, height: 38, objectFit: "cover", flexShrink: 0, background: "#efe9df" }} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: INK, lineHeight: 1.15 }}>
                    {founder.first} {founder.last}
                  </span>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 8.5, letterSpacing: "0.06em", textTransform: "uppercase", color: INK_SOFT, marginTop: 3 }}>
                    {founder.company}
                  </span>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 9, color: ACCENT, marginTop: 2 }}>{note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Folio page={pageNumber} section={kicker} />
      </Page>
    </Sheet>
  );
}

export function MosaicPage({ founders, onOpen, active, pageNumber }) {
  return (
    <Sheet active={active} fitViewport fill mark="right">
      <div style={{ flex: 1, minHeight: 0, background: PAPER, color: INK, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0.55in 0.7in 0.24in", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <div>
            <Label>Fall 2026 Founders</Label>
            <h2 style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Fall 2026 Founders
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: INK_SOFT }}>
              Click a face
            </p>
            <LogoMark />
          </div>
        </div>
        {/* Full bleed, no gutters, no captions. Rows are pinned to the count
            rather than auto-sized: six across over 36 faces is exactly six
            rows, and auto rows sized to content ran off the bottom. */}
        <div style={{
          flex: 1, minHeight: 0, display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: `repeat(${Math.max(1, Math.ceil(founders.length / 6))}, minmax(0, 1fr))`,
          gap: 0,
        }}>
          {founders.map(f => (
            <button key={f.id} onClick={() => onOpen(f.id)}
              style={{ padding: 0, border: "none", background: "none", cursor: "pointer", lineHeight: 0, display: "block", overflow: "hidden", minHeight: 0, minWidth: 0 }}>
              <FounderPhoto founder={f} fontSize={16} fillFrame
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#efe9df" }} />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

// The founder feature: portrait to the trim on the left, the story on the
// right. One founder, one spread-feeling page.
// "Other:" is what the form records when nobody picked a category. It is not
// an industry, so it does not go on the page.

// Founders wrote these answers in a form box, so they arrive with stray line
// breaks, missing capitals, no full stop, and the odd em dash. This tidies
// the mechanics without touching a word: dashes become commas (house style),
// sentences start with a capital, and the text ends on punctuation.
export function tidyText(v) {
  if (!v) return v;
  let t = String(v).replace(/\s+/g, " ").trim();
  t = t.replace(/\s*[—–]\s*/g, ", ");
  t = t.replace(/,\s*,/g, ",").replace(/,\s*([.!?])/g, "$1");
  t = t.replace(/([.!?])\s+([a-z])/g, (m, stop, ch) => `${stop} ${ch.toUpperCase()}`);
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?…”"')]$/.test(t)) t += ".";
  return t;
}


// Cut long answers at the end of a sentence, never mid-thought. If no
// sentence ends inside the budget, fall back to a word boundary with an
// ellipsis so it reads as continuing rather than broken.
export function trimTo(text, max) {
  if (!text || text.length <= max) return text;
  const window = text.slice(0, max);
  const end = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (end > max * 0.45) return window.slice(0, end + 1);
  const space = window.lastIndexOf(" ");
  return `${window.slice(0, space > 0 ? space : max).replace(/[,;:]+$/, "")}…`;
}


// Whole sentences only, for the short blocks where an ellipsis reads as
// software running out of room rather than a quote trailing off. Takes as
// many complete sentences as fit the budget, and never fewer than one.
export function wholeSentences(text, softMax) {
  if (!text) return text;
  if (text.length <= softMax) return text;
  const parts = text.match(/[^.!?]+[.!?]+["'”’)]*\s*/g);
  if (!parts || parts.length === 0) return text;
  let out = "";
  for (const part of parts) {
    if (out && (out + part).trim().length > softMax) break;
    out += part;
  }
  return (out || parts[0]).trim();
}


// A last line carrying one word is a widow, and it is the fastest way to make
// a page look unset. Binding the final two words together prevents it, and
// text-wrap balance evens the lines above.
export function noWidow(text) {
  if (!text) return text;
  const at = String(text).lastIndexOf(" ");
  return at < 0 ? text : `${text.slice(0, at)}\u00a0${text.slice(at + 1)}`;
}

function tidyIndustry(v) {
  const out = String(v || "").replace(/:$/, "").trim();
  return /^other$/i.test(out) ? null : out;
}

function factRows(f) {
  const yes = (v) => (v === true ? "Yes" : v === false ? "No" : v || null);
  const tight = (v) => (typeof v === "string" ? v.replace(/\s*\([^)]*\)\s*$/, "").trim() : v);
  // "Planning to in the next 6 months" is the Typeform label and it does not
  // fit a fact column, so the timeframe moves into the row label and the
  // value becomes the answer.
  const soon = (v) => {
    if (!v) return null;
    if (/^yes$/i.test(v)) return "Yes, now";
    if (/next 6 months/i.test(v)) return "Planning to";
    return v;
  };
  // Revenue and fundraising timing are withheld outright, whatever the
  // answer. Both are commercially sensitive, and the application routed this
  // sort of detail to mentors rather than to the public. The rows stay so the
  // page reads as complete; the values are never printed.
  return [
    ["Stage", tight(f.stage)],
    ["Industry", tidyIndustry(f.industry)],
    ["Revenue", "REDACT"],
    ["Raising in 6 months", "REDACT"],
    ["Hiring in 6 months", soon(f.snapshot?.hiring)],
    ["Seeking customers", yes(f.snapshot?.lookingForCustomers)],
    ["Seeking partnerships", yes(f.snapshot?.seekingPartnerships)],
    ["Based", [f.city, f.county && `${f.county} County`].filter(Boolean).join(", ")],
  ].filter(([, v]) => v != null && v !== "");
}


// A withheld answer. The blurred text is a stand-in, never the founder's real
// answer: the real one does not reach the page at all (see the public feed in
// pages/api/fall-lookbook.js). The blur is there so the row reads as private
// rather than as unanswered.
function FactValue({ value }) {
  if (value !== "REDACT") return value;
  return (
    <span aria-label="Shared at match" style={{ filter: "blur(3.2px)", userSelect: "none", fontWeight: 600, color: INK_SOFT }}>
      Yes, $000,000
    </span>
  );
}

export function FeaturePage({ founder: f, active, pageNumber, onAdjust, dragProps, floatDrag }) {
  // The portrait runs large wherever the photo can carry it. A missing,
  // suppressed, or small upload gets the text-forward layout instead of a
  // blown-up thumbnail. Anything else is the page layout chosen for this
  // founder in the Photos tool.
  // A small upload still gets on the page, in a narrow column where its
  // resolution holds up, rather than being dropped or stretched across half a
  // sheet. An explicit choice in the Photos tool always wins.
  const [smallPhoto, setSmallPhoto] = useState(false);
  const portrait = hasPhoto(f) && !f.crop?.hidden;
  const layout = !portrait
    ? "none"
    : f.crop?.layout || (smallPhoto ? "inset" : "left-half");

  const facts = factRows(f);
  // Why mentorship now carries the pull quote; the bio carries the body. If
  // there is no bio, what they hope to accomplish stands in for it, and the
  // "hoping to get" block below steps aside so nothing is said twice.
  const body = tidyText(applyBioEdit(f.id, f.bio) || f.hoping);
  const cut = (text) => {
    const out = applyQuoteCuts(f.id, text);
    return out && out.trim().length > 2 ? tidyText(out) : null;
  };
  // If a cut empties the line the quote would have used, the page falls
  // through to the next thing they wrote rather than running blank.
  const firstOf = (...vals) => vals.map(cut).find(Boolean) || null;
  const quote = firstOf(f.valueSought, f.hoping, f.bio);
  const wantsToGet = f.bio ? cut(f.hoping) : null;
  const wantsToGive = cut(f.brings);

  // Where the floating photo sits, and how much room the text has to give up
  // for it. Default is the top right corner.
  const floatW = f.crop?.floatW || 1.6;
  const floatX = f.crop?.floatX;
  const floatOnLeft = floatX != null && floatX < 50;
  const floatClear = floatX == null
    // Default corner: the photo hangs 0.7in off the right edge.
    ? { left: 0.7, right: +(0.7 + floatW + 0.25).toFixed(2) }
    : floatOnLeft
      ? { left: +((floatX / 100) * 8.5 + floatW + 0.25).toFixed(2), right: 0.7 }
      : { left: 0.7, right: +(8.5 - (floatX / 100) * 8.5 + 0.25).toFixed(2) };

  const photo = portrait && (
    <div
      onClick={onAdjust ? () => onAdjust(f) : undefined}
      {...(dragProps ? dragProps(f) : {})}
      style={{
        position: "relative", overflow: "hidden", background: "#efe9df",
        width: "100%", height: "100%",
        cursor: onAdjust ? "grab" : "default",
      }}
    >
      {onAdjust && <AdjustBadge label="Drag to move" />}
      <img
        src={`/api/admin/tf-file?u=${encodeURIComponent(f.headshotUrl)}`}
        alt={`${f.first} ${f.last}`}
        draggable={false}
        onLoad={(e) => setSmallPhoto(e.currentTarget.naturalWidth < 420)}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
          objectFit: "cover", ...cropStyle(f.crop),
        }}
      />
    </div>
  );

  const story = (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      // The floating photo sits over the page, so the text column is pulled
      // in to clear whichever side it has been dragged to. Text never runs
      // underneath it.
      padding: layout === "left-half" ? "0.55in 0.6in 0 0.5in"
        : layout === "right-half" ? "0.55in 0.5in 0 0.6in"
        : layout === "icon"
          ? `0.5in ${floatClear.right}in 0 ${floatClear.left}in`
          : "0.5in 0.7in 0",
    }}>
      <Label>{tidyIndustry(f.industry) || "Founder"}</Label>
      <h2 style={{ margin: "9px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: layout === "full-bleed" ? 42 : 36, lineHeight: 0.98, letterSpacing: "-0.02em" }}>
        {f.first} {f.last}
      </h2>
      <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_SOFT }}>
        {[f.title, f.company].filter(Boolean).join(" · ")}
      </p>

      {quote && (
        <>
          <Rule style={{ margin: "14px 0" }} />
          <p style={{ margin: 0, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.45, color: INK, textWrap: "pretty" }}>
            &ldquo;{noWidow(trimTo(quote, 300))}&rdquo;
          </p>
        </>
      )}

      <Rule style={{ margin: "14px 0 12px" }} />

      {body && (
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 9.8, lineHeight: 1.68, color: INK_SOFT, columnGap: 18, textWrap: "pretty",
          // Two columns need enough text to fill both. A short bio split in
          // half leaves a word or two stranded in the second column.
          columnCount: (body || "").length > 260 ? 2 : 1 }}>
          {noWidow(wholeSentences(body, 700))}
        </p>
      )}

      <div style={{ marginTop: 14 }}>
        <Label size={8}>Wants help with</Label>
        <p style={{ margin: "5px 0 0", fontFamily: DISPLAY, fontSize: 17, fontWeight: 700, lineHeight: 1.2, color: ACCENT }}>
          {f.primaryFocus || "Open to guidance"}
        </p>
        {f.milestonesExpected === true && f.milestonesText && (
          <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 9.5, lineHeight: 1.6, color: INK_SOFT }}>
            <span style={{ fontWeight: 800, color: INK }}>By the end of the program: </span>
            {noWidow(tidyText(applyQuoteCuts(f.id, f.milestonesText)))}
          </p>
        )}
      </div>

      {/* Who they pictured, and what they are putting in. The two halves of
          the match a mentor actually wants to read before saying yes. */}
      {(wantsToGive || wantsToGet) && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: wantsToGive && wantsToGet ? "1fr 1fr" : "1fr", gap: "0 18px" }}>
          {wantsToGive && (
            <div>
              <Label size={8}>Hoping to give</Label>
              <p style={{ margin: "4px 0 0", fontFamily: SANS, fontSize: 9, lineHeight: 1.5, color: INK_SOFT, textWrap: "pretty" }}>
                {noWidow(wholeSentences(wantsToGive, 230))}
              </p>
            </div>
          )}
          {wantsToGet && (
            <div>
              <Label size={8}>Hoping to get</Label>
              <p style={{ margin: "4px 0 0", fontFamily: SANS, fontSize: 9, lineHeight: 1.5, color: INK_SOFT, textWrap: "pretty" }}>
                {noWidow(wholeSentences(wantsToGet, 230))}
              </p>
            </div>
          )}
        </div>
      )}

      {(f.mentorType || []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Label size={8}>The mentor they pictured</Label>
          <p style={{ margin: "4px 0 0", fontFamily: SANS, fontSize: 9, lineHeight: 1.5, color: INK_SOFT, textWrap: "pretty" }}>
            {f.mentorType.join(" · ")}
          </p>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ display: "grid", gridTemplateColumns: layout === "left-half" || layout === "right-half" ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0 20px", marginBottom: 10 }}>
        {facts.map(([label, v]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: `1px solid ${RULE}`, padding: "3.5px 0" }}>
            <span style={{ fontFamily: SANS, fontSize: 8, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_SOFT, flexShrink: 0 }}>{label}</span>
            <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, color: INK, textAlign: "right" }}>
              <FactValue value={v} />
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${RULE}`, padding: "8px 0 0", marginBottom: 8 }}>
        <ContactLine founder={f} />
      </div>

      <Folio page={pageNumber} section="The founders" />
    </div>
  );

  // Each layout is just where the photo and the story sit on the sheet.
  const frames = {
    "left-half": { display: "grid", gridTemplateColumns: "4.25in 4.25in" },
    "right-half": { display: "grid", gridTemplateColumns: "4.25in 4.25in" },
    "top-band": { display: "grid", gridTemplateRows: "4in 1fr" },
    "bottom-band": { display: "grid", gridTemplateRows: "1fr 4in" },
    "inset": { display: "grid", gridTemplateColumns: "2.4in 1fr" },
    "full-bleed": { position: "relative" },
    // A small photo floating over a full-width page, for uploads too small or
    // too soft to carry any more space than that.
    icon: { position: "relative" },
    none: { display: "block" },
  };

  return (
    <Sheet
      active={active}
      fitViewport
      fill
      // The photo owns the top right in these layouts, so the mark moves over.
      mark={["right-half", "top-band", "full-bleed", "icon"].includes(layout) ? "left" : "right"}
    >
      <div style={{ flex: 1, minHeight: 0, background: PAPER, color: INK, ...frames[layout] }}>
        {layout === "full-bleed" && (
          <>
            <div style={{ position: "absolute", inset: 0 }}>{photo}</div>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(250,247,242,0.96) 0%, rgba(250,247,242,0.93) 46%, rgba(250,247,242,0) 78%)",
            }} />
            <div style={{ position: "absolute", inset: 0, width: "5in" }}>{story}</div>
          </>
        )}
        {layout === "icon" && (
          <>
            {/* Free-floating: the size and the corner it sits in are saved per
                founder, so it can be moved into whatever white space the page
                leaves. Default is the top right. */}
            <div
              {...(floatDrag ? floatDrag(f) : {})}
              style={{
                position: "absolute",
                left: f.crop?.floatX != null ? `${f.crop.floatX}%` : undefined,
                top: f.crop?.floatY != null ? `${f.crop.floatY}%` : "0.5in",
                right: f.crop?.floatX != null ? undefined : "0.7in",
                width: `${f.crop?.floatW || 1.6}in`,
                height: `${(f.crop?.floatW || 1.6) * 1.25}in`,
                zIndex: 3, boxShadow: "0 2px 14px rgba(23,20,31,0.16)",
                cursor: floatDrag ? "move" : "default",
              }}
            >
              {photo}
            </div>
            {story}
          </>
        )}
        {layout === "right-half" && <>{story}{photo}</>}
        {(layout === "left-half" || layout === "top-band" || layout === "inset") && <>{photo}{story}</>}
        {layout === "bottom-band" && <>{story}{photo}</>}
        {layout === "none" && story}
      </div>
    </Sheet>
  );
}

// Four founders applied on the earlier, shorter form and wrote nothing but
// what they want help with. A full feature each would be three-quarters
// white space, so they run two to a page, like a magazine's shorts.
export function DuoPage({ founders, active, pageNumber, onAdjust }) {
  return (
    <Sheet active={active} fitViewport fill mark="right">
      <div style={{ flex: 1, minHeight: 0, background: PAPER, color: INK, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0.5in 0.7in 0.18in" }}>
          <Label>Also in the program</Label>
        </div>
        {founders.map((f, i) => (
          <div key={f.id} style={{
            flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "2.5in 1fr",
            borderTop: `1px solid ${RULE}`,
          }}>
            <div
              onClick={onAdjust ? () => onAdjust(f) : undefined}
              style={{ position: "relative", background: "#efe9df", overflow: "hidden", cursor: onAdjust ? "zoom-in" : "default" }}
            >
              {onAdjust && <AdjustBadge />}
              {/* A photoless founder gets a quiet tile in the stock colour,
                  the same as the cover. A pink slab this size shouts. */}
              <FounderPhoto founder={f} fontSize={34} fallbackColor="#efe9df" initialsColor={INK_SOFT}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ padding: "0.3in 0.7in 0.3in 0.45in", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Label size={8}>{tidyIndustry(f.industry) || "Founder"}</Label>
              <h2 style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 30, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {f.first} {f.last}
              </h2>
              <p style={{ margin: "7px 0 0", fontFamily: SANS, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_SOFT }}>
                {[f.title, f.company].filter(Boolean).join(" · ")}
              </p>
              <Rule style={{ margin: "12px 0" }} />
              <Label size={8}>Wants help with</Label>
              <p style={{ margin: "5px 0 0", fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, lineHeight: 1.2, color: ACCENT }}>
                {f.primaryFocus || "Open to guidance"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px", marginTop: 12 }}>
                {factRows(f).slice(0, 6).map(([label, v]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: `1px solid ${RULE}`, padding: "3px 0" }}>
                    <span style={{ fontFamily: SANS, fontSize: 7.5, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_SOFT }}>{label}</span>
                    <span style={{ fontFamily: SANS, fontSize: 8, fontWeight: 700, color: INK, textAlign: "right" }}>
                      <FactValue value={v} />
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <ContactLine founder={f} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ paddingTop: 8 }}>
          <Folio page={pageNumber} section="The founders" />
        </div>
      </div>
    </Sheet>
  );
}

// ── The back half: Summer 2026 graduates ──────────────────────────────────
//
// Alumni get a quarter page each rather than a feature: this is a directory
// of who came through the program, not a pitch for each of them. The data
// (lib/uplift-alumni.js) is public by design, so there is nothing here to
// gate.
export function AlumniDividerPage({ alumni = [], active }) {
  const count = alumni.length;
  // The same at-a-glance read as the fall cohort, sized for a divider: what
  // they were building and what they came for.
  const tally = (pick) => {
    const m = new Map();
    for (const a of alumni) {
      const k = pick(a);
      if (!k) continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  };
  const industries = tally(a => tidyIndustry(a.industry)).slice(0, 7);

  const column = (title, rows) => (
    <div>
      <Label color={ACCENT} size={8}>{title}</Label>
      <div style={{ marginTop: 8 }}>
        {rows.map(([label, n]) => (
          <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "4px 0", borderTop: "1px solid rgba(255,255,255,.18)" }}>
            <span style={{ flex: 1, fontFamily: SANS, fontSize: 9.5, lineHeight: 1.35, color: "#e6e2f5" }}>{label}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: "#fff" }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet active={active} fitViewport fill mark="right">
      <div style={{ flex: 1, minHeight: 0, background: NAVY, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0.9in" }}>
        <Label color={ACCENT}>Part two</Label>
        <h2 style={{ margin: "12px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 52, lineHeight: 0.98, letterSpacing: "-0.025em" }}>
          The alumni
        </h2>
        <p style={{ margin: "12px 0 0", fontFamily: DISPLAY, fontStyle: "italic", fontSize: 20, color: ACCENT }}>
          Summer 2026 graduates
        </p>

        <div style={{ margin: "20px 0 0", maxWidth: "5.1in" }}>
          <Rule color="rgba(255,255,255,.28)" />
          <p style={{ margin: "14px 0 0", fontFamily: SANS, fontSize: 11.5, lineHeight: 1.7, color: "#c8c2e8" }}>
            Uplift has run for years as single cohorts, one at a time. This summer we ran an
            &ldquo;experiment&rdquo;: several cohorts at once, to find out whether cross pollination between founders
            would compound what each of them got out of it.
          </p>
          <p style={{ margin: "10px 0 0", fontFamily: SANS, fontSize: 11.5, lineHeight: 1.7, color: "#c8c2e8" }}>
            It caught more attention, traction, and momentum than we planned for, and that is what carried the
            program straight into this fall. These are the {count} founders who graduated the summer cohorts and made
            Uplift what it is today.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5in 1fr", gap: 30, margin: "24px 0 0", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.28)" }}>
          <div>
            <p style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, lineHeight: 0.9 }}>{count}</p>
            <p style={{ margin: "6px 0 0", fontFamily: SANS, fontSize: 9.5, lineHeight: 1.4, color: "#b9b2e0" }}>founders graduated</p>
          </div>
          {column("Industry vertical", industries)}
        </div>

      </div>
    </Sheet>
  );
}


// The longer testimonials, given a page of their own. They come from founders
// across Uplift's cohorts rather than only this summer's class, so the page
// says so rather than implying they all graduated in August.
export function VoicesPage({ voices, active, pageNumber }) {
  return (
    <Sheet active={active} fitViewport mark="right">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: PAPER, color: INK, padding: "0.5in 0.65in 0.18in" }}>
        <Label>In their words</Label>
        <h2 style={{ margin: "7px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 34, letterSpacing: "-0.02em", lineHeight: 1.02 }}>
          What founders say about Uplift
        </h2>
        <p style={{ margin: "7px 0 12px", fontFamily: SANS, fontSize: 10, lineHeight: 1.5, color: INK_SOFT }}>
          Founders and mentors from the Summer 2026 cohorts.
        </p>

        {/* All of them on one page: two columns, tight rows. The sheet scales
            the whole block down rather than dropping anyone. */}
        <div style={{ flex: 1, columnCount: 2, columnGap: 26 }}>
          {voices.map(v => (
            <div key={v.name} style={{ breakInside: "avoid", borderTop: `1px solid ${RULE}`, padding: "9px 0" }}>
              <p style={{ margin: 0, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 11, lineHeight: 1.45, color: INK }}>
                &ldquo;{v.quote}&rdquo;
              </p>
              <p style={{ margin: "5px 0 0", fontFamily: SANS, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT }}>
                {v.name}
                {v.role && <span style={{ color: INK_SOFT, fontWeight: 600 }}> · {v.role}</span>}
              </p>
            </div>
          ))}
        </div>
        <Folio page={pageNumber} section="In their words" />
      </div>
    </Sheet>
  );
}

function AlumniCard({ a, onAdjust }) {
  const facts = [tidyIndustry(a.industry), a.stage, a.county && `${a.county} County`].filter(Boolean);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.45in 1fr", gap: 14, padding: "16px 0", borderTop: `1px solid ${RULE}`, minHeight: 0, alignItems: "start", alignContent: "center" }}>
      <div
        onClick={onAdjust ? () => onAdjust(a) : undefined}
        style={{ position: "relative", overflow: "hidden", background: "#efe9df", aspectRatio: "4 / 5", cursor: onAdjust ? "zoom-in" : "default" }}
      >
        {onAdjust && a.photo && <AdjustBadge />}
        {/* The initials tile sits underneath: if the photo 404s the image
            hides itself and this shows through. */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: ACCENT, color: "#fff", fontFamily: DISPLAY, fontSize: 22, fontWeight: 700 }}>
          {`${(a.first || "")[0] || ""}${(a.last || "")[0] || ""}`.toUpperCase()}
        </div>
        {a.photo
          ? <img
              src={a.photo}
              alt=""
              onError={e => { e.currentTarget.parentElement.dataset.noPhoto = "1"; e.currentTarget.style.display = "none"; }}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
                objectFit: "cover", ...cropStyle(a.crop),
              }}
            />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: ACCENT, color: "#fff", fontFamily: DISPLAY, fontSize: 22, fontWeight: 700 }}>
              {`${(a.first || "")[0] || ""}${(a.last || "")[0] || ""}`.toUpperCase()}
            </div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 19, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.01em", color: INK }}>
          {a.first} {a.last}
        </h3>
        {a.company && (
          <p style={{ margin: "4px 0 0", fontFamily: SANS, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_SOFT }}>
            {a.company}
          </p>
        )}
        {facts.length > 0 && (
          <p style={{ margin: "7px 0 0", fontFamily: SANS, fontSize: 9.5, lineHeight: 1.5, color: INK_SOFT }}>
            {facts.join(" · ")}
          </p>
        )}
        {/* What brought them to Uplift is the useful line in a founder
            lookbook. Their mentor is a program detail, not a reason to reach
            out to them, so it is not here. */}
        {a.primaryFocus && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
            <Label size={7.5}>Came to Uplift for</Label>
            <p style={{ margin: "4px 0 0", fontFamily: DISPLAY, fontSize: 13, fontStyle: "italic", lineHeight: 1.3, color: ACCENT }}>
              {a.primaryFocus}
            </p>
          </div>
        )}
        {/* Their own words about the program, where they gave them. */}
        {a.testimonial && (
          <p style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontStyle: "italic", fontSize: 10.5, lineHeight: 1.4, color: INK }}>
            &ldquo;{a.testimonial}&rdquo;
          </p>
        )}

      </div>
    </div>
  );
}

export function AlumniPage({ alumni, active, pageNumber, partOf, onAdjust }) {
  return (
    <Sheet active={active} fitViewport mark="right">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: PAPER, color: INK, padding: "0.55in 0.7in 0.2in" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <Label>Summer 2026 graduates</Label>
          <Label size={7.5} color={INK_SOFT}>{partOf}</Label>
        </div>
        {/* Two by two, filling the sheet: four alumni to a page, each with
            room to breathe rather than crowded into the top half. */}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "0 26px" }}>
          {alumni.map(a => <AlumniCard key={a.slug} a={a} onAdjust={onAdjust} />)}
        </div>
        <Folio page={pageNumber} section="The alumni" />
      </div>
    </Sheet>
  );
}
