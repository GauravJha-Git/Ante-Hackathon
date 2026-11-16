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

## Start locally

You need two processes: Bifrost on port 8080, then Ante. Node 20 or newer is enough. Ante has no install step. Bifrost is started with `npx`.

The OpenRouter key stays inside Bifrost. Ante's `.env` gets the Bifrost virtual key (`sk-bf-...`), never the OpenRouter key.

### 1. Configure Ante

From the `ante` folder:

```powershell
copy .env.example .env
```

Fill in `.env`:

| Variable | What to put |
| --- | --- |
| `TAVILY_API_KEY` | Key from [app.tavily.com](https://app.tavily.com). Coupon `GEEKROOM2` if the account has no credits yet. |
| `BIFROST_BASE_URL` | `http://localhost:8080/openai/v1` |
| `BIFROST_API_KEY` | Bifrost virtual key from step 3. Leave this blank until that key exists. |
| `BIFROST_MODEL` | `openrouter/openrouter/free` for the free OpenRouter route, or another model id Bifrost is serving. |
| `TAVILY_SEARCH_DEPTH` | `basic` while testing (1 credit per search, 4 per briefing). `advanced` is 2 credits per search. |
| `PORT` | `3010` in the example, because 3000 is often already taken. Ante prints the URL it actually bound. |

`.env` is gitignored. Do not commit it.

### 2. Start Bifrost

Open a terminal in the `ante` folder. The first launch needs a setup token before the process starts. Pick a long random string and keep it for the dashboard screen.

```powershell
$env:BIFROST_SETUP_TOKEN = "paste-a-long-random-string"
npx -y @maximhq/bifrost
```

Leave this terminal open. The dashboard is http://localhost:8080.

On the first visit:

1. Paste the setup token and create the admin account.
2. Turn on dashboard auth and **Enforce auth on inference**.
3. Skip the CORS restriction.
4. Add a provider. For the free path, add **OpenRouter** and paste the OpenRouter API key there. That key is stored by Bifrost. It does not go in Ante's `.env`.
5. Later launches of this same machine can be just `npx -y @maximhq/bifrost`. The account and provider are already saved.

### 3. Create the virtual key

In the Bifrost dashboard, create a virtual key. It starts with `sk-bf-`.

Put that value in `.env` as `BIFROST_API_KEY`. Ante sends it as `Authorization: Bearer`. With inference auth on, a request without this key is rejected.

Set `BIFROST_MODEL` to a model that provider can serve. The free router used for this project is:

```
BIFROST_MODEL=openrouter/openrouter/free
```

### 4. Start Ante

In a second terminal, from the `ante` folder:

```powershell
node server.mjs
```

`npm start` does the same thing. The terminal should print:

```
Ante is running at http://localhost:3010
Tavily key: set · Bifrost key: set
```

The port is whatever `PORT` is in `.env`. Open that URL. If either key is missing, the page shows a banner and will not run a briefing.

### 5. Prepare a page

Use a company or a person, a meeting time, a purpose, and a goal. **Prepare the page** runs 4 Tavily searches, then one Bifrost completion. On the free OpenRouter route the model often takes one to five minutes. Wait for the page. Do not refresh while the trace is still moving.

### Stop

Press Ctrl+C in the Ante terminal, then Ctrl+C in the Bifrost terminal.

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
