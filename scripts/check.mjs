import { addDays, researchWindow } from "../src/window.mjs";
import { applyGate } from "../src/gate.mjs";
import { normalizeUrl, dedupeSources } from "../src/sources.mjs";
import { parseModelJson } from "../src/model.mjs";
import { planQueries } from "../src/queries.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

assert(addDays("2026-11-14", -30) === "2026-10-15", "subtract 30 days");

const past = researchWindow("2026-11-01T15:00", "2026-11-14");
assert(past.start === "2026-10-02" && past.end === "2026-11-01" && !past.empty, "past meeting window");

const soon = researchWindow("2026-11-20T09:30", "2026-11-14");
assert(soon.start === "2026-10-21" && soon.end === "2026-11-14" && !soon.empty, "near-future window ends today");

const far = researchWindow("2026-12-30", "2026-11-14");
assert(far.empty && far.start > far.end, "far meeting has no window yet");

assert(
  normalizeUrl("https://Example.com/a/#frag") === "https://example.com/a",
  "normalize url",
);

const sources = dedupeSources([
  { url: "https://news.example/a/", title: "A", score: 0.2, content: "one", publishedDate: "2026-11-02" },
  { url: "https://news.example/a", title: "A longer", score: 0.9, content: "two", publishedDate: "2026-11-02" },
  { url: "https://news.example/b", title: "B", score: 0.4, content: "three", publishedDate: "2026-10-01" },
]);
assert(sources.length === 2 && sources[0].title === "A longer", "dedupe keeps higher score");

const window = { start: "2026-10-15", end: "2026-11-14" };
const gated = applyGate(
  {
    oneLine: "A shipped a product.",
    findings: [
      {
        claim: "A shipped a product on 2 Nov.",
        category: "launch",
        sourceUrl: "https://news.example/a/",
        sourceTitle: "wrong title",
        confidence: "verified",
        whyItMatters: "Ask about rollout.",
      },
      {
        claim: "A raised a secret round.",
        category: "funding",
        sourceUrl: "https://invented.example/nope",
        confidence: "verified",
      },
      {
        claim: "A story from outside the window.",
        category: "news",
        sourceUrl: "https://news.example/b",
        confidence: "verified",
      },
    ],
    discussionPoints: ["Ask who owns rollout."],
    openQuestions: ["What is still private?"],
  },
  sources,
  window,
);

assert(gated.findings.length === 1, "keeps the sourced in-window claim");
assert(gated.findings[0].sourceTitle === "A longer", "title comes from the source");
assert(gated.findings[0].confidence === "verified", "dated source can stay verified");
assert(gated.heldBack.length === 2, "holds back invented URL and out-of-window source");
assert(gated.heldBack.some((item) => item.reason.includes("not in the Tavily")), "invented URL reason");

const undated = applyGate(
  {
    findings: [
      {
        claim: "Something was reported.",
        category: "news",
        sourceUrl: "https://news.example/c",
        confidence: "verified",
      },
    ],
  },
  [{ url: "https://news.example/c", title: "C", publishedDate: null, content: "x", score: 1 }],
  window,
);
assert(undated.findings[0].confidence === "partial", "undated source is partial");

const parsed = parseModelJson('```json\n{"findings":[]}\n```');
assert(Array.isArray(parsed.findings), "parse fenced json");

assert(planQueries("Ada Lovelace", "person").length === 4, "person plan");
assert(planQueries("Stripe", "company")[1].label === "Launches", "company launches query");

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("All citation and window checks passed.");
