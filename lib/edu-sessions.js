// The 22 Fall 2026 educational sessions: the canonical list.
//
// Used by the Luma sync (pages/api/admin/fall-sessions.js), the speaker
// application form generator (scripts/create-speaker-form.mjs), and the
// speaker review board (pages/api/admin/speaker-applications.js).
//
// pages/fall/[mentee].js still carries its own copy for founders. If a date
// moves, change it here AND there.
//
// sessionLabel() must keep producing the exact strings used as date choices in
// the live speaker Typeform (uUjnsoDm), or approved speakers stop mapping to
// slots. Re-run the form script after changing it.

export const EDU_SESSIONS = [
  { n: 1,  day: "Fri Sept 11", time: "12:30 PM", slug: "techun-lfmg" },
  { n: 2,  day: "Mon Sept 14", time: "12:30 PM", slug: "3qg5eegx" },
  { n: 3,  day: "Tue Sept 15", time: "5:30 PM",  slug: "vxh6h310" },
  { n: 4,  day: "Fri Sept 18", time: "12:30 PM", slug: "smzvhwxk" },
  { n: 5,  day: "Mon Sept 21", time: "12:30 PM", slug: "zkb2rc8p" },
  { n: 6,  day: "Tue Sept 22", time: "5:30 PM",  slug: "de3y5zeu" },
  { n: 7,  day: "Fri Sept 25", time: "12:30 PM", slug: "k1mvgwvs" },
  { n: 8,  day: "Mon Sept 28", time: "12:30 PM", slug: "pidrg7sw" },
  { n: 9,  day: "Tue Sept 29", time: "5:30 PM",  slug: "bruqh9hf" },
  { n: 10, day: "Fri Oct 2",   time: "12:30 PM", slug: "rjxdyml0" },
  { n: 11, day: "Mon Oct 5",   time: "12:30 PM", slug: "7ajm07pv" },
  { n: 12, day: "Tue Oct 6",   time: "5:30 PM",  slug: "6fqmptfu" },
  { n: 13, day: "Fri Oct 9",   time: "12:30 PM", slug: "872810d3" },
  { n: 14, day: "Mon Oct 12",  time: "12:30 PM", slug: "g2j1tlk4" },
  { n: 15, day: "Fri Oct 16",  time: "12:30 PM", slug: "mbjuraiq" },
  { n: 16, day: "Mon Oct 19",  time: "12:30 PM", slug: "6droguib" },
  { n: 17, day: "Tue Oct 20",  time: "5:30 PM",  slug: "krpytz6i" },
  { n: 18, day: "Tue Oct 20",  time: "5:30 PM",  slug: "hbm2pxfg" },
  { n: 19, day: "Wed Oct 21",  time: "12:30 PM", slug: "widxhy78" },
  { n: 20, day: "Fri Oct 23",  time: "5:30 PM",  slug: "s012hqvf" },
  { n: 21, day: "Tue Nov 3",   time: "5:30 PM",  slug: "c5o9r8zg" },
  { n: 22, day: "Wed Nov 4",   time: "12:30 PM", slug: "b7bf0c6h" },
];

export const sessionLabel = (s) => `Session ${s.n} · ${s.day} · ${s.time} ET`;

// "Session 7 · Fri Sept 25 · 12:30 PM ET" -> 7. Returns null for the
// "Any of these work" choice and for anything unrecognized.
export function sessionNumberFromLabel(label) {
  const m = /^Session (\d+)\b/.exec((label || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return EDU_SESSIONS.some(s => s.n === n) ? n : null;
}
