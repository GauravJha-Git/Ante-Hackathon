export function normalizeUrl(url) {
  try {
    const parsed = new URL(String(url));
    parsed.hash = "";
    let value = parsed.toString();
    if (value.endsWith("/")) value = value.slice(0, -1);
    return value.toLowerCase();
  } catch {
    return String(url || "").trim().toLowerCase();
  }
}

export function dedupeSources(sources) {
  const map = new Map();
  for (const source of sources) {
    if (!source?.url) continue;
    const key = normalizeUrl(source.url);
    const previous = map.get(key);
    if (!previous || (source.score || 0) > (previous.score || 0)) {
      map.set(key, source);
    }
  }
  return [...map.values()].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 12);
}
