import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));

const requiredCommands = [
  "get-state",
  "load-sample",
  "load-pdf",
  "set-options",
  "analyze",
  "export-dxf",
  "download-dxf",
  "fit",
];

const requiredMethods = [
  "send",
  "request",
  "getState",
  "loadPdfData",
  "loadSample",
  "setOptions",
  "analyze",
  "exportDxf",
  "downloadDxf",
  "fit",
];

const requiredDxfFields = [
  "fileName",
  "layerName",
  "dxf",
  "dxfBase64",
  "bytes",
  "counts",
  "state",
];

const requiredEvents = [
  "pdf-cad-output",
  "pdf-cad-response",
  "pdf-cad-ready",
  "pdf-cad-status",
  "pdf-cad-pdf-loaded",
  "pdf-cad-sample-loaded",
  "pdf-cad-analysis-complete",
  "pdf-cad-dxf-exported",
  "pdf-cad-dxf-download-started",
  "pdf-cad-error",
  "pdf-cad-command-error",
];

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludesAll(label, values, requiredValues) {
  for (const value of requiredValues) {
    assert(values.includes(value), `${label} is missing ${value}.`);
  }
}

const generatedFile = resolveConfigPath(config.generatedFile);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const previewFile = resolveConfigPath(config.previewFile);
const bridgeHarnessFile = resolveConfigPath(config.bridgeHarnessFile);
const bridgeApiHarnessFile = resolveConfigPath(config.bridgeApiHarnessFile);
const bridgeManifestFile = resolveConfigPath(config.bridgeManifestFile);
const bridgeTypesFile = resolveConfigPath(config.bridgeTypesFile);
const sourceEntryFile = path.join(resolveConfigPath(config.sourceAppDir), config.sourceEntry);
const exampleFile = path.join(projectDir, "examples", "PdfCadBridgeClient.example.js");

for (const [label, filePath] of Object.entries({
  generatedFile,
  sandboxFile,
  previewFile,
  bridgeHarnessFile,
  bridgeApiHarnessFile,
  bridgeManifestFile,
  bridgeTypesFile,
  sourceEntryFile,
  exampleFile,
})) {
  assert(filePath, `${label} is not configured.`);
  assert(isInsideProject(filePath) || label === "sourceEntryFile", `${label} is outside app-output-bridge: ${filePath}`);
  assert(await exists(filePath), `${label} does not exist: ${filePath}`);
}

const sourceEntry = await readText(sourceEntryFile);
const generated = await readText(generatedFile);
const sandbox = await readText(sandboxFile);
const preview = await readText(previewFile);
const rawHarness = await readText(bridgeHarnessFile);
const apiHarness = await readText(bridgeApiHarnessFile);
const manifest = JSON.parse(await readText(bridgeManifestFile));
const types = await readText(bridgeTypesFile);
const example = await readText(exampleFile);
const appBuild = sourceEntry.match(/const\s+APP_BUILD\s*=\s*["']([^"']+)["']/)?.[1] || "";

assert(appBuild, "Could not read APP_BUILD from source app.");
assert(manifest.contract === "pdf-cad-app-output-bridge", "Manifest contract name is wrong.");
assert(manifest.contractVersion === 1, "Manifest contract version is wrong.");
assert(manifest.appBuild === appBuild, "Manifest appBuild does not match source APP_BUILD.");
assert(manifest.hostWriteMode === "none", "Manifest must declare hostWriteMode none.");

assertIncludesAll("Manifest childCommands", manifest.childCommands || [], requiredCommands);
assertIncludesAll("Manifest parent methods", manifest.parentApi?.methods || [], requiredMethods);
assertIncludesAll("Manifest parent events", manifest.parentApi?.events || [], requiredEvents);
assertIncludesAll("Manifest export result fields", manifest.exportDxfResult || [], requiredDxfFields);

const generatedFiles = manifest.generatedFiles || {};
assert(generatedFiles.reactWrapper === path.basename(generatedFile), "Manifest reactWrapper file name is wrong.");
assert(generatedFiles.preview === path.basename(previewFile), "Manifest preview file name is wrong.");
assert(generatedFiles.rawMessageHarness === path.basename(bridgeHarnessFile), "Manifest raw harness file name is wrong.");
assert(generatedFiles.promiseApiHarness === path.basename(bridgeApiHarnessFile), "Manifest API harness file name is wrong.");
assert(generatedFiles.manifest === path.basename(bridgeManifestFile), "Manifest manifest file name is wrong.");
assert(generatedFiles.types === path.basename(bridgeTypesFile), "Manifest types file name is wrong.");

assert(generated === sandbox, "Generated wrapper and sandbox output differ.");
assert(generated.includes("window.PdfCadAppBridge = api"), "Generated wrapper does not expose PdfCadAppBridge.");
assert(generated.includes("event.source !== childWindow"), "Generated wrapper does not filter messages by iframe source.");
assert(preview.includes("window.PdfCadBridge"), "Preview does not expose the inner PdfCadBridge.");
assert(rawHarness.includes("pdf-cad:command"), "Raw I/O harness does not send bridge commands.");
assert(apiHarness.includes("Run Full Flow"), "API harness does not include full-flow testing.");
assert(apiHarness.includes("Export & Save DXF"), "API harness does not include parent-side DXF saving.");
assert(apiHarness.includes("AUTO_RUN"), "API harness does not include autorun support.");
assert(apiHarness.includes("SMOKE_OPTIONS"), "API harness does not include query-driven smoke options.");
assert(apiHarness.includes("__PDF_CAD_BRIDGE_SMOKE_RESULT__"), "API harness does not expose smoke result.");
assert(apiHarness.includes('id="smokeResult"'), "API harness does not expose DOM smoke result.");
assert(apiHarness.includes("dataset.result"), "API harness does not store DOM smoke result data.");
assert(apiHarness.includes("summarizeResult"), "API harness does not summarize smoke result.");
assert(example.includes("runPdfCadSampleFlow"), "Example does not include sample flow helper.");
assert(example.includes("saveDxfResult"), "Example does not include DXF save helper.");

for (const command of requiredCommands) {
  assert(types.includes(`"${command}"`), `Types do not list command ${command}.`);
}
for (const method of requiredMethods) {
  assert(types.includes(`${method}`), `Types do not list method ${method}.`);
}
for (const field of requiredDxfFields) {
  assert(types.includes(`${field}:`), `Types do not list DXF field ${field}.`);
}

console.log(JSON.stringify({
  ok: true,
  appBuild,
  contract: manifest.contract,
  contractVersion: manifest.contractVersion,
  generatedFiles,
  checks: {
    commands: requiredCommands.length,
    methods: requiredMethods.length,
    events: requiredEvents.length,
    exportDxfFields: requiredDxfFields.length,
    wrapperMatchesSandbox: true,
    apiHarnessHasParentSave: true,
    exampleAvailable: true,
  },
}, null, 2));
