# public/uplift-speaker-onepagers.html: one Letter page per booked speaker.
# Serves three readers at once, so nothing on it is internal-only:
#   Zone 1  the session at a glance (approve in fifteen seconds)
#   Zone 2  the ask (what the speaker builds, and by when)
#   Zone 3  Luma copy block, paste-ready for whoever or whatever updates the event
# Titles are the speakers' own. No recommendation, no go / no-go: this doc is
# shared externally with the speaker.

SPEAKERS = [
  dict(
    idx=1, name="Steve Cummins",
    settle=["Which one or two tactics we close on, so the room leaves with a decision", "Who moderates and how questions reach you, live in chat or read out", "Whether the one-pager and the eBook go into the cohort resource library under your name"], role="Principal / Chief Marketer", org="Solent Strategies",
    email="steve@solentstrategies.com",
    session="Session 7", when="Fri Sept 25 · 12:30 PM ET",
    format_short="Presentation, then Q&amp;A", other_dates="Yes", series="Maybe, wants to discuss",
    title="Marketing that Maps the Customer Journey",
    covers=("Takes the classic marketing funnel and shows which tactics belong at which stage, then makes the case "
            "that the customer journey is no longer linear so the funnel needs a more nuanced read."),
    build=[
      "<b>20 minutes of slides</b> walking the journey stage by stage, with the tactics that belong at each",
      "Close on <b>the one or two tactics this cohort should pick</b>, so the room leaves with a decision",
      "<b>10 minutes of questions</b> at the end",
    ],
    aways=["Define the goal of your marketing, then match tactics to each stage",
           "What has to be in place before you spend: a clear message, a defined reachable audience",
           "Do one or two things well rather than covering every base"],
    aim="Pre-revenue and testing the market · generating revenue · raising",
    brings="A one-pager built for the session, plus an 8-page eBook, Building a Realistic Marketing Strategy. Both go in the cohort resource library under his name.",
    deck="Deck exists, in Drive. Final version due 72 hours before.",
    luma_desc=("Every founder is told to do marketing, and everyone they ask has a different opinion. Steve Cummins, "
               "a fractional CMO with more than 20 years in B2B marketing, walks the customer journey stage by stage "
               "and shows which tactics actually belong at each one. You will leave able to define the goal of your "
               "marketing, name what has to be in place before you spend anything, and pick the one or two things to "
               "do well instead of covering every base."),
    bio=("Steve helps growing businesses punch above their weight, working with companies who are ready to take "
         "marketing seriously but are not ready for a full time CMO. That means developing the right message, "
         "reaching a broader audience, and executing a marketing plan tailored for their business. Steve has an "
         "engineering background and more than 20 years experience in global B2B marketing with name-brand companies "
         "and feisty start-ups. He also coaches and mentors marketers and teams of one."),
  ),
  dict(
    idx=2, name="Eric Schmalzbauer",
    settle=["What you are comfortable naming out loud: numbers, timelines, the decision to close", "The three questions you wish someone had asked you at the start, which become the run of show", "Who conducts the fireside and who fields founder questions"], role="Former co-founder &amp; CEO", org="Prospective",
    email="eric.schmalzbauer@gmail.com",
    session="Session 2", when="Mon Sept 14 · 12:30 PM ET",
    format_short="Fireside chat", other_dates="Yes", series="Maybe, wants to discuss",
    title="B2B: from idea &gt; funding &gt; failure",
    covers=("A first-time founder winding down a venture-backed company: the arc from idea through fundraising and "
            "team building to deciding when and why to close, what he will change next time, and what he will do "
            "more of."),
    build=[
      "<b>No deck required.</b> We interview him and founders ask questions",
      "Bring <b>three questions he wishes someone had asked</b> at the start, which become the run of show",
      "Agree <b>what he is comfortable naming out loud</b>: numbers, timelines, the decision to close",
    ],
    aways=["Tangible examples of what worked and what did not inside a venture-backed startup",
           "As a founder you always have to be selling, in some form",
           "Honest acknowledgement that the job is very lonely"],
    aim="Any founder in the cohort",
    brings="Workbench Ventures GTM Weekly newsletter. Open to a series: GTM from scratch, and investor management.",
    deck="None needed for a fireside.",
    luma_desc=("Founders hear success stories constantly and almost never a first-hand account of the other outcome. "
               "Eric Schmalzbauer takes us through the whole arc of his venture-backed B2B startup: the idea, the "
               "fundraising, building the team, and the decision to wind it down. He covers what worked, what he "
               "would change next time, and what he would do more of. Expect a candid conversation rather than a "
               "polished talk."),
    bio=("Eric Schmalzbauer is a technology executive, founder, and venture partner across product strategy, data "
         "platforms, and go-to-market execution. He is the now former co-Founder and CEO of Prospective, the team "
         "behind the open-source Perspective project, building high-performance tools for interactive data "
         "analytics. Eric previously held senior leadership roles across financial market infrastructure and "
         "enterprise technology, driving product innovation and commercialization. As a Venture Partner at "
         "REFASHIOND Ventures, he advises early-stage founders on product-market fit, fundraising, and scaling."),
  ),
  dict(
    idx=3, name="Julia Kahky",
    settle=["How each takeaway becomes something a founder can act on the following Monday", "Which stages to aim at, so the invitation to the cohort has an edge", "Who moderates and how questions reach you, plus where The Atrium and the AI tools list fit"], role="VP Operations", org="Tailsight",
    email="julia.m.kahky@gmail.com",
    session="Session 5", when="Mon Sept 21 · 12:30 PM ET",
    format_short="Presentation, then Q&amp;A", other_dates="Yes", series="Maybe, wants to discuss",
    title="From startup to dissolution: a post-mortem",
    covers=("Everything learned trying to sell software to enterprise customers and into highly regulated markets, "
            "framed as the post-mortem of a company that did not make it. What worked and what did not."),
    build=[
      "<b>20 minutes of slides</b> on the enterprise and regulated sales arc: cycle lengths, where deals died, what she would do differently",
      "Turn the three takeaways into <b>actions a founder can take on Monday</b>",
      "<b>10 minutes of questions</b> at the end",
    ],
    aways=["Problems to avoid early on", "Product-market fit", "Sales cycles"],
    aim="Every stage, idea through raising",
    brings="Her community, The Atrium. The post-mortem deck. A list of AI tools, tips and tricks.",
    deck="Deck to be sent. Due 72 hours before.",
    luma_desc=("Everything online is about how companies succeed. Julia Kahky takes the other route and walks through "
               "the post-mortem of a startup that closed, specifically what she learned selling software to "
               "enterprise customers and into highly regulated markets. Expect specifics on the problems worth "
               "avoiding early, product-market fit, and how long sales cycles really take."),
    bio=("Julia Kahky is VP of Operations at a software company in the aviation industry, with prior experience as a "
         "chief of staff and in financial technology and operations in sports media. She started her career in "
         "finance and has worked across Fortune 15 companies, 500-person companies, and startups, with experience "
         "spanning finance, operations, marketing, revenue operations, and HR."),
  ),
]

