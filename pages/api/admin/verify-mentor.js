// POST /api/admin/verify-mentor
// Body: { name, company, title, based, linkedin }
// Auth: ?token=<ADMIN_SECRET>
//
// The "Run the checks" button behind a Check or Review score. It searches the
// open web for the person and reports whether the claims on their application
// are corroborated anywhere the applicant does not control.
//
// LinkedIn itself is unreachable: every profile URL returns HTTP 999 behind an
// authwall whether the profile exists or not, so fetching one proves nothing.
// Search results carry the same facts in their titles ("Name - Title - Company
// | LinkedIn"), which is how the Fall 2026 case was actually resolved, so the
// server-side web_search tool does the work instead of a scraper.
//
// This never decides anything. It gathers, a human reads it.
import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY is not set on this deployment." });
  }

  const { name, company, title, based, linkedin } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const claims = [
    `Name: ${name}`,
    company ? `Claims to work at: ${company}` : null,
    title ? `Claims the title: ${title}` : null,
    based ? `Claims to be based in: ${based}` : null,
    linkedin ? `Gave this LinkedIn: ${linkedin}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `Someone applied to mentor early-stage founders in New Jersey. Search the web and tell me whether what they wrote about themselves is corroborated anywhere they do not control.

${claims}

Check, in order:
1. Does a real person by this name, matching these details, appear anywhere?
2. Does the organization exist, and does anything connect this person to it?
3. Is the job title corroborated by a source other than their own application?
4. Anything that contradicts what they wrote.

Report only what you actually found. If the name is common and you cannot tell which person is theirs, say that plainly rather than guessing. Absence of evidence is a real finding and is not the same as evidence of fraud: plenty of capable people have little web presence.

Reply as JSON and nothing else:
{"verdict":"corroborated"|"partial"|"nothing-found"|"contradicted",
 "summary":"two sentences a busy person can act on",
 "findings":[{"claim":"which claim","result":"what the search showed","source":"url or publication"}],
 "contradictions":["anything that conflicts with the application"]}`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages: [{ role: "user", content: prompt }],
    });

    // A refusal returns HTTP 200 with no usable content, so check before reading.
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ error: "The model declined this lookup.", raw: null });
    }

    // Server-tool failures also come back 200, as an error object in place of
    // the usual results list rather than as a thrown exception.
    const searchErrors = [];
    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && !Array.isArray(block.content)) {
        searchErrors.push(block.content?.error_code || "unknown");
      }
    }

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    let parsed = null;
    const match = /\{[\s\S]*\}/.exec(text);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { /* fall through to raw */ } }

    return res.status(200).json({
      ok: true,
      result: parsed,
      raw: parsed ? null : text,
      searchErrors,
      usage: { input: response.usage?.input_tokens, output: response.usage?.output_tokens },
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Rate limited, try again shortly." });
    if (e instanceof Anthropic.APIConnectionError) return res.status(502).json({ error: "Could not reach the API." });
    return res.status(500).json({ error: e?.message || "Lookup failed" });
  }
}
