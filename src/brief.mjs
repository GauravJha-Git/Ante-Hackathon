import { requireConfig, searchDepth } from "./env.mjs";
import { researchWindow } from "./window.mjs";
import { planQueries, PURPOSES } from "./queries.mjs";
import { tavilySearch } from "./tavily.mjs";
import { dedupeSources } from "./sources.mjs";
import { applyGate } from "./gate.mjs";
import { writeBrief, bifrostHost } from "./model.mjs";

const KINDS = new Set(["company", "person"]);

function fallbackConversation(subject) {
  return {
    discussionPoints: [
      `Ask what ${subject} treats as the real change in this window, versus noise.`,
      "Ask which of the public items is still in motion.",
      "Ask what they want from this meeting that a news search would miss.",
    ],
    openQuestions: [
      `What happened for ${subject} in this window that is not public yet?`,
      "Which of these items should we not assume is settled?",
      "What would make this meeting useful if the public record is thin?",
    ],
  };
}

function emptyBrief(base, reason) {
  const conversation = fallbackConversation(base.subject);
  return {
    ...base,
    oneLine: reason,
    findings: [],
    discussionPoints: conversation.discussionPoints,
    openQuestions: conversation.openQuestions,
    heldBack: [],
    sourcesRead: [],
  };
}

export async function runBrief(input, send) {
  requireConfig();

  const subject = String(input.subject || "").replace(/\s+/g, " ").trim();
  if (subject.length < 2 || subject.length > 120) {
    throw new Error("Enter a company or person name, up to 120 characters.");
  }
  const kind = KINDS.has(input.kind) ? input.kind : "company";
  const purpose = PURPOSES[input.purpose] ? input.purpose : "general";
  const goal = String(input.goal || "").replace(/\s+/g, " ").trim().slice(0, 400);
  const meeting = String(input.meeting || "");
  const window = researchWindow(meeting, input.today);

  const base = {
    subject,
    kind,
    purpose,
    goal,
    meeting,
    window,
    model: process.env.BIFROST_MODEL || "gpt-4o-mini",
    bifrostHost: bifrostHost(),
    searchDepth: searchDepth(),
    searches: [],
  };

  send({
    type: "status",
    message: window.empty
      ? window.note
      : `Searching ${window.start} to ${window.end}.`,
  });

  if (window.empty) {
    send({ type: "brief", brief: emptyBrief(base, window.note) });
    return;
  }

  const queries = planQueries(subject, kind);
  const collected = [];
  const failures = [];

  await Promise.all(
    queries.map(async (query) => {
      send({ type: "search", state: "start", label: query.label, query: query.query });
      try {
        const found = await tavilySearch({
          query: query.query,
          topic: query.topic,
          startDate: window.start,
          endDate: window.end,
        });
        collected.push(...found);
        send({
          type: "search",
          state: "done",
          label: query.label,
          query: query.query,
          count: found.length,
        });
        base.searches.push({ label: query.label, query: query.query, count: found.length });
      } catch (error) {
        failures.push(error.message || "Search failed.");
        send({
          type: "search",
          state: "error",
          label: query.label,
          query: query.query,
          message: error.message || "Search failed.",
        });
      }
    }),
  );

  const order = new Map(queries.map((query, index) => [query.label, index]));
  base.searches.sort((a, b) => order.get(a.label) - order.get(b.label));

  const sources = dedupeSources(collected);
  if (!sources.length) {
    if (failures.length === queries.length) {
      throw new Error(failures[0]);
    }
    send({
      type: "brief",
      brief: emptyBrief(base, "Tavily returned no sources in this 30-day window, so Ante has no findings to state."),
    });
    return;
  }

  send({
    type: "status",
    message: `Writing from ${sources.length} sources. Claims that do not match a source URL are held back.`,
  });

  const draft = await writeBrief({ subject, kind, purpose, goal, window, sources });
  const gated = applyGate(draft, sources, window);
  if (!gated.discussionPoints.length || !gated.openQuestions.length) {
    const conversation = fallbackConversation(subject);
    if (!gated.discussionPoints.length) gated.discussionPoints = conversation.discussionPoints;
    if (!gated.openQuestions.length) gated.openQuestions = conversation.openQuestions;
  }

  send({
    type: "brief",
    brief: {
      ...base,
      ...gated,
      sourcesRead: sources.map((source) => ({
        title: source.title,
        url: source.url,
        publishedDate: source.publishedDate,
      })),
    },
  });
}
