// Fall 2026 mentor-side data for the one-screen mentor view (/mentor/[slug]).
// Test entry: Jeanne McPhillips, from her real 2026-08-21 mentor application,
// mock-matched to the three test founders. The application-ingest build will
// grow this the same way it grows FALL_SLUGS.

export const FALL_MENTORS = [
  {
    slug: "jeanne",
    first: "Jeanne",
    last: "McPhillips",
    company: "SuperGirlls LLC",
    title: "Founder · Professor of Business Innovation, SCAD",
    location: "Spring Lake, NJ",
    linkedin: "https://www.linkedin.com/in/jeanne-mcphillips/",
    tier: "4-6 sessions",
    timePref: "Weekday mornings, weekends, flexible",
    method: "Phone, chat, in-person when feasible",
    focusAreas: ["Go-to-market", "Pitch & narrative", "Hiring & leadership"],
    give:
      "I want to bring practical, in-the-trenches marketing and brand-building guidance, the kind I use every day teaching business strategy in the classroom and applying it myself as a founder, podcast host, and author. Specifically, I can help founders sharpen their brand positioning and messaging, build a go-to-market and content strategy that doesn't require a big budget, prepare for media and public relations opportunities, and pressure-test their pitch and story before it goes in front of investors or customers. I also want to offer the candid, honest feedback that founders say is hardest to find elsewhere.",
    getOut:
      "I'm hoping to stay close to the real, current challenges founders are facing today so I can keep bringing fresh, relevant examples back into my classroom and my own business. Mentoring founders who are earlier in their journey also pushes me to stay sharp. Just as much, I'm looking forward to the community itself: connecting with other experienced operators and investors in the Uplift network, and being part of a program that's genuinely invested in expanding opportunity for women and underrepresented entrepreneurs in New Jersey's innovation economy.",
    menteeSlugs: ["kennedy", "hana", "mj"],
  },
];

export function getFallMentorBySlug(slug) {
  return FALL_MENTORS.find(m => m.slug === slug) || null;
}
