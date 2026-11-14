# Ante — Build Plan

How we finish the product, which technology we use, and how we keep it production-grade without losing the deadline.

Prototype deadline: **15 November 2026, 11:59 PM IST**.

Read this while building. The judge-facing story is in `docs/idea.md`. The wider strategy is in `docs/hackathon-plan.md`.

The order is fixed. Implement the idea first. Harden it second. Do not start a rewrite.

---

## 1. What "done" means

The idea is done when a stranger can do all of this on a fresh machine:

1. Add a Tavily key and a Bifrost virtual key to `.env`.
2. Run `node server.mjs`.
3. Enter a company or a person, a meeting time, and a purpose.
4. Get one page that covers only the 30 days before that meeting.
5. See news, launches, hires, and deals as separate coverage, including a category that came back empty.
6. Read each finding with a source link and the snippet sentence that supports it.
7. See Verified, Partial, and Disputed as different labels.
8. See Held back for anything the model said that the gate refused.
9. See discussion points and open questions, labeled as conversation.
10. Move the meeting months ahead and get an honest empty page, with no model call.
11. If the live call fails during the demo, open the last real brief from disk.

Production-grade, for this deadline, means the behavior above is enforced in code and covered by checks. It does not mean a new framework, a cloud deploy, or a calendar integration.

## 2. Technology

We stay on the stack that already runs. Node 20+ is installed. The disk filled up when we tried to install Next.js, and a rewrite would spend the night on tooling.

| Piece | Technology | Why this one |
| --- | --- | --- |
| Runtime | Node.js 20+ | `fetch`, timeouts, and the test script need no packages |
| Server | `node:http` in `server.mjs` | Two routes, streaming NDJSON, no framework |
| Page | HTML, CSS, and one `app.js` | The brief is a document, not an app shell |
| Search | Tavily Search API | Required. Date filters and news topic are the product |
| Model | Bifrost, OpenAI-compatible chat completions | Required. Keys, model choice, and fallbacks stay on the gateway |
| Trust | Citation gate in `src/gate.mjs` | A prompt cannot be the only control |
| Checks | `node scripts/check.mjs` | Window math and the gate, with zero API spend |
| Config | `.env`, loaded by `src/env.mjs` | Keys stay on the server |

We do not add React, Next.js, LangChain, a database, or a queue tonight. Those are real tools. They are not on the path to a sourced one-page brief by tomorrow night.

### How each piece is used

**Tavily.** `POST https://api.tavily.com/search` with `Authorization: Bearer`. Every search sends `topic: "news"`, `start_date`, `end_date`, `max_results: 5`, and `chunks_per_source: 2`. Depth is `basic` while building (1 credit a search) and `advanced` for the recorded demo (2 credits a search). Four searches run with `Promise.all`. A briefing costs 4 or 8 credits. Extract is off.

**Bifrost.** `POST ${BIFROST_BASE_URL}/chat/completions`. The base URL includes `/openai/v1`, for example `http://localhost:8080/openai/v1`. The virtual key is the bearer token. The body is one chat completion: `temperature: 0.1`, `max_tokens: 1100`, JSON mode when the gateway accepts it. The model name in `BIFROST_MODEL` must already exist on that gateway. We call Bifrost once per brief, and a second time only if the first reply is not JSON. We never call it when the window is closed or Tavily returned nothing.

**The page.** The form posts to `/api/brief` and reads NDJSON. Each line is a status, a search update, the brief, or an error. The sheet is built with `textContent`, so model text cannot become HTML. Keys are never sent to the browser. `/api/health` reports only whether each key is present.

**The gate.** After the model returns, `applyGate` keeps a claim only when its URL matches a Tavily result, drops dates outside the window, downgrades undated sources to Partial, drops duplicate claims, and caps the page at 6 findings. Titles and dates shown on the page come from Tavily, not from the model's copy of them.

## 3. What is already built

Leave these files working. Extend them. Do not replace them.

| File | Already does |
| --- | --- |
| `src/window.mjs` | 30-day window, future meetings cut off at today, far meetings come back empty |
| `src/queries.mjs` | Four fixed queries for a company, four for a person |
| `src/tavily.mjs` | Dated news search |
| `src/sources.mjs` | URL normalize, dedupe, top 12 |
| `src/model.mjs` | Bifrost JSON brief, one repair retry |
| `src/gate.mjs` | Drop unknown URLs, drop out-of-window dates, Partial when undated, cap at 6 |
| `src/brief.mjs` | Orchestration and the NDJSON events |
| `public/` | Form, live search trace, one-page sheet, print, copy |
| `scripts/check.mjs` | Window and gate checks |

## 4. Build the idea first

Do these in order. Stop when the definition of done in section 1 is true. Each step should be shippable on its own.

### Step 1. Evidence line

The strongest thing a judge can see.

In `src/gate.mjs`, when a claim is kept, copy a short span from that source's `content` onto the finding as `evidence`. Prefer a sentence that shares words with the claim. If nothing lines up, use the first 240 characters of the snippet and keep the label Partial. The model does not get to invent the evidence string.

In `public/app.js`, render that span under the claim, above the source link, in a quieter style.

Check: a finding with an unknown URL still drops. A kept finding always has `evidence` taken from the source object, never from the model JSON.

### Step 2. Coverage bar

`src/brief.mjs` already records `{ label, query, count }` per search. Pass that list through on the brief. The page shows four counts, including zeros: News, Launches, Hires, Deals (or the person labels). An empty category stays visible. Hiding a zero would recreate the "summaries miss updates" failure.

### Step 3. Disputed

