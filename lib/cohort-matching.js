// ─── Match scoring + whole-cohort assignment ─────────────────────────────────
//
// Two different questions live in here, and they have different answers.
//
//   scoreMentor(mentee, mentor)     "how good is THIS pair?"
//   recommendFor(ctx, menteeId)     "which pick is best for the whole cohort?"
//
// The second exists because the first is not enough. Working down the waiting
// list newest-first and handing each founder their own best available mentor
// is greedy: it is optimal for whoever you happen to serve first, and it
// quietly spends other people's options. A founder with ten excellent mentors
// and a founder with exactly one can both want the same person, and if the
// founder with ten gets there first, the other drops to a poor match for no
// gain to anybody.
//
// So every recommendation here is scored by re-solving the entire cohort with
// that one pairing locked in. The number that ranks a mentor is not the pair's
// score, it is what the cohort looks like afterwards — and because the plan is
// re-solved, we can say exactly which other founders a click would cost.

const FOCUS_KEYWORDS = ["go-to-market", "customer", "pitch", "narrative", "hiring", "leadership", "fundraising", "investor", "operational", "operations", "scaling", "product", "priorities", "strategy", "sounding board", "inflection", "brand", "marketing"];
const STOPWORDS = new Set(["that", "this", "with", "have", "from", "they", "them", "will", "want", "hope", "hoping", "their", "would", "about", "more", "some", "what", "when", "your", "like", "just", "very", "into", "then", "than", "been", "being", "over", "also", "help", "make", "take"]);

function keywordsOf(list) {
  const text = (Array.isArray(list) ? list : [list]).filter(Boolean).join(" ").toLowerCase();
  return FOCUS_KEYWORDS.filter(k => text.includes(k));
}

export function tierBand(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("7-10")) return 3;
  if (t.includes("4-6")) return 2;
  if (t.includes("minimum") || t.includes("3")) return 1;
  return 0;
}

