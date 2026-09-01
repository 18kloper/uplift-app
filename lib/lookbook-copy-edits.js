// Hand edits to founder-written copy in the lookbook, keyed by Typeform
// response id.
//
// The book quotes founders verbatim, so nothing is rewritten here: an entry
// only removes a trailing sentence that weakens how they come across. Kennedy
// makes these calls; anything not listed is printed as written.

export const QUOTE_CUTS = {
  // Rosalind Griffie: she was answering a form question, and the page is not
  // the form.
  "ut1obvbkm2857t2pvnut1obvb7saym3o": [
    "Awesome question!",
  ],
  // Ninad Dhoble: "work on my weaknesses" is not how he should be introduced,
  // so his page leads on the question he wants answered instead.
  "5zag0n8ar1bv25zag0e29bvyhh366re2": [
    "work on my weaknesses like fund raising",
  ],
  // Megan Fonseca: cuts the throat-clearing opener so the block starts on
  // what she will actually do.
  "gk3xs953a8yvtf07w2igk3x3sh4fnhzs": [
    "I'll bring a strong work ethic, curiosity, and a real willingness to learn. Since this is my first time building a business, I know there are things I don't know yet, and",
  ],
  // Ceana Santori: the programme length is on every page already.
  "d7co1uru6mdu1ad7coz2f1z5emq1hthl": [
    "Over the 10-week program,",
  ],
  // David Singletary: what he wrote for "what will you bring" says nothing a
  // mentor can act on, so the block comes off his page entirely.
  "bspu74srtkny8vaycbspsqhvswje2jdu": [
    "I will be dedication to the program.",
    "I will set and track goals so that we have productive sessions.",
  ],
  // Brittany Payton: the middle sentence is boilerplate every applicant
  // writes, so it goes and the two that say something specific stay.
  "b2zrydiwvaokmb2t7mmorjruhdhf3led": [
    "I plan to come prepared with clear goals and questions, apply the guidance I receive, track my progress, and follow through between sessions.",
  ],
  // Ifeanyi Osuji: the quote lands better on the value of mentorship without
  // the self-deprecating close.
  "417md379dr3c417md3k15jdclems8n1e": [
    "I believe I can benefit from mentorship and I still have ALOT to learn",
  ],
};

// Removes any listed sentence from a founder's quote, then tidies the seam.
// The cuts apply to any founder-written block, not only the pull quote.
// Apostrophes arrive curly from some forms and straight from others, so both
// the stored text and the cut are flattened before they are compared.
const flatten = (v) => String(v).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").toLowerCase();

export function applyQuoteCuts(id, text) {
  const cuts = QUOTE_CUTS[id];
  if (!text || !cuts) return text;
  let out = String(text).replace(/\s+/g, " ");
  for (const cut of cuts) {
    const at = flatten(out).indexOf(flatten(cut));
    if (at >= 0) out = out.slice(0, at) + out.slice(at + cut.length);
  }
  // A cut can leave a dangling conjunction or a doubled space at the seam.
  return out
    .replace(/\s+/g, " ")
    .replace(/\s+([.!?,])/g, "$1")
    .replace(/^[\s,;]*(and|but|so|because)\b\s*/i, "")
    .replace(/[.,;\s]+$/, "")
    .trim();
}

// Polished bios, keyed by Typeform response id.
//
// Same rule as the quote cuts: the facts, the voice, and the claims are the
// founder's. What changes is spelling, capitalisation, contractions, and a
// stray URL. Kennedy approves each one; everyone else is printed as written.
export const BIO_EDITS = {
  // Ifeanyi Osuji, Zarachi AI.
  "417md379dr3c417md3k15jdclems8n1e":
    "Started out building Haggler AI, an AI shopping assistant, in November 2024. Got accepted into the Google for Startups program with $25k in credits, and took part in Founder University, Jason Calacanis's pre-accelerator. Based on that feedback, I'm now building Zarachi AI, an AI mentor for knowledge workers. Myself and people in my circle have had stunted career growth from a lack of mentorship. Plenty of tools prep candidates to ace interviews. Far less exists for keeping the job and becoming a top performer, and that is where Zarachi AI helps, especially for people who have never found a mentor.",
};

export function applyBioEdit(id, text) {
  return BIO_EDITS[id] || text;
}

// Founders who share a page rather than getting one each. Same shape as the
// short-form pairs the book makes automatically, chosen by hand here.
export const PAIRED_PAGES = [
  // Kristen Chin and Sameer Dhawan: neither has a usable photo, so a full
  // page each is mostly white space.
  ["88lr1p1k17o20cd2bu388lr1pji23pc5", "z9rr13jj32a3tdrxg71e51z9rr1377n0"],
];

// The order the short-form founders run in, by Typeform response id. They
// pair up two to a page in this order; anyone not listed follows in
// alphabetical order after them.
export const SHORT_FORM_ORDER = [
  "kr38yvgwn2x9x9akkkr38yvlpoh9zny5", // Neha Panwar
  "pn79vaay0rlyg5pi343tpn79va099pnz", // Vishruti Mehta
  "s5ztmk6w01qk12zs5ztmt5loo0ij3sgb", // Mayank Doultani
  "4cwze95p6vjkslbrvng84cwze9gq5kbc", // Naomie Sophia Renarde
];
