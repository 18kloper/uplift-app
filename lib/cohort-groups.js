// ─── Breaking the cohort into five peer groups ───────────────────────────────
//
// Mentors give a founder expertise. Peer groups give them company, which is a
// different good and it fails for different reasons. A peer room works when
// the problems in it rhyme, when the people in it can actually all show up,
// and when somebody present has already solved what somebody else is stuck
// on. It fails when it is nine people at nine different altitudes, when half
// of them cannot make the time, or when it is nine founders who all need the
// same thing and none of them can give it.
//
// So the grouping is decided on four things, in this order of weight:
//
//   1. Can they meet?      A group with no common window never convenes, and
//                          then nothing else about it matters. Hard-weighted.
//   2. Stage proximity     Peer value comes from facing comparable problems at
//                          the same time. An idea-stage founder and a
//                          growth-stage founder produce mentoring, not peer
//                          exchange. Rooms should span one stage, not four.
//   3. Reciprocity         What each founder says they bring, against what the
//                          others say they need. This is what makes a room
//                          generative instead of merely similar, and it is the
//                          "gives and gets" axis.
//   4. Spread of industry  Fresh perspective, and it keeps direct competitors
//      and of need         out of the same room. Pairs are good — shared
//                          context — three or more of anything is not.
//
// Deliberately NOT region. The fall sessions are virtual, a third of the
// county fields are blank, and grouping by geography would fight stage for no
// gain. Geography would only earn its place if these rooms met in person.

import { keywordsOfText } from "./cohort-matching.js";

// Named for the onboarding slots, in the same order.
export const COHORT_NAMES = ["Edison", "Hopper", "Bardeen", "Lawrence", "Morrison"];

// The one ordered axis in the data. Everything else is categorical.
const STAGE_ORDER = [
  [/idea/i, 1],
  [/mvp|early build/i, 2],
  [/early traction/i, 3],
  [/revenue.generating/i, 4],
  [/growth/i, 5],
];

export function stageRank(stage) {
  const s = String(stage || "");
  for (const [re, n] of STAGE_ORDER) if (re.test(s)) return n;
  return 0; // unknown: floats freely rather than dragging a room's spread
}

export const STAGE_LABEL = { 0: "unstated", 1: "Idea", 2: "MVP", 3: "Early traction", 4: "Revenue", 5: "Growth" };

// The stages present in a room, earliest first, so a room reads as a band.
export function stageBandOf(members) {
  const ranks = [...new Set(members.map(m => stageRank(m.stage)))].sort((a, b) => a - b);
  return ranks.map(r => STAGE_LABEL[r]).join(" + ");
}

// The four windows a group could meet in. "Flexible" counts for all of them,
// which is the point of saying it.
const WINDOWS = ["morning", "afternoon", "evening", "weekend"];

export function windowsFor(founder) {
  const text = (founder.timePref || []).join(" ").toLowerCase();
  if (!text) return [];
  if (text.includes("flexible") || text.includes("no preference")) return [...WINDOWS];
  return WINDOWS.filter(w => text.includes(w));
}

// "Other:" is what people pick when none of the options fit, so it is an
// absence of information rather than an industry eleven founders share.
function industryOf(founder) {
  const v = String(founder.industry || "").trim();
  return !v || /^other/i.test(v) ? null : v;
}

// ─── What a founder can actually offer a peer ────────────────────────────────
//
// The first version of this read the "what will you bring to the mentorship"
// free text, and it was the wrong field. That question is about the mentor
// relationship, so founders answered about their own coachability — "a
// sponge-like willingness to learn", "energy and curiosity", "openness to
// candid feedback". Real answers to a different question. Matching keywords
// across them produced a reciprocity number of 78% on a room whose evidence
// column was empty, which is worse than no number at all.
//
// So reciprocity is built on what a founder has demonstrably already done,
// against what another founder says they are trying to do. Those are both
// facts in the application rather than sentiments about it, and the result
// explains itself in a sentence: somebody who has raised outside capital, in
// a room with somebody working on fundraising readiness.
const CAPABILITIES = [
  ["raised", "has raised outside capital", (m) => m.snapshot?.priorCapital === true],
  ["revenue", "has paying customers", (m) => m.snapshot?.generatingRevenue === true],
  ["hired", "has employees", (m) => m.snapshot?.employees === true],
  ["accelerator", "has been through an accelerator", (m) => /^yes/i.test(String(m.priorProgram || ""))],
  ["traction", "has users or early customers", (m) => stageRank(m.stage) >= 3],
  ["scaled", "has scaled a team and operations", (m) => stageRank(m.stage) >= 5],
];

