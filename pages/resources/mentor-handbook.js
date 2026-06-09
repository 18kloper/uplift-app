// /resources/mentor-handbook
import ResourceLayout from "../../components/ResourceLayout";

export default function MentorHandbook() {
  return (
    <ResourceLayout
      icon="📄"
      title="Mentor Handbook"
      subtitle="Everything you need to know about being an Uplift mentor"
      badge="Summer 2026"
      sections={[
        {
          heading: "Welcome to Uplift",
          body: `You're part of something meaningful. Uplift is TechUnited NJ's founder mentorship program — connecting early-stage entrepreneurs across New Jersey with experienced operators, investors, and builders who've been where they are.

As a mentor, your role isn't to have all the answers. It's to ask better questions, share relevant experience, and help your mentee see their situation more clearly. Three sessions over 8 weeks can change how a founder thinks — and that compounds.`,
        },
        {
          heading: "Your Commitment",
          items: [
            "Minimum 3 sessions with your assigned mentee(s) — 60 minutes each",
            "Attend the midpoint meetup (TBD — check program schedule)",
            "Attend the Uplift Summit as available — our end-of-program celebration and demo day",
            "Respond to mentee messages within 3 business days",
            "Complete the end-of-program sign-off report (required)",
          ],
        },
        {
          heading: "What Great Mentorship Looks Like",
          items: [
            "Show up consistently — the relationship matters more than any single insight",
            "Ask about their goals before giving advice — understand before prescribing",
            "Share specific stories from your own journey, not just principles",
            "Challenge assumptions gently — 'have you considered...' goes further than 'you should...'",
            "Give permission to slow down — sometimes the best thing is helping them pause",
            "Follow up between sessions — a quick check-in text means a lot",
          ],
        },
        {
          heading: "What's Not Your Job",
          body: `You're not a co-founder, an investor, or an advisor-for-hire. You don't need to solve their problems — your job is to help them think more clearly so they can solve their own.

You're also not expected to know everything about their industry. Some of the best mentorship comes from someone who asks "why are you doing it that way?" without any preconceptions.`,
        },
        {
          heading: "Session Structure (Suggested)",
          items: [
            "Check-in (5 min) — how's it going, what's top of mind?",
            "Wins since last session (5 min) — celebrate forward momentum",
            "Main topic (40 min) — go deep on one thing vs. shallow on many",
            "Action items (5 min) — what will they do before next session?",
            "Feedback on the session (5 min) — was this useful? what would be more helpful?",
          ],
        },
        {
          heading: "This Cohort: What to Know",
          body: `**76 founders** across 8 industries — the largest Uplift cohort to date. 52% are women-led; 83% are pre-revenue. Most are first-time founders who have built something and are now stuck on what to do with it.

The single most common challenge across the cohort: **go-to-market**. Most founders have a product. Almost none have a repeatable engine for finding and converting customers. GTM, customer acquisition, and ICP definition will likely come up in your sessions regardless of your mentee's stated focus area.

The second most common challenge: **fundraising readiness** — specifically, not knowing what milestone makes them fundable or how to position for investor conversations.

Your mentee's profile in the portal shows their specific focus area, stage, and what they're working on. Start there.`,
        },
        {
          heading: "Getting Help",
          body: `If anything comes up — a difficult conversation, concerns about the match, scheduling issues, or anything else — reach out to the Uplift team via the portal's Support section or email kennedy@techunited.co directly. We respond within 1 business day.`,
        },
      ]}
    />
  );
}
