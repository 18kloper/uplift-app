// /resources/nj-ecosystem
import ResourceLayout from "../../components/ResourceLayout";

export default function NJEcosystem() {
  return (
    <ResourceLayout
      icon="🌐"
      title="NJ Startup Ecosystem Overview"
      subtitle="Key players, resources, and networks for NJ founders"
      badge="New Jersey"
      sections={[
        {
          heading: "Why NJ Is Different",
          body: `New Jersey has one of the most underrated startup ecosystems in the country. It sits between two of the world's largest startup markets (NYC and Philadelphia), has a dense, diverse population, strong university talent pipelines (Rutgers, Princeton, Stevens, NJIT), and significant capital from family offices and regional VCs.

The challenge: it's fragmented. Unlike Silicon Valley or NYC, there's no single hub. The ecosystem lives in pockets — Montclair, Newark, New Brunswick, Princeton, Jersey City — each with its own energy and focus. Your job as a mentor is to help your mentee find where they fit.`,
        },
        {
          heading: "Key Organizations to Know",
          items: [
            "TechUnited NJ — statewide tech and startup community (you're here)",
            "Newark Venture Partners — seed-stage fund focused on Newark and urban NJ",
            "Princeton Innovation Center — deep tech, life sciences, university spinouts",
            "New Jersey Economic Development Authority (NJEDA) — grants, loans, and incentives for NJ companies",
            "NJIT Entrepreneurship Hub — tech founder programs in Newark",
            "Rutgers Technology Commercialization — university IP and spinouts",
            "New Jersey Angel Network (NJAN) — network of accredited angel investors",
            "Innovation Hub NJ — programs for diverse founders across the state",
          ],
        },
        {
          heading: "Funding Landscape",
          body: `NJ founders historically underutilize local capital. Most look immediately to NYC VCs, which is fine — but there's meaningful early-stage capital in NJ that's less competitive:

**Pre-seed / Angel**: NJ Angel Network, family offices concentrated in Bergen and Morris counties, and active angels in the TechUnited community.

**Seed**: Newark Venture Partners (urban/social impact focus), Jumpstart NJ, and several sector-specific NJ funds in life sciences and deep tech.

**State incentives**: NJEDA offers grants and low-interest loans for NJ-based companies, especially in tech, life sciences, and manufacturing. Many founders don't know these exist.`,
        },
        {
          heading: "Sector Strengths",
          items: [
            "Life sciences & pharma — one of the strongest life sciences corridors in the world (Middlesex/Somerset counties)",
            "FinTech — strong talent base from Wall Street spillover",
            "Enterprise SaaS — dense enterprise customer base across Fortune 500 companies headquartered in NJ",
            "E-commerce & logistics — NJ is a major distribution hub for the Northeast",
            "EdTech & workforce development — strong university ecosystem and community college network",
          ],
        },
        {
          heading: "Events & Community",
          items: [
            "Uplift Summit (August) — TechUnited's annual founder celebration and demo day",
            "TechUnited Signature Series — monthly events for the NJ tech community",
            "NJ Tech Week — annual statewide celebration of NJ's tech ecosystem",
            "Princeton Entrepreneurship Council events",
            "Newark startup community events via Newark Venture Partners",
            "1776 NJ — workspace and programming in various NJ locations",
          ],
        },
        {
          heading: "Helping Your Mentee Navigate NJ",
          body: `The most common question from NJ founders is "should I move to NYC?" The honest answer: maybe, for fundraising. But for building a company, many NJ-based founders find lower costs, less competition for talent, and a more accessible customer base.

The best thing you can do is introduce them to 2–3 specific people in your network — not a generic "you should meet people." A warm intro to one investor or potential customer is worth more than all the ecosystem knowledge in the world.`,
        },
      ]}
    />
  );
}