function meaningfulWords(text) {
  return new Set(String(text || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter(w => w.length >= 5 && !STOPWORDS.has(w)));
}

export function gradeOf(score) {
  if (score >= 11) return { label: "Perfect match", short: "Perfect", bg: "#e8f8f0", color: "#1a6e42", tier: 4 };
  if (score >= 8) return { label: "Excellent match", short: "Excellent", bg: "#e8f8f0", color: "#1a6e42", tier: 3 };
  if (score >= 6) return { label: "Strong match", short: "Strong", bg: "#eafaf7", color: "#0e7c6b", tier: 2 };
  if (score >= 3) return { label: "Good match", short: "Good", bg: "#fffbeb", color: "#7a5c00", tier: 1 };
  return { label: "Weak match", short: "Weak", bg: "#f0eef8", color: "#9b8fcf", tier: 0 };
}

// Transparent heuristic, session commitment weighted heaviest: pairs only work
// when both sides expect the same amount of time together. Every suggestion
// shows its grade and reasons so the human stays the decision-maker.
export function scoreMentor(mentee, mentor) {
  const reasons = [];
  let score = 0;

  // Session commitment: the heavy weight
  const mb = tierBand(mentee.tier);
  const rb = tierBand(mentor.tier);
  if (mb && rb) {
    if (mb === rb) { score += 4; reasons.push(`sessions aligned (both ${mb === 1 ? "3" : mb === 2 ? "4-6" : "7-10"})`); }
    else if (rb > mb) { score += 2; reasons.push("mentor offers more sessions than asked"); }
    else { score -= 2; reasons.push("⚠ mentor offers fewer sessions than requested"); }
  }

  // Focus overlap
  const menteeKw = keywordsOf([...(mentee.topics || []), mentee.primaryFocus]);
  const mentorKw = keywordsOf(mentor.focusAreas || []);
  const overlap = menteeKw.filter(k => mentorKw.includes(k));
  if (overlap.length) { score += Math.min(overlap.length, 3) * 2; reasons.push(`focus: ${overlap.join(", ")}`); }

  // Language overlap between what the founder wants and what the mentor offers
  const wants = meaningfulWords(`${mentee.hoping || ""} ${mentee.valueSought || ""}`);
  const offers = meaningfulWords(`${mentor.why || ""} ${mentor.give || ""}`);
  const shared = [...wants].filter(w => offers.has(w));
  if (shared.length >= 2) { score += 2; reasons.push(`shared language: ${shared.slice(0, 3).join(", ")}`); }
  else if (shared.length === 1) { score += 1; reasons.push(`shared language: ${shared[0]}`); }

  // Stage + schedule
  const stageWord = (mentee.stage || "").split(" ")[0].toLowerCase();
  if (stageWord && (mentor.stagePref || []).some(sp => sp.toLowerCase().includes(stageWord))) { score += 2; reasons.push("stage fit"); }
  const mTime = (mentee.timePref || []).join(" ").toLowerCase();
  const rTime = (mentor.timePref || []).join(" ").toLowerCase();
  if (rTime.includes("flexible") || ["morning", "evening", "weekend"].some(k => mTime.includes(k) && rTime.includes(k))) { score += 1; reasons.push("schedule works"); }

  return { score, reasons };
}

// ─── What the cohort is actually trying to maximise ──────────────────────────
//
// Not the sum of scores. A cohort where everyone is Strong beats one where
// half are Perfect and half are Weak, even when the two add up the same. So
// the value of a pairing has to bend: points that lift somebody off the floor
// are worth far more than points that decorate an already-great match. These
// weights say so out loud — Weak→Good is worth 100, Excellent→Perfect is
// worth 8. Maximising their sum therefore never parks one founder on a weak
// match to upgrade a founder who was already excellent, because that trade
// always loses. Raw score rides along as a tiebreaker.
const TIER_UTILITY = [0, 100, 130, 150, 158]; // weak, good, strong, excellent, perfect
const NO_MATCH_UTILITY = -50;                 // a weak mentor still beats nobody

// One mentee per mentor is the rule; a second is the backup and a third is a
// last resort. Expressing that as a small penalty was too soft — a mentor's
// second founder cost 12 points while a Good-to-Strong upgrade paid 30, so the
// solver stacked three founders on one mentor and left nine mentors with
// nobody. Instead each additional mentee steps down by more than every quality
// difference in the cohort added together, which makes the objective strictly
// lexicographic: give every mentor one, then prefer spreading the surplus as
// second mentees over piling up thirds, and only then sort out quality. Even
// the last step still beats leaving a founder unmatched, so doubling remains
// the fallback when there truly are not enough mentors.
const MAX_MENTEES = 3;

// Bigger than any total quality difference this cohort can produce, so no
// amount of match-quality can buy a mentor's second or third founder.
function loadStep(waitingCount, maxUtility) {
  return waitingCount * (maxUtility - NO_MATCH_UTILITY) + 1;
}

// The other way to run it: quality first, doubling merely discouraged. Kept
// because the choice between the two is a real programme decision (a mentor
// who signed up and gets nobody, against a founder on a bad match) and the
// screen shows both sets of numbers so it can be made with them in view.
const SPREAD_NUDGE = 12;

export function utilityOf(score) {
  return TIER_UTILITY[gradeOf(score).tier] + score * 0.1;
}

// ─── Capacity is sessions, not headcount ─────────────────────────────────────
//
// Counting founders per mentor was wrong in both directions. A mentor offering
// 7-10 sessions was treated as room for three founders, so they could be given
// three founders who each wanted 7-10 — thirty sessions from someone who
// offered ten. Meanwhile a mentor offering 7-10 whose founder only wants three
// looked full at one, when they have seven sessions going spare.
//
// So both sides are converted to sessions and the mentor's own number is a
// hard ceiling. Each side's figure is the top of the range they picked: a
// mentor saying 7-10 is offering up to ten, and a founder asking for 7-10
// should have ten reserved for them rather than be quietly given seven.
const SESSIONS_BY_BAND = { 1: 3, 2: 6, 3: 10 };
const MIN_SESSIONS = 3; // the smallest ask anybody can make

export function sessionsFor(tier) {
  return SESSIONS_BY_BAND[tierBand(tier)] || MIN_SESSIONS;
}

// A mentor whose 7-10 sessions go to a founder who wants three has seven
// sitting unused, and with capacity this tight somebody else needs them. This
// is what lines the bands up — 7-10 with 7-10, 4-6 with 4-6, minimum with
// minimum — and it is deliberately small: enough to settle which founder goes
// to which mentor when quality is close, never enough to outrank a grade.
const WASTED_SESSION_COST = 0.3;

export function wastedSessions(mentee, mentor) {
  return Math.max(0, sessionsFor(mentor.tier) - sessionsFor(mentee.tier));
}

// ─── Three sessions is a promise; everything above it is a preference ────────
//
// What is actually hard here is narrow. Every founder is owed the three-session
// minimum, and no mentor may be booked past what they offered. Both come out
// of one number: a mentor can carry at most floor(offered / 3) founders, which
// guarantees every founder their three and can never over-book the mentor. See
// slotsFor.
//
// Everything above that floor is a preference, and it loses to match quality.
// A founder who asked for 7-10 and gets three sessions with a mentor who fits
// them perfectly has not been short-changed: they have the minimum they were
// promised and a better mentor than the alternative. Founders are told this.
//
// An earlier version priced a session shortfall at 12 a head, which made it
// worth up to 84 against grade steps of 8 to 30 — so the solver would trade a
// genuinely better mentor for a more available one, which is the opposite of
// the deal on offer. The whole range of this term is now smaller than the
// narrowest grade step, so it can only ever decide between two mentors of the
// same grade: quality first, then as much depth as that allows.
// Derived rather than chosen, so the invariant holds even if the grade weights
// are retuned later: the largest possible depth gap, priced at the very most,
// still comes to less than the narrowest step between two grades.
const NARROWEST_GRADE_STEP = TIER_UTILITY[4] - TIER_UTILITY[3]; // excellent -> perfect
const WIDEST_SESSION_GAP = 10 - MIN_SESSIONS;
const SESSION_DEPTH_COST = (NARROWEST_GRADE_STEP - 1) / WIDEST_SESSION_GAP;

// Sessions this founder can expect from this mentor: the mentor's own offer
// divided by the founders they carry, floored at the three-session promise and
// never more than the founder asked for.
export function sessionsPlanned(mentee, mentor, extra = 0) {
  const share = Math.max(MIN_SESSIONS, Math.floor(sessionsFor(mentor.tier) / (extra + 1)));
  return Math.min(sessionsFor(mentee.tier), share);
}

// How far short of their own ask that lands. Never a reason to refuse a
// pairing, only a reason to prefer another of equal quality.
export function sessionGap(mentee, mentor, extra = 0) {
  return sessionsFor(mentee.tier) - sessionsPlanned(mentee, mentor, extra);
}

// The most founders this mentor could take even in the best case, which is
// every one of them asking for the minimum. The real limit is the session
// budget, enforced against the actual pairing further down; this only bounds
// how many slots the solver needs to consider. Anyone already carrying a
// founder has that subtracted.
export function slotsFor(mentor, allowMultiple) {
  const taken = (mentor.assignedTo || []).length;
  const ceiling = allowMultiple
    ? Math.min(MAX_MENTEES, Math.max(1, Math.floor(sessionsFor(mentor.tier) / MIN_SESSIONS)))
    : 1;
  return Math.max(0, ceiling - taken);
}

// Sessions a mentor has already promised away outside this plan. Their
// founders' own asks are not in this payload, so each one is counted at the
// minimum: it under-counts rather than over-books.
function committedSessions(mentor) {
  return (mentor.assignedTo || []).length * MIN_SESSIONS;
}

export function isEligibleMentor(m) {
  return m.decision === "approved" && !m.isTest;
}

// People do apply to both forms. Sanjeev Wadhwa is on the fall mentee list and
// approved as a mentor, and an optimiser with no opinion about it will happily
// pair somebody with themselves.
export function samePerson(mentee, mentor) {
  if (mentee.email && mentor.email && mentee.email.toLowerCase() === mentor.email.toLowerCase()) return true;
  const a = `${mentee.first || ""} ${mentee.last || ""}`.trim().toLowerCase();
  const b = (mentor.name || "").trim().toLowerCase();
  return !!a && a === b;
}

// ─── Assignment solver ───────────────────────────────────────────────────────
// Jonker-Volgenant / Hungarian, minimising cost, rows <= cols. O(n^2 m), which
// at cohort size (dozens x dozens) is instant even re-run once per candidate.
function hungarian(cost, n, m) {
  const INF = Infinity;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);   // p[col] = row holding it (1-indexed)
  const way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(INF);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = -1;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const rowToCol = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j] > 0) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

