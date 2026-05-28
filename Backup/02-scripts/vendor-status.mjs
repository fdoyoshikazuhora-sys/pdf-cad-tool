import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectVendorStatus, getVendorMappings, isVendorReady } from "./vendor-config.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const vendors = await collectVendorStatus(getVendorMappings(config, sourceAppDir));

const missing = vendors.filter((item) => !item.localFile.exists);
const sourceStillRemote = vendors.filter((item) => item.sourceUsesRemote);
const notReady = vendors.filter((item) => !isVendorReady(item));

console.log(JSON.stringify({
  ok: notReady.length === 0,
  readyForOfflineRuntime: notReady.length === 0,
  sourceAppDir,
  missing: missing.map((item) => ({
    name: item.name,
    expectedLocalPath: item.localPath,
    remote: item.remote,
  })),
  sourceStillRemote: sourceStillRemote.map((item) => ({
    name: item.name,
    sourceFile: item.sourceFile,
    remote: item.remote,
  })),
  notReady: notReady.map((item) => ({
    name: item.name,
    localPath: item.localPath,
    sourceFile: item.sourceFile,
    reason: item.localFile.exists ? "source reference is not local or still remote" : "missing local file",
  })),
  vendors,
  note: "This checks PDF.js plus Tesseract browser, worker, core, and jpn/eng language assets.",
}, null, 2));
