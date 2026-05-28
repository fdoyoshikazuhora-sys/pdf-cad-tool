import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const rawArgs = process.argv.slice(2);
const noOpen = rawArgs.includes("--no-open");
const positionalArgs = rawArgs.filter((arg) => arg !== "--no-open");
const root = path.resolve(positionalArgs[0] || "out");
const port = Number(positionalArgs[1] || 5211);
const openPath = positionalArgs[2] || "/";
const host = "127.0.0.1";
const url = `http://${host}:${port}/`;
const openUrl = new URL(openPath, url).href;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".ts", "text/plain; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".gz", "application/gzip"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".pdf", "application/pdf"],
  [".txt", "text/plain; charset=utf-8"],
]);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${host}:${port}/`);
    if (requestUrl.pathname === "/" && openPath !== "/") {
      response.writeHead(302, {
        Location: openPath,
        "Cache-Control": "no-store",
      });
      response.end();
      return;
    }

    const requestedPath = decodeURIComponent(requestUrl.pathname.slice(1));
    const relativePath = requestedPath || defaultDocumentName();
    const filePath = path.resolve(root, relativePath);

    if (!isInsideRoot(filePath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    let body;
    let servedPath = filePath;
    try {
      body = await fs.readFile(filePath);
    } catch (_error) {
      servedPath = path.join(root, defaultDocumentName());
      body = await fs.readFile(servedPath);
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(servedPath).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500);
    response.end(String(error?.message || error));
  }
});

server.once("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`${url} is already running.`);
    if (!noOpen) openBrowser(openUrl);
    process.exit(0);
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at ${url}`);
  console.log(`Opening ${openUrl}`);
  if (!noOpen) openBrowser(openUrl);
});

function isInsideRoot(filePath) {
  const relative = path.relative(root, filePath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function defaultDocumentName() {
  const pathname = new URL(openPath, url).pathname;
  const basename = path.basename(pathname);
  return basename || "index.html";
}

function openBrowser(targetUrl) {
  if (process.platform !== "win32") return;
  spawn("cmd", ["/c", "start", "", targetUrl], { detached: true, stdio: "ignore" }).unref();
}
