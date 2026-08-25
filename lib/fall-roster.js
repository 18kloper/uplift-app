// The fall roster, shared by the portal save path and both admin endpoints.
// The application-ingest build will grow this from accepted applicants; until
// then it is the three test founders.
export const FALL_SLUGS = ["kennedy", "hana", "mj"];

// One tab for every founder's portal inputs (pulse, Deep Work, wins, quiz,
// check-offs). Replaces the summer pattern of one sheet tab per person, which
// ballooned to 70+ tabs and made every bulk read a fan-out.
export const FALL_RESPONSES_TAB = "FallResponses";
export const FALL_RESPONSES_HEADERS = ["Slug", "Week", "Field Key", "Question", "Value", "Updated At"];
