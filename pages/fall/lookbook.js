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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { SheetStyles, FounderPhoto, pickMentorSafe } from "../../components/FounderSheet";
import { UPLIFT_ALUMNI } from "../../lib/uplift-alumni";
import { UPLIFT_VOICES } from "../../lib/uplift-voices";
import { PAIRED_PAGES, SHORT_FORM_ORDER } from "../../lib/lookbook-copy-edits";
import {
  CoverPage, ContentsPage, GlancePage, IndexPage, FeaturePage, DuoPage,
  AlumniDividerPage, AlumniPage, VoicesPage,
  PAPER, INK, INK_SOFT, RULE, ACCENT, DISPLAY, SANS,
} from "../../components/LookbookPages";

// Typeform's choice labels carry a parenthetical gloss that is useful in the
// form and noise in a tally.
const short = (v) => String(v || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/:$/, "").trim();

// Names arrive exactly as they were typed into the form, which means some are
// all lowercase. A word that already carries a capital is left alone, so
// "JT" and "Khasky-Levy" survive while "ceana santori" gets its capitals.
const properName = (v) => String(v || "")
  .split(/(\s+)/)
  .map(part => (/[A-Z]/.test(part) ? part : part.replace(/(^|[-'’])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase())))
  .join("");

const isSoon = (v) => /^yes$/i.test(v || "") || /next 6 months/i.test(v || "");

// The tools only exist in a local build. On the deployed site the book is
// something you read, not something anyone can change.
const EDITABLE_BUILD = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_VERCEL_ENV === undefined;

// Founders who applied on the earlier, shorter form wrote nothing but their
// focus areas. A page each would be mostly white space, so they pair up.
const isSparse = (f) => !f.bio && !f.hoping && !f.valueSought && !f.brings;

function tally(founders, pick) {
  const counts = new Map();
  for (const f of founders) {
    const key = pick(f);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function Lookbook() {
  // Anyone with the link can read the book. Only the founders' email
  // addresses are gated, and they are gated server-side: see
  // pages/api/fall-lookbook.js.
  const [isAdmin, setIsAdmin] = useState(false);
  const [founders, setFounders] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(0);
  const [generatedAt] = useState(() => new Date().toISOString());
  const [crops, setCrops] = useState({});
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  // Clicking a name in an index opens their page as a preview rather than
  // jumping the book: you look, then either go there or come back.
  const [preview, setPreview] = useState(null);
  // Mounting all 53 sheets at once means 53 fit passes and every photo at
  // once, which takes the better part of a minute before anything appears.
  // On screen only the current spread and its neighbours are mounted;
  // printing mounts the whole issue first (see printAll).
  const [printAll, setPrintAll] = useState(false);
  const [saveState, setSaveState] = useState(null); // saving | saved | failed
  // The key that lets this browser write to the book. Asked for once when the
  // photo tools are switched on, then kept for the session.
  const [editCode, setEditCode] = useState("");
  // Emails are blurred until someone enters the contact code. The book is
  // already behind the admin gate; this is the second lock, so it can be
  // opened in front of people who should see the founders but not their
  // inboxes.
  const [contactsShown, setContactsShown] = useState(false);
  const [emails, setEmails] = useState({});

  useEffect(() => {
    // The photo tools appear for anyone already signed into the fall admin
    // board in this browser, or for anyone who adds ?edit=1 to the URL. The
    // book itself is public; this is the difference between reading it and
    // re-cropping it.
    // ?edit=1 turns the tools on and is remembered for the rest of the browser
    // session, so following a link or refreshing does not silently drop you
    // back into read-only.
    // The deployed book is read-only for everyone: no photo tools, no page
    // moving, no email reveal, no print. Editing happens on the local copy.
    if (!EDITABLE_BUILD) return;
    const wantsEdit = new URLSearchParams(window.location.search).get("edit") === "1";
    if (wantsEdit) sessionStorage.setItem("lookbook_edit", "1");
    setIsAdmin(
      wantsEdit
      || sessionStorage.getItem("lookbook_edit") === "1"
      || sessionStorage.getItem("auth_admin_fall") === "1",
    );
    setEditCode(sessionStorage.getItem("lookbook_edit_code") || "");
  }, []);

  useEffect(() => {
    fetch("/api/fall-lookbook")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setCrops(d.crops || {});
        setFounders(d.founders || []);
      })
      .catch(e => setErr(e.message));
  }, []);

  // The contact code is checked on the server, which is also where the
  // addresses live until it passes.
  // Every page has to be in the document before the print dialog opens, and
  // each one needs a frame to measure itself, hence the pause.
  const printIssue = useCallback(() => {
    setPrintAll(true);
    setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 1200);
  }, []);

  const revealContacts = useCallback(async () => {
    const code = window.prompt("Contact code to show emails");
    if (!code) return;
    try {
      const r = await fetch("/api/fall-lookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!r.ok) return window.alert("That code is not right.");
      const { contacts } = await r.json();
      setEmails(contacts || {});
      setContactsShown(true);
    } catch (e) {
      window.alert("Could not load the emails just now.");
    }
  }, []);

  // The issue as an explicit running order: front matter, a feature per
  // founder who wrote one, then the short-form founders two to a page.
  // A photo is set up twice over: once for the full page it leads, once for
  // the small square it occupies on the cover and the mosaic. They are stored
  // under separate keys so adjusting one never disturbs the other. A tile
  // with no setup of its own inherits the page's, which is what everything
  // saved before this split does.
  const TILE = (id) => `${id}:tile`;

  const cast = useMemo(
    () => (founders || []).map(f => ({
      ...f,
      first: properName(f.first),
      last: properName(f.last),
      ...(crops[f.id] ? { crop: crops[f.id] } : null),
      ...(emails[f.id] ? { email: emails[f.id] } : null),
    })),
    [founders, crops, emails],
  );

  const tileCast = useMemo(
    () => (founders || []).map(f => {
      const crop = crops[TILE(f.id)] || crops[f.id];
      const named = { ...f, first: properName(f.first), last: properName(f.last) };
      return crop ? { ...named, crop } : named;
    }),
    [founders, crops],
  );

  // Alumni photos are croppable on the same terms as the founders', keyed by
  // their slug rather than an application id.
  const alumniCast = useMemo(
    () => UPLIFT_ALUMNI.map(a => ({
      ...a,
      first: properName(a.first),
      last: properName(a.last),
      ...(crops[a.slug] ? { crop: crops[a.slug] } : null),
    })),
    [crops],
  );

  // Every save says whether it landed. A silent failure here is what makes
  // an adjustment look like it "reverted" on the next load.
  //
  // Sliders fire on every tick, so the write is debounced per photo: the
  // screen updates immediately and one save goes out when you stop moving.
  // Without this a single drag of the zoom slider sent dozens of writes and
  // tripped the Sheets quota.
  const saveTimers = useRef({});

  const saveCrop = useCallback((id, next) => {
    setCrops(c => ({ ...c, [id]: next }));
    setSaveState("saving");
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => writeCrop(id, next), 450);
  }, []);

  const writeCrop = useCallback(async (id, next) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch("/api/admin/photo-crop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...next, code: editCode }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setSaveState("saved");
        setTimeout(() => setSaveState(s2 => (s2 === "saved" ? null : s2)), 1600);
        return;
      } catch (e) {
        if (attempt === 1) {
          console.error("crop save failed", e);
          setSaveState("failed");
        }
      }
    }
  }, [editCode]);

  // The founder band is a list of pages, not a list of people: a feature is
  // one founder, a duo is two. Pages run alphabetically until one is moved,
  // at which point the saved position on that page's first founder decides
  // where it sits. Moving swaps two neighbours, so everything else stays put.

  // Dragging a photo moves its focal point. The distance you drag is read as
  // a share of the frame, so a small nudge is a small move, and the result is
  // saved when you let go.
  const dragRef = useRef(null);
  const justDragged = useRef(0);

  const dragProps = useCallback((subject) => {
    if (!adjustMode) return {};
    const key = subject.id || subject.slug;
    return {
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        const box = e.currentTarget.getBoundingClientRect();
        const cur = crops[key] || { posX: 50, posY: 50, zoom: 1, hidden: false, fit: "cover", layout: null };
        dragRef.current = { key, startX: e.clientX, startY: e.clientY, box, cur, moved: false };
      },
    };
  }, [adjustMode, crops]);

  // The floating photo is moved around the page rather than panned inside its
  // frame, so it gets its own drag: the pointer carries the box.
  const floatDrag = useCallback((subject) => {
    if (!adjustMode) return {};
    const key = subject.id || subject.slug;
    return {
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sheet = e.currentTarget.closest(".sheet");
        if (!sheet) return;
        const page = sheet.getBoundingClientRect();
        const box = e.currentTarget.getBoundingClientRect();
        const cur = crops[key] || { posX: 50, posY: 50, zoom: 1, hidden: false, fit: "cover", layout: "icon" };
        dragRef.current = {
          key, kind: "float", box: page, cur,
          grabX: e.clientX - box.left,
          grabY: e.clientY - box.top,
          pageLeft: page.left, pageTop: page.top,
          boxW: box.width, boxH: box.height,
          moved: false,
        };
      },
    };
  }, [adjustMode, crops]);

  useEffect(() => {
    if (!adjustMode) return;
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "float") {
        const x = ((e.clientX - d.grabX - d.pageLeft) / d.box.width) * 100;
        const y = ((e.clientY - d.grabY - d.pageTop) / d.box.height) * 100;
        d.moved = true;
        d.next = {
          ...d.cur,
          layout: "icon",
          floatX: Math.min(100 - (d.boxW / d.box.width) * 100, Math.max(0, x)),
          floatY: Math.min(100 - (d.boxH / d.box.height) * 100, Math.max(0, y)),
        };
        setCrops(c => ({ ...c, [d.key]: d.next }));
        return;
      }
      const dx = ((e.clientX - d.startX) / d.box.width) * 100;
      const dy = ((e.clientY - d.startY) / d.box.height) * 100;
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) d.moved = true;
      // Dragging right reveals more of the photo's left side, so the focal
      // point moves against the pointer.
      d.next = {
        ...d.cur,
        posX: Math.min(100, Math.max(0, d.cur.posX - dx)),
        posY: Math.min(100, Math.max(0, d.cur.posY - dy)),
      };
      setCrops(c => ({ ...c, [d.key]: d.next }));
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.moved || !d.next) return;
      saveCrop(d.key, d.next);
      // The mouseup is followed by a click on the same photo; without this
      // the panel opens every time you finish a drag.
      justDragged.current = Date.now();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [adjustMode, saveCrop]);

  const founderPages = useMemo(() => {
    const partnerOf = {};
    PAIRED_PAGES.forEach(([a, b]) => { partnerOf[a] = b; partnerOf[b] = a; });

    const rich = cast.filter(f => !isSparse(f));
    const shorts = cast.filter(isSparse)
      .map((f, i) => {
        const fixed = SHORT_FORM_ORDER.indexOf(f.id);
        return { f, key: fixed >= 0 ? fixed : 100 + i };
      })
      .sort((a, b) => a.key - b.key)
      .map(x => x.f);

    const groups = [];
    const placed = new Set();

    rich.forEach(f => {
      if (placed.has(f.id)) return;
      const partner = partnerOf[f.id] && rich.find(x => x.id === partnerOf[f.id]);
      if (partner) {
        placed.add(f.id);
        placed.add(partner.id);
        groups.push({ kind: "duo", people: [f, partner] });
        return;
      }
      groups.push({ kind: "feature", people: [f] });
    });
    for (let i = 0; i < shorts.length; i += 2) {
      groups.push({ kind: "duo", people: shorts.slice(i, i + 2) });
    }

    return groups
      .map((g, i) => ({ g, key: crops[g.people[0].id]?.order ?? i }))
      .sort((a, b) => a.key - b.key)
      .map(x => x.g);
  }, [cast, crops]);

  const pages = useMemo(() => {
    const list = [{ kind: "cover" }, { kind: "contents" }, { kind: "glance" }];
    if (!founders) return list;
    list.push({ kind: "voices", voices: UPLIFT_VOICES });
    list.push({ kind: "seeking" }, { kind: "hiring" });
    founderPages.forEach(g => list.push(g));

    // Part two: the summer graduates, four to a page.
    list.push({ kind: "alumniDivider" });
    const alumniPages = Math.ceil(alumniCast.length / 4);
    for (let i = 0; i < alumniCast.length; i += 4) {
      list.push({
        kind: "alumni",
        alumni: alumniCast.slice(i, i + 4),
        partOf: `${i / 4 + 1} of ${alumniPages}`,
      });
    }
    return list;
  }, [founders, founderPages, alumniCast]);

  // Moving a page moves everyone on it. The order is written against the
  // page's first founder, which is what the sort above reads.
  const movePage = useCallback((pageIdx, delta) => {
    const band = pages.map((p, i) => ({ p, i })).filter(x => x.p.kind === "feature" || x.p.kind === "duo");
    const here = band.findIndex(x => x.i === pageIdx);
    const there = here + delta;
    if (here < 0 || there < 0 || there >= band.length) return;
    const a = band[here].p.people[0].id;
    const b = band[there].p.people[0].id;
    const blank = { posX: 50, posY: 50, zoom: 1, hidden: false, fit: "cover", layout: null };
    saveCrop(a, { ...(crops[a] || blank), order: there });
    saveCrop(b, { ...(crops[b] || blank), order: here });
    setPage(p => p + delta);
  }, [pages, crops, saveCrop]);

  const pageCount = founders ? pages.length : 0;

  // Which page a given founder is on, for the contents list and every link.
  const pageOfFounder = useMemo(() => {
    const map = {};
    pages.forEach((pg, i) => (pg.people || []).forEach(f => { map[f.id] = i; }));
    return map;
  }, [pages]);

  const openFounder = useCallback((id) => {
    const i = pageOfFounder[id];
    if (i != null) setPage(i);
  }, [pageOfFounder]);

  const turn = useCallback((delta) => {
    setPage(p => Math.min(Math.max(p + delta, 0), Math.max(pageCount - 1, 0)));
  }, [pageCount]);

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      // Escape backs out of whatever is open before it turns a page.
      if (e.key === "Escape") { setPreview(null); setAdjusting(null); return; }
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

  const seeking = useMemo(() => cast
    .filter(f => f.snapshot?.lookingForCustomers === true || f.snapshot?.seekingPartnerships === true)
    .map(f => ({
      founder: f,
      note: [f.snapshot?.lookingForCustomers === true && "Customers and pilots",
        f.snapshot?.seekingPartnerships === true && "Partnerships"].filter(Boolean).join(" · "),
    })), [cast]);

  const hiring = useMemo(() => cast
    .filter(f => isSoon(f.snapshot?.hiring))
    .map(f => ({
      founder: f,
      note: /^yes$/i.test(f.snapshot?.hiring || "") ? "Hiring now" : "Hiring within six months",
    })), [cast]);

  const glance = useMemo(() => {
    const fs = cast;
    return {
      // Revenue and fundraising are withheld across the book, so they are not
      // counted here either. A tally of something the pages will not show is
      // the same disclosure by another route.
      stats: [
        { n: fs.length, label: "founders in the cohort" },
        { n: fs.filter(f => isSoon(f.snapshot?.hiring)).length, label: "hiring now or within six months" },
        { n: fs.filter(f => f.snapshot?.lookingForCustomers === true).length, label: "looking for customers or pilots" },
        { n: fs.filter(f => f.snapshot?.seekingPartnerships === true).length, label: "seeking partnerships" },
      ],
      columns: [
        { title: "Stage", rows: tally(fs, f => short(f.stage)) },
        { title: "Industry", rows: tally(fs, f => short(f.industry)) },
        { title: "Where they are", rows: tally(fs, f => f.county && `${f.county} County`) },
        { title: "What they want help with", rows: tally(fs, f => f.primaryFocus) },
      ],
    };
  }, [cast]);

  // Printing needs the whole issue in the document; the screen needs three
  // pages at most.
  const near = (idx) => printAll || Math.abs(idx - page) <= 1;

  // A drag ends in a mouseup on the photo, which would otherwise read as a
  // click and open the panel on top of what you were just doing.
  // Callers hand this either a whole record (the cover, the feature pages) or
  // just an id (the mosaic, which is built from links). Both are fine.
  const openPanel = (subject, scope = "page") => {
    if (dragRef.current || Date.now() - justDragged.current < 250) return;
    const record = typeof subject === "string"
      ? cast.find(f => f.id === subject) || alumniCast.find(a => a.slug === subject)
      : subject;
    if (record) setAdjusting({ ...record, scope });
  };

  const chrome = {
    border: `1px solid ${RULE}`, background: PAPER, color: INK,
    borderRadius: 2, padding: "6px 13px", fontSize: 9, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", fontFamily: SANS,
  };
  const sections = [
    { label: "At a glance", page: pages.findIndex(p => p.kind === "glance") },
    { label: "What founders say about Uplift", page: pages.findIndex(p => p.kind === "voices") },
    { label: "Looking for customers and partners", page: pages.findIndex(p => p.kind === "seeking") },
    { label: "Hiring in the next six months", page: pages.findIndex(p => p.kind === "hiring") },
    { label: "The alumni: Summer 2026 graduates", page: pages.findIndex(p => p.kind === "alumniDivider") },
  ].filter(sec => sec.page >= 0);

  return (
    <>
      <Head>
        <title>Uplift · The Founder Lookbook</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="icon" href="/uplift-logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Red+Hat+Text:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
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
                  onChange={e => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v.startsWith("p:")) setPage(Number(v.slice(2)));
                    else openFounder(v);
                  }}
                  style={{ ...chrome, letterSpacing: "0.06em", textTransform: "none", fontSize: 11, maxWidth: 200 }}
                >
                  <option value="">Jump to a page</option>
                  <optgroup label="Sections">
                    <option value="p:0">Cover</option>
                    <option value="p:1">Contents</option>
                    {sections.map(sec => <option key={sec.label} value={`p:${sec.page}`}>{sec.label}</option>)}
                  </optgroup>
                  <optgroup label="Founders">
                    {cast.map(f => <option key={f.id} value={f.id}>{f.first} {f.last}</option>)}
                  </optgroup>
                </select>
              )}
              <button onClick={() => turn(-1)} disabled={page === 0} style={{ ...chrome, opacity: page === 0 ? 0.4 : 1 }}>‹ Prev</button>
              <span style={{ fontFamily: DISPLAY, fontSize: 12, color: INK_SOFT, minWidth: 66, textAlign: "center" }}>
                {founders ? `${page + 1} / ${pageCount}` : "…"}
              </span>
              <button onClick={() => turn(1)} disabled={page >= pageCount - 1} style={{ ...chrome, opacity: page >= pageCount - 1 ? 0.4 : 1 }}>Next ›</button>
              {/* Moving a founder up or down the running order belongs next to
                  the other page actions, not inside a photo panel. It shows
                  on the founder pages, which are the only ones that move. */}
              {isAdmin && ["feature", "duo"].includes(pages[page]?.kind) && (
                <>
                  <button
                    onClick={() => movePage(page, -1)}
                    title="Move this founder one page earlier"
                    style={{ ...chrome, letterSpacing: "0.08em" }}
                  >
                    ◀ Move page
                  </button>
                  <button
                    onClick={() => movePage(page, 1)}
                    title="Move this founder one page later"
                    style={{ ...chrome, letterSpacing: "0.08em" }}
                  >
                    Move page ▶
                  </button>
                </>
              )}
              {isAdmin && <button
                onClick={() => {
                  if (!adjustMode && !editCode) {
                    const code = window.prompt("Edit code to change photos and page order");
                    if (!code) return;
                    sessionStorage.setItem("lookbook_edit_code", code.trim());
                    setEditCode(code.trim());
                  }
                  setAdjustMode(v => !v);
                  setAdjusting(null);
                  setPreview(null);
                }}
                style={{ ...chrome, background: adjustMode ? ACCENT : PAPER, color: adjustMode ? "#fff" : INK, borderColor: adjustMode ? ACCENT : RULE }}
                title="Turn on, then click any photo to drag it, zoom it, change its layout, or move that founder earlier or later in the book"
              >
                {adjustMode ? "Done" : "Photos"}
              </button>}
              {EDITABLE_BUILD && <button
                onClick={() => { if (contactsShown) { setContactsShown(false); setEmails({}); } else revealContacts(); }}
                style={{ ...chrome, background: contactsShown ? INK : PAPER, color: contactsShown ? PAPER : INK }}
              >
                {contactsShown ? "Hide emails" : "Show emails"}
              </button>}
              {saveState && (
                <span style={{
                  fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", padding: "5px 9px", borderRadius: 2,
                  background: saveState === "failed" ? "#c0392b" : saveState === "saved" ? "#15653c" : RULE,
                  color: saveState === "saving" ? INK : "#fff",
                }}>
                  {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Not saved"}
                </span>
              )}
              {EDITABLE_BUILD && (
                <button onClick={printIssue} disabled={!founders} style={{ ...chrome, background: INK, color: PAPER, borderColor: INK }}>Print</button>
              )}
            </div>
          </div>
        </div>

        {founders && (
          <div className="book" style={{ padding: "18px 0 40px" }}>
            {pages.map((pg, idx) => {
              if (!near(idx)) return null;
              const last = idx === pages.length - 1;
              const key = pg.people ? pg.people.map(f => f.id).join("-") : `${pg.kind}-${idx}`;
              const on = page === idx;
              return (
                <div
                  key={key}
                  id={pg.people ? `f-${pg.people[0].id}` : undefined}
                  className={last ? "lastpage" : undefined}
                >
                  {pg.kind === "cover" && (
                    <CoverPage
                      founders={tileCast}
                      generatedAt={generatedAt}
                      active={on}
                      onPick={adjustMode ? (f => openPanel(f, "tile")) : (f => setPreview(f.id))}
                    />
                  )}
                  {pg.kind === "contents" && (
                    <ContentsPage
                      founders={tileCast}
                      sections={sections}
                      pageOfFounder={pageOfFounder}
                      onOpen={{ page: setPage, founder: id => setPreview(id) }}
                      active={on}
                      pageNumber={idx + 1}
                    />
                  )}
                  {pg.kind === "glance" && (
                    <GlancePage founders={glance.columns} stats={glance.stats} active={on} pageNumber={idx + 1} />
                  )}
                  {pg.kind === "voices" && (
                    <VoicesPage voices={pg.voices} active={on} pageNumber={idx + 1} />
                  )}
                  {pg.kind === "seeking" && (
                    <IndexPage
                      active={on}
                      kicker="Open doors"
                      title="Looking for customers and partners"
                      standfirst="Founders actively seeking customers, pilot partners, or strategic partnerships. Click a name to read their feature."
                      rows={seeking}
                      onOpen={id => setPreview(id)}
                      empty="Nobody has flagged this yet."
                      pageNumber={idx + 1}
                    />
                  )}
                  {pg.kind === "hiring" && (
                    <IndexPage
                      active={on}
                      kicker="Open doors"
                      title="Hiring in the next six months"
                      standfirst="Founders hiring today or planning to within six months. Click a name to read their feature."
                      rows={hiring}
                      onOpen={id => setPreview(id)}
                      empty="Nobody has flagged this yet."
                      pageNumber={idx + 1}
                    />
                  )}
                  {pg.kind === "feature" && (
                    <FeaturePage
                      founder={pg.people[0]}
                      active={on}
                      pageNumber={idx + 1}
                      onAdjust={adjustMode ? openPanel : undefined}
                      dragProps={dragProps}
                      floatDrag={adjustMode ? floatDrag : undefined}
                    />
                  )}
                  {pg.kind === "duo" && (
                    <DuoPage founders={pg.people} active={on} pageNumber={idx + 1} onAdjust={adjustMode ? openPanel : undefined} />
                  )}
                  {pg.kind === "alumniDivider" && <AlumniDividerPage alumni={alumniCast} active={on} />}
                  {pg.kind === "alumni" && (
                    <AlumniPage alumni={pg.alumni} active={on} pageNumber={idx + 1} partOf={pg.partOf} onAdjust={adjustMode ? openPanel : undefined} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {preview && (() => {
          const f = cast.find(x => x.id === preview);
          if (!f) return null;
          const target = pageOfFounder[preview];
          const pg = pages[target];
          return (
            <div
              className="noprint"
              onClick={() => setPreview(null)}
              style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(23,20,31,0.62)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}
            >
              <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setPage(target); setPreview(null); }}
                  style={{ ...chrome, background: INK, color: PAPER, borderColor: INK }}
                >
                  Go to this page
                </button>
                <button onClick={() => setPreview(null)} style={chrome}>Back</button>
              </div>
              <div onClick={e => e.stopPropagation()} style={{ flex: "0 1 auto", minHeight: 0 }}>
                {pg?.kind === "duo"
                  ? <DuoPage founders={pg.people} active pageNumber={target + 1} />
                  : <FeaturePage founder={f} active pageNumber={(target ?? 0) + 1} />}
              </div>
            </div>
          );
        })()}

        {adjusting && (
          <div
            className="noprint"
            onClick={() => setAdjusting(null)}
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(23,20,31,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              // The panel grew past the bottom of the screen, which quietly
              // hid the controls below the slider. It scrolls now.
              style={{ background: PAPER, borderRadius: 4, padding: "22px 24px", width: 380, fontFamily: SANS, maxHeight: "88vh", overflowY: "auto" }}
            >
              <p style={{ margin: "0 0 2px", fontFamily: DISPLAY, fontSize: 20, fontWeight: 900, color: INK }}>
                {adjusting.first} {adjusting.last}
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: INK_SOFT }}>
                {adjusting.scope === "tile" ? "Photo on the cover and the founders grid" : "Photo on their page"}
              </p>

              {(() => {
                // Founders are keyed by application id and their photo comes
                // through the Typeform proxy; alumni are keyed by slug with a
                // file in /photos. Everything below treats them the same.
                const base = adjusting.id || adjusting.slug;
                const key = adjusting.scope === "tile" ? `${base}:tile` : base;
                const src = adjusting.headshotUrl
                  ? `/api/admin/tf-file?u=${encodeURIComponent(adjusting.headshotUrl)}`
                  : adjusting.photo;
                const cur = crops[key] || crops[base] || { posX: 50, posY: 50, zoom: 1, hidden: false, fit: "cover", layout: null };
                const set = (patch) => saveCrop(key, { ...cur, ...patch });
                // The layout belongs to the founder's own page, so it is
                // offered wherever you open the panel from and always saved
                // against the page record, never the tile.
                const isFounderPage = !!adjusting.headshotUrl;
                const pageCrop = crops[base] || { posX: 50, posY: 50, zoom: 1, hidden: false, fit: "cover", layout: null };
                const setLayout = (layout) => saveCrop(base, { ...pageCrop, layout });
                const layouts = [
                  ["left-half", "Half page, left"],
                  ["right-half", "Half page, right"],
                  ["top-band", "Band across the top"],
                  ["bottom-band", "Band across the bottom"],
                  ["full-bleed", "Full page behind the text"],
                  ["inset", "Narrow column"],
                  ["icon", "Small floating photo"],
                ];
                return (
                  <>
                    {/* Drag inside this box to move the photo, exactly as on
                        the page itself. */}
                    <div
                      onMouseDown={(e) => {
                        const box = e.currentTarget.getBoundingClientRect();
                        const start = { x: e.clientX, y: e.clientY, posX: cur.posX, posY: cur.posY };
                        let latest = null;
                        const move = (ev) => {
                          const dx = ((ev.clientX - start.x) / box.width) * 100;
                          const dy = ((ev.clientY - start.y) / box.height) * 100;
                          latest = {
                            ...cur,
                            posX: Math.min(100, Math.max(0, start.posX - dx)),
                            posY: Math.min(100, Math.max(0, start.posY - dy)),
                          };
                          setCrops(c => ({ ...c, [key]: latest }));
                        };
                        const up = () => {
                          window.removeEventListener("mousemove", move);
                          window.removeEventListener("mouseup", up);
                          if (latest) saveCrop(key, latest);
                        };
                        window.addEventListener("mousemove", move);
                        window.addEventListener("mouseup", up);
                      }}
                      style={{ width: 170, height: 212, margin: "0 auto 6px", overflow: "hidden", background: "#efe9df", position: "relative", cursor: "grab" }}
                    >
                      {src && !cur.hidden && (
                        <img
                          src={src}
                          alt=""
                          draggable={false}
                          style={{
                            position: "absolute", inset: 0, width: "100%", height: "100%",
                            objectFit: cur.fit === "contain" ? "contain" : "cover",
                            objectPosition: `${cur.posX}% ${cur.posY}%`,
                            ...(cur.zoom > 1 ? { transform: `scale(${cur.zoom})`, transformOrigin: `${cur.posX}% ${cur.posY}%` } : null),
                          }}
                        />
                      )}
                      {(!src || cur.hidden) && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: ACCENT, color: "#fff", fontFamily: DISPLAY, fontSize: 30, fontWeight: 700 }}>
                          {`${(adjusting.first || "")[0] || ""}${(adjusting.last || "")[0] || ""}`.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p style={{ margin: "0 0 14px", textAlign: "center", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: INK_SOFT }}>
                      Drag the photo to move it
                    </p>



                    <p style={{ margin: "0 0 6px", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_SOFT }}>Size</p>
                    <input
                      type="range" min="1" max="2.5" step="0.05" value={cur.zoom || 1}
                      onChange={e => set({ zoom: parseFloat(e.target.value) })}
                      style={{ width: "100%", marginBottom: 14 }}
                    />

                    {isFounderPage && (pageCrop.layout === "icon") && (
                      <>
                        <p style={{ margin: "0 0 6px", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_SOFT }}>Floating photo size</p>
                        <input
                          type="range" min="1" max="4" step="0.1"
                          value={pageCrop.floatW || 1.6}
                          onChange={e => saveCrop(base, { ...pageCrop, layout: "icon", floatW: parseFloat(e.target.value) })}
                          style={{ width: "100%", marginBottom: 6 }}
                        />
                        <p style={{ margin: "0 0 14px", fontSize: 9.5, color: INK_SOFT }}>
                          Drag it anywhere on the page to reposition.
                        </p>
                      </>
                    )}

                    <p style={{ margin: "0 0 6px", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_SOFT }}>Size</p>
                    <input
                      type="range" min="1" max="2.5" step="0.05" value={cur.zoom || 1}
                      onChange={e => set({ zoom: parseFloat(e.target.value) })}
                      style={{ width: "100%", marginBottom: 14 }}
                    />

                    {isFounderPage && (pageCrop.layout === "icon") && (
                      <>
                        <p style={{ margin: "0 0 6px", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_SOFT }}>Floating photo size</p>
                        <input
                          type="range" min="1" max="4" step="0.1"
                          value={pageCrop.floatW || 1.6}
                          onChange={e => saveCrop(base, { ...pageCrop, layout: "icon", floatW: parseFloat(e.target.value) })}
                          style={{ width: "100%", marginBottom: 6 }}
                        />
                        <p style={{ margin: "0 0 14px", fontSize: 9.5, color: INK_SOFT }}>
                          Drag it anywhere on the page to reposition.
                        </p>
                      </>
                    )}


                    {isFounderPage && (
                      <>
                        <p style={{ margin: "0 0 6px", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_SOFT }}>
                          Where it sits on {adjusting.first}&rsquo;s page
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                          {layouts.map(([value, label]) => (
                            <button key={value} onClick={() => setLayout(value)}
                              style={{ ...chrome, fontSize: 8.5, padding: "5px 9px", letterSpacing: "0.04em", textTransform: "none", background: (pageCrop.layout || "left-half") === value ? INK : PAPER, color: (pageCrop.layout || "left-half") === value ? PAPER : INK }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: INK, marginBottom: 8 }}>
                      <input type="checkbox" checked={cur.fit === "contain"} onChange={e => set({ fit: e.target.checked ? "contain" : "cover" })} />
                      Show the whole photo (with space around it)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: INK, marginBottom: 16 }}>
                      <input type="checkbox" checked={!!cur.hidden} onChange={e => set({ hidden: e.target.checked })} />
                      Hide this photo (show initials instead)
                    </label>
                  </>
                );
              })()}

              <button onClick={() => setAdjusting(null)} style={{ ...chrome, width: "100%", background: INK, color: PAPER, borderColor: INK }}>Done</button>
            </div>
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
