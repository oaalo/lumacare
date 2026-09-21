import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chat, configured, ChatError } from "./chat.mjs";

const root = new URL("../", import.meta.url);
const knowledge = JSON.parse(await readFile(new URL("knowledge.json", import.meta.url), "utf8"));
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/search.css", ["search.css", "text/css; charset=utf-8"]],
  ["/assets/lumacare-logo.png", ["assets/lumacare-logo.png", "image/png"]]
]);

export function createApp(env = process.env, fetchImpl = fetch) {
  let inFlight = 0;
  let windowStart = Date.now(), requestCount = 0;
  const port = Number(env.PORT || 3000);
  const origin = env.LUMACARE_ORIGIN || "http://127.0.0.1:" + port;
  return createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, origin);
      if (req.headers.host !== new URL(origin).host ||
          (req.headers.origin && req.headers.origin !== origin)) return json(403, { error: "forbidden_origin" });
      if (req.method === "GET" && url.pathname === "/api/status")
        return json(200, { configured: configured(env) });
      if (url.pathname === "/api/chat") {
        if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
        if (req.headers.origin !== origin) return json(403, { error: "forbidden_origin" });
        if (!req.headers["content-type"]?.startsWith("application/json"))
          return json(415, { error: "json_required" });
        if (inFlight >= 3) return json(429, { error: "service_busy" });
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); requestCount = 0; }
        if (++requestCount > 20) return json(429, { error: "service_busy" });
        inFlight++;
        try {
          let length = 0; const chunks = [];
          for await (const chunk of req) {
            length += chunk.length;
            if (length > 65536) { json(413, { error: "request_too_large" }); return; }
            chunks.push(chunk);
          }
          let body;
          try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
          catch { return json(400, { error: "invalid_json" }); }
          return json(200, await chat(body, env, knowledge, fetchImpl));
        } finally { inFlight--; }
      }
      const asset = assets.get(url.pathname);
      if (req.method !== "GET" || !asset) return json(404, { error: "not_found" });
      const content = await readFile(new URL(asset[0], root));
      res.writeHead(200, { "Content-Type": asset[1], "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
      res.end(content);
    } catch (error) {
      if (!res.headersSent) json(error instanceof ChatError ? error.status : 500,
        { error: error instanceof ChatError ? error.code : "server_error" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  // Local preview only. Put a verified access gateway in front before hospital rollout.
  createApp().listen(port, "127.0.0.1", () => console.log("LumaCare: http://127.0.0.1:" + port));
}