// Which of those a founder's stated focus would benefit from.
const NEEDS = [
  [/fundrais|investor|pitch|narrative|inflection/i, ["raised", "accelerator"]],
  [/go-to-market|customer acquisition/i, ["revenue", "traction"]],
  [/hiring|team structure|leadership/i, ["hired"]],
  [/operational scaling|systems/i, ["scaled", "hired", "revenue"]],
  [/product strategy|roadmap/i, ["traction"]],
  [/near-term|priorities/i, ["accelerator", "traction"]],
  [/ecosystem/i, ["accelerator"]],
  [/sense-check|experienced operator/i, ["revenue", "hired"]],
];

const capsCache = new WeakMap();
const needsCache = new WeakMap();

// What this founder has done, as keys plus the phrase that says it.
export function capabilitiesOf(founder) {
  let v = capsCache.get(founder);
  if (!v) {
    v = CAPABILITIES.filter(([, , test]) => test(founder)).map(([key, label]) => ({ key, label }));
    capsCache.set(founder, v);
  }
  return v;
}

// What this founder is trying to do, as the capability keys that would help.
export function needsOf(founder) {
  let v = needsCache.get(founder);
  if (!v) {
    const text = `${founder.primaryFocus || ""} ${(founder.topics || []).join(" ")}`;
    const keys = new Set();
    for (const [re, wants] of NEEDS) if (re.test(text)) wants.forEach(w => keys.add(w));
    v = [...keys];
    needsCache.set(founder, v);
  }
  return v;
}

const windowsCache = new WeakMap();
function windowsCached(founder) {
  let v = windowsCache.get(founder);
  if (!v) { v = windowsFor(founder); windowsCache.set(founder, v); }
  return v;
}

// ─── What a good set of rooms looks like, as a number ────────────────────────
// Weights are ordered, not tuned to three decimal places: a room that cannot
// meet is worse than a room with a wide stage spread, which is worse than a
// room short on reciprocity, which is worse than one heavy on a single
// industry. The scoreCohort breakdown is rendered in the admin so the trade
// each room is making is visible rather than asserted.
const W_MEETABLE = 40;   // fraction of the room that shares its best window
const W_STAGE = 14;      // per stage of spread beyond one
const W_RECIP = 10;      // fraction of members whose need somebody here meets
const W_INDUSTRY = 4;    // per founder beyond the second in one industry
const W_FOCUS = 3;       // per founder beyond the third needing the same thing
const W_SIBLING = 8;     // two founders who share a mentor, in one room

