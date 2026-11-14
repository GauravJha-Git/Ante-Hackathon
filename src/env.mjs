import fs from "node:fs";
import path from "node:path";

export function loadEnv(root) {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function integrationStatus() {
  return {
    tavily: Boolean(process.env.TAVILY_API_KEY),
    bifrost: Boolean(process.env.BIFROST_API_KEY && process.env.BIFROST_BASE_URL),
    model: process.env.BIFROST_MODEL || "gpt-4o-mini",
    searchDepth: searchDepth(),
  };
}

export function searchDepth() {
  return process.env.TAVILY_SEARCH_DEPTH === "advanced" ? "advanced" : "basic";
}

export function requireConfig() {
  const missing = [];
  if (!process.env.TAVILY_API_KEY) missing.push("TAVILY_API_KEY");
  if (!process.env.BIFROST_BASE_URL) missing.push("BIFROST_BASE_URL");
  if (!process.env.BIFROST_API_KEY) missing.push("BIFROST_API_KEY");
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(", ")} in .env. Ante will not write a briefing without both Tavily and Bifrost.`,
    );
  }
}
