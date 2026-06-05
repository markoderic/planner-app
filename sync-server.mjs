import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const syncDir = path.join(root, ".planner-sync");
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "0.0.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Planner-Account, X-Planner-Key, X-Planner-Client"
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

await fs.mkdir(syncDir, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return send(res, 204, "", corsHeaders);
    if (url.pathname === "/api/sync") return handleSync(req, res);
    return serveStatic(url.pathname, res);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Planner app: http://localhost:${port}`);
  console.log(`Sync API: http://localhost:${port}/api/sync`);
});

async function handleSync(req, res) {
  const accountFile = accountPath(req);
  if (!accountFile) return sendJson(res, 401, { error: "Missing sync account or key" });

  if (req.method === "GET") {
    try {
      const stored = await fs.readFile(accountFile, "utf8");
      return send(res, 200, stored, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
    } catch (error) {
      if (error.code === "ENOENT") return sendJson(res, 200, { data: null, updatedAt: null });
      throw error;
    }
  }

  if (req.method === "POST") {
    const payload = JSON.parse(await readBody(req));
    if (!payload?.data) return sendJson(res, 400, { error: "Missing planner data" });
    const updatedAt = payload.updatedAt || payload.data?._meta?.updatedAt || new Date().toISOString();
    const body = JSON.stringify({
      data: payload.data,
      updatedAt,
      clientId: payload.clientId || ""
    });
    const tempFile = `${accountFile}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, body);
    await fs.rename(tempFile, accountFile);
    return sendJson(res, 200, { ok: true, updatedAt });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

function accountPath(req) {
  const account = String(req.headers["x-planner-account"] || "").trim();
  const key = String(req.headers["x-planner-key"] || "");
  if (!account || !key) return "";
  const digest = crypto.createHash("sha256").update(`${account}\0${key}`).digest("hex");
  return path.join(syncDir, `${digest}.json`);
}

async function serveStatic(pathname, res) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const filePath = path.normalize(path.join(root, requested));
  const relative = path.relative(root, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative.startsWith(".planner-sync")) {
    return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  }

  try {
    const data = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    return send(res, 200, data, { "Content-Type": type });
  } catch (error) {
    if (error.code === "ENOENT") return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    throw error;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body || "{}"));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  return send(res, status, JSON.stringify(body), { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}
