const form = document.querySelector("#brief-form");
const submit = document.querySelector("#submit");
const banner = document.querySelector("#banner");
const live = document.querySelector("#live");
const sheet = document.querySelector("#sheet");
const sheetBody = document.querySelector("#sheet-body");
const emptyCopy = document.querySelector("#empty-copy");
const creditNote = document.querySelector("#credit-note");

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const purposes = {
  sales: "Sales call",
  partnership: "Partnership",
  investor: "Investor meeting",
  "business-development": "Business development",
  general: "General",
};
const categories = {
  news: "News",
  launch: "Launch",
  hire: "Hire",
  partnership: "Partnership",
  funding: "Funding",
  other: "Update",
};

function todayStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || "—";
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

function formatWhen(value) {
  const [date, time] = String(value || "").split("T");
  const clock = time ? ` · ${time.slice(0, 5)}` : "";
  return `${formatDay(date)}${clock}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function showBanner(message) {
  banner.hidden = !message;
  banner.textContent = message || "";
}

function setDefaultMeeting() {
  const meeting = form.elements.meeting;
  if (meeting.value) return;
  const next = new Date();
  next.setDate(next.getDate() + 1);
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  meeting.value = `${next.getFullYear()}-${month}-${day}T15:00`;
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    const credits = health.searchDepth === "advanced" ? 8 : 4;
    creditNote.textContent = `Each briefing runs 4 ${health.searchDepth} Tavily searches, about ${credits} credits, then one Bifrost completion.`;
    if (!health.tavily || !health.bifrost) {
      showBanner("Add TAVILY_API_KEY, BIFROST_BASE_URL, and BIFROST_API_KEY to .env, then restart Ante. The page will stay blank until both are set.");
    }
  } catch {
    showBanner("Ante is not responding. Start it with node server.mjs.");
  }
}

function renderSteps(steps) {
  live.replaceChildren();
  for (const step of steps) {
    const row = el("div", "step");
    row.append(el("span", "", step.label), el("span", "", step.detail));
    live.append(row);
  }
}

function renderBrief(brief) {
  emptyCopy.hidden = true;
  sheet.querySelector("h2").textContent = brief.subject;
  sheetBody.replaceChildren();

  const meta = el("div", "meta");
  const bits = [
    ["With", brief.kind === "person" ? "Person" : "Company"],
    ["Meeting", formatWhen(brief.meeting)],
    ["Window", brief.window.empty ? "Not open yet" : `${formatDay(brief.window.start)} – ${formatDay(brief.window.end)}`],
    ["Purpose", purposes[brief.purpose] || "General"],
  ];
  for (const [label, value] of bits) {
    const cell = el("div");
    cell.append(el("span", "", label), document.createTextNode(value));
    meta.append(cell);
  }
  sheetBody.append(meta);
  sheetBody.append(el("p", "one-line", brief.oneLine));
  sheetBody.append(el("p", "fine", brief.window.note));

  const findingsTitle = el("h3", "", "Findings");
  findingsTitle.style.marginTop = "1rem";
  sheetBody.append(findingsTitle);

  if (!brief.findings.length) {
    sheetBody.append(el("p", "", "No sourced finding was kept."));
  }

  brief.findings.forEach((finding, index) => {
    const row = el("article", "finding");
    const copy = el("div");
    const kicker = el("p", "cat", `${String(index + 1).padStart(2, "0")}  ${categories[finding.category] || "Update"}${finding.date ? ` · ${formatDay(finding.date)}` : ""}`);
    copy.append(kicker, el("p", "", finding.claim));
    if (finding.whyItMatters) copy.append(el("p", "why", finding.whyItMatters));
    const source = el("p", "source");
    source.append(document.createTextNode("Source: "));
    const link = el("a", "", finding.sourceTitle);
    link.href = finding.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    source.append(link);
    copy.append(source);
    row.append(copy, el("p", `confidence ${finding.confidence}`, finding.confidence === "verified" ? "Verified" : "Partial"));
    sheetBody.append(row);
  });

  addList("Discussion points", "Angles for the conversation. These are not extra facts.", brief.discussionPoints);
  addList("Open questions", "What this search does not answer.", brief.openQuestions);

  if (brief.heldBack?.length) {
    const block = el("section", "block");
    block.append(el("h3", "", "Held back"), el("p", "fine", "The model offered these, and the citation gate refused them."));
    const list = el("ol", "held");
    for (const item of brief.heldBack) {
      const li = el("li");
      li.append(document.createTextNode(item.claim), el("span", "reason", item.reason));
      list.append(li);
    }
    block.append(list);
    sheetBody.append(block);
  }

  const actions = el("div", "actions");
  const print = el("button", "ghost", "Print");
  print.type = "button";
  print.addEventListener("click", () => window.print());
  const copy = el("button", "ghost", "Copy text");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(toText(brief));
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Copy failed";
    }
  });
  actions.append(print, copy);
  sheetBody.append(actions);

  const credits = brief.searchDepth === "advanced" ? brief.searches.length * 2 : brief.searches.length;
  const foot = el(
    "p",
    "foot",
    `Tavily · ${brief.searches.length} searches · about ${credits} credits · Bifrost ${brief.bifrostHost} · ${brief.model} · ${brief.sourcesRead.length} sources read`,
  );
  sheetBody.append(foot);

  if (brief.sourcesRead.length) {
    const details = el("details");
    details.append(el("summary", "", "Sources read"));
    const list = el("ol");
    for (const source of brief.sourcesRead) {
      const li = el("li");
      const link = el("a", "", source.title);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      li.append(link);
      if (source.publishedDate) li.append(document.createTextNode(` · ${formatDay(source.publishedDate)}`));
      list.append(li);
    }
    details.append(list);
    sheetBody.append(details);
  }
}

function addList(title, note, items) {
  const block = el("section", "block");
  block.append(el("h3", "", title), el("p", "fine", note));
  const list = el("ol");
  for (const item of items || []) list.append(el("li", "", item));
  if (!items?.length) list.append(el("li", "", "None returned."));
  block.append(list);
  sheetBody.append(block);
}

function toText(brief) {
  const lines = [
    `ANTE — ${brief.subject}`,
    `${brief.kind} · ${formatWhen(brief.meeting)} · ${purposes[brief.purpose] || "General"}`,
    brief.window.note,
    "",
    brief.oneLine,
    "",
    "FINDINGS",
  ];
  if (!brief.findings.length) lines.push("No sourced finding was kept.");
  for (const finding of brief.findings) {
    lines.push(`- [${finding.confidence}] ${finding.claim}`);
    if (finding.whyItMatters) lines.push(`  ${finding.whyItMatters}`);
    lines.push(`  ${finding.sourceTitle} — ${finding.sourceUrl}`);
  }
  lines.push("", "DISCUSSION POINTS");
  for (const item of brief.discussionPoints) lines.push(`- ${item}`);
  lines.push("", "OPEN QUESTIONS");
  for (const item of brief.openQuestions) lines.push(`- ${item}`);
  if (brief.heldBack?.length) {
    lines.push("", "HELD BACK");
    for (const item of brief.heldBack) lines.push(`- ${item.claim} (${item.reason})`);
  }
  return lines.join("\n");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showBanner("");
  submit.disabled = true;
  const steps = [{ label: "Window", detail: "Setting the 30 days before the meeting" }];
  renderSteps(steps);

  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, today: todayStamp() }),
    });
    if (!response.ok || !response.body) {
      const failure = await response.json().catch(() => ({ error: "The briefing failed." }));
      throw new Error(failure.error || "The briefing failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        if (!part.trim()) continue;
        const message = JSON.parse(part);
        if (message.type === "status") {
          steps.push({ label: "Agent", detail: message.message });
        } else if (message.type === "search") {
          const detail = message.state === "done"
            ? `${message.count} sources`
            : message.state === "error"
              ? message.message
              : "Searching";
          steps.push({ label: message.label, detail });
        } else if (message.type === "error") {
          throw new Error(message.message);
        } else if (message.type === "brief") {
          renderBrief(message.brief);
        }
        renderSteps(steps);
      }
    }
  } catch (error) {
    showBanner(error.message || "The briefing failed.");
  } finally {
    submit.disabled = false;
  }
});

setDefaultMeeting();
loadHealth();
