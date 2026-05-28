import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectVendorStatus, getVendorMappings, isVendorReady } from "./vendor-config.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function readTextIfExists(filePath) {
  return (await exists(filePath)) ? fs.readFile(filePath, "utf8") : "";
}

function shortHash(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}

function appState(text) {
  return {
    exists: text.length > 0,
    bytes: Buffer.byteLength(text, "utf8"),
    sha256: text ? shortHash(text) : "",
    containsPdfCad: text.includes("PDF to CAD Tool"),
    containsOldCadApp: text.includes("Line: click start point"),
    containsSamplePdf: text.includes("_sample_M-08_sanitary.pdf"),
  };
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const generatedFile = resolveConfigPath(config.generatedFile);
const promotionDir = path.join(projectDir, "promotion");
const readyFile = path.join(promotionDir, "App_minimal.ready.js");
const manifestFile = path.join(promotionDir, "PROMOTION_MANIFEST.json");
const checklistFile = path.join(promotionDir, "PROMOTION_CHECKLIST.md");

const host = await readTextIfExists(hostTemplateFile);
const sandbox = await readTextIfExists(sandboxFile);
const generated = await readTextIfExists(generatedFile);
const ready = await readTextIfExists(readyFile);
const manifestText = await readTextIfExists(manifestFile);
const checklistExists = await exists(checklistFile);
const localVendors = await collectVendorStatus(getVendorMappings(config, sourceAppDir));
const localVendorReady = localVendors.every(isVendorReady);

let manifest = null;
let manifestReadable = false;
try {
  manifest = manifestText ? JSON.parse(manifestText) : null;
  manifestReadable = Boolean(manifest);
} catch (_error) {
  manifestReadable = false;
}

const pathSafety = {
  promotionInsideBridge: isInsideProject(promotionDir),
  readyInsideBridge: isInsideProject(readyFile),
  manifestInsideBridge: isInsideProject(manifestFile),
  checklistInsideBridge: isInsideProject(checklistFile),
  hostSeparateFromPromotion: hostTemplateFile !== readyFile,
};

const states = {
  host: appState(host),
  sandbox: appState(sandbox),
  generated: appState(generated),
  ready: appState(ready),
};

const checks = {
  pathSafety: Object.values(pathSafety).every(Boolean),
  manifestReadable,
  checklistExists,
  hostStillOriginal: states.host.exists && !states.host.containsPdfCad && states.host.containsOldCadApp,
  sandboxIsPdfCad: states.sandbox.exists && states.sandbox.containsPdfCad && !states.sandbox.containsOldCadApp,
  generatedMatchesSandbox: states.generated.exists && states.generated.sha256 === states.sandbox.sha256,
  promotionMatchesSandbox: states.ready.exists && states.ready.sha256 === states.sandbox.sha256,
  promotionMatchesManifest: manifestReadable && manifest.candidate?.sha256 === states.ready.sha256,
  promotionWritesOutsideBridgeFalse: manifestReadable && manifest.writesOutsideBridge === false,
};

const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  ok,
  readyForManualReview: ok,
  readyForOfflineUse: ok && localVendorReady,
  note: localVendorReady
    ? "Promotion package is consistent and PDF.js/Tesseract runtime files are local."
    : "Promotion package is consistent, but PDF.js/Tesseract.js are still CDN-based.",
  files: {
    hostTemplateFile,
    sandboxFile,
    generatedFile,
    readyFile,
    manifestFile,
    checklistFile,
  },
  checks,
  pathSafety,
  states,
  externalDependencies: {
    localVendorReady,
    localVendors,
  },
}, null, 2));

if (!ok) {
  process.exitCode = 1;
}
