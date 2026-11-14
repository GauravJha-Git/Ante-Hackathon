import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, integrationStatus } from "./src/env.mjs";
import { runBrief } from "./src/brief.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
loadEnv(root);

const publicDir = path.join(root, "public");
const files = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 20_000) {
        reject(new Error("Request is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("Request body must be JSON."));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, ...integrationStatus() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/brief") {
    let input;
    try {
      input = await readBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    const send = (event) => {
      res.write(`${JSON.stringify(event)}\n`);
    };
    try {
      await runBrief(input, send);
    } catch (error) {
      send({ type: "error", message: error.message || "The briefing failed." });
    } finally {
      res.end();
    }
    return;
  }

  if (req.method === "GET" && files.has(url.pathname)) {
    const name = files.get(url.pathname);
    const filePath = path.join(publicDir, name);
    const body = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": types[path.extname(name)] || "text/plain" });
    res.end(body);
    return;
  }

  sendJson(res, 404, { error: "Not found." });
});

const port = Number(process.env.PORT || 3000);
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT in .env to a free port.`);
    process.exit(1);
  }
  throw error;
});
server.listen(port, () => {
  const status = integrationStatus();
  console.log(`Ante is running at http://localhost:${port}`);
  console.log(`Tavily key: ${status.tavily ? "set" : "missing"} · Bifrost key: ${status.bifrost ? "set" : "missing"}`);
});
