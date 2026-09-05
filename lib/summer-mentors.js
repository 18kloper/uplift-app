// Mentors who served in the Summer 2026 cohort, normalized for name matching.
// Generated from uplift-2026-mentors.csv. This is the "known to us" check in
// lib/mentor-verification.js — the valve that keeps the credibility score from
// punishing a good mentor who simply has a thin web presence.
export const SUMMER_2026_MENTORS = new Set([
  "aditisinha",
  "aizazshariff",
  "anandrai",
  "anatolenorland",
  "andrewjacobs",
  "brunobilik",
  "christinadorando",
  "claredenicola",
  "deemarshall",
  "dennisyuscavitch",
  "edsawma",
  "ericschmalzbauer",
  "feliciapalmer",
  "jeffreyallen",
  "jenniferdangelo",
  "jenniferjolley",
  "jessielee",
  "joemaruschak",
  "joespivack",
  "josegabrielcarrascoramirez",
  "jossyharrington",
  "kennethjones",
  "marcsaintulysse",
  "martycoleman",
  "michaelbaer",
  "miqueldequadras",
  "nataliekaminski",
  "orindavis",
  "rahulmehendale",
  "romantsibulevskiy",
  "stellaalvo",
  "stephenmakinen",
  "vishalgoyal",
  "vishalsoni",
  "wadnescastelly",
  "yurifiaschi"
]);

export const normalizeName = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
export const servedInSummer = (name) => SUMMER_2026_MENTORS.has(normalizeName(name));
