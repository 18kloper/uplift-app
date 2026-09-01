// The prompt library and the focus-area classifier, shared by both portals.
//
// Kept out of lib/mentees.js on purpose: the portal pages render prompts in
// the browser but only ever touch the roster inside getStaticPaths /
// getStaticProps. Importing prompts from here lets Next drop the roster from
// the client bundle, so 100+ founders' records stop shipping to anyone who
// loads a portal page. lib/mentees.js re-exports both names for the API
// routes that were already importing them from there.

// Prompt library keyed by focus area
export const PROMPTS = {
  "go-to-market": {
    theme: "Your go-to-market strategy",
    questions: [
      "Who is your ideal first customer, and why? What specific problem are you solving for them that no one else solves as well?",
      "What does your current customer acquisition process look like? Where does it break down, and what would \"working well\" look like in three months?",
      "What assumptions about your market or buyer have you not yet tested? What would change if one turned out to be wrong?",
    ],
  },
  "fundraising": {
    theme: "Your fundraising strategy",
    questions: [
      "Where are you in your fundraising journey right now? What have you tried, and what's the honest story of why it hasn't moved as fast as you'd like?",
      "What does a compelling investor conversation look like for your company? What questions do investors keep asking that you struggle to answer?",
      "What does your company need to demonstrate before investors will feel confident writing a check? How realistic is that milestone in the next 90 days?",
    ],
  },
  "pitch-narrative": {
    theme: "Your pitch & company narrative",
    questions: [
      "How do you currently describe your company to a stranger in two sentences? What part of that feels fuzzy or hard to explain?",
      "What's the core insight behind your company that most people don't yet see? How do you communicate it without losing the room?",
      "Think about the last time you pitched, what landed best, and what fell flat? What does that tell you about your narrative?",
    ],
  },
  "product-roadmap": {
    theme: "Your product strategy & roadmap",
    questions: [
      "What is the single most important problem your product solves today? Is that still the right problem to be solving?",
      "How do you currently make decisions about what to build next? What information do you have, and what do you wish you had?",
      "Where does user feedback end and your own vision begin? How do you balance what users ask for with what they actually need?",
    ],
  },
  "inflection-point": {
    theme: "Navigating your next inflection point",
    questions: [
      "What is the specific inflection point you're preparing for, a raise, a launch, a pivot, or an expansion? What does success look like?",
      "What are the two or three things that absolutely must go right for this transition to work? What would cause each one to fail?",
      "Who else has navigated a similar inflection point? What can you learn from them before you go through it yourself?",
    ],
  },
  "sounding-board": {
    theme: "Sense-checking your decisions",
    questions: [
      "What is the biggest decision you're wrestling with right now? What are you leaning toward, and what's making you hesitate?",
      "When you think about advice you've received so far, what's been most useful, and what have you most disagreed with?",
      "What would you do right now if you weren't afraid of being wrong? What's holding you back?",
    ],
  },
  "founder-decisions": {
    theme: "Founder decision-making & priorities",
    questions: [
      "What are the top three things on your plate right now? If you could only do one in the next 30 days, which would move the needle most? And what if you had 60 days?",
      "Where are you spending time that you know isn't the highest-leverage use of your energy? What would need to be true for you to stop?",
      "What does \"good progress\" look like for you at the end of this program? What do you want to be able to say you figured out?",
    ],
  },
  "hiring-leadership": {
    theme: "Hiring, team & leadership",
    questions: [
      "What does your team look like today, and what's the most critical role you need to fill or develop in the next three months?",
      "Where are you currently the bottleneck in your own organization? What would it take to change that?",
      "What kind of leader are you trying to become? What are the gaps between how you currently lead and how you want to lead?",
    ],
  },
  "operational-scaling": {
    theme: "Operational scaling & systems",
    questions: [
      "What part of your business runs on you personally, where your absence would cause things to break? What would it take to change that?",
      "What are the two or three operational bottlenecks that limit how fast you can grow right now?",
      "What does a well-run version of your company look like in 12 months? What systems need to exist that don't today?",
    ],
  },
  "nj-ecosystem": {
    theme: "Navigating the NJ startup ecosystem",
    questions: [
      "What do you know about the New Jersey startup ecosystem today, the resources, networks, investors? Where are the gaps?",
      "Who in NJ do you most want to connect with, founders, investors, operators, and what would make those relationships genuinely valuable?",
      "What would it mean for your company to be truly plugged into the local ecosystem? What does that look like in practice?",
    ],
  },
};

export function getFocusKey(focus) {
  const f = (focus || "").toLowerCase();
  if (f.includes("go-to-market") || f.includes("customer acq") || f.includes("business model") || f.includes("revenue gen")) return "go-to-market";
  if (f.includes("fundrais")) return "fundraising";
  if (f.includes("pitch") || f.includes("narrative")) return "pitch-narrative";
  if (f.includes("product") || f.includes("roadmap")) return "product-roadmap";
  if (f.includes("inflection") || f.includes("launch") || f.includes("pivot")) return "inflection-point";
  if (f.includes("sense-check") || f.includes("sounding board") || f.includes("operator")) return "sounding-board";
  if (f.includes("clarif") || f.includes("priorit") || f.includes("decision")) return "founder-decisions";
  if (f.includes("hiring") || f.includes("team") || f.includes("leadership")) return "hiring-leadership";
  if (f.includes("operat") || f.includes("scaling") || f.includes("systems")) return "operational-scaling";
  if (f.includes("ecosystem") || f.includes("nj") || f.includes("regional")) return "nj-ecosystem";
  return "sounding-board";
}
