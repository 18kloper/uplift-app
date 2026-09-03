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

// What a founder offers, against what the others are asking for. The search
// re-scores the same rooms thousands of times, so the keyword pass is cached
// per founder object rather than redone on every candidate swap — this is the
// difference between a second of work and a few milliseconds.
const givesCache = new WeakMap();
const getsCache = new WeakMap();

function givesOf(founder) {
  let v = givesCache.get(founder);
  if (!v) {
    v = keywordsOfText(`${founder.brings || ""} ${founder.title || ""}`);
    givesCache.set(founder, v);
  }
  return v;
}
function getsOf(founder) {
  let v = getsCache.get(founder);
  if (!v) {
    v = keywordsOfText(`${founder.hoping || ""} ${founder.valueSought || ""} ${founder.primaryFocus || ""} ${(founder.topics || []).join(" ")}`);
    getsCache.set(founder, v);
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

  // Reciprocity: how many members have somebody else here who brings what
  // they are looking for
  const gives = members.map(givesOf);
  const gets = members.map(getsOf);
  let served = 0;
  for (let i = 0; i < members.length; i++) {
    const need = gets[i];
    if (!need.length) continue;
    const met = members.some((_, j) => j !== i && gives[j].some(g => need.includes(g)));
    if (met) served++;
  }
  const reciprocal = members.length ? served / members.length : 0;

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
    meetable, bestWindow, stageSpread, reciprocal,
    industryDupes: indDupes, focusDupes, siblings,
    parts,
  };
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
