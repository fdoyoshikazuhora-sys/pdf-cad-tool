import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(projectDir, "bridge.config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

async function readFileHash(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function runGeneratorApply() {
  const originalArgv = process.argv;
  const generatorPath = path.join(projectDir, "scripts", "generate-app-minimal.mjs");
  process.argv = [process.execPath, generatorPath, "--apply", "--no-backup"];
  try {
    await import(`${pathToFileURL(generatorPath).href}?verify=${Date.now()}`);
  } finally {
    process.argv = originalArgv;
  }
}

const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const generatedFile = resolveConfigPath(config.generatedFile);
const previewFile = resolveConfigPath(config.previewFile);
const bridgeHarnessFile = resolveConfigPath(config.bridgeHarnessFile || path.join(path.dirname(generatedFile), "bridge-io-harness.html"));
const bridgeApiHarnessFile = resolveConfigPath(config.bridgeApiHarnessFile || path.join(path.dirname(generatedFile), "bridge-api-harness.html"));
const bridgeManifestFile = resolveConfigPath(config.bridgeManifestFile || path.join(path.dirname(generatedFile), "bridge-manifest.json"));
const bridgeTypesFile = resolveConfigPath(config.bridgeTypesFile || path.join(path.dirname(generatedFile), "pdf-cad-bridge.d.ts"));
const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const configuredSourceAssets = Array.isArray(config.sourceAssets) ? config.sourceAssets.filter(Boolean) : [];
const sourceAssetEmbeddingEnabled = config.embedSourceAssets !== false;

assert(isInsideProject(sandboxFile), "Sandbox file is outside app-output-bridge.");
assert(isInsideProject(generatedFile), "Generated file is outside app-output-bridge.");
assert(isInsideProject(previewFile), "Preview file is outside app-output-bridge.");
assert(isInsideProject(bridgeHarnessFile), "Bridge I/O harness file is outside app-output-bridge.");
assert(isInsideProject(bridgeApiHarnessFile), "Bridge API harness file is outside app-output-bridge.");
assert(isInsideProject(bridgeManifestFile), "Bridge manifest file is outside app-output-bridge.");
assert(isInsideProject(bridgeTypesFile), "Bridge types file is outside app-output-bridge.");
assert(isInsideProject(sourceAppDir), "Source app is outside app-output-bridge.");
assert(hostTemplateFile !== sandboxFile, "Host template and sandbox file point to the same path.");
assert(await exists(hostTemplateFile), "Host template file does not exist.");
assert(!(await exists(path.join(projectDir, "apply-to-target.cmd"))), "apply-to-target.cmd must not exist.");
assert(!(await exists(path.join(projectDir, "serve-target.cmd"))), "serve-target.cmd must not exist.");

const beforeHostHash = await readFileHash(hostTemplateFile);

await runGeneratorApply();

const afterHostHash = await readFileHash(hostTemplateFile);
assert(afterHostHash === beforeHostHash, "Host App_minimal.js changed during verification.");

const sandboxText = await readText(sandboxFile);
const generatedText = await readText(generatedFile);
const previewText = await readText(previewFile);
const bridgeHarnessText = await readText(bridgeHarnessFile);
const bridgeApiHarnessText = await readText(bridgeApiHarnessFile);
const bridgeManifestText = await readText(bridgeManifestFile);
const bridgeManifest = JSON.parse(bridgeManifestText);
const bridgeTypesText = await readText(bridgeTypesFile);

assert(sandboxText.includes("PDF to CAD Tool"), "Sandbox output does not contain the PDF-CAD app.");
if (sourceAssetEmbeddingEnabled && configuredSourceAssets[0]) {
  assert(sandboxText.includes(configuredSourceAssets[0]), "Sandbox output does not embed the configured sample PDF name.");
} else {
  for (const assetName of configuredSourceAssets) {
    assert(!sandboxText.includes(assetName), `Sandbox output unexpectedly embeds source asset: ${assetName}`);
  }
}
assert(!sandboxText.includes("Line: click start point"), "Sandbox output still looks like the old CAD app.");
assert(sandboxText.includes("window.PdfCadAppBridge = api"), "Sandbox output does not expose PdfCadAppBridge.");
assert(sandboxText.includes("getState: (options = {})"), "Sandbox output does not expose getState promise helper.");
assert(sandboxText.includes("exportDxf: (payload = {}, options = {})"), "Sandbox output does not expose exportDxf promise helper.");
assert(sandboxText.includes("event.source !== childWindow"), "Sandbox output does not filter bridge messages by iframe source.");
assert(generatedText === sandboxText, "Generated output and sandbox output differ.");
assert(previewText.includes("PDF to CAD Tool"), "Preview HTML does not contain the PDF-CAD app.");
assert(bridgeHarnessText.includes("Bridge I/O Harness"), "Bridge I/O harness was not generated.");
assert(bridgeHarnessText.includes("pdf-cad:command"), "Bridge I/O harness does not send bridge commands.");
assert(bridgeApiHarnessText.includes("Bridge API Harness"), "Bridge API harness was not generated.");
assert(bridgeApiHarnessText.includes("window.PdfCadAppBridge"), "Bridge API harness does not expose PdfCadAppBridge.");
assert(bridgeApiHarnessText.includes("Run Full Flow"), "Bridge API harness does not include a full-flow test.");
assert(bridgeApiHarnessText.includes("Export & Save DXF"), "Bridge API harness does not include parent-side DXF save.");
assert(bridgeApiHarnessText.includes("saveDxfResult"), "Bridge API harness does not save returned DXF data.");
assert(bridgeApiHarnessText.includes("AUTO_RUN"), "Bridge API harness does not include autorun support.");
assert(bridgeApiHarnessText.includes("__PDF_CAD_BRIDGE_SMOKE_RESULT__"), "Bridge API harness does not expose smoke result.");
assert(bridgeApiHarnessText.includes('id="smokeResult"'), "Bridge API harness does not expose DOM smoke result.");
assert(bridgeApiHarnessText.includes("dataset.result"), "Bridge API harness does not store DOM smoke result data.");
assert(bridgeApiHarnessText.includes("summarizeResult"), "Bridge API harness does not summarize smoke result.");
assert(bridgeManifest.contract === "pdf-cad-app-output-bridge", "Bridge manifest contract is wrong.");
assert(bridgeManifest.appBuild, "Bridge manifest does not contain the app build.");
assert(bridgeManifest.parentApi?.methods?.includes("exportDxf"), "Bridge manifest does not list exportDxf.");
assert(bridgeManifest.childCommands?.includes("export-dxf"), "Bridge manifest does not list export-dxf.");
assert(bridgeTypesText.includes("interface PdfCadBridgeApi"), "Bridge types do not define PdfCadBridgeApi.");
assert(bridgeTypesText.includes("exportDxf"), "Bridge types do not define exportDxf.");
assert(bridgeTypesText.includes("PdfCadExportDxfResult"), "Bridge types do not define DXF result.");

console.log(JSON.stringify({
  ok: true,
  hostUnchanged: true,
  sandboxContainsPdfCad: true,
  generatedMatchesSandbox: true,
  previewReady: true,
  hostTemplateFile,
  sandboxFile,
  generatedFile,
  previewFile,
  bridgeHarnessFile,
  bridgeApiHarnessFile,
  bridgeManifestFile,
  bridgeTypesFile,
  safety: true,
  apply: true,
}, null, 2));
