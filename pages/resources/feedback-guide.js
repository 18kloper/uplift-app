// /resources/feedback-guide
import ResourceLayout from "../../components/ResourceLayout";

export default function FeedbackGuide() {
  return (
    <ResourceLayout
      icon="💡"
      title="How to Give Feedback to Founders"
      subtitle="Practical tips for feedback that actually lands"
      badge="Mentor Resource"
      sections={[
        {
          heading: "Why Founder Feedback Is Different",
          body: `Founders are deeply attached to their ideas — often in ways they don't even recognize. Their startup isn't a work project; for most of them, it's tied to their identity, their financial security, and years of effort.

This doesn't mean you should soften everything. It means you need to be precise. Vague encouragement and vague criticism are both useless. Specific, honest, contextual feedback is what actually helps.`,
        },
        {
          heading: "The Feedback That Sticks",
          items: [
            "Name the specific behavior or decision — not a general character trait",
            "Connect it to the outcome it's causing — 'when you do X, I notice Y'",
            "Ask permission before giving unsolicited feedback — 'can I share an observation?'",
            "Share what you'd do — not what they should do — 'when I was in a similar situation, I...'",
            "End with a question, not a directive — 'what do you think?'",
          ],
        },
        {
          heading: "The SBI Framework",
          body: `A simple structure that keeps feedback grounded:

**Situation** — describe the specific context
"In our last session, when we were talking about your pricing model..."

**Behavior** — describe what you observed, not your interpretation
"...you kept redirecting the conversation away from the numbers..."

**Impact** — share the effect, including on you
"...which made me wonder if there's something uncomfortable there. It also made it hard for me to give you useful input."

Then open it up: "Does that match what you were experiencing?"`,
        },
        {
          heading: "Hard Things Worth Saying",
          items: [
            "'I'm not sure the market is big enough for this to be a venture-backable business — have you thought about what it could be otherwise?'",
            "'You keep describing this as a distribution problem, but I think the product itself might need more work first.'",
            "'You're talking about hiring but you don't have revenue yet — I'd want to understand that decision more.'",
            "'The story you're telling investors doesn't match what you're actually building. Let's fix that.'",
            "'I'm noticing you seem exhausted. Is this still something you want to be doing?'",
          ],
        },
        {
          heading: "Feedback Timing",
          body: `Give feedback close to the observation — not three sessions later. And pick your moment: the middle of a crisis is not the time for structural feedback. When they're overwhelmed, what they need is acknowledgment first, perspective second.

A good rule: one hard thing per session. Going deeper on one issue beats spraying feedback on five.`,
        },
        {
          heading: "What Founders Actually Hear",
          items: [
            "Praise without specifics = polite noise",
            "'You should pivot' = panic (unless delivered with full context)",
            "'Have you thought about...' = a safe invitation to explore",
            "'When I was in your position...' = someone who actually gets it",
            "'What does your gut tell you?' = permission to trust themselves",
          ],
        },
        {
          heading: "When to Push, When to Support",
          body: `The hardest skill in mentorship is reading the room. Some sessions, a founder needs a thinking partner who will challenge every assumption. Other sessions, they've had a brutal week and just need someone to say "this is hard, and you're doing the right things."

If you're not sure which mode to be in, ask: "Do you want me to push on this, or do you need support right now?" Most founders will tell you exactly what they need.`,
        },
      ]}
    />
  );
}
