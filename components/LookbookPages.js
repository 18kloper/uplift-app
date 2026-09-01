// The editorial layer of the Fall 2026 Founder Lookbook: cover, contents,
// the index spreads, the mosaic, and the founder features.
//
// This is a magazine, not the mentor handout. The one-page profile a mentor
// is sent (components/FounderSheet.js) stays as it is; these pages share its
// fixed 8.5 x 11 Sheet and its data, and nothing else. The look is set by
// four things: cream stock, a serif display face, hairline rules with
// small-caps labels, and photography that runs to the trim edge.

import { Sheet, FounderPhoto } from "./FounderSheet";

export const PAPER = "#faf7f2";
export const INK = "#17141f";
export const INK_SOFT = "#5d5766";
export const RULE = "#ded6c9";
export const ACCENT = "#d86697";
export const NAVY = "#110465";

export const DISPLAY = "'Playfair Display', 'Times New Roman', serif";
export const SANS = "'Inter', system-ui, sans-serif";

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

// Every page but the cover carries a folio.
export function Folio({ page, section }) {
  return (
    <div style={{ padding: "0 0.7in 0.42in", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <Label size={7.5} color={INK_SOFT}>Uplift Mentorship Program</Label>
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

export function CoverPage({ founders, generatedAt, active }) {
  // Every founder is on the cover. The grid rows are sized to whatever space
  // is left, so the squares shrink rather than the last row falling off.
  const cols = Math.ceil(Math.sqrt(founders.length * 1.15)) || 6;
  return (
    <Sheet active={active} fitViewport fill>
      <div style={{ flex: 1, background: PAPER, color: INK, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "0.5in 0.7in 0.22in", textAlign: "center" }}>
          <img src="/uplift-logo.png" alt="Uplift" style={{ height: 40, display: "block", margin: "0 auto 16px" }} />
          <Label size={8} color={INK_SOFT}>TechUnited New Jersey presents</Label>
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
            <p style={{ margin: "9px 0 0", fontFamily: SANS, fontSize: 10.5, lineHeight: 1.6, color: INK_SOFT }}>
              {founders.length} New Jersey founders. What they are building, what they need,
              and who should meet them.
            </p>
          </div>
        </div>

        {/* Faces to the trim edge, all of them. */}
        <div style={{
          flex: 1, minHeight: 0, display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: "minmax(0, 1fr)", gap: 0,
        }}>
          {founders.map(f => (
            <FounderPhoto key={f.id} founder={f} fontSize={13}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#efe9df" }} />
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

export function ContentsPage({ founders, sections, onOpen, active, pageNumber }) {
  const half = Math.ceil(founders.length / 2);
  const columns = [founders.slice(0, half), founders.slice(half)];
  return (
    <Sheet active={active} fitViewport>
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
                    {ci === 0 ? i + 1 + sections.length + 3 : half + i + 1 + sections.length + 3}
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
    <Sheet active={active} fitViewport>
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
    <Sheet active={active} fitViewport>
      <Page active={active}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 26, marginBottom: 16 }}>
          <div style={{ maxWidth: "4.9in" }}>
            <Label>{kicker}</Label>
            <h2 style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1.02 }}>
              {title}
            </h2>
            <p style={{ margin: "10px 0 0", fontFamily: SANS, fontSize: 11, lineHeight: 1.6, color: INK_SOFT }}>{standfirst}</p>
          </div>
          <p style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 900, fontSize: 62, lineHeight: 0.8, color: ACCENT, letterSpacing: "-0.03em" }}>
            {rows.length}
          </p>
        </div>

        <div style={{ flex: 1 }}>
          {rows.length === 0 && <p style={{ fontFamily: SANS, fontSize: 11, color: INK_SOFT }}>{empty}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 30px" }}>
            {rows.map(({ founder, note }) => (
              <button key={founder.id} onClick={() => onOpen(founder.id)}
                style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", textAlign: "left", background: "none", border: "none", borderTop: `1px solid ${RULE}`, padding: "8px 0", cursor: "pointer" }}>
                <FounderPhoto founder={founder} fontSize={10}
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
    <Sheet active={active} fitViewport fill>
      <div style={{ flex: 1, background: PAPER, color: INK, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0.55in 0.7in 0.24in", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <div>
            <Label>The full class</Label>
            <h2 style={{ margin: "8px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Thirty-six founders
            </h2>
          </div>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: INK_SOFT }}>
            Click a face
          </p>
        </div>
        {/* Full bleed, no gutters, no captions. */}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gridAutoRows: "minmax(0, 1fr)", gap: 0 }}>
          {founders.map(f => (
            <button key={f.id} onClick={() => onOpen(f.id)}
              style={{ padding: 0, border: "none", background: "none", cursor: "pointer", lineHeight: 0, display: "block", overflow: "hidden" }}>
              <FounderPhoto founder={f} fontSize={16}
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
function factRows(f) {
  const yes = (v) => (v === true ? "Yes" : v === false ? "No" : v || null);
  const tight = (v) => (typeof v === "string" ? v.replace(/\s*\([^)]*\)\s*$/, "").trim() : v);
  return [
    ["Stage", tight(f.stage)],
    ["Industry", String(f.industry || "").replace(/:$/, "")],
    ["Revenue", f.revenueHidden ? "REDACT" : f.snapshot?.generatingRevenue === true ? (f.snapshot?.revenueRange || "Yes") : f.snapshot?.generatingRevenue === false ? "Pre-revenue" : f.snapshot?.revenueRange],
    ["Raising", f.snapshot?.raising],
    ["Hiring", f.snapshot?.hiring],
    ["Seeking customers", yes(f.snapshot?.lookingForCustomers)],
    ["Partnerships", yes(f.snapshot?.seekingPartnerships)],
    ["Sessions", /minimum/i.test(f.tier || "") ? "3 (program minimum)" : f.tier],
    ["Based", [f.city, f.county && `${f.county} County`].filter(Boolean).join(", ")],
  ].filter(([, v]) => v != null && v !== "");
}

export function FeaturePage({ founder: f, active, pageNumber }) {
  const facts = factRows(f);
  const quote = f.valueSought || f.hoping || f.bio;
  const body = f.bio || f.hoping;

  return (
    <Sheet active={active} fitViewport>
      <div style={{ flex: 1, background: PAPER, color: INK, display: "grid", gridTemplateColumns: "3.15in 1fr" }}>
        {/* Portrait, full bleed */}
        <div style={{ position: "relative", background: "#efe9df" }}>
          <FounderPhoto founder={f} fontSize={44}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "0.55in 0.6in 0 0.5in" }}>
          <Label>{String(f.industry || "Founder").replace(/:$/, "")}</Label>
          <h2 style={{ margin: "9px 0 0", fontFamily: DISPLAY, fontWeight: 900, fontSize: 36, lineHeight: 0.98, letterSpacing: "-0.02em" }}>
            {f.first} {f.last}
          </h2>
          <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: INK_SOFT }}>
            {[f.title, f.company].filter(Boolean).join(" · ")}
          </p>

          {quote && (
            <>
              <Rule style={{ margin: "14px 0" }} />
              <p style={{ margin: 0, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.45, color: INK }}>
                &ldquo;{String(quote).replace(/\s+/g, " ").slice(0, 260)}{String(quote).length > 260 ? "…" : ""}&rdquo;
              </p>
            </>
          )}

          <Rule style={{ margin: "14px 0 12px" }} />

          {body && (
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 9.8, lineHeight: 1.68, color: INK_SOFT, columnCount: 2, columnGap: 18 }}>
              {String(body).replace(/\s+/g, " ")}
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <Label size={8}>Wants help with</Label>
            <p style={{ margin: "5px 0 0", fontFamily: DISPLAY, fontSize: 17, fontWeight: 700, lineHeight: 1.2, color: ACCENT }}>
              {f.primaryFocus || "Open to guidance"}
            </p>
            {f.milestonesExpected === true && f.milestonesText && (
              <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 9.5, lineHeight: 1.6, color: INK_SOFT }}>
                <span style={{ fontWeight: 800, color: INK }}>By December: </span>
                {String(f.milestonesText).replace(/\s+/g, " ")}
              </p>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 10 }}>
            {facts.map(([label, v]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: `1px solid ${RULE}`, padding: "3.5px 0" }}>
                <span style={{ fontFamily: SANS, fontSize: 8, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_SOFT, flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, color: INK, textAlign: "right" }}>
                  {v === "REDACT"
                    ? <span><span aria-hidden="true" style={{ filter: "blur(3px)", userSelect: "none" }}>$000,000</span></span>
                    : v}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${RULE}`, padding: "8px 0 0", display: "flex", flexWrap: "wrap", gap: "2px 12px", marginBottom: 8 }}>
            {f.email && <a href={`mailto:${f.email}`} style={{ fontFamily: SANS, fontSize: 8.5, color: ACCENT, textDecoration: "none", fontWeight: 700 }}>{f.email}</a>}
            {f.linkedin && <a href={f.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: 8.5, color: INK_SOFT, textDecoration: "none" }}>
              {String(f.linkedin).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")}
            </a>}
          </div>

          <Folio page={pageNumber} section="The founders" />
        </div>
      </div>
    </Sheet>
  );
}
