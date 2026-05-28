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

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

function hashText(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function shortHash(value) {
  return hashText(value).slice(0, 12);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const sourceEntryFile = path.join(sourceAppDir, config.sourceEntry);
const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const generatedFile = resolveConfigPath(config.generatedFile);
const configuredSourceAssets = Array.isArray(config.sourceAssets) ? config.sourceAssets.filter(Boolean) : [];
const sourceAssetEmbeddingEnabled = config.embedSourceAssets !== false;
const promotionDir = path.join(projectDir, "promotion");
const readyFile = path.join(promotionDir, "App_minimal.ready.js");
const manifestFile = path.join(promotionDir, "PROMOTION_MANIFEST.json");
const checklistFile = path.join(promotionDir, "PROMOTION_CHECKLIST.md");

assert(isInsideProject(promotionDir), "Promotion directory must stay inside app-output-bridge.");
assert(isInsideProject(readyFile), "Promotion output must stay inside app-output-bridge.");
assert(await exists(hostTemplateFile), "Host App_minimal.js was not found.");
assert(await exists(sandboxFile), "Sandbox output was not found. Run npm run verify first.");
assert(await exists(generatedFile), "Generated output was not found. Run npm run verify first.");

const host = await readText(hostTemplateFile);
const sandbox = await readText(sandboxFile);
const generated = await readText(generatedFile);
const sourceEntry = await readText(sourceEntryFile);
const appBuild = sourceEntry.match(/const\s+APP_BUILD\s*=\s*["']([^"']+)["']/)?.[1] || "";
const localVendors = await collectVendorStatus(getVendorMappings(config, sourceAppDir));
const localVendorReady = localVendors.every(isVendorReady);

assert(!host.includes("PDF to CAD Tool") && host.includes("Line: click start point"), "Host file no longer looks like the original app.");
assert(sandbox.includes("PDF to CAD Tool") && !sandbox.includes("Line: click start point"), "Sandbox output does not look like PDF-CAD.");
if (sourceAssetEmbeddingEnabled && configuredSourceAssets[0]) {
  assert(sandbox.includes(configuredSourceAssets[0]), "Sandbox output does not include the configured sample PDF.");
} else {
  for (const assetName of configuredSourceAssets) {
    assert(!sandbox.includes(assetName), `Sandbox output unexpectedly includes source asset: ${assetName}`);
  }
}
assert(generated === sandbox, "Generated output and sandbox output differ. Run npm run verify.");

await fs.mkdir(promotionDir, { recursive: true });
await fs.writeFile(readyFile, generated, "utf8");

const manifest = {
  ok: true,
  createdAt: new Date().toISOString(),
  appBuild,
  sourceAppDir,
  hostTemplateFile,
  sandboxFile,
  generatedFile,
  readyFile,
  host: {
    bytes: Buffer.byteLength(host, "utf8"),
    sha256: shortHash(host),
    containsPdfCad: host.includes("PDF to CAD Tool"),
    containsOldCadApp: host.includes("Line: click start point"),
  },
  candidate: {
    bytes: Buffer.byteLength(generated, "utf8"),
    sha256: shortHash(generated),
    containsPdfCad: generated.includes("PDF to CAD Tool"),
    containsOldCadApp: generated.includes("Line: click start point"),
    containsSamplePdf: generated.includes("_sample_M-08_sanitary.pdf"),
  },
  sourceAssets: {
    embedSourceAssets: sourceAssetEmbeddingEnabled,
    configuredAssets: configuredSourceAssets,
  },
  externalDependencies: {
    localVendorReady,
    localVendors,
  },
  writesOutsideBridge: false,
  note: "This package is review-only. It does not write to the real host App_minimal.js.",
};

await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await fs.writeFile(checklistFile, `# Promotion Checklist

This package is review-only. It does not write to the real host app.

## Candidate

- Build: ${appBuild}
- Candidate: \`${readyFile}\`
- Candidate SHA-256: \`${manifest.candidate.sha256}\`
- Host path: \`${hostTemplateFile}\`
- Host SHA-256 before promotion: \`${manifest.host.sha256}\`
- Embedded source assets: \`${manifest.sourceAssets.embedSourceAssets}\`

## Required Approval Before Real Promotion

- Confirm the host app should receive the PDF-CAD output.
- Back up the real host \`App_minimal.js\`.
- Replace the host \`App_minimal.js\` only after explicit approval.
- Run host-side build and browser checks after replacement.
- Sample PDFs are not bundled when embedded source assets are disabled.

## Current Known Limitation

- Local vendor ready: \`${localVendorReady}\`
- PDF.js and Tesseract runtime files are local when local vendor ready is \`true\`.
`, "utf8");

console.log(JSON.stringify({
  ok: true,
  readyFile,
  manifestFile,
  checklistFile,
  writesOutsideBridge: false,
  appBuild,
  candidateSha256: manifest.candidate.sha256,
}, null, 2));
