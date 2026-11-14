# Ante

**One sourced page covering the 30 days before your meeting.**

Ante is an AI-powered pre-meeting briefing agent developed for the Global AI Hackathon – Problem 05 (Tavily Research Agent). Simply enter a company or person's name and the meeting date. Ante researches relevant news, product launches, hiring updates, deals, and other developments from the preceding 30 days, then generates a concise, one-page briefing. Every finding must be backed by a source URL returned by Tavily within the research window. Bifrost serves as the exclusive gateway for all AI model interactions, while an independent citation-validation system ensures that unsupported claims never appear as verified facts.

## Why this, and not a generic summary

The problem is not "search the web and summarize." Summaries miss the recent item, or they state something the sources never said. Ante is built around that failure:

1. The meeting time sets the window. The search runs from 30 days before the meeting through the meeting day, and never past today.
2. Four Tavily news searches cover news, launches, hires, and deals (or role, remarks, and ventures for a person).
3. Bifrost writes the page from those sources only.
4. A citation gate drops any claim whose URL was not in the results, drops sources dated outside the window, and marks undated sources as partial.
5. Discussion points and open questions are labeled as conversation, not as extra facts.
6. If the meeting is so far away that the 30-day window has not started, Ante says so and does not invent a brief.

## Submit this

**Track:** Problem 05 — Tavily Research Agent

**Project name:** Ante

**One line:** A pre-meeting agent that researches only the 30 days before the meeting and prints a finding only when Tavily returned the source.

**Description:**

Preparing for a meeting means chasing news, launches, hires, and other updates that are scattered across the web. A normal summary either misses the recent item or states something no source supports.

Ante takes a company or a person, the meeting time, and the kind of conversation (sales, partnership, investor, or business development). It asks Tavily for developments in the 30 days before that meeting, not "whatever is latest." Bifrost, Maxim AI's gateway, is the only model path, so generation stays on the hackathon stack. Before anything is shown, a citation gate checks every claim: the URL must be one Tavily actually returned, the source date must sit inside the window, and an undated source can only be marked partial. Claims that fail are listed as held back, not as facts. The page then adds discussion points and open questions so the reader can walk in ready, without confusing a prompt for a finding.

**Stack:** Node.js server, Tavily Search API, Bifrost OpenAI-compatible chat completions. No extra packages.

## Run it

Node 20 or newer is enough. There is no install step.

```bash
cd ante
copy .env.example .env
```

Fill in `.env`:

- `TAVILY_API_KEY` from [app.tavily.com](https://app.tavily.com). Hackathon coupon `GEEKROOM2` if the credits are not on the account yet.
- `BIFROST_BASE_URL` — local gateway is `http://localhost:8080/openai/v1`
- `BIFROST_API_KEY` — your Bifrost virtual key
- `BIFROST_MODEL` — a model your gateway already serves, such as `gpt-4o-mini`

Start Bifrost in another terminal if it is not already running:

```bash
npx -y @maximhq/bifrost
```

Then:

```bash
node server.mjs
```

Open http://localhost:3000

While testing, keep `TAVILY_SEARCH_DEPTH=basic` (4 credits per briefing). Switch to `advanced` for the demo (8 credits). A full run is 4 searches plus one Bifrost completion.

## Demo script

1. Company: `Stripe`. Meeting: tomorrow at 15:00. Purpose: Sales call. Prepare the page.
2. Open a source link on a finding and show that the claim is in that page.
3. Point at **Held back** if the model offered a claim the gate refused.
4. Set the meeting several months ahead. Ante should refuse to brief a window that has not started.
5. The footer names Tavily, the Bifrost host, and the model. That is the integration, in view.

## Checks

```bash
node scripts/check.mjs
```

This checks the 30-day window, URL matching, and the citation gate. It does not spend API credits.

## Layout

- `server.mjs` — the page and `/api/brief`
- `src/window.mjs` — meeting-anchored 30-day window
- `src/queries.mjs` — the four searches
- `src/tavily.mjs` — Tavily Search
- `src/model.mjs` — Bifrost chat completion
- `src/gate.mjs` — drops unsourced, out-of-window, and duplicate claims
- `public/` — the one-page brief

## What this does not do

Ante does not read your calendar, email, or CRM. The brief is only as current as the public sources Tavily returns, and a partial finding means the source did not state the claim outright or had no publish date.