// One founder to one mentor is the rule. Only when there are not enough
// mentors to go round does anybody carry two, and then their own stated
// session availability sets the ceiling.
export function buildCohort({ mentees, mentors, oneEach = true }) {
  const waiting = [...mentees];
  const pool = mentors.filter(isEligibleMentor);
  const singleSupply = pool.reduce((n, mt) => n + slotsFor(mt, false), 0);
  const allowMultiple = singleSupply < waiting.length;

  const slots = [];
  for (const mt of pool) {
    const n = slotsFor(mt, allowMultiple);
    for (let k = 0; k < n; k++) slots.push({ mentor: mt, extra: k });
  }
  // scores[i][j] for founder i against slot j (same mentor slots share a score)
  const scores = waiting.map(a => slots.map(s => scoreMentor(a, s.mentor)));
  const blocked = waiting.map(a => slots.map(s => samePerson(a, s.mentor)));
  const waste = waiting.map(a => slots.map(s => wastedSessions(a, s.mentor)));
  const gap = waiting.map(a => slots.map(s => sessionGap(a, s.mentor, s.extra)));
  // Sessions the pool can give against sessions it was asked for. This is the
  // number that actually decides whether the cohort can be served, and no
  // amount of clever matching moves it: with 181 sessions offered against 291
  // asked, somebody is getting less than they asked for and the only real
  // remedy is more mentors with high availability.
  const sessionSupply = pool.reduce((n, mt) => n + Math.max(0, sessionsFor(mt.tier) - committedSessions(mt)), 0);
  const sessionDemand = waiting.reduce((n, a) => n + sessionsFor(a.tier), 0);
  const byBand = (list, tierOf) => list.reduce((acc, x) => {
    const b = tierBand(tierOf(x)) || 1;
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {});

  const maxUtility = Math.max(0, ...scores.flat().map(x => utilityOf(x.score)));
  const step = loadStep(waiting.length, maxUtility);
  // Offset that keeps every cost non-negative, load bonuses included.
  const bestUtility = MAX_MENTEES * step + maxUtility;

  return {
    waiting, pool, slots, slotsOpen: slots.length, scores, blocked, waste, gap,
    allowMultiple, oneEach, step, bestUtility,
    sessionSupply, sessionDemand,
    mentorBands: byBand(pool, mt => mt.tier),
    founderBands: byBand(waiting, a => a.tier),
  };
}

// What a slot is worth for load purposes alone: a mentor's first founder is
// worth the most, each additional one strictly less.
function loadBonus(ctx, extra) {
  if (!ctx.oneEach) return -extra * SPREAD_NUDGE;
  return Math.max(0, MAX_MENTEES - extra) * ctx.step;
}

function summarise(pairs, waitingCount, ctx = null) {
  const byTier = [0, 0, 0, 0, 0];
  let utility = 0, score = 0;
  for (const p of pairs) {
    byTier[gradeOf(p.score).tier]++;
    utility += utilityOf(p.score);
    score += p.score;
  }
  const unmatched = Math.max(0, waitingCount - pairs.length);
  utility += unmatched * NO_MATCH_UTILITY;
  const mentorsUsed = new Set(pairs.map(p => p.mentor.id)).size;
  const doubled = pairs.filter(p => p.extra === 1).length;
  const tripled = pairs.filter(p => p.extra >= 2).length;
  const load = ctx ? pairs.reduce((sum, p) => sum + loadBonus(ctx, p.extra || 0), 0) : 0;
  // Founders who land nearer the three-session minimum than the range they
  // picked. Not a failure — the minimum is the promise and quality came first —
  // but worth counting, because it is what more mentors would buy.
  const short = pairs.map(p => ({ p, miss: sessionGap(p.mentee, p.mentor, p.extra || 0) })).filter(x => x.miss > 0);
  const shortSessions = short.reduce((sum, x) => sum + x.miss, 0);
  const atMinimum = pairs.filter(p => sessionsPlanned(p.mentee, p.mentor, p.extra || 0) <= MIN_SESSIONS
    && sessionsFor(p.mentee.tier) > MIN_SESSIONS).length;
  const sessionsPromised = pairs.reduce((sum, p) => sum + sessionsPlanned(p.mentee, p.mentor, p.extra || 0), 0);
  return {
    weak: byTier[0], good: byTier[1], strong: byTier[2], excellent: byTier[3], perfect: byTier[4],
    excellentPlus: byTier[3] + byTier[4],
    unmatched, utility: Math.round(utility * 10) / 10, score,
    mentorsUsed, doubled, tripled,
    shortchanged: short.length, shortSessions, atMinimum, sessionsPromised,
    mentorsIdle: ctx ? Math.max(0, ctx.pool.length - mentorsUsed) : null,
    worst: pairs.length ? Math.min(...pairs.map(p => p.score)) : null,
    // The solver's own objective: load first, quality second. Anything ranking
    // whole plans has to compare them on this, not on utility alone, or it
    // will happily prefer a plan that benches a mentor.
    objective: Math.round((load + utility) * 10) / 10,
  };
}

// Cohorts are full of ties: two mentors can score a founder identically, and
// then any of several plans is equally good. Left alone the solver picks among
// them arbitrarily, which makes an unrelated founder appear to be "moved" by a
// click that cost the group nothing. So a plan already on screen gets an
// epsilon of preference — smaller than any real score difference, big enough
// to settle a tie — and churn in the diff then means something.
const TIE_BREAK = 0.001;

// Solve for a subset of the cohort: everyone except the founders in skipRows,
// using every slot except those in skipSlots. That is all a locked-in pairing
// is — take the pair out of the problem and solve what remains. `prefer` maps
// a founder id to the mentor id they hold in the plan being compared against.
function solveOnce(ctx, skipRows = new Set(), skipSlots = new Set(), prefer = null, bannedCells = null) {
  const rows = ctx.waiting.map((_, i) => i).filter(i => !skipRows.has(i));
  const cols = ctx.slots.map((_, j) => j).filter(j => !skipSlots.has(j));
  if (!rows.length) return { pairs: [], unassigned: [] };

  const n = rows.length;
  const m = Math.max(cols.length, n);
  const cost = rows.map(i => {
    const row = new Array(m);
    const held = prefer ? prefer[ctx.waiting[i].id] : null;
    for (let c = 0; c < m; c++) {
      if (c >= cols.length) { row[c] = ctx.bestUtility - NO_MATCH_UTILITY; continue; }
      const j = cols[c];
      if (ctx.blocked[i][j] || bannedCells?.has(`${i}:${j}`)) {
        row[c] = ctx.bestUtility - NO_MATCH_UTILITY + 1000;
        continue;
      }
      row[c] = ctx.bestUtility - (
        utilityOf(ctx.scores[i][j].score)
        + loadBonus(ctx, ctx.slots[j].extra)
        - ctx.waste[i][j] * WASTED_SESSION_COST
        - ctx.gap[i][j] * SESSION_DEPTH_COST
      );
      if (held && ctx.slots[j].mentor.id === held) row[c] -= TIE_BREAK;
    }
    return row;
  });

  const rowToCol = hungarian(cost, n, m);
  const pairs = [];
  const unassigned = [];
  for (let r = 0; r < n; r++) {
    const c = rowToCol[r];
    const i = rows[r];
    if (c < 0 || c >= cols.length) { unassigned.push(ctx.waiting[i]); continue; }
    const j = cols[c];
    if (ctx.blocked[i][j] || bannedCells?.has(`${i}:${j}`)) { unassigned.push(ctx.waiting[i]); continue; }
    pairs.push({
      mentee: ctx.waiting[i], mentor: ctx.slots[j].mentor,
      score: ctx.scores[i][j].score, reasons: ctx.scores[i][j].reasons,
      extra: ctx.slots[j].extra,
      second: ctx.slots[j].extra > 0,
    });
  }
  return { pairs, unassigned };
}

function planFrom(ctx, extraPairs, skipRows, skipSlots, prefer) {
  const { pairs, unassigned } = solveOnce(ctx, skipRows, skipSlots, prefer);
  const all = [...extraPairs, ...pairs];
  return {
    pairs: all,
    byMentee: Object.fromEntries(all.map(p => [p.mentee.id, p])),
    unassigned,
    summary: summarise(all, ctx.waiting.length, ctx),
  };
}

// The unconstrained best plan for everybody waiting.
export function cohortPlan(ctx) {
  return planFrom(ctx, [], new Set(), new Set());
}

// What Kennedy does by hand: newest first, each founder takes their own best
// remaining mentor. Kept so the cohort plan can show what that order costs.
export function greedyPlan(ctx) {
  const left = new Map();
  for (const s of ctx.slots) left.set(s.mentor.id, (left.get(s.mentor.id) || 0) + 1);
  const taken = new Set();
  const used = new Map();
  const pairs = [];
  ctx.waiting.forEach((a, i) => {
    // Under one-each, a hand-picker also exhausts the untouched mentors before
    // giving anybody a second founder — otherwise the comparison flatters the
    // cohort plan for following a rule the baseline was never given.
    for (const onlyFresh of ctx.oneEach ? [true, false] : [false]) {
      let best = null;
      ctx.slots.forEach((s, j) => {
        if ((left.get(s.mentor.id) || 0) <= 0) return;
        if (onlyFresh && taken.has(s.mentor.id)) return;
        if (best && best.mentor.id === s.mentor.id) return;
        if (ctx.blocked[i][j]) return;
        const sc = ctx.scores[i][j].score;
        if (!best || sc > best.score) best = { mentee: a, mentor: s.mentor, score: sc, reasons: ctx.scores[i][j].reasons, extra: used.get(s.mentor.id) || 0, second: taken.has(s.mentor.id) };
      });
      if (!best) continue;
      left.set(best.mentor.id, left.get(best.mentor.id) - 1);
      taken.add(best.mentor.id);
      used.set(best.mentor.id, (used.get(best.mentor.id) || 0) + 1);
      pairs.push(best);
      return;
    }
  });
  return { pairs, byMentee: Object.fromEntries(pairs.map(p => [p.mentee.id, p])), summary: summarise(pairs, ctx.waiting.length, ctx) };
}

// ─── The three picks, and what each one costs ────────────────────────────────
//
// For one founder, rank every mentor with an open slot by re-solving the whole
// cohort with that pairing locked. Ranking is by the resulting cohort, not by
// the pair's own score, so a mentor who is marginally better for this founder
// and ruinous for two others loses. Each pick carries the fallout: who else
// gets moved, and whether their grade drops.
export function recommendFor(ctx, menteeId, top = 3) {
  const i = ctx.waiting.findIndex(a => a.id === menteeId);
  if (i < 0) return { picks: [], baseline: null };

  const baseline = cohortPlan(ctx);

  // First open slot per mentor (lowest `extra`, so the load penalty is right).
  const firstSlot = new Map();
  ctx.slots.forEach((s, j) => { if (!firstSlot.has(s.mentor.id)) firstSlot.set(s.mentor.id, j); });

  const candidates = [];
  for (const [mentorId, j] of firstSlot) {
    if (ctx.blocked[i][j]) continue;
    const forced = {
      mentee: ctx.waiting[i], mentor: ctx.slots[j].mentor,
      score: ctx.scores[i][j].score, reasons: ctx.scores[i][j].reasons,
      extra: ctx.slots[j].extra,
      second: ctx.slots[j].extra > 0,
    };
    const prefer = Object.fromEntries(baseline.pairs.map(pr => [pr.mentee.id, pr.mentor.id]));
    const plan = planFrom(ctx, [forced], new Set([i]), new Set([j]), prefer);

    // Who moves, and who loses a grade, versus the unconstrained plan.
    const moved = [];
    for (const other of ctx.waiting) {
      if (other.id === menteeId) continue;
      const was = baseline.byMentee[other.id];
      const now = plan.byMentee[other.id];
      if (!was && !now) continue;
      if (was && now && was.mentor.id === now.mentor.id) continue;
      const fromTier = was ? gradeOf(was.score).tier : -1;
      const toTier = now ? gradeOf(now.score).tier : -1;
      moved.push({
        mentee: other,
        from: was ? gradeOf(was.score) : null, fromMentor: was ? was.mentor : null,
        to: now ? gradeOf(now.score) : null, toMentor: now ? now.mentor : null,
        drop: fromTier - toTier,
      });
    }
    const downgraded = moved.filter(x => x.drop > 0).sort((a, b) => b.drop - a.drop);

    candidates.push({
      mentor: ctx.slots[j].mentor,
      score: forced.score,
      grade: gradeOf(forced.score),
      reasons: forced.reasons,
      second: forced.second,
      // Ranked on the solver's objective so a pick that benches a mentor
      // cannot win on quality alone; the cost shown to a human stays in
      // quality terms, with the benched mentors counted separately.
      cohortObjective: plan.summary.objective,
      cohortCost: Math.round((baseline.summary.utility - plan.summary.utility) * 10) / 10,
      benched: baseline.summary.mentorsUsed - plan.summary.mentorsUsed,
      summary: plan.summary,
      moved, downgraded,
      isCohortPick: baseline.byMentee[menteeId]?.mentor.id === mentorId,
    });
  }

  candidates.sort((a, b) => b.cohortObjective - a.cohortObjective || b.score - a.score);
  return { picks: candidates.slice(0, top), all: candidates, baseline };
}
