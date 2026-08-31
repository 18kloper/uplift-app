# public/uplift-speaker-onepagers.html: one Letter page per booked speaker.
#
# Built to be skimmed in seconds, so it stays deliberately plain: a header line,
# the title, the three blocks Kennedy liked (about the session, what you leave
# with, about the speaker), what we need, and what the sync call settles.
# No zone labels, no panel grid, no recommendation: this is shared externally.

SPEAKERS = [
  dict(
    name="Steve Cummins",
    date_line="Session 7<br>Fri, Sept 25 · 12:30 PM ET", fmt_line="Presentation<br>with slides, then Q&amp;A",
    aim="Founders who are pre-revenue and testing the market, already generating revenue, or raising. Useful to anyone who knows they should be marketing and has neither the time nor the budget to do all of it.",
    linkedin="linkedin.com/in/stevecummins", applied="Aug 28", role="Principal / Chief Marketer, Solent Strategies",
    email="steve@solentstrategies.com",
    title="Marketing that Maps the Customer Journey",
    suggestion="Yours is good. We would publish it exactly as written.",
    about=("Every founder is told to do marketing, and everyone they ask has a different opinion. Steve Cummins, a "
           "fractional CMO with more than 20 years in B2B marketing, walks the customer journey stage by stage and "
           "shows which tactics actually belong at each one. The session closes on the one or two things this cohort "
           "should do well rather than trying to cover every base."),
    aways=["Define the goal of your marketing, then match tactics to each stage",
           "What has to be in place before you spend: a clear message, a defined reachable audience",
           "Do one or two things well rather than covering every base"],
    bio=("Steve helps growing businesses punch above their weight, working with companies who are ready to take "
         "marketing seriously but are not ready for a full time CMO. That means developing the right message, "
         "reaching a broader audience, and executing a marketing plan tailored for their business. Steve has an "
         "engineering background and more than 20 years experience in global B2B marketing with name-brand companies "
         "and feisty start-ups. He also coaches and mentors marketers and teams of one."),
    need=[("Your 30 minutes", "Roughly 20 minutes of content, then questions. 30 minutes total, and we hold the clock."),
          ("Your deck", "Final version 72 hours before the session, so we can prep and promote."),
          ("Sync call", "15 minutes with us the week before. We send the invite."),
          ("Calendar hold", "Lands in your inbox as soon as you confirm the date.")],
    settle=["Which one or two tactics we close on, so the room leaves with a decision",
            "How much of the 30 minutes you want to keep for questions",
            "Whether your one-pager and eBook go into the cohort resource library under your name"],
  ),
  dict(
    name="Eric Schmalzbauer",
    date_line="Session 2<br>Mon, Sept 14 · 12:30 PM ET", fmt_line="Fireside chat<br>we interview, founders ask",
    aim="Any founder in the cohort. The worries overlap whatever the stage: fundraising, team building, go-to-market, managing investors.",
    linkedin="linkedin.com/in/ericschmalzbauer", applied="Aug 31", role="Former co-founder &amp; CEO, Prospective",
    email="eric.schmalzbauer@gmail.com",
    title="B2B: from idea &gt; funding &gt; failure",
    suggestion="Yours is good. We would publish it exactly as written.",
    about=("Founders hear success stories constantly and almost never a first-hand account of the other outcome. "
           "Eric Schmalzbauer takes us through the whole arc of his venture-backed B2B startup: the idea, the "
           "fundraising, building the team, and the decision to wind it down. He covers what worked, what he would "
           "change next time, and what he would do more of. A candid conversation rather than a polished talk."),
    aways=["Tangible examples of what worked and what did not inside a venture-backed startup",
           "As a founder you always have to be selling, in some form",
           "Honest acknowledgement that the job is very lonely"],
    bio=("Eric Schmalzbauer is a technology executive, founder, and venture partner across product strategy, data "
         "platforms, and go-to-market execution. He is the now former co-Founder and CEO of Prospective, the team "
         "behind the open-source Perspective project, building high-performance tools for interactive data "
         "analytics. Eric previously held senior leadership roles across financial market infrastructure and "
         "enterprise technology. As a Venture Partner at REFASHIOND Ventures, he advises early-stage founders on "
         "product-market fit, fundraising, and scaling."),
    need=[("Your 30 minutes", "A 30 minute conversation, questions from founders throughout. We hold the clock."),
          ("No deck needed", "It is a fireside. We drive with questions."),
          ("Sync call", "15 minutes with us the week before. We send the invite."),
          ("Calendar hold", "Lands in your inbox as soon as you confirm the date.")],
    settle=["What you are comfortable naming out loud: numbers, timelines, the decision to close",
            "The three questions you wish someone had asked you at the start, which become the run of show",
            "Who conducts the fireside with you, and how much time we leave for founder questions"],
  ),
  dict(
    name="Julia Kahky",
    date_line="Session 5<br>Mon, Sept 21 · 12:30 PM ET", fmt_line="Presentation<br>with slides, then Q&amp;A",
    aim="Founders at any stage, from idea through raising, and anyone selling into enterprise or regulated buyers where cycles are long and requirements arrive late.",
    linkedin="linkedin.com/in/juliamkahky", applied="Aug 28", role="VP Operations, Tailsight",
    email="julia.m.kahky@gmail.com",
    title="From startup to dissolution: a post-mortem",
    suggestion="Yours is good. One option: add the subtitle <b>Selling into enterprise and regulated markets</b>, so it reads distinctly beside another founder post-mortem in the same series. Entirely your call.",
    about=("Everything online is about how companies succeed. Julia Kahky takes the other route and walks through the "
           "post-mortem of a startup that closed, specifically what she learned selling software to enterprise "
           "customers and into highly regulated markets. Expect specifics on the problems worth avoiding early, "
           "product-market fit, and how long sales cycles really take."),
    aways=["Problems to avoid early on", "Product-market fit", "Sales cycles"],
    bio=("Julia Kahky is VP of Operations at a software company in the aviation industry, with prior experience as a "
         "chief of staff and in financial technology and operations in sports media. She started her career in "
         "finance and has worked across Fortune 15 companies, 500-person companies, and startups, with experience "
         "spanning finance, operations, marketing, revenue operations, and HR."),
    need=[("Your 30 minutes", "Roughly 20 minutes of content, then questions. 30 minutes total, and we hold the clock."),
          ("Your deck", "Final version 72 hours before the session, so we can prep and promote."),
          ("Sync call", "15 minutes with us the week before. We send the invite."),
          ("Calendar hold", "Lands in your inbox as soon as you confirm the date.")],
    settle=["How each takeaway becomes something a founder can act on the following Monday",
            "How much of the 30 minutes you want to keep for questions",
            "Where The Atrium and your AI tools list fit in the resource library"],
  ),
]

