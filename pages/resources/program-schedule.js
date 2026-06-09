// /resources/program-schedule
import ResourceLayout from "../../components/ResourceLayout";

export default function ProgramSchedule() {
  return (
    <ResourceLayout
      icon="🗓️"
      title="Uplift Program Schedule"
      subtitle="Key dates, milestones, and events — Summer 2026"
      badge="June 1 – August 4"
      timeline={[
        {
          week: "Week 1–2",
          dates: "June 1–13",
          title: "Kickoff & First Sessions",
          done: false,
          active: false,
          items: [
            "Mentor-mentee introductions via portal",
            "Schedule and complete your first 60-min session",
            "Review your mentee's goals and focus areas",
          ],
        },
        {
          week: "Week 3–4",
          dates: "June 30 – July 11",
          title: "Session 2 + Touchbase #1",
          done: false,
          active: true,
          items: [
            "Complete second mentorship session",
            "Touchbase #1 opens June 17 — closes June 25",
            "Mentors: optional pulse check form in your portal",
          ],
        },
        {
          week: "Week 5",
          dates: "July 14–18",
          title: "Midpoint Meetup",
          done: false,
          active: false,
          items: [
            "Uplift Midpoint Meetup — date TBD",
            "Mentee midpoint reflection form goes live",
            "Check in with your mentee — how are they feeling halfway through?",
          ],
        },
        {
          week: "Week 6–7",
          dates: "July 21 – August 1",
          title: "Third & Final Session",
          done: false,
          active: false,
          items: [
            "Complete your third (and minimum required) session",
            "Focus on next steps beyond the program — what are they doing with momentum?",
          ],
        },
        {
          week: "Week 8",
          dates: "August 4",
          title: "End of Program Sign-Off",
          done: false,
          active: false,
          items: [
            "Sign-off report unlocks in your portal — REQUIRED",
            "Complete mentor reflection and momentum check",
            "All sessions must be logged and approved by this date",
          ],
        },
        {
          week: "Week 10",
          dates: "August TBD",
          title: "Post-Program Pulse Check",
          done: false,
          active: false,
          items: [
            "Optional post-program reflection — sent after the program wraps up",
          ],
        },
      ]}
    />
  );
}
