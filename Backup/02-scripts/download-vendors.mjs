import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getVendorMappings, pathExists } from "./vendor-config.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function fail(message, details = {}) {
  console.error(JSON.stringify({
    ok: false,
    reason: message,
    ...details,
  }, null, 2));
  process.exit(1);
}

function download(url, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects: ${url}`));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        "User-Agent": "app-output-bridge-vendor-downloader/1.0",
      },
    }, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;

      if (status >= 300 && status < 400 && location) {
        response.resume();
        resolve(download(new URL(location, url).href, redirectCount + 1));
        return;
      }

      if (status !== 200) {
        response.resume();
        reject(new Error(`HTTP ${status} while downloading ${url}`));
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
    });

    request.setTimeout(120000, () => {
      request.destroy(new Error(`Download timed out: ${url}`));
    });
    request.on("error", reject);
  });
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const mappings = getVendorMappings(config, sourceAppDir);

const unsafePaths = [
  { name: "sourceAppDir", value: sourceAppDir },
  ...mappings.map((mapping) => ({ name: mapping.local, value: mapping.localPath })),
].filter((item) => !isInsideProject(item.value));

if (unsafePaths.length) {
  fail("Vendor downloads are allowed only inside app-output-bridge.", {
    projectDir,
    unsafePaths,
  });
}

const results = [];
for (const mapping of mappings) {
  const exists = await pathExists(mapping.localPath);
  if (exists && !force) {
    const bytes = (await fs.stat(mapping.localPath)).size;
    results.push({
      name: mapping.name,
      skipped: true,
      reason: "already exists",
      localPath: mapping.localPath,
      bytes,
    });
    continue;
  }

  if (dryRun) {
    results.push({
      name: mapping.name,
      skipped: false,
      dryRun: true,
      remote: mapping.remote,
      localPath: mapping.localPath,
    });
    continue;
  }

  const bytes = await download(mapping.remote);
  if (bytes.length < 1024) {
    fail("Downloaded vendor file is unexpectedly small.", {
      name: mapping.name,
      remote: mapping.remote,
      localPath: mapping.localPath,
      bytes: bytes.length,
    });
  }

  await fs.mkdir(path.dirname(mapping.localPath), { recursive: true });
  await fs.writeFile(mapping.localPath, bytes);
  results.push({
    name: mapping.name,
    skipped: false,
    remote: mapping.remote,
    localPath: mapping.localPath,
    bytes: bytes.length,
  });
}

console.log(JSON.stringify({
  ok: true,
  dryRun,
  force,
  results,
  note: "This downloads PDF.js plus the Tesseract browser bundle, worker, core files, and eng/jpn traineddata used by offline OCR mode.",
}, null, 2));