CSS = """
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 8.5in 11in; margin: 0; }
  :root {
    --ink: #110465; --body: #33304d; --soft: #6b6689; --pink: #cf5b8d;
    --rule: #d7d2e3; --wash: #f7f6f2; --code: #f2f0f7;
  }
  body { background: #fff; color: var(--body); font-family: 'Archivo', system-ui, sans-serif;
    font-size: 8.7pt; line-height: 1.32; }
  .page { width: 8.5in; height: 10.96in; overflow: hidden; padding: 0.4in 0.55in 0.3in;
    display: flex; flex-direction: column; break-after: page; page-break-after: always; }
  .page:last-child { break-after: auto; page-break-after: auto; }

  .mast { display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 3px solid var(--ink); padding-bottom: 7px; }
  .mast .logo { width: 1.35in; height: 0.44in; background: url("uplift-logo.png") left bottom / contain no-repeat; }
  .mast .r { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 7.5pt;
    font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--soft); line-height: 1.6; }
  .mast .r b { color: var(--pink); }

  .zone { font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; color: #fff; background: var(--ink);
    padding: 3px 7px; display: inline-block; margin-top: 11px; }
  .zone.two { background: var(--pink); }
  .zone.three { background: var(--soft); }
  .zone-note { font-family: 'JetBrains Mono', monospace; font-size: 7pt; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--soft); margin-left: 8px; }
  .k { font-family: 'JetBrains Mono', monospace; font-size: 6.8pt; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--soft); }

  .head { border: 2px solid var(--ink); margin-top: 7px; display: flex; }
  .head .who { flex: 1.45; padding: 9px 12px; border-right: 1px solid var(--rule); }
  .head .who h1 { font-family: 'Archivo Narrow', sans-serif; font-weight: 700; font-size: 19pt;
    text-transform: uppercase; color: var(--ink); line-height: 1.0; }
  .head .who p { margin-top: 4px; font-size: 8.8pt; }
  .head .slot { flex: 1; padding: 9px 12px; border-right: 1px solid var(--rule); }
  .head .fmt { flex: 1; padding: 9px 12px; background: var(--wash); }
  .head .v { margin-top: 3px; font-family: 'Archivo Narrow', sans-serif; font-weight: 700;
    font-size: 12.5pt; color: var(--ink); text-transform: uppercase; line-height: 1.1; }
  .head .sub { margin-top: 4px; font-size: 8pt; color: var(--soft); }

  .titlebox { margin-top: 8px; background: #fdf1f6; padding: 8px 12px; border-left: 3px solid var(--pink); }
  .titlebox .val { margin-top: 2px; font-size: 12.5pt; font-weight: 600; color: var(--ink); line-height: 1.18;
    font-family: 'Archivo Narrow', sans-serif; }
  .covers { margin-top: 8px; font-size: 9.4pt; }

  .aways { margin-top: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .away { border-top: 2px solid var(--ink); padding-top: 5px; font-size: 8.6pt; line-height: 1.3; }
  .away .n { font-family: 'JetBrains Mono', monospace; font-size: 6.4pt; font-weight: 700;
    color: var(--pink); letter-spacing: 0.1em; }

  ul.build { list-style: none; margin-top: 6px; }
  ul.build li { position: relative; padding-left: 14px; margin-bottom: 3px; }
  ul.build li:before { content: "\\2192"; position: absolute; left: 0; color: var(--pink); font-weight: 700; }
  ul.build li b { color: var(--ink); }

  .steps { margin-top: 7px; display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--ink); }
  .step { padding: 7px 10px; border-right: 1px solid var(--rule); }
  .step:last-child { border-right: none; }
  .step .n { font-family: 'JetBrains Mono', monospace; font-size: 6.6pt; font-weight: 700;
    letter-spacing: 0.12em; color: var(--pink); }
  .step .t { margin-top: 2px; font-size: 8pt; line-height: 1.26; }
  .step .t b { color: var(--ink); }

  .call { margin-top: 7px; background: var(--wash); border-left: 3px solid var(--ink); padding: 7px 11px; }
  .call ul { margin: 3px 0 0 13px; font-size: 8.1pt; }
  .call li { margin-bottom: 2px; }

  .facts { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px 16px; font-size: 8.2pt; }

  /* Zone 3 renders as the event page will read, so the speaker can approve the
     words and an agent can copy them straight into Luma. */
  .luma { margin-top: 6px; border: 1px solid var(--rule); background: var(--code); padding: 9px 12px; }
  .luma .etitle { font-family: 'Archivo Narrow', sans-serif; font-weight: 700; font-size: 11.5pt;
    color: var(--ink); line-height: 1.15; }
  .luma .emeta { margin-top: 3px; font-family: 'JetBrains Mono', monospace; font-size: 7pt;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--soft); }
  .luma .h { margin-top: 6px; font-family: 'JetBrains Mono', monospace; font-size: 6.6pt; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--pink); }
  .luma .txt { margin-top: 3px; font-size: 8pt; line-height: 1.36; }
  .luma ul { margin: 3px 0 0 13px; font-size: 8pt; line-height: 1.32; }

  .spacer { flex: 1; }
  .foot { border-top: 1px solid var(--rule); margin-top: 8px; padding-top: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 6.8pt; letter-spacing: 0.06em;
    color: var(--soft); display: flex; justify-content: space-between; gap: 14px; }
"""