export function scoreCohort(members) {
  if (members.length === 0) return { total: 0, meetable: 0, bestWindow: null, stageSpread: 0, reciprocal: 0, parts: {} };

  // Can they meet, and when
  const counts = WINDOWS.map(w => members.filter(m => windowsCached(m).includes(w)).length);
  const best = Math.max(...counts);
  const bestWindow = WINDOWS[counts.indexOf(best)];
  const meetable = best / members.length;

  // Stage proximity
  const ranks = members.map(m => stageRank(m.stage)).filter(r => r > 0);
  const stageSpread = ranks.length ? Math.max(...ranks) - Math.min(...ranks) : 0;

  // Reciprocity, measured as density rather than coverage. "Does anybody here
  // have what this founder needs" turns out to be true for everybody in every
  // arrangement, so it cannot tell two arrangements apart. How MANY people in
  // the room have already done what a given founder is working on does, and it
  // is the more honest quantity anyway: one person who has raised in a room of
  // nine is not the same as four. Founders who stated no focus sit out of the
  // denominator rather than counting as unserved.
  const caps = members.map(m => capabilitiesOf(m).map(c => c.key));
  const needs = members.map(needsOf);
  let asked = 0, edges = 0;
  for (let i = 0; i < members.length; i++) {
    if (!needs[i].length) continue;
    asked++;
    for (let j = 0; j < members.length; j++) {
      if (j === i) continue;
      if (caps[j].some(c => needs[i].includes(c))) edges++;
    }
  }
  const avgHelpers = asked ? edges / asked : 0;
  const reciprocal = asked && members.length > 1 ? edges / (asked * (members.length - 1)) : 0;

  // Concentration
  const tally = (vals) => vals.reduce((acc, v) => (v ? (acc[v] = (acc[v] || 0) + 1, acc) : acc), {});
  const indDupes = Object.values(tally(members.map(industryOf))).reduce((n, c) => n + Math.max(0, c - 2), 0);
  const focusDupes = Object.values(tally(members.map(m => m.primaryFocus))).reduce((n, c) => n + Math.max(0, c - 3), 0);

  // Two founders sharing one mentor learn more in different rooms
  const mentors = tally(members.map(m => m.matchedMentorId));
  const siblings = Object.values(mentors).reduce((n, c) => n + Math.max(0, c - 1), 0);

  const parts = {
    meetable: W_MEETABLE * meetable,
    stage: -W_STAGE * Math.max(0, stageSpread - 1),
    reciprocity: W_RECIP * reciprocal,
    industry: -W_INDUSTRY * indDupes,
    focus: -W_FOCUS * focusDupes,
    siblings: -W_SIBLING * siblings,
  };
  return {
    total: Object.values(parts).reduce((a, b) => a + b, 0),
    meetable, bestWindow, stageSpread, reciprocal, avgHelpers,
    industryDupes: indDupes, focusDupes, siblings,
    parts,
  };
}

// ─── Why this founder is in this room ────────────────────────────────────────
// The four factors are legible as a set of rules but invisible on any single
// person, and reciprocity worst of all: it is the factor doing the most work
// and the one you cannot see by reading a table of applications. So say it per
// founder — their stage against the room's band, whether they can actually
// make the window the room meets in, and by name who here they can help and
// who here can help them.
export function explainMember(members, index) {
  const me = members[index];
  const score = scoreCohort(members);
  const myWindows = windowsCached(me);
  const myCaps = capabilitiesOf(me);
  const myNeeds = needsOf(me);

  const helps = [];
  const helpedBy = [];
  members.forEach((other, j) => {
    if (j === index) return;
    const theirNeeds = needsOf(other);
    const theirCaps = capabilitiesOf(other);
    const iCanHelp = myCaps.filter(c => theirNeeds.includes(c.key));
    const theyCanHelp = theirCaps.filter(c => myNeeds.includes(c.key));
    if (iCanHelp.length) helps.push({ person: other, on: iCanHelp.map(c => c.label) });
    if (theyCanHelp.length) helpedBy.push({ person: other, on: theyCanHelp.map(c => c.label) });
  });

  const ranks = members.map(m => stageRank(m.stage)).filter(r => r > 0);
  const modal = [...ranks].sort((a, b) =>
    ranks.filter(r => r === b).length - ranks.filter(r => r === a).length)[0];

  return {
    stage: STAGE_LABEL[stageRank(me.stage)],
    stageIsModal: stageRank(me.stage) === modal,
    canMakeWindow: myWindows.includes(score.bestWindow),
    flexible: myWindows.length === 4,
    capabilities: myCaps.map(c => c.label),
    statedNoFocus: myNeeds.length === 0,
    helps, helpedBy,
  };
}

// ─── The blurb ───────────────────────────────────────────────────────────────
//
// Each room needs a paragraph that can go to the founders in it and into a
// funder report without being rewritten: why these nine are together, in
// language a person would use. So it is composed from the same facts the
// grouping was decided on, and it says the honest thing in each case rather
// than the flattering one. A room of idea-stage founders is not "rich in peer
// expertise" and should not claim to be — its value is that everybody is at
// the same starting line, which is a real and different thing.

