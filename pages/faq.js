import { useState } from "react";
import Head from "next/head";
import Link from "next/link";

const FAQS = [
  {
    category: "Getting Started",
    icon: "🚀",
    questions: [
      {
        q: "How do I access my personal portal?",
        a: "Your portal URL is uplift2026.vercel.app/[your-name] — for example, if your name is Jane Smith, your link is uplift2026.vercel.app/jane-smith. You should have received this link directly from the Uplift team.",
      },
      {
        q: "What's my login password?",
        a: "Your password is simply your first name, all lowercase. For example, if your name is Jane, your password is jane. If you're having trouble logging in, contact uplift@techunited.co.",
      },
      {
        q: "How do I confirm my participation in the program?",
        a: `On Week 1 of your portal, you'll see a "Confirm Your Participation" card at the top. Click "I Accept" to confirm. You must do this by Wednesday, June 3rd. Once confirmed, your onboarding milestone will be marked and your mentor will be revealed after you attend orientation.`,
      },
      {
        q: "When will I find out who my mentor is?",
        a: "Your mentor will be revealed in the Week 2 tab of your portal after you attend one of the onboarding sessions and the team has confirmed your attendance. No action is needed on your end — it will appear automatically.",
      },
    ],
  },
  {
    category: "Logging Mentor Sessions",
    icon: "🤝",
    questions: [
      {
        q: "How do I submit a mentor meeting?",
        a: `After each meeting with your mentor, submit your session report using the Typeform link found in your portal (look for the "Submit your meeting →" button on the relevant week tab, or under the "Logged Mentorship Sessions" tab). The form takes about 2 minutes to fill out.`,
      },
      {
        q: "My session isn't showing up — what do I do?",
        a: "Submissions may take up to 15 minutes to appear. If it's been longer than that, make sure you submitted the form completely (you should have received a confirmation screen from Typeform). If it's still missing, contact uplift@techunited.co.",
      },
      {
        q: "What counts as a verified session?",
        a: "A session is automatically verified if it was 60 minutes or longer AND you submitted a Granola transcript in the notes field. Sessions that don't meet both criteria are flagged for internal review — they still count, but require manual approval from the program team.",
      },
      {
        q: "What's a Granola transcript?",
        a: `Granola is a free AI meeting notes app (www.granola.so) that generates a transcript and summary of your meeting. You can paste the transcript or summary into the "Meeting Notes" field when submitting your session. Including it helps us verify the session automatically so you don't have to wait for manual review.`,
      },
      {
        q: `What does "Pending Review" mean on my session card?`,
        a: `It means your session didn't auto-qualify (either it was under 60 minutes or didn't include a transcript), so the program team is reviewing it manually. Don't worry — this is completely normal. If we need anything from you, we'll reach out directly. Pending sessions are not yet counted toward your milestones.`,
      },
      {
        q: `What does "Denied" mean?`,
        a: "A denied session means the program team reviewed it and was unable to verify it meets the program requirements. If you believe this is an error, please contact uplift@techunited.co and we'll look into it.",
      },
      {
        q: "How many mentor sessions do I need to complete the program?",
        a: "You need to complete a minimum of 3 hours with your mentor — at least one session per program checkpoint (Week 2, Week 5, and Week 7). Each submitted and verified session counts toward your milestone progress.",
      },
    ],
  },
  {
    category: "Educational Sessions",
    icon: "📚",
    questions: [
      {
        q: "How do I get credit for attending an educational session?",
        a: "Educational session attendance is manually verified by the program team and updated every Tuesday. Simply attend the session — you don't need to submit anything. If your attendance hasn't been updated within a week of the session, contact uplift@techunited.co.",
      },
      {
        q: "How many educational sessions do I need?",
        a: "You must attend a minimum of 3 virtual educational sessions by the end of the program (Week 7 is the last week to attend). These can be any combination of Expert Insight, Industry Q&A, or Peer Development sessions.",
      },
      {
        q: "What's the difference between Expert Insight, Industry Q&A, and Peer Development?",
        a: (
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 2 }}>
            <li><strong>Expert Insight</strong> — A structured fireside chat or lecture with a guest speaker. More presentation-driven; you can submit questions live.</li>
            <li><strong>Industry Q&A</strong> — An open, conversational session with a guest. More dialogue-focused; you'll have a genuine chance to ask questions and engage directly.</li>
            <li><strong>Peer Development</strong> — A hands-on workshop focused on your professional skills. Expect active participation and practical takeaways.</li>
          </ul>
        ),
      },
    ],
  },
  {
    category: "Milestones & Progress",
    icon: "🏆",
    questions: [
      {
        q: "Where can I see my overall progress?",
        a: `Click the "Milestones" tab in your portal. It shows a checklist of every program requirement — from confirming participation to completing mentor sessions and attending educational events.`,
      },
      {
        q: "Some of my milestones are checked but I haven't done them — is that normal?",
        a: "Some milestones (like mentor session verification) are updated automatically when you submit a qualifying session. Others (like educational session attendance) are updated manually by the team every Tuesday. If something looks wrong, reach out to uplift@techunited.co.",
      },
      {
        q: "What happens if I fall behind?",
        a: "The most important deadline is Week 4 — if you haven't had at least one mentor session by the end of Week 4, you're at risk of being removed from the program. If you're struggling to schedule time with your mentor or need support, reach out through the Support tab in your portal or email uplift@techunited.co right away.",
      },
    ],
  },
  {
    category: "Goals & Reflections",
    icon: "💡",
    questions: [
      {
        q: "Do I have to fill out the reflection prompts?",
        a: `Most reflection prompts are optional, but the Week 1 goals sense-check (under "Let's get specific about your goals") is required. We'll revisit your Week 1 answers at the end of the program so you can see how far you've come — so the more specific you are, the more meaningful that reflection will be.`,
      },
      {
        q: "Are my notes and reflections shared with my mentor?",
        a: "No — everything you write in the portal stays between you and the Uplift team. Your reflections and goal notes are private and are only visible to the internal team.",
      },
      {
        q: "Can I edit my responses after saving them?",
        a: "Yes. All text fields in the portal auto-save as you type and sync to our system. You can go back and update them at any time.",
      },
    ],
  },
  {
    category: "Technical & Support",
    icon: "🛠️",
    questions: [
      {
        q: "I can't log in to my portal — what do I do?",
        a: "Make sure you're using just your first name (lowercase) as the password, and that you're at the right URL. If you still can't get in, email uplift@techunited.co with your name and we'll send you your link.",
      },
      {
        q: "The page looks broken or something isn't loading.",
        a: "Try refreshing the page or clearing your browser cache. The portal works best on Chrome or Safari. If the issue persists, take a screenshot and send it to uplift@techunited.co.",
      },
      {
        q: "Who do I contact for help?",
        a: (
          <>
            For anything program-related, reach out to the team at{" "}
            <a href="mailto:uplift@techunited.co" style={{ color: "#5c4eb5", fontWeight: 600, textDecoration: "none" }}>
              uplift@techunited.co
            </a>. You can also use the Support tab inside your portal.
          </>
        ),
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: "1px solid #f0ecff",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          padding: "18px 4px", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1733", lineHeight: 1.4, flex: 1 }}>
          {q}
        </span>
        <span style={{
          fontSize: 18, color: "#5c4eb5", flexShrink: 0,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          lineHeight: 1,
        }}>
          +
        </span>
      </button>
      {open && (
        <div style={{
          padding: "0 4px 18px",
          fontSize: 14, color: "#4a4060", lineHeight: 1.75,
        }}>
          {typeof a === "string" ? <p style={{ margin: 0 }}>{a}</p> : a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(null);
  const visibleFAQs = activeCategory
    ? FAQS.filter(s => s.category === activeCategory)
    : FAQS;

  return (
    <>
      <Head>
        <title>FAQ · Uplift Summer 2026</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#f7f5ff", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1a0e4f 0%, #3d2f8a 60%, #5c4eb5 100%)",
          padding: "32px 32px 40px",
        }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <img src="/uplift-logo.png" alt="Uplift" style={{ height: 36, marginBottom: 20, display: "block" }} />
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
              Uplift Summer 2026
            </p>
            <h1 style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
              Participant FAQ
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
              Everything you need to know about using your Uplift portal and navigating the program.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 80px" }}>

          {/* Category filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: !activeCategory ? "2px solid #5c4eb5" : "1.5px solid #d4d0e8",
                background: !activeCategory ? "#5c4eb5" : "#fff",
                color: !activeCategory ? "#fff" : "#6b6480",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              All topics
            </button>
            {FAQS.map(({ category, icon }) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(active ? null : category)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: active ? "2px solid #5c4eb5" : "1.5px solid #d4d0e8",
                    background: active ? "#5c4eb5" : "#fff",
                    color: active ? "#fff" : "#6b6480",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  {icon} {category}
                </button>
              );
            })}
          </div>

          {/* FAQ sections */}
          {visibleFAQs.map(({ category, icon, questions }) => (
            <div key={category} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a1733" }}>{category}</h2>
              </div>
              <div style={{
                background: "#fff", borderRadius: 14, border: "1px solid #e8e4f5",
                padding: "0 22px",
              }}>
                {questions.map((item, i) => (
                  <FAQItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}

          {/* Still need help */}
          <div style={{
            background: "linear-gradient(135deg, #5c4eb5 0%, #3d2f8a 100%)",
            borderRadius: 14, padding: "28px 32px", color: "#fff", textAlign: "center",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 20 }}>💬</p>
            <p style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>Still have a question?</p>
            <p style={{ margin: "0 0 18px", fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
              The Uplift team is here to help. Reach out any time.
            </p>
            <a
              href="mailto:uplift@techunited.co"
              style={{
                display: "inline-block", padding: "11px 24px",
                background: "#fff", color: "#3d2f8a",
                borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}
            >
              uplift@techunited.co
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
