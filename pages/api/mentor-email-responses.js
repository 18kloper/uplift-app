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
    replyDate: "2026-05-29",
    reply: "Please send some further details so can decide if can do 1 or both.",
    options: [
      { name: "Jagannadh Kanumuri", company: "ACI Infotech", slug: "jagannadh-kanumuri", stage: "Growth-stage", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
      { name: "Hamza Zafar", company: "HHALI LLC", slug: "hamza-zafar", stage: "MVP / Early build", industry: "AI / Data / ML", needs: "Go-to-market & customer acquisition" },
    ],
    selected: null,
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
];

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  return res.status(200).json({ responses: RESPONSES, lastRefreshed: "2026-06-02" });
}
