import { google } from "googleapis";

export const MILESTONE_KEYS = [
  "participation",
  "onboarding",
  "mentorMatched",
  "edu1",
  "edu2",
  "edu3",
  "mentorSession1",
  "mentorSession2",
  "mentorSession3",
  "midpoint",
  "endSurvey",
  "summit",
  "certificate",
];

export const MILESTONE_LABELS = {
  participation:   "Confirmed Participation",
  onboarding:      "Onboarding Session Attended",
  mentorMatched:   "Matched with a Mentor",
  edu1:            "Educational Session 1",
  edu2:            "Educational Session 2",
  edu3:            "Educational Session 3",
  mentorSession1:  "Mentor Session 1",
  mentorSession2:  "Mentor Session 2",
  mentorSession3:  "Mentor Session 3",
  midpoint:        "Midpoint Meetup Attended",
  endSurvey:       "End of Program Survey Completed",
  summit:          "Summit & Graduation Attended",
  certificate:     "Certificate Received",
};

export function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}
