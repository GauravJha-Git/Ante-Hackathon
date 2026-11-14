import { searchDepth } from "./env.mjs";

export async function tavilySearch({ query, topic, startDate, endDate }) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      topic,
      search_depth: searchDepth(),
      max_results: 5,
      start_date: startDate,
      end_date: endDate,
      chunks_per_source: 2,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`Tavily search failed (${response.status}). ${detail}`);
  }

  const data = await response.json();
  return (data.results || [])
    .filter((item) => item?.url)
    .map((item) => ({
      title: String(item.title || item.url),
      url: item.url,
      content: String(item.content || "").slice(0, 700),
      publishedDate: item.published_date || item.publishedDate || null,
      score: typeof item.score === "number" ? item.score : 0,
    }));
}
