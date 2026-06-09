// /resources/first-meeting
import ResourceLayout from "../../components/ResourceLayout";

export default function FirstMeeting() {
  return (
    <ResourceLayout
      icon="🤝"
      title="First Meeting Framework"
      subtitle="A structured guide to running a great first session"
      badge="Session Guide"
      sections={[
        {
          heading: "Before You Meet",
          items: [
            "Review your mentee's profile in the portal — their focus area, industry, stage, and what they're stuck on",
            "Skim their LinkedIn if available — understand their background before they explain it",
            "Come with 2–3 open questions ready, not advice",
            "Set aside 60 uninterrupted minutes",
          ],
        },
        {
          heading: "Opening (5–10 min): Get Oriented",
          body: `Start by making them comfortable — this might be their first mentor relationship. Briefly introduce yourself: who you are, what you've built or worked on, and why you wanted to mentor.

Then hand it to them: "Tell me about what you're building and where you are right now."`,
        },
        {
          heading: "The Core Questions (20–25 min)",
          items: [
            "What does success look like for you at the end of this program?",
            "What's the one thing you're most uncertain about right now?",
            "What have you already tried? What worked, what didn't?",
            "Where do you feel most stuck — and why do you think that is?",
            "Is there something you haven't told anyone yet that's weighing on you about the business?",
          ],
        },
        {
          heading: "Alignment (10 min): Set the Relationship Up",
          body: `Before you go deep on advice, align on how you'll work together:

• How do you prefer to communicate between sessions? (Text, email, Slack?)
• Do you want me to challenge you directly, or do you prefer I ask more questions?
• What would make this mentorship feel like a waste of your time? (Useful to know!)
• Is there anything that's off-limits for you right now?

This conversation prevents a lot of future friction.`,
        },
        {
          heading: "Going Deep (15–20 min): Pick One Thing",
          body: `Resist the urge to solve everything. Pick the one issue that seems most urgent or most foundational, and go deep on it.

A good depth question: "If you resolved this one thing, what would become possible?"

You don't need to have the answer — sometimes the most valuable thing is helping them think through it out loud.`,
        },
        {
          heading: "Close (5 min): Clear Next Steps",
          items: [
            "Summarize what you discussed and what stood out to you",
            "Agree on 1–2 concrete things they'll do before the next session",
            "Schedule the next session before you hang up — don't leave it open",
            "Ask: 'Was this useful? What would make the next session even better?'",
          ],
        },
        {
          heading: "After the Session",
          body: `Send a short follow-up message — even just 2 sentences. Something like: "Great meeting you today. I'm thinking about [specific thing they mentioned] — let me know how it goes."

This signals that you were listening and you care. It takes 30 seconds and matters more than you'd expect.`,
        },
        {
          heading: "What This Cohort Is Working On",
          body: `Based on what founders shared in their onboarding reflections, the most common themes across this cohort are:

**Securing first paying customers** — The dominant goal. Most want 2–10 paying customers to validate market demand. Many are stuck relying on warm intros and referrals that don't scale.

**ICP uncertainty** — Founders know roughly who their customer is, but aren't confident they've identified the right segment, the right buyer persona, or whether those buyers have actual budget authority.

**Untested assumptions** — Many have never validated whether customers will actually pay, what price point works, or whether the product solves a problem people prioritize.

**Fundraising readiness** — The second most common focus. Founders are preparing for conversations but uncertain on timing, which investors to approach, and what milestone makes them "ready."

Use this as context — not a script. Your mentee may have different priorities. Let them tell you what's most urgent.`,
        },
        {
          heading: "Common First-Session Traps",
          items: [
            "Jumping to advice before understanding the full picture",
            "Spending the whole session on backstory — push toward present-day challenges",
            "Overpromising your availability or expertise",
            "Letting them defer all decision-making to you — push it back",
            "Not scheduling the next session before ending",
          ],
        },
      ]}
    />
  );
}
