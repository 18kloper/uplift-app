// /resources/mentor-credibility
//
// PUBLIC PAGE. Everything under /resources is ungated, so this deliberately
// publishes the standard and withholds the scoring key: what we verify, what
// the three tiers oblige us to do, and what we may come back and ask for.
// The numeric weights and flag names live in lib/mentor-verification.js and
// stay internal, because a published threshold is a published way around it.
import ResourceLayout from "../../components/ResourceLayout";

export default function MentorCredibility() {
  return (
    <ResourceLayout
      icon="🔎"
      title="How We Verify Mentors"
      subtitle="What we check before a mentor is matched with a founder, and why"
      badge="Fall 2026"
      sections={[
        {
          heading: "Why this exists",
          body: `Uplift asks founders to be candid with a stranger about the hardest parts of their company. That only works if we have done our homework on the stranger.

Every mentor application now gets a credibility review before anyone is matched. It is not a judgment of you as a person. It checks whether the specific things written on the application hold up, so that a founder sitting down for their first meeting is talking to who they think they are talking to.`,
        },
        {
          heading: "What we actually check",
          items: [
            "Identity — the LinkedIn profile you gave opens, and the name on it is yours",
            "Employer — the organization you named exists, and something connects you to it",
            "Role — the title you gave is corroborated somewhere other than the application itself",
            "Reachability — a New Jersey founder can realistically meet you, in a workable timezone",
            "Corroboration — any independent trace: press, a panel, a publication, an org roster",
            "Known to us — you have mentored for Uplift before, or someone we trust vouches for you",
          ],
        },
        {
          heading: "The three outcomes",
          body: `**Clear.** Everything holds up, or you have mentored for us before. Nothing more is asked of you and matching proceeds.

**Check.** Something is missing or unclear, usually a blank answer or a role we could not confirm. We will reach out personally, ask for the missing pieces, and confirm the rest adds up. This is a short conversation, and most people land here for boring reasons.

**Review.** Too little of the application could be confirmed. Before you meet a founder we will ask for a reference: someone credible who will vouch for you by name. This is not an accusation. It is what we owe the founder on the other side of the match.`,
        },
        {
          heading: "How to land in Clear without trying",
          items: [
            "Fill in both open-ended answers. Blank narrative answers are the single most common reason an application stalls.",
            "Give a real job title. \"Mentor\" or \"Advisor\" describes what you want to do here, not what you do.",
            "Name one employer rather than every affiliation you hold.",
            "Paste a LinkedIn URL that opens, and check it before you submit.",
            "Tell us where you are actually based, including the state.",
          ],
        },
        {
          heading: "Returning mentors",
          body: `If you mentored in a previous Uplift cohort, that counts for more than anything else on this page, and the review is designed to say so. A mentor we have already watched work with a founder is the most verified thing we have.

The returning application is deliberately short and does not ask again for your company, title, or LinkedIn. Leaving those blank is the form working correctly and will not count against you.`,
        },
        {
          heading: "A note on fairness",
          body: `This review scores claims, never people. Every check asks whether something asserted on the application turned out to be true, and an applicant who asserts little is treated neutrally rather than badly.

That distinction is deliberate. A standard built on how much the internet knows about someone would quietly penalize newer operators, people who work outside the English-language web, and anyone whose career happened away from a keyboard. Those are people Uplift exists to bring in, on both sides of the match.`,
        },
        {
          heading: "Questions",
          body: `If you think something was flagged in error, reply to whoever emailed you or write to uplift@techunited.co. A human reads it, and the review is a starting point for a conversation rather than a verdict.`,
        },
      ]}
    />
  );
}
