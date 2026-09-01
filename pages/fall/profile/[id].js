// /fall/profile/<id> — a founder's Uplift profile, the one-pager Kennedy
// sends a prospective mentor so they have context before a match is made.
//
// Linked by Typeform response id (unguessable, permanent) or by the short
// Uplift ID once one has been issued. Data is read server-side and only the
// mentor-safe fields are serialized: the demographic disclosure block and
// every other applicant stay on the server. The page does carry the founder's
// contact details, so a profile link is as shareable as their email address.

import Head from "next/head";
import { FounderSheet, SheetStyles, pickMentorSafe } from "../../../components/FounderSheet";
import { getFallMentees, findFounder } from "../../../lib/fall-applications";

const PURPLE = "#5c4eb5";
const NAVY = "#110465";
const MUTED = "#6b6480";
const LINE = "#e8e4f5";

export default function FounderProfile({ founder, notFound, unavailable, generatedAt }) {
  if (notFound) {
    return (
      <>
        <Head>
          <title>Profile not found · Uplift</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f5ff", fontFamily: "'Red Hat Text', system-ui, sans-serif", padding: 24 }}>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "32px 36px", maxWidth: 440, textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: NAVY }}>
              {unavailable ? "This profile is taking a moment" : "This profile isn\u2019t available"}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
              {unavailable
                ? "We couldn\u2019t load it just now. Refresh in a few seconds and it should come right back."
                : <>The link may be out of date. Email <a href="mailto:uplift@techunited.co" style={{ color: PURPLE, fontWeight: 700 }}>uplift@techunited.co</a> and we&rsquo;ll send a current one.</>}
            </p>
          </div>
        </div>
      </>
    );
  }

  const name = `${founder.first} ${founder.last}`.trim();

  return (
    <>
      <Head>
        <title>{`${name} · Uplift Founder Profile`}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content={`${name}${founder.company ? `, ${founder.company}` : ""} — Uplift Mentorship Program, Fall 2026.`} />
        <link rel="icon" href="/uplift-logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Red+Hat+Text:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </Head>
      <SheetStyles />
      <div style={{ fontFamily: "'Red Hat Text', system-ui, sans-serif", paddingBottom: 8 }}>
        <div className="noprint" style={{ maxWidth: "8.5in", margin: "0 auto", padding: "14px 8px 10px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => window.print()}
            style={{ border: `1px solid ${LINE}`, background: "#fff", color: PURPLE, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Print / save as PDF
          </button>
        </div>
        <FounderSheet founder={founder} generatedAt={generatedAt} />
        <div className="noprint" style={{ height: 28 }} />
      </div>
    </>
  );
}

export async function getServerSideProps({ params, query, res }) {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return { props: { notFound: true, generatedAt: new Date().toISOString() } };

  let founder = null;
  let unavailable = false;
  try {
    const { mentees, failed } = await getFallMentees(token);
    founder = findFounder(mentees, params.id);
    // With the decision sheet unread every founder reads as undecided. That
    // is a temporary fault, and telling a mentor the profile doesn't exist
    // would be wrong.
    unavailable = !founder && failed;
  } catch (err) {
    console.error("[fall/profile] load failed:", err);
    unavailable = true;
  }
  if (!founder) {
    res.statusCode = unavailable ? 503 : 404;
    return { props: { notFound: true, unavailable, generatedAt: new Date().toISOString() } };
  }

  // Only what a mentor should see. The demographic disclosure is dropped
  // here, not hidden in the markup.
  // Once a founder has a mentor, that mentor is the audience for this page
  // and the revenue figure comes back. ?reveal=1 forces it for the times
  // Kennedy is sharing ahead of the match landing in the sheet.
  const reveal = !!founder.matchedMentorName || query.reveal === "1";

  return {
    props: {
      notFound: false,
      generatedAt: new Date().toISOString(),
      founder: JSON.parse(JSON.stringify(pickMentorSafe(founder, { reveal }))),
    },
  };
}