CSS = """
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 8.5in 11in; margin: 0; }
  :root { --ink: #110465; --body: #35324f; --soft: #6f6a8c; --pink: #cf5b8d; --rule: #d7d2e3; --wash: #f7f6f2; }
  body { background: #fff; color: var(--body); font-family: 'Archivo', system-ui, sans-serif;
    font-size: 8.9pt; line-height: 1.38; }
  .page { width: 8.5in; height: 10.96in; overflow: hidden; padding: 0.4in 0.66in 0.26in;
    display: flex; flex-direction: column; break-after: page; page-break-after: always; }
  .page:last-child { break-after: auto; page-break-after: auto; }

  .mast { display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 3px solid var(--ink); padding-bottom: 8px; }
  .mast .logo { width: 1.4in; height: 0.46in; background: url("uplift-logo.png") left bottom / contain no-repeat; }
  .mast .r { font-family: 'JetBrains Mono', monospace; font-size: 8pt; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--soft); }

  h1 { font-family: 'Archivo Narrow', sans-serif; font-weight: 700; font-size: 21pt;
    text-transform: uppercase; color: var(--ink); line-height: 1.0; margin-top: 16px; }
  .role { margin-top: 4px; font-size: 10.5pt; color: var(--body); }
  .contact { margin-top: 5px; font-family: 'JetBrains Mono', monospace; font-size: 8pt;
    letter-spacing: 0.04em; color: var(--soft); }
  .contact b { color: var(--ink); font-weight: 700; }
  .strip { margin-top: 10px; display: grid; grid-template-columns: 1.15fr 1.35fr 0.9fr;
    border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); }
  .strip div { padding: 7px 14px 7px 0; border-right: 1px solid var(--rule); }
  .strip div:last-child { border-right: none; padding-left: 14px; padding-right: 0; }
  .strip div:nth-child(2) { padding-left: 14px; }
  .strip .lab { font-family: 'JetBrains Mono', monospace; font-size: 7pt; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--soft); }
  .strip .val { margin-top: 3px; font-family: 'Archivo Narrow', sans-serif; font-weight: 700;
    font-size: 12.5pt; color: var(--ink); text-transform: uppercase; line-height: 1.12; }

  h2 { font-family: 'JetBrains Mono', monospace; font-size: 8pt; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; color: var(--pink); margin-top: 11px; }
  .titles { margin-top: 10px; display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px; }
  .tcell { border-top: 2px solid var(--ink); padding-top: 7px; }
  .tcell.sug { border-top-color: var(--pink); }
  .tcell .lab { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--soft); }
  .tcell.sug .lab { color: var(--pink); }
  .tcell .val { margin-top: 3px; font-family: 'Archivo Narrow', sans-serif; font-weight: 700;
    font-size: 15pt; color: var(--ink); line-height: 1.14; }
  .tcell.sug .val { font-family: 'Archivo', sans-serif; font-weight: 500; font-size: 10pt;
    line-height: 1.4; color: var(--body); }
  p.txt { margin-top: 6px; }
  ul.aways { margin: 9px 0 0 0; list-style: none; }
  ul.aways li { position: relative; padding-left: 16px; margin-bottom: 2px; }
  ul.aways li:before { content: "\\2014"; position: absolute; left: 0; color: var(--pink); font-weight: 700; }

  .need { margin-top: 8px; }
  .need .row { display: flex; gap: 14px; padding: 5px 0; border-bottom: 1px solid var(--rule); }
  .need .row:first-child { border-top: 1px solid var(--rule); }
  .need .lab { flex: 0 0 1.7in; font-weight: 600; color: var(--ink); }
  .copyband { margin-top: 12px; border-top: 3px solid var(--ink); padding-top: 9px;
    display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
  .copyband .l { font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); }
  .copyband .n { font-size: 9pt; color: var(--soft); text-align: right; }
  .copyblock { border-left: 3px solid var(--pink); padding-left: 16px; margin-top: 4px; }
  .copyblock h2:first-child { margin-top: 9px; }
  .settle { margin-top: 6px; background: var(--wash); padding: 8px 12px; }
  .settle ul { margin: 0 0 0 16px; }
  .settle li { margin-bottom: 2px; }

  .spacer { flex: 1; }
  .foot { border-top: 1px solid var(--rule); margin-top: 8px; padding-top: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; letter-spacing: 0.08em;
    color: var(--soft); display: flex; justify-content: space-between; }
"""

