import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
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

async function fileInfo(filePath) {
  if (!(await exists(filePath))) return { exists: false, bytes: 0 };
  const bytes = await fs.readFile(filePath);
  return {
    exists: true,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
  };
}

async function appFileInfo(filePath) {
  const info = await fileInfo(filePath);
  if (!info.exists) return info;
  const source = await readTextIfExists(filePath);
  return {
    ...info,
    containsPdfCad: source.includes("PDF to CAD Tool"),
    containsOldCadApp: source.includes("Line: click start point"),
    containsSamplePdf: source.includes("_sample_M-08_sanitary.pdf"),
  };
}

function collectMatches(source, pattern, group = 1) {
  const values = [];
  let match = pattern.exec(source);
  while (match) {
    values.push(match[group] || match[0]);
    match = pattern.exec(source);
  }
  return values;
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const sourceHtmlPath = path.join(sourceAppDir, config.sourceHtml);
const sourceEntryPath = path.join(sourceAppDir, config.sourceEntry);
const sourceCssPath = path.join(sourceAppDir, config.sourceCss);
const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const generatedFile = resolveConfigPath(config.generatedFile);
const previewFile = resolveConfigPath(config.previewFile);
const bridgeHarnessFile = resolveConfigPath(config.bridgeHarnessFile || path.join(path.dirname(generatedFile), "bridge-io-harness.html"));
const bridgeApiHarnessFile = resolveConfigPath(config.bridgeApiHarnessFile || path.join(path.dirname(generatedFile), "bridge-api-harness.html"));
const bridgeManifestFile = resolveConfigPath(config.bridgeManifestFile || path.join(path.dirname(generatedFile), "bridge-manifest.json"));
const bridgeTypesFile = resolveConfigPath(config.bridgeTypesFile || path.join(path.dirname(generatedFile), "pdf-cad-bridge.d.ts"));

const html = await readTextIfExists(sourceHtmlPath);
const js = await readTextIfExists(sourceEntryPath);
const css = await readTextIfExists(sourceCssPath);
const host = await readTextIfExists(hostTemplateFile);
const sandbox = await readTextIfExists(sandboxFile);
const generated = await readTextIfExists(generatedFile);

const appBuild = js.match(/const\s+APP_BUILD\s*=\s*["']([^"']+)["']/)?.[1] || "";
const htmlScripts = collectMatches(html, /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi);
const htmlStylesheets = collectMatches(html, /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi);
const jsImports = collectMatches(js, /import\s+[^"']*["']([^"']+)["']/g);
const jsRemoteUrls = collectMatches(js, /["'](https?:\/\/[^"']+)["']/g);
const remoteDependencies = [...new Set([
  ...htmlScripts.filter((value) => /^https?:\/\//.test(value)),
  ...htmlStylesheets.filter((value) => /^https?:\/\//.test(value)),
  ...jsImports.filter((value) => /^https?:\/\//.test(value)),
  ...jsRemoteUrls,
])];

const assets = {};
for (const assetName of config.sourceAssets || []) {
  assets[assetName] = await fileInfo(path.join(sourceAppDir, assetName));
}

console.log(JSON.stringify({
  ok: Boolean(appBuild && sandbox.includes("PDF to CAD Tool") && !host.includes("PDF to CAD Tool")),
  summary: {
    hostStaysOriginal: !host.includes("PDF to CAD Tool") && host.includes("Line: click start point"),
    sandboxIsPdfCad: sandbox.includes("PDF to CAD Tool") && !sandbox.includes("Line: click start point"),
    generatedMatchesSandbox: Boolean(generated) && generated === sandbox,
    previewGenerated: await exists(previewFile),
    requiresNetworkForLibraries: remoteDependencies.length > 0,
  },
  title: config.title,
  componentName: config.componentName,
  appBuild,
  source: {
    appDir: sourceAppDir,
    embedSourceAssets: config.embedSourceAssets !== false,
    html: await fileInfo(sourceHtmlPath),
    entry: await fileInfo(sourceEntryPath),
    css: await fileInfo(sourceCssPath),
    cssBytes: Buffer.byteLength(css, "utf8"),
  },
  host: await appFileInfo(hostTemplateFile),
  outputs: {
    sandbox: await appFileInfo(sandboxFile),
    generated: await appFileInfo(generatedFile),
    preview: await fileInfo(previewFile),
    bridgeHarness: await fileInfo(bridgeHarnessFile),
    bridgeApiHarness: await fileInfo(bridgeApiHarnessFile),
    bridgeManifest: await fileInfo(bridgeManifestFile),
    bridgeTypes: await fileInfo(bridgeTypesFile),
  },
  embeddedAssets: assets,
  externalDependencies: {
    requiresNetworkForLibraries: remoteDependencies.length > 0,
    remoteDependencies,
    htmlScripts,
    htmlStylesheets,
    jsImports,
    jsRemoteUrls,
  },
}, null, 2));
