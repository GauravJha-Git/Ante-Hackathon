import { normalizeUrl } from "./sources.mjs";

const CATEGORIES = new Set(["news", "launch", "hire", "partnership", "funding", "other"]);

function clean(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function asDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function takeLines(value, max, limit) {
  if (!Array.isArray(value)) return [];
  const lines = [];
  for (const item of value) {
    const text = clean(item, limit);
    if (!text) continue;
    lines.push(text);
    if (lines.length === max) break;
  }
  return lines;
}

export function applyGate(draft, sources, window) {
  const byUrl = new Map(sources.map((source) => [normalizeUrl(source.url), source]));
  const findings = [];
  const heldBack = [];
  const seen = new Set();
  const incoming = Array.isArray(draft?.findings) ? draft.findings : [];

  for (const raw of incoming) {
    const claim = clean(raw?.claim, 320);
    if (!claim) continue;
    const key = claim.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const source = byUrl.get(normalizeUrl(raw?.sourceUrl));
    if (!source) {
      heldBack.push({ claim, reason: "The URL was not in the Tavily results for this window." });
      continue;
    }

    const published = asDate(source.publishedDate);
    if (published && (published < window.start || published > window.end)) {
      heldBack.push({
        claim,
        reason: `The source is dated ${published}, outside ${window.start} to ${window.end}.`,
      });
      continue;
    }

    let confidence = raw?.confidence === "verified" ? "verified" : "partial";
    if (!published) confidence = "partial";

    findings.push({
      claim,
      category: CATEGORIES.has(raw?.category) ? raw.category : "other",
      date: published,
      whyItMatters: clean(raw?.whyItMatters, 280),
      sourceUrl: source.url,
      sourceTitle: source.title || clean(raw?.sourceTitle, 180) || source.url,
      confidence,
    });
    if (findings.length === 6) break;
  }

  const oneLine = findings.length
    ? clean(draft?.oneLine, 280) || "Sourced developments from this window are below."
    : "Nothing in this window was strong enough to state as fact.";

  return {
    oneLine,
    findings,
    discussionPoints: takeLines(draft?.discussionPoints, 4, 240),
    openQuestions: takeLines(draft?.openQuestions, 4, 240),
    heldBack: heldBack.slice(0, 6),
  };
}