def page(s, total):
    aways_bullets = "\n".join(f'      <li>{a}</li>' for a in s["aways"])
    build = "\n".join(f'      <li>{b}</li>' for b in s["build"])
    settle = "\n".join(f'      <li>{x}</li>' for x in s["settle"])
    return f"""
<div class="page">
  <div class="mast">
    <div class="logo"></div>
    <div class="r">Expert Sessions · Fall 2026<br>Session brief <b>0{s['idx']} / 0{total}</b></div>
  </div>

  <span class="zone">1 · The session</span><span class="zone-note">at a glance</span>
  <div class="head">
    <div class="who">
      <h1>{s['name']}</h1>
      <p>{s['role']}, {s['org']}</p>
    </div>
    <div class="slot">
      <p class="k">Date</p>
      <p class="v">{s['session']}<br>{s['when']}</p>
      <p class="sub">30 minutes · virtual</p>
    </div>
    <div class="fmt">
      <p class="k">Format</p>
      <p class="v" style="font-size: 11pt;">{s['format_short']}</p>
      <p class="sub">Aimed at: {s['aim']}</p>
    </div>
  </div>

  <div class="titlebox">
    <p class="k">Session title, as they submitted it</p>
    <p class="val">{s['title']}</p>
  </div>

  <div class="facts">
    <p><span class="k">Open to other dates</span><br>{s['other_dates']}</p>
    <p><span class="k">Open to a series, up to three sessions</span><br>{s['series']}</p>
    <p><span class="k">Brings for the resource library</span><br>{s['brings']}</p>
    <p><span class="k">Deck</span><br>{s['deck']}</p>
  </div>

  <span class="zone two">2 · The ask</span><span class="zone-note">what to build, and by when</span>
  <ul class="build">
{build}
  </ul>

  <div class="steps">
    <div class="step"><p class="n">STEP 1 · IMMEDIATELY</p><p class="t"><b>Calendar hold</b> for this slot goes out as soon as the date is confirmed.</p></div>
    <div class="step"><p class="n">STEP 2 · WEEK PRIOR</p><p class="t"><b>15 minute sync call.</b> Lock the title and intro, walk the shape of the 30 minutes, confirm recording and promotion, tech check.</p></div>
    <div class="step"><p class="n">STEP 3 · 72 HOURS OUT</p><p class="t"><b>Deck due</b>, if a deck is being used, so we can prep and promote.</p></div>
  </div>

  <div class="call">
    <p class="k" style="color: #110465;">Settle on the sync call</p>
    <ul>
{settle}
    </ul>
  </div>

  <span class="zone three">3 · Luma event page</span><span class="zone-note">draft copy, for your approval</span>
  <div class="luma">
    <p class="etitle">{s['title']}</p>
    <p class="emeta">Uplift Expert Session · {s['when']} · Virtual · 30 minutes</p>
    <p class="h">About this session</p>
    <p class="txt">{s['luma_desc']}</p>
    <p class="h">What you will leave with</p>
    <ul>
{aways_bullets}
    </ul>
    <p class="h">About {s['name'].split()[0]}</p>
    <p class="txt">{s['bio']}</p>
  </div>

  <div class="spacer"></div>
  <div class="foot">
    <span>{s['email']}</span>
    <span>Uplift Mentorship Program · TechUnited:NJ</span>
  </div>
</div>
"""

html_out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Uplift Expert Sessions · Session briefs</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Archivo+Narrow:wght@600;700&family=JetBrains+Mono:wght@400;500;700&display=swap">
<style>{CSS}</style>
</head>
<body>
{''.join(page(s, len(SPEAKERS)) for s in SPEAKERS)}
</body>
</html>
"""
open("/Users/kennedy/uplift-app/public/uplift-speaker-onepagers.html", "w").write(html_out)
print("built", len(SPEAKERS), "session briefs")
