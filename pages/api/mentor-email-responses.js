// GET /api/mentor-email-responses
// Returns parsed mentor email responses from the Gmail threads.
// Data is sourced from manual parse of uplift@techunited.co / uplift@vip.techunited.co threads.
// To refresh: re-parse threads and update RESPONSES below.

const RESPONSES = [
  {
    threadId: "19e838e106446427",
    mentor: { name: "Jessie Lee", email: "jessie.lee@smartertravel.com" },
    replyDate: "2026-06-01",
    reply: "I would like to mentor Chandni Patel.",
    options: [
      { name: "Elaf Mahmoud", company: "Elune Health", slug: "elaf-mahmoud", stage: "Idea stage", industry: "CPG / Consumer Brands", needs: "Refining pitch or company narrative" },
      { name: "Chandni Patel", company: "BOA (startup name undecided)", slug: "chandni-patel", stage: "Idea stage", industry: "Other", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Chandni Patel",
  },
  {
    threadId: "19e7a7a939fe360e",
    mentor: { name: "Joe Spivack", email: "spivack@yahoo.com" },
    replyDate: "2026-06-01",
    reply: "I'm happy to act as a mentor for Sharon Joseph.",
    options: [
      { name: "Sharon Joseph", company: "CREWASIS.AI", slug: "sharon-joseph", stage: "Revenue-generating", industry: "Enterprise SaaS / B2B", needs: "Fundraising strategy & investor readiness" },
      { name: "Daniel Patton", company: "DreamEngine AI", slug: "daniel-patton", stage: "MVP / Early build", industry: "AI / Data / ML", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Sharon Joseph",
    note: "Sharon Joseph churned Jun 2026 — Joe has 1 open slot.",
  },
  {
    threadId: "19e805a83a423d5b",
    mentor: { name: "Dan Gura", email: "dgura@hugoneu.com" },
    replyDate: "2026-05-31",
    reply: "Hi thank you. Actually neither are great fits for my background as I'm in computer science / data science. But I'm still happy to help if you'd like.",
    options: [
      { name: "Bejan Moers", company: "United Solution", slug: "bejan-moers", stage: "Early traction", industry: "Other", needs: "Go-to-market & customer acquisition" },
      { name: "Abhaya Pawar", company: "Ilika LLC", slug: "abhaya-pawar", stage: "Early traction", industry: "Climate / Energy", needs: "Go-to-market & customer acquisition" },
    ],
    selected: null,
  },
  {
    threadId: "19e88f0ab95f7829",
    mentor: { name: "Vikram Wadhawan", email: "vikram@vasitum.com" },
    replyDate: "2026-06-02",
    reply: "I'd be happy to mentor both teams. One note regarding Ahmed Metwoali — Sphinque: we operate in the same industry, although our product has a broader and deeper scope than what I understand he is currently building. I want to be transparent about that upfront. If he is comfortable with this overlap, I'd be happy to share my experience and help him avoid some of the mistakes and challenges we encountered along our journey.",
    options: [
      { name: "Ahmed Metwoali", company: "Sphinque", slug: "ahmed-metwoali", stage: "MVP / Early build", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
      { name: "Idongesit Obeya", company: "Altruistic Scribe", slug: "idongesit-obeya", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e83523ac1d5542",
    mentor: { name: "Jennifer Jolley", email: "jenniferj@pdhi.com" },
    replyDate: "2026-06-01",
    reply: "I am happy to take on both mentees and will confirm my attendance at the June and August Hoboken events.",
    options: [
      { name: "Jordan-River Samuel", company: "tapyoca", slug: "jordan-river-samuel", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
      { name: "Chirag Shah", company: "Crestwood Digital", slug: "chirag-shah", stage: "Early traction", industry: "Other", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e88bc9aae5f270",
    mentor: { name: "Ed Sawma", email: "ed@edsawma.com" },
    replyDate: "2026-06-02",
    reply: "I can definitely mentor both Anthony and Ebunoluwa!",
    options: [
      { name: "Anthony Caruso", company: "Contextral", slug: "anthony-caruso", stage: "Early traction", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
      { name: "Ebunoluwa Adenekan", company: "KLA Corporation", slug: "ebunoluwa-adenekan", stage: "Idea stage", industry: "Hardware / Manufacturing", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e839ffff3127d2",
    mentor: { name: "Jeffrey Allen", email: "mariner5050@gmail.com" },
    replyDate: "2026-06-01",
    reply: "It will be my pleasure to mentor Pearl Gable and Maab Iqbal in this session.",
    options: [
      { name: "Pearl Gabel", company: "TBD", slug: "pearl-gabel", stage: "Idea stage", industry: "Media / Marketing / Advertising", needs: "Clarifying near-term priorities" },
      { name: "Maab Iqbal", company: "TBD", slug: "maab-iqbal", stage: "Idea stage", industry: "Media / Marketing / Advertising", needs: "Understanding NJ ecosystem" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e7fe91d3724386",
    mentor: { name: "Mark Nelson", email: "mark.nelson100@gmail.com" },
    replyDate: "2026-05-31",
    reply: "Yes -- I'm happy to mentor both people.",
    options: [
      { name: "Naveen Kumar", company: "Truxt", slug: "naveen-kumar", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
      { name: "Mehul Sompura", company: "Diamond Hedge", slug: "mehul-sompura", stage: "Revenue-generating", industry: "Retail / Marketplace / E-commerce", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e79b2fd9c96710",
    mentor: { name: "Marc Saint-Ulysse", email: "marc@northgateops.io" },
    replyDate: "2026-05-30",
    reply: "Hello - I will mentor both companies.",
    options: [
      { name: "Shanthi Viswanathan", company: "Infivista Inc", slug: "shanthi-viswanathan", stage: "Early traction", industry: "Other", needs: "Go-to-market & customer acquisition" },
      { name: "Saurabh Gandhe", company: "Creative Sprouts Inc", slug: "saurabh-gandhe", stage: "Revenue-generating", industry: "Media / Marketing / Advertising", needs: "Clarifying near-term priorities" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e78d20700e1405",
    mentor: { name: "Eric Schmalzbauer", email: "eric.schmalzbauer@gmail.com" },
    replyDate: "2026-05-30",
    reply: "Happy to support both founders",
    options: [
      { name: "Sonali Chilupuri", company: "Recky Solutions LLC", slug: "sonali-chilupuri", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
      { name: "Paula Machado Jackler", company: "Ozzie", slug: "paula-machado-jackler", stage: "MVP / Early build", industry: "Finance / Fintech", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e7645bb7a0ccf4",
    mentor: { name: "Rahul Mehendale", email: "rahul.mehendale@gmail.com" },
    replyDate: "2026-06-02",
    reply: "Can meet with both.",
    options: [
      { name: "Jagannadh Kanumuri", company: "ACI Infotech", slug: "jagannadh-kanumuri", stage: "Growth-stage", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
      { name: "Hamza Zafar", company: "HHALI LLC", slug: "hamza-zafar", stage: "MVP / Early build", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "both",
  },
  {
    threadId: "19e763023f7e2c44",
    mentor: { name: "Orin Davis", email: "dr.orin.davis@gmail.com" },
    replyDate: "2026-05-29",
    reply: "I'll do both.",
    options: [
      { name: "Stephanie Scott-Bradshaw", company: "First and Last PR", slug: "stephanie-scott-bradshaw", stage: "Revenue-generating", industry: "Media / Marketing / Advertising", needs: "Sense-checking decisions with an advisor" },
      { name: "Parminder Singh", company: "DeepInspect.ai", slug: "parminder-singh", stage: "Early traction", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e89409a73dc381",
    mentor: { name: "ebun okubanjo", email: "et@mssuzie.io" },
    replyDate: "2026-06-02",
    reply: "I have decided on this company: Elisa Charters — Juegos AI Lab. I would have loved to do both but due to work, I want to be on the safer side and give my all to this. I also know software and consumer tech a lot more than I do hardware and manufacturing.",
    options: [
      { name: "Andrea Vernengo", company: "TrueSkin", slug: "andrea-vernengo", stage: "MVP / Early build", industry: "Hardware / Manufacturing", needs: "Fundraising strategy & investor readiness" },
      { name: "Elisa Charters", company: "Juegos AI Lab", slug: "elisa-charters", stage: "Early traction", industry: "Other", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Elisa Charters",
  },
  {
    threadId: "19e899e0aa6cd59c",
    mentor: { name: "Roman Tsibulevskiy", email: "roman.tsibulevskiy@dentons.com" },
    replyDate: "2026-06-02",
    reply: "Option 2 - Jean Guerdy Paul — TETHRRA. I will try to attend the in-person midpoint meetup and the in-person summit.",
    options: [
      { name: "Shell Bobev", company: "Disrupt The Gap", slug: "shell-bobev", stage: "Revenue-generating", industry: "Government / Civic / Policy", needs: "Product strategy & roadmap decisions" },
      { name: "Jean Guerdy Paul", company: "TETHRRA", slug: "jean-guerdy-paul", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Refining pitch or company narrative" },
    ],
    selected: "Jean Guerdy Paul",
  },
  {
    threadId: "19e89e98bf6bb5c9",
    mentor: { name: "Aizaz Shariff", email: "shariff.aizaz@gmail.com" },
    replyDate: "2026-06-02",
    reply: "I will support both of them and I responded to this earlier, also.",
    options: [
      { name: "Justin Savage", company: "STEAM FOR ME", slug: "justin-savage", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Fundraising strategy & investor readiness" },
      { name: "Pierre Girgis", company: "Veriflo LLC", slug: "pierre-girgis", stage: "Idea stage", industry: "AI / Data / ML", needs: "Product strategy & roadmap decisions" },
    ],
    selected: "both",
  },
  {
    threadId: "19e89f2d33b2dba7",
    mentor: { name: "Vishal Soni", email: "vsoni@viridbiosolutions.com" },
    replyDate: "2026-06-02",
    reply: "I can only mentor 1. Natalie from The Zigzig business appears to be more closer to my business area expertise. Thus, Zigzag might be a better fit for me.",
    options: [
      { name: "Soheil Khosravinejad", company: "DRIFTLANE", slug: "soheil-khosravinejad", stage: "Early traction", industry: "Media / Marketing / Advertising", needs: "Preparing for a major inflection point (raise, launch, pivot, expansion)" },
      { name: "Natalie Kitts", company: "The Zigzag Flow, Therapy Services", slug: "natalie-kitts", stage: "Early traction", industry: "Other", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Natalie Kitts",
  },
  {
    threadId: "19e8a0e74f44b46f",
    mentor: { name: "Natalie Kaminski", email: "natalie@jetrockets.com" },
    replyDate: "2026-06-02",
    reply: "I confirm my availability to mentor, but unfortunately I won't be able to attend the in-person meetings due to prior travel commitments.",
    options: [
      { name: "Jedidiah Worrell", company: "Unnamed (Idea Stage)", slug: "jedidiah-worrell", stage: "Idea stage", industry: "Retail / Marketplace / E-commerce", needs: "Product strategy & roadmap decisions" },
      { name: "Tosca Marleen", company: "Tend to Belle", slug: "tosca-marleen", stage: "MVP / Early build", industry: "Retail / Marketplace / E-commerce", needs: "Hiring, team structure & leadership" },
    ],
    selected: "both",
  },
  {
    threadId: "19e8a6860e11cc88",
    mentor: { name: "Wadnes Castelly", email: "wadnes@kapab.co" },
    replyDate: "2026-06-02",
    reply: "Confirming I can mentor both of my matches.",
    options: [
      { name: "Debbie Douglas-Henry", company: "3DHR Consulting, LLC", slug: "debbie-douglas-henry", stage: "Early traction", industry: "Media / Marketing / Advertising", needs: "Go-to-market & customer acquisition" },
      { name: "Kima D'Anjou", company: "The Keenly Group LLC", slug: "kima-danjou", stage: "Revenue-generating", industry: "Enterprise SaaS / B2B", needs: "Sense-checking decisions with an experienced operator" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e8a3230e1e1de3",
    mentor: { name: "Marty Coleman", email: "colemanglobal@gmail.com" },
    replyDate: "2026-06-02",
    reply: "Option 1, please!!",
    options: [
      { name: "Jhamar Youngblood", company: "Brickcity", slug: "jhamar-youngblood", stage: "Early traction", industry: "Other", needs: "Go-to-market & customer acquisition" },
      { name: "Ekaterina Kashkina", company: "Stealth-mode molecular diagnostics startup", slug: "ekaterina-kashkina", stage: "MVP / Early build", industry: "Other", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Jhamar Youngblood",
  },
  {
    threadId: "19e8a636cf9d51c1",
    mentor: { name: "Bruno Bilik", email: "bbilik@gmail.com" },
    replyDate: "2026-06-02",
    reply: "I'd be happy to work with both of my matches, Shounak Thaker (Arnex Solutions LLC) and Harshil Thakkar (Newyorklife).",
    options: [
      { name: "Shounak Thaker", company: "Arnex Solutions LLC", slug: "shounak-thaker", stage: "Revenue-generating", industry: "Other", needs: "Fundraising strategy & investor readiness" },
      { name: "Harshil Thakkar", company: "Newyorklife", slug: "harshil-thakkar", stage: "Revenue-generating", industry: "Finance / Fintech", needs: "Understanding the NJ/regional startup ecosystem" },
    ],
    selected: "Both",
    note: "Shounak Thaker churned Jun 2026 — Bruno continues with Harshil only, has 1 open slot.",
  },
  {
    threadId: "19e8df6aa13f18e4",
    mentor: { name: "Yuri Fiaschi", email: "yurifiaschi@gmail.com" },
    replyDate: "2026-06-03",
    reply: "I'm happy to confirm my participation in the Uplift Mentorship Program, and I'd be glad to support both matched founders: Lianna and Rachel.",
    options: [
      { name: "Lianna LaRiccia", company: "Quanticore", slug: "lianna-lariccia", stage: "MVP / Early build", industry: "Enterprise SaaS / B2B", needs: "Fundraising strategy & investor readiness" },
      { name: "Rachel Hayes", company: "Ravel Genetics", slug: "rachel-hayes", stage: "MVP / Early build", industry: "Enterprise SaaS / B2B", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Both",
  },
  // --- Confirmed via individual Kennedy emails / other channels ---
  {
    threadId: "19e9449ad7f9946a",
    mentor: { name: "Vishal Goyal", email: "vishal0073@gmail.com" },
    replyDate: "2026-06-04",
    reply: "Hello, I accept mentoring Elune Health. Could you please suggest other mentees in the digital health, life sciences, hospitals, or biotech space. I am flexible to mentor 2 mentees.",
    options: [
      { name: "Elaf Mahmoud", company: "Elune Health", slug: "elaf-mahmoud", stage: "Idea stage", industry: "CPG / Consumer Brands", needs: "Refining pitch or company narrative" },
    ],
    selected: "Elaf Mahmoud",
  },
  {
    threadId: "19e8e9f2d22d5f8c",
    mentor: { name: "Soojin Choung", email: "soojin@witnesspartners.us" },
    replyDate: "2026-06-03",
    reply: "Forwarded confirmation to Kennedy — confirmed for Andrea Ferguson Peterson.",
    options: [
      { name: "Andrea Ferguson Peterson", company: "Everyday Unstoppable", slug: "andrea-ferguson-peterson", stage: "Revenue-generating", industry: "Retail / Marketplace / E-commerce", needs: "Clarifying near-term company priorities" },
    ],
    selected: "Andrea Ferguson Peterson",
  },
  {
    threadId: "19e9eeff03786c49",
    mentor: { name: "Stella Alvo", email: "stella.alvo@gmail.com" },
    replyDate: "2026-06-06",
    reply: "I want to mentor only one person. Please let me know where the meetings in Hoboken will be held when the information becomes available. The person I choose is: Abhaya Pawar — Ilika LLC.",
    options: [
      { name: "Abhaya Pawar", company: "Ilika LLC", slug: "abhaya-pawar", stage: "Early traction", industry: "Climate / Energy", needs: "Go-to-market & customer acquisition" },
      { name: "Andrea Vernengo", company: "TrueSkin", slug: "andrea-vernengo", stage: "MVP / Early build", industry: "Hardware / Manufacturing", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Abhaya Pawar",
  },
  {
    threadId: "19e9d101fac187d0",
    mentor: { name: "Kenneth Jones", email: "kenjonesnj@gmail.com" },
    replyDate: "2026-06-06",
    reply: "Hello. I am away this weekend, doing both is ok with me.",
    options: [
      { name: "Radha Ratnala", company: "Rekogni AI", slug: "radha-ratnala", stage: "MVP / Early build", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
      { name: "Rajesh Ivaturi", company: "SekurAI", slug: "rajesh-ivaturi", stage: "MVP / Early build", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "19e9938344ea45b9",
    mentor: { name: "Michael Baer", email: "michael.baer@techcxo.com" },
    replyDate: "2026-06-05",
    reply: "Confirmed via direct reply to Kennedy — confirmed for Soheil Khosravinejad.",
    options: [
      { name: "Soheil Khosravinejad", company: "DRIFTLANE", slug: "soheil-khosravinejad", stage: "Early traction", industry: "Media / Marketing / Advertising", needs: "Preparing for a major inflection point (raise, launch, pivot, expansion)" },
    ],
    selected: "Soheil Khosravinejad",
  },
  {
    threadId: "19e9938344ea45b9",
    mentor: { name: "Stephen Makinen", email: "stephen.makinen@gmail.com" },
    replyDate: "2026-06-08",
    reply: "Hello Kennedy! Thank you for accepting my application to volunteer as a mentor. I confirm that I can satisfy the two specified requirements. I look forward to supporting this program and my paired mentee, Andrea Vernengo.",
    options: [
      { name: "Andrea Vernengo", company: "TrueSkin", slug: "andrea-vernengo", stage: "MVP / Early build", industry: "Hardware / Manufacturing", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Andrea Vernengo",
  },
  {
    threadId: "19e9939c45d1d71e",
    mentor: { name: "Anatole Norland", email: "anorland@rewritingthecode.org" },
    replyDate: "2026-06-08",
    reply: "I confirm!",
    options: [
      { name: "Gunjan Aggarwal", company: "Virre", slug: "gunjan-aggarwal", stage: "Early traction", industry: "AI / Data / ML", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Gunjan Aggarwal",
  },
  {
    threadId: "19e9936a895afb8e",
    mentor: { name: "Anand Rai", email: "arai2@stevens.edu" },
    replyDate: "2026-06-05",
    reply: "Yes can attend the in-person midpoint meetup and the in-person summit. Not sure what is the commitment — I would love to help both but if I have to pick in order I will do 1) Evan Peneiras - Nooriva 2) Nina Mladenovski - Zenia Graph.",
    options: [
      { name: "Evan Peneiras", company: "Nooriva", slug: "evan-peneiras", stage: "MVP / Early build", industry: "AI / Data / ML", needs: "Understanding the NJ/regional startup ecosystem" },
      { name: "Nina Mladenovski", company: "Zenia Graph", slug: "nina-mladenovski", stage: "Revenue-generating", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Evan Peneiras",
  },
  {
    threadId: "admin-confirmed-christina-dorando",
    mentor: { name: "Christina Dorando", email: "cdorando@cresthillacademy.com" },
    replyDate: "2026-06-05",
    reply: "Confirmed via admin — mentoring both Sarah Inoue and Aliya Laliwala.",
    options: [
      { name: "Sarah Inoue", company: "Crafty Dessert LLC", slug: "sarah-inoue", stage: "Early traction", industry: "Retail / Marketplace / E-commerce", needs: "Preparing for a major inflection point (raise, launch, pivot, expansion)" },
      { name: "Aliya Laliwala", company: "Campus Marketplace", slug: "aliya-laliwala", stage: "Early traction", industry: "Retail / Marketplace / E-commerce", needs: "Preparing for a major inflection point (raise, launch, pivot, expansion)" },
    ],
    selected: "Both",
  },
  {
    threadId: "admin-confirmed-marc-kaufman",
    mentor: { name: "Marc Kaufman", email: "mkaufman@potomaclaw.com" },
    replyDate: "2026-06-05",
    reply: "Confirmed via admin — mentoring both Daniel Lee and Han Nguyen.",
    options: [
      { name: "Daniel Lee", company: "Bruce AI (OnwardJustice Inc.)", slug: "daniel-lee", stage: "Revenue-generating", industry: "AI / Data / ML", needs: "Fundraising strategy & investor readiness" },
      { name: "Han Nguyen", company: "Ox Group", slug: "han-nguyen", stage: "Early traction", industry: "Finance / Fintech", needs: "Fundraising strategy & investor readiness" },
    ],
    selected: "Both",
  },
  {
    threadId: "admin-confirmed-pavan-kumar",
    mentor: { name: "Pavan Kumar", email: "pavan@3pmventures.com" },
    replyDate: "2026-06-05",
    reply: "Confirmed via admin — mentoring Rajesh Ivaturi.",
    options: [
      { name: "Rajesh Ivaturi", company: "SekurAI", slug: "rajesh-ivaturi", stage: "MVP / Early build", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Rajesh Ivaturi",
  },
  {
    threadId: "admin-confirmed-miquel-dequadras",
    mentor: { name: "Miquel de Quadras", email: "mquadras@atomian.com" },
    replyDate: "2026-06-05",
    reply: "Confirmed Nina Mladenovski — declined Jerry Primus (chose Nina only).",
    options: [
      { name: "Nina Mladenovski", company: "Zenia Graph", slug: "nina-mladenovski", stage: "Revenue-generating", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
      { name: "Jerry Primus", company: "PCLinkup", slug: "jerry-primus", stage: "Revenue-generating", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Nina Mladenovski",
  },
  {
    threadId: "19f2a8c3jennifer-dangelo-confirmed",
    mentor: { name: "Jennifer D'Angelo", email: "jennifer.dangelo@njii.com" },
    replyDate: "2026-06-08",
    reply: "Hi Yes I'm available.",
    options: [
      { name: "Shell Bobev", company: "Disrupt The Gap", slug: "shell-bobev", stage: "Revenue-generating", industry: "Government / Civic / Policy", needs: "Product strategy & roadmap decisions" },
      { name: "Angela Aricatt", company: "", slug: "angela-aricatt", stage: "", industry: "Government / Civic / Policy", needs: "Hiring & leadership" },
    ],
    selected: "Both",
  },

  // ─── Jun 10–11 confirmations ──────────────────────────────────────────────────

  {
    threadId: "admin-confirmed-aditi-sinha",
    mentor: { name: "Aditi Sinha", email: "aditiisinhaaa@gmail.com" },
    replyDate: "2026-06-10",
    reply: "I missed replying to your email yesterday but I am still available and interested in volunteering. I am traveling this week but available next week for intros or calls.",
    options: [
      { name: "Eliana Zebro", company: "EleCare", slug: "eliana-zebro", stage: "MVP / Early build", industry: "Healthcare / Wellness", needs: "Go-to-market & customer acquisition" },
      { name: "Adeola Adeoye-Davids", company: "AfroFusion", slug: "adeola-adeoye-davids", stage: "Early traction", industry: "Retail / Marketplace / E-commerce", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "admin-confirmed-dee-marshall",
    mentor: { name: "Dee Marshall", email: "dee.c.marshall@aitrainingplus.com" },
    replyDate: "2026-06-08",
    reply: "Yes I'm in. I can be live on June 23, August 4 I'll be out town.",
    options: [
      { name: "Stephanie Cwynar", company: "StepUp Eats", slug: "stephanie-cwynar", stage: "Early traction", industry: "Food / Restaurant / Hospitality", needs: "Go-to-market & customer acquisition" },
      { name: "Jeremy Ruiz Villavicencio", company: "Nooriva", slug: "jeremy-ruiz-villavicencio", stage: "MVP / Early build", industry: "AI / Data / ML", needs: "Understanding NJ startup ecosystem" },
    ],
    selected: "Both",
  },
  {
    threadId: "admin-confirmed-dennis-yuscavitch",
    mentor: { name: "Dennis Yuscavitch", email: "dennis.yuscavitch@njeda.com" },
    replyDate: "2026-06-08",
    reply: "yes, was looking forward to participating",
    options: [
      { name: "Kevin Navarro", company: "Navarro Digital Media LLC", slug: "kevin-navarro", stage: "Early traction", industry: "Media / Marketing / Advertising", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Kevin Navarro",
  },
  {
    threadId: "admin-confirmed-clare-denicola",
    mentor: { name: "Clare DeNicola", email: "claredenicola@gmail.com" },
    replyDate: "2026-06-09",
    reply: "Confirmed. I can do it.",
    options: [
      { name: "Logan Jones", company: "Elroi", slug: "logan-jones", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Logan Jones",
  },
  {
    threadId: "admin-confirmed-goncalo-esteves",
    mentor: { name: "Goncalo Esteves", email: "estevesgoncalo@gmail.com" },
    replyDate: "2026-06-08",
    reply: "Yes I can mentor both.",
    options: [
      { name: "Neha Chopade", company: "Chopade Solutions", slug: "neha-chopade", stage: "Early traction", industry: "Enterprise SaaS / B2B", needs: "Go-to-market & customer acquisition" },
      { name: "Jasmin Jones", company: "JJ Creative", slug: "jasmin-jones", stage: "Idea stage", industry: "Media / Marketing / Advertising", needs: "Refining pitch or company narrative" },
    ],
    selected: "Both",
  },
  {
    threadId: "admin-confirmed-malak-atut",
    mentor: { name: "Malak Atut", email: "malakatut@gmail.com" },
    replyDate: "2026-06-08",
    reply: "I would be happy to mentor both of these entrepreneurs. Please confirm I will be able to do the one on one meetings over Zoom.",
    options: [
      { name: "Angie Tirado", company: "Tirado Consulting", slug: "angie-tirado", stage: "Revenue-generating", industry: "Other", needs: "Scaling & operations" },
      { name: "Mohammad Saleh Nikoopayan Tak", company: "Unnamed", slug: "mohammad-saleh-nikoopayan-tak", stage: "Idea stage", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Both",
  },
  {
    threadId: "admin-confirmed-connie-pascal",
    mentor: { name: "Connie Pascal", email: "cpascal@comminfo.rutgers.edu" },
    replyDate: "2026-06-08",
    reply: "I have time for one team this summer and the team I believe I'm best aligned with — Britney Medich",
    options: [
      { name: "Britney Medich", company: "The Medich Group", slug: "britney-medich", stage: "Revenue-generating", industry: "Media / Marketing / Advertising", needs: "Scaling & operations" },
      { name: "Alok Rai", company: "Rai Ventures", slug: "alok-rai", stage: "Idea stage", industry: "Other", needs: "Go-to-market & customer acquisition" },
    ],
    selected: "Britney Medich",
  },

  // ─── Non-responsive mentors (no reply received) ───────────────────────────────

  {
    threadId: "no-reply-tom-oser",
    mentor: { name: "Tom Oser", email: "tomoser@pipeline-strategies.com" },
    replyDate: null,
    reply: null,
    noReply: true,
    options: [],
    selected: null,
  },
  {
    threadId: "no-reply-rikin-diwan",
    mentor: { name: "Rikin Diwan", email: "rikin@lowercaseb2b.com" },
    replyDate: null,
    reply: null,
    noReply: true,
    options: [],
    selected: null,
  },
  {
    threadId: "no-reply-joseph-gadino",
    mentor: { name: "Joseph Gadino", email: "jgadino414@gmail.com" },
    replyDate: null,
    reply: null,
    noReply: true,
    options: [
      { name: "Annalyce D'Agostino-Gavin", company: "DAG Digital", slug: "annalyce-dagostino-gavin", stage: "Early traction", industry: "Media / Marketing / Advertising", needs: "Go-to-market & customer acquisition" },
    ],
    selected: null,
  },
];

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  return res.status(200).json({ responses: RESPONSES, lastRefreshed: "2026-06-11" });
}