def page(s, i, total):
    aways = "\n".join(f'    <li>{a}</li>' for a in s["aways"])
    need = "\n".join(f'    <div class="row"><span class="lab">{k}</span><span>{v}</span></div>'
                     for k, v in s["need"])
    settle = "\n".join(f'      <li>{x}</li>' for x in s["settle"])
    first = s["name"].split()[0]
    return f"""
<div class="page">
  <div class="mast">
    <div class="logo"></div>
    <div class="r">Expert Session · Fall 2026 · {i} of {total}</div>
  </div>

  <h1>{s['name']}</h1>
  <p class="role">{s['role']}</p>
  <p class="contact">{s['email']} &nbsp;·&nbsp; {s['linkedin']}</p>
  <div class="strip">
    <div><p class="lab">When</p><p class="val">{s['date_line']}</p></div>
    <div><p class="lab">Format</p><p class="val">{s['fmt_line']}</p></div>
    <div><p class="lab">Length</p><p class="val">30 minutes<br>Virtual</p></div>
  </div>

  <div class="titles">
    <div class="tcell">
      <p class="lab">Your title</p>
      <p class="val">{s['title']}</p>
    </div>
    <div class="tcell sug">
      <p class="lab">Our suggestion</p>
      <p class="val">{s['suggestion']}</p>
    </div>
  </div>

  <div class="copyband">
    <span class="l">Default event copy</span>
    <span class="n">This is what we will publish on the event page.<br>If you would like it adjusted, send us the revisions.</span>
  </div>
  <div class="copyblock">
    <h2>About this session</h2>
    <p class="txt">{s['about']}</p>

    <h2>What you will leave with</h2>
    <ul class="aways">
{aways}
    </ul>

    <h2>Who it is for</h2>
    <p class="txt">{s['aim']}</p>

    <h2>About {first}</h2>
    <p class="txt">{s['bio']}</p>
  </div>

  <h2>What we need from you</h2>
  <div class="need">
{need}
  </div>

  <h2>To settle on the sync call</h2>
  <div class="settle">
    <ul>
{settle}
    </ul>
  </div>

  <div class="spacer"></div>
  <div class="foot"><span>Applied {s['applied']} · Uplift Expert Sessions, Fall 2026</span><span>Uplift Mentorship Program · TechUnited:NJ</span></div>
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
{''.join(page(s, i, len(SPEAKERS)) for i, s in enumerate(SPEAKERS, 1))}
</body>
</html>
"""
open("/Users/kennedy/uplift-app/public/uplift-speaker-onepagers.html", "w").write(html_out)
print("built", len(SPEAKERS), "briefs")