// What the room is collectively in the middle of, by the stages present.
const MOMENT = {
  1: "shaping an idea into something real",
  2: "building the first working version of a product",
  3: "putting a product in front of its first real users",
  4: "past first revenue and working out how to grow it",
  5: "scaling a team and an operation",
};

function momentPhrase(members) {
  const ranks = members.map(m => stageRank(m.stage)).filter(Boolean);
  const present = [...new Set(ranks)].sort((a, b) => a - b);
  if (!present.length) return { lead: "building something", tail: "" };
  if (present.length === 1) return { lead: MOMENT[present[0]], tail: "" };
  const low = present[0], high = present[present.length - 1];
  const nHigh = ranks.filter(r => r === high).length;
  const nLow = ranks.filter(r => r === low).length;
  // Lead with whichever the room mostly is, and name the other as the minority
  // it actually is, rather than welding two phrases together with "and".
  return nLow >= nHigh
    ? { lead: MOMENT[low], tail: `, and ${nHigh === 1 ? "one of them is" : `${nHigh} of them are`} a step beyond that, ${MOMENT[high]}` }
    : { lead: MOMENT[high], tail: `, with ${nLow === 1 ? "one" : nLow} still ${MOMENT[low]}` };
}

const WINDOW_PHRASE = {
  morning: "weekday mornings",
  afternoon: "weekday afternoons",
  evening: "weekday evenings",
  weekend: "weekends",
};

