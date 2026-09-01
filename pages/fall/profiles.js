// /fall/profiles — the matching-side index of founder one-pagers.
//
// Admin-gated (same code as the fall admin board). Every approved, non-test
// founder gets a row with a copy-ready link to their mentor-facing profile,
// so a prospective mentor can be sent context without anyone re-typing an
// application into an email.

import { useEffect, useState } from "react";
import Head from "next/head";
import { FounderPhoto } from "../../components/FounderSheet";

const NAVY = "#110465";
const PINK = "#d86697";
const PURPLE = "#5c4eb5";
const MUTED = "#6b6480";
const LINE = "#e8e4f5";

function PasswordGate({ onAuthenticated }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const attempt = () => {
    if (input.trim().toLowerCase() === "admin") onAuthenticated();
    else setError(true);
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0f0729", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Red Hat Text', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", width: 360, textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#1a1733" }}>Founder profiles · Fall 2026</p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: MUTED }}>Enter the admin code to continue</p>
        <input
          type="password" value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: error ? "1.5px solid #e74c3c" : `1.5px solid ${LINE}`, fontSize: 15, outline: "none", fontFamily: "inherit", marginBottom: 12 }}
        />
        <button onClick={attempt} style={{ width: "100%", border: "none", borderRadius: 8, padding: "10px 0", background: PURPLE, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Enter
        </button>
      </div>
    </div>
  );
}

export default function FounderProfileIndex() {
  const [authed, setAuthed] = useState(false);
  const [people, setPeople] = useState(null);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | unmatched | matched
  const [copied, setCopied] = useState(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("auth_admin_fall") === "1") setAuthed(true);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/admin/fall-people")
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setPeople(d); })
      .catch(e => setErr(e.message));
  }, [authed]);

  // Always the response id, never the Uplift ID: founders use that ID as
  // their portal password, and these links go to mentors.
  const linkFor = (m) => `${origin}/fall/profile/${m.id}`;

  const copy = async (m) => {
    try {
      await navigator.clipboard.writeText(linkFor(m));
      setCopied(m.id);
      setTimeout(() => setCopied(c => (c === m.id ? null : c)), 1600);
    } catch (_) {
      window.prompt("Copy this link:", linkFor(m));
    }
  };

  if (!authed) {
    return (
      <>
        <Head>
          <title>Founder profiles · Uplift Fall 2026</title>
          <meta name="robots" content="noindex,nofollow" />
          <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Red+Hat+Text:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        </Head>
        <PasswordGate onAuthenticated={() => { sessionStorage.setItem("auth_admin_fall", "1"); setAuthed(true); }} />
      </>
    );
  }

  const approved = (people?.mentees || []).filter(m => m.decision === "approved" && !m.isTest);
  const rows = approved
    .filter(m => filter === "all" || (filter === "matched" ? m.matchedMentorName : !m.matchedMentorName))
    .filter(m => !search || `${m.first} ${m.last} ${m.company || ""} ${m.primaryFocus || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`));

  const btn = { border: `1px solid ${LINE}`, background: "#fff", color: PURPLE, borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <>
      <Head>
        <title>Founder profiles · Uplift Fall 2026</title>
        <meta name="robots" content="noindex,nofollow" />
        <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Red+Hat+Text:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Red Hat Text', system-ui, sans-serif", color: "#1a1733" }}>
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "34px 20px 60px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: PINK }}>Uplift Mentorship Program · Fall 2026</p>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: NAVY }}>Founder profiles</h1>
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 640 }}>
            One shareable page per approved founder, built from their application. Send the link to a prospective mentor
            before you make the match. The page shows their company, goals, and what they want help with. It does not
            show their email or the demographic questions.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, company, focus"
              style={{ flex: "1 1 240px", padding: "8px 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
            />
            {[["all", "All"], ["unmatched", "Not matched yet"], ["matched", "Matched"]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{ ...btn, background: filter === k ? PURPLE : "#fff", color: filter === k ? "#fff" : PURPLE, borderColor: filter === k ? PURPLE : LINE }}
              >{label}</button>
            ))}
          </div>

          {err && <p style={{ fontSize: 13, color: "#b3261e" }}>Could not load applications: {err}</p>}
          {!people && !err && <p style={{ fontSize: 13.5, color: MUTED }}>Loading applications…</p>}

          {people && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: MUTED }}>
                {rows.length} of {approved.length} approved founders
                {people.sheetReadError && <span style={{ color: "#b3261e", fontWeight: 700 }}> · decisions could not be read from the sheet, this list may be short</span>}
              </p>
              <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, overflow: "hidden" }}>
                {rows.map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? `1px solid ${LINE}` : "none" }}>
                    <FounderPhoto founder={m} fontSize={13} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", background: "#f0eef8", flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                        {m.first} {m.last}
                        {m.upliftId && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: "#9b93b5", letterSpacing: "0.06em" }}>{m.upliftId}</span>}
                      </p>
                      <p style={{ margin: "1px 0 0", fontSize: 12.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[m.company, m.primaryFocus].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {m.matchedMentorName
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: "#1a6e42", background: "#e8f8f0", borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>↔ {m.matchedMentorName}</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: "#9b6b1f", background: "#fdf3e0", borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>Needs mentor</span>}
                    <button onClick={() => copy(m)} style={{ ...btn, minWidth: 92 }}>{copied === m.id ? "Copied" : "Copy link"}</button>
                    <a href={`/fall/profile/${m.id}`} target="_blank" rel="noopener noreferrer" style={btn}>Open</a>
                  </div>
                ))}
                {rows.length === 0 && <p style={{ margin: 0, padding: "18px 16px", fontSize: 13.5, color: MUTED }}>No founders match that filter.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