After the gate, a small function in `src/gate.mjs` looks at kept findings in the same category. If two claims point at different URLs and contradict each other (launch versus beta, hired versus departed, raised versus did not), mark both `confidence: "disputed"` and leave both on the page. Do not ask the model to pick a winner. A simple contradiction list is enough for the demo: pairs of phrases we care about (`launched` / `beta`, `appointed` / `steps down`, `raised` / `did not raise`). If the heuristic misses a pair, the findings stay Verified or Partial. A missed dispute is safer than a false one.

Show the Disputed label in the sheet next to Verified and Partial.

### Step 4. Demo cache

When a brief succeeds and has at least one source, write `data/last-brief.json`. Add `GET /api/last-brief`. The page gets a second button, "Show last real brief", enabled only when that file exists. The file is gitignored. Never commit it, and never seed it with handwritten findings.

### Step 5. One real run

Fill `.env`. Run one company (Stripe, sales call, tomorrow) and one person. Save screenshots:

- the full page with coverage and an evidence line
- a source tab open on that evidence
- Held back
- a meeting six months out, empty page
- the footer with Tavily, the Bifrost host, and the credit estimate

Switch `TAVILY_SEARCH_DEPTH` to `advanced` only for these recorded runs.

### Step 6. Tighten the meeting goal

The goal field already exists. In `src/model.mjs`, tell the model that discussion points and open questions must refer to that goal, and must not add facts. This is a prompt edit, not a new feature.

## 5. Then make it production-grade

Start this only after section 4 is visible in the browser. These items are the production bar we can actually finish tomorrow. They also give honest answers when a judge asks what happens outside a demo.

### Trust

- Extend `scripts/check.mjs` for the evidence rule, the coverage counts, and one disputed pair.
- Run `node scripts/check.mjs` before every commit.
- Add one fixture brief in `scripts/fixtures/` built from a saved Tavily payload, so the pipeline can be checked with no credits. The fixture test calls the gate and the coverage shaper, not the network.

### Operations

- Log one JSON line per brief: subject length, kind, window, search counts, source count, finding count, held-back count, Bifrost latency, Tavily errors. Do not log the API keys, the raw prompt, or the user's goal text.
- Keep the timeouts that already exist: 30 seconds for Tavily, 45 seconds for Bifrost.
- Keep the 20 KB body limit.
- On Tavily 401 or 429, or on a Bifrost connection refusal, return that error on the stream and do not invent a page.
- `GET /api/health` stays free of secrets. Add the search depth and the model name, which it already returns.

### Cost

- Default depth stays `basic`.
- Do not call Extract.
- Do not call Bifrost on an empty window or on zero sources.
- Cap sources at 12 and findings at 6. Those caps are the production limits, not temporary hacks.

### Demo reliability

- The last-brief cache is the failover for the live demo.
- Print preview must fit the findings, the discussion, and the questions on one page. If it spills, cut copy before cutting the gate.

### What production-grade does not include tomorrow

- A database, accounts, or a deploy pipeline.
- Google Calendar or Gmail.
- A second model call that re-checks every claim. Add that only if a real brief still looks loose after the evidence line.
- Auto-detecting company versus person.
- Kubernetes, queues, or a frontend framework.

Say these in the pitch as the next step. Do not build them before submission.

## 6. Schedule

Tonight, 14 November.

| Block | Work | Stop when |
| --- | --- | --- |
| First | Steps 1 and 2, evidence and coverage | A local brief shows a snippet under a finding and four counts |
| Second | Steps 3 and 4, disputed and cache | A contradiction is labeled, and the last brief reopens with the network off |
| Third | Step 5, two real runs and screenshots | The five screenshots exist |

Tomorrow, 15 November.

| Block | Work | Stop when |
| --- | --- | --- |
| Morning | Step 6 and section 5 | `node scripts/check.mjs` passes, logs have no secrets |
| Midday | README, public GitHub repo, six slides from `docs/idea.md` | A stranger can run the project from the README |
| Afternoon | One full demo rehearsal on the cached brief and one live brief | You can recover if Tavily or Bifrost fails |
| Evening | Submit before 11:59 PM IST | The form has the repo, the idea line, and the deck |

If a block slips, drop from the bottom of section 5. Do not drop the evidence line or the empty-window behavior.

## 7. How to run while building

```bash
cd ante
copy .env.example .env
node scripts/check.mjs
node server.mjs
```

Open the URL the server prints. Port 3000 was already taken on this machine, so set `PORT=3010` in `.env` if 3000 is busy.

`.env` needs:

```
TAVILY_API_KEY=
BIFROST_BASE_URL=http://localhost:8080/openai/v1
BIFROST_API_KEY=
BIFROST_MODEL=gpt-4o-mini
TAVILY_SEARCH_DEPTH=basic
```

Start Bifrost separately if it is not already running: `npx -y @maximhq/bifrost`. The model name has to match a model that gateway serves. If JSON mode returns 400, `src/model.mjs` already retries once without it.

## 8. Acceptance check before you submit

- [ ] Company brief and person brief both return a page.
- [ ] Every finding has a real URL and an evidence span from that URL's snippet.
- [ ] A claim with a made-up URL appears under Held back, or not at all.
- [ ] Coverage shows a zero where a search found nothing.
- [ ] A far-future meeting spends no Tavily credit and no Bifrost credit.
- [ ] Verified, Partial, and Disputed look different on the page.
- [ ] Discussion points are captioned as conversation.
- [ ] `node scripts/check.mjs` passes.
- [ ] `.env` is gitignored. `data/last-brief.json` is gitignored.
- [ ] The footer names Tavily and the Bifrost host.
- [ ] The demo can be finished from the cached brief with the network disconnected.