function listOf(items, joiner = "and") {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} ${joiner} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items[items.length - 1]}`;
}

// External-facing, no scores, no percentages presented as algorithm output.
export function blurbFor(members, name) {
  if (!members.length) return "";
  const score = scoreCohort(members);
  const n = members.length;

  const industries = [...new Set(members.map(m => {
    const v = String(m.industry || "").trim();
    return !v || /^other/i.test(v) ? null : v.split(" /")[0];
  }).filter(Boolean))];

  const have = (key) => members.filter(m => capabilitiesOf(m).some(c => c.key === key)).length;
  const marks = [
    [have("revenue"), "is already generating revenue", "are already generating revenue"],
    [have("raised"), "has raised outside capital", "have raised outside capital"],
    [have("hired"), "has people on payroll", "have people on payroll"],
    [have("accelerator"), "has been through a programme like this before", "have been through a programme like this before"],
  ].filter(([count]) => count > 0)
   .map(([count, one, many]) => `${count === 1 ? "one" : count} ${count === 1 ? one : many}`);

  const focusCounts = members.reduce((acc, m) => {
    const f = m.primaryFocus;
    if (f) acc[f] = (acc[f] || 0) + 1;
    return acc;
  }, {});
  const topFocus = Object.entries(focusCounts).sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([f]) => f.replace(/\s*&\s*/g, " and ").toLowerCase());

  const sentences = [];

  const moment = momentPhrase(members);
  sentences.push(
    `${name} is ${n} founders at roughly the same point: ${moment.lead}${moment.tail}.`
  );

  if (industries.length >= 3) {
    sentences.push(
      `They come from ${industries.length} different fields — ${listOf(industries)} — which is deliberate. The problems of this stage are shared, but nobody in the room is competing with anybody else in it, so the conversation can be specific without being guarded.`
    );
  } else if (industries.length) {
    sentences.push(
      `They work in ${listOf(industries)}, and no two of them are competing with each other, so the conversation can be specific without being guarded.`
    );
  }

  // These labels contain their own "and", so joining two of them with another
  // "and" reads as one long noun. Name the first and subordinate the second.
  if (topFocus.length === 1) {
    sentences.push(`What they are asking for clusters around ${topFocus[0]}.`);
  } else if (topFocus.length > 1) {
    sentences.push(`What they are asking for clusters around ${topFocus[0]}, with ${topFocus[1]} close behind.`);
  }

  // The honest half. A room with real operating experience in it says so; a
  // room without any does not pretend, because its value is a different one.
  if (score.avgHelpers >= 3 && marks.length) {
    sentences.push(
      `And they are not all asking from the same place: ${listOf(marks)}. Most questions raised in this room already have somebody sitting in it who has answered them once.`
    );
  } else if (marks.length) {
    sentences.push(
      `A few are further along — ${listOf(marks)} — but this is mostly a room of people at the same starting line. That is the point of it: it is easier to be honest about what you have not figured out yet among people who have not figured it out either, and this group will get more out of a facilitated conversation than out of waiting for a peer to have the answer.`
    );
  } else {
    sentences.push(
      `None of them has raised, hired or sold yet, which makes this a room of people at the same starting line. That is the point of it: it is easier to be honest about what you have not figured out yet among people who have not figured it out either, and this group will get more out of a facilitated conversation than out of waiting for a peer to have the answer.`
    );
  }

  const w = WINDOW_PHRASE[score.bestWindow] || score.bestWindow;
  sentences.push(
    score.meetable === 1
      ? `Every one of them is free ${w}, which is when the room meets.`
      : `${Math.round(score.meetable * n)} of the ${n} are free ${w}, which is when the room meets.`
  );

  return sentences.join(" ");
}

// ─── Building the rooms ──────────────────────────────────────────────────────
// Seeded by stage so every room starts coherent on the one axis that has an
// order, then improved by swapping people between rooms for as long as the set
// of rooms gets better. Sizes stay within one of each other throughout, so no
// room is ever a rump. Deterministic: same input, same rooms, every time.
export function buildGroups(founders, { count = 5, names = COHORT_NAMES } = {}) {
  const n = founders.length;
  if (!n) return { groups: [], total: 0, passes: 0 };

  const sizes = Array.from({ length: count }, (_, i) => Math.floor(n / count) + (i < n % count ? 1 : 0));

  // Seed: stage-sorted, then cut into contiguous bands, so each room opens
  // spanning one or two adjacent stages. Ties broken by id for determinism.
  const sorted = [...founders].sort((a, b) =>
    stageRank(a.stage) - stageRank(b.stage) || String(a.id).localeCompare(String(b.id)));
  const groups = [];
  let at = 0;
  for (let g = 0; g < count; g++) {
    groups.push(sorted.slice(at, at + sizes[g]));
    at += sizes[g];
  }

  const scoreAll = (gs) => gs.reduce((sum, m) => sum + scoreCohort(m).total, 0);
  let total = scoreAll(groups);

  // Best-improvement pairwise swaps. Swapping keeps every size fixed, so the
  // balance constraint holds for free.
  let passes = 0;
  for (; passes < 60; passes++) {
    let bestGain = 1e-9, move = null;
    for (let g1 = 0; g1 < count; g1++) {
      for (let g2 = g1 + 1; g2 < count; g2++) {
        const base = scoreCohort(groups[g1]).total + scoreCohort(groups[g2]).total;
        for (let i = 0; i < groups[g1].length; i++) {
          for (let j = 0; j < groups[g2].length; j++) {
            const a = [...groups[g1]], b = [...groups[g2]];
            [a[i], b[j]] = [b[j], a[i]];
            const gain = scoreCohort(a).total + scoreCohort(b).total - base;
            if (gain > bestGain) { bestGain = gain; move = { g1, g2, i, j }; }
          }
        }
      }
    }
    if (!move) break;
    const { g1, g2, i, j } = move;
    const tmp = groups[g1][i];
    groups[g1][i] = groups[g2][j];
    groups[g2][j] = tmp;
    total += bestGain;
  }

  // Name the rooms in stage order, earliest first, so the list reads as a
  // progression rather than an arbitrary shuffle.
  const withScores = groups
    .map(members => ({ members, score: scoreCohort(members) }))
    .sort((x, y) => {
      const rx = x.members.map(m => stageRank(m.stage)).filter(Boolean);
      const ry = y.members.map(m => stageRank(m.stage)).filter(Boolean);
      const avg = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 99;
      return avg(rx) - avg(ry);
    })
    .map((g, i) => ({ name: names[i] || `Cohort ${i + 1}`, ...g }));

  return { groups: withScores, total: scoreAll(groups), passes };
}
