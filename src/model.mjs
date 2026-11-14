import { PURPOSES } from "./queries.mjs";

function bifrostBase() {
  return process.env.BIFROST_BASE_URL.replace(/\/$/, "");
}

export function parseModelJson(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Bifrost returned a reply that was not JSON.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function formatSources(sources) {
  return sources
    .map((source, index) => {
      const date = source.publishedDate || "date unknown";
      return `[${index + 1}] ${date} | ${source.title}\nURL: ${source.url}\n${source.content}`;
    })
    .join("\n\n");
}

async function complete(messages, jsonMode = true) {
  const base = bifrostBase();
  const body = {
    model: process.env.BIFROST_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 1100,
    messages,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  let response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BIFROST_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    const refused = error?.cause?.code === "ECONNREFUSED" || String(error?.message || "").includes("fetch failed");
    if (refused) {
      throw new Error(`Could not reach Bifrost at ${base}. Start the gateway, or set BIFROST_BASE_URL in .env.`);
    }
    throw error;
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 220);
    if (jsonMode && (response.status === 400 || response.status === 422)) return complete(messages, false);
    throw new Error(`Bifrost request failed (${response.status}). ${detail}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Bifrost returned an empty completion.");
  return text;
}

export async function writeBrief({ subject, kind, purpose, goal, window, sources }) {
  const meetingPurpose = PURPOSES[purpose] || PURPOSES.general;
  const messages = [
    {
      role: "system",
      content: `You write a one-page pre-meeting briefing. You may only state a fact that appears in SOURCES. If a detail is not in SOURCES, it is not a finding.

Return one JSON object:
{
  "oneLine": "one sentence that only restates what the sources support, or says the record is thin",
  "findings": [
    {
      "claim": "one factual sentence",
      "category": "news|launch|hire|partnership|funding|other",
      "date": "YYYY-MM-DD or null",
      "whyItMatters": "one sentence for this meeting. An angle, not a new fact.",
      "sourceUrl": "copy an URL from SOURCES exactly",
      "sourceTitle": "copy that source title",
      "confidence": "verified|partial"
    }
  ],
  "discussionPoints": ["angle to raise, not a new fact"],
  "openQuestions": ["question the sources do not answer"]
}

Rules:
- At most 6 findings. Prefer launches, leadership changes, funding, partnerships, and other material updates. Skip duplicates.
- sourceUrl must be copied exactly from SOURCES. Never invent a URL.
- confidence is verified only when the source text states the claim directly. Use partial when the wording is softer.
- An empty findings array is the correct result when the sources are off topic.
- 3 discussion points and 3 open questions. Phrase them as conversation, not as extra facts.
- Do not invent numbers, dates, quotes, titles, or customers.`,
    },
    {
      role: "user",
      content: `Subject: ${subject}
Type: ${kind}
Meeting purpose: ${meetingPurpose}
Reader's goal: ${goal || "Walk in ready for a useful conversation."}
Window: ${window.start} to ${window.end}

SOURCES:
${formatSources(sources)}`,
    },
  ];

  const first = await complete(messages);
  try {
    return parseModelJson(first);
  } catch {
    const second = await complete([
      ...messages,
      { role: "assistant", content: first },
      { role: "user", content: "That was not valid JSON. Return only the JSON object." },
    ]);
    return parseModelJson(second);
  }
}

export function bifrostHost() {
  try {
    return new URL(bifrostBase()).host;
  } catch {
    return "bifrost";
  }
}
