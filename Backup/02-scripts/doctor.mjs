import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectVendorStatus, getVendorMappings, isVendorReady } from "./vendor-config.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const packageJson = JSON.parse(await fs.readFile(path.join(projectDir, "package.json"), "utf8"));

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
  return (await exists(filePath)) ? fs.readFile(filePath, "utf8") : "";
}

async function fileState(filePath) {
  if (!(await exists(filePath))) {
    return {
      exists: false,
      bytes: 0,
      sha256: "",
      containsPdfCad: false,
      containsOldCadApp: false,
      containsSamplePdf: false,
    };
  }
  const bytes = await fs.readFile(filePath);
  const text = bytes.toString("utf8");
  return {
    exists: true,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
    containsPdfCad: text.includes("PDF to CAD Tool"),
    containsOldCadApp: text.includes("Line: click start point"),
    containsSamplePdf: text.includes("_sample_M-08_sanitary.pdf"),
  };
}

function collectRemoteUrls(...sources) {
  const urls = [];
  for (const source of sources) {
    const pattern = /["'](https?:\/\/[^"']+)["']/g;
    let match = pattern.exec(source);
    while (match) {
      urls.push(match[1]);
      match = pattern.exec(source);
    }
  }
  return [...new Set(urls)];
}

function requestStatus(url, followRedirect = false) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      if (followRedirect && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        resolve(requestStatus(new URL(response.headers.location, url).href, false));
        return;
      }
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
      });
      response.on("end", () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 400,
          status: response.statusCode,
          location: response.headers.location || "",
          bytes,
          contentType: response.headers["content-type"] || "",
        });
      });
    });
    request.setTimeout(2500, () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", (error) => {
      resolve({
        ok: false,
        status: 0,
        location: "",
        bytes: 0,
        contentType: "",
        error: error.message,
      });
    });
  });
}

const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const sourceHtmlFile = path.join(sourceAppDir, config.sourceHtml);
const sourceEntryFile = path.join(sourceAppDir, config.sourceEntry);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const generatedFile = resolveConfigPath(config.generatedFile);
const previewFile = resolveConfigPath(config.previewFile);
const bridgeHarnessFile = resolveConfigPath(config.bridgeHarnessFile || path.join(path.dirname(generatedFile), "bridge-io-harness.html"));
const bridgeApiHarnessFile = resolveConfigPath(config.bridgeApiHarnessFile || path.join(path.dirname(generatedFile), "bridge-api-harness.html"));
const bridgeManifestFile = resolveConfigPath(config.bridgeManifestFile || path.join(path.dirname(generatedFile), "bridge-manifest.json"));
const bridgeTypesFile = resolveConfigPath(config.bridgeTypesFile || path.join(path.dirname(generatedFile), "pdf-cad-bridge.d.ts"));
const promotionDir = path.join(projectDir, "promotion");
const promotionReadyFile = path.join(promotionDir, "App_minimal.ready.js");
const promotionManifestFile = path.join(promotionDir, "PROMOTION_MANIFEST.json");
const lightPackageDir = path.join(projectDir, "dist-light-package");
const lightWrapperFile = path.join(lightPackageDir, "App_minimal.light.js");
const lightManifestFile = path.join(lightPackageDir, "LIGHT_PACKAGE_MANIFEST.json");
const configuredSourceAssets = Array.isArray(config.sourceAssets) ? config.sourceAssets.filter(Boolean) : [];
const sourceAssetEmbeddingEnabled = config.embedSourceAssets !== false;
const activeSampleName = sourceAssetEmbeddingEnabled ? configuredSourceAssets[0] || "" : "";
const expectedSampleBundled = Boolean(activeSampleName);
const previewPath = activeSampleName
  ? `/preview.html?sample=${encodeURIComponent(activeSampleName)}`
  : "/preview.html";

const sourceHtml = await readText(sourceHtmlFile);
const sourceEntry = await readText(sourceEntryFile);
const host = await fileState(hostTemplateFile);
const sandbox = await fileState(sandboxFile);
const generated = await fileState(generatedFile);
const preview = await fileState(previewFile);
const bridgeHarness = await fileState(bridgeHarnessFile);
const bridgeApiHarness = await fileState(bridgeApiHarnessFile);
const bridgeManifest = await fileState(bridgeManifestFile);
const bridgeTypes = await fileState(bridgeTypesFile);
const promotionReady = await fileState(promotionReadyFile);
const lightWrapper = await fileState(lightWrapperFile);
const lightManifest = await fileState(lightManifestFile);
const appBuild = sourceEntry.match(/const\s+APP_BUILD\s*=\s*["']([^"']+)["']/)?.[1] || "";
const remoteDependencies = collectRemoteUrls(sourceHtml, sourceEntry);
const localVendorStatus = await collectVendorStatus(getVendorMappings(config, sourceAppDir));
const rootStatus = await requestStatus("http://127.0.0.1:5212/");
const previewStatus = await requestStatus(`http://127.0.0.1:5212${previewPath}`);
const bridgeHarnessStatus = await requestStatus("http://127.0.0.1:5212/bridge-io-harness.html");
const bridgeApiHarnessStatus = await requestStatus("http://127.0.0.1:5212/bridge-api-harness.html");
const bridgeManifestStatus = await requestStatus("http://127.0.0.1:5212/bridge-manifest.json");
const bridgeTypesStatus = await requestStatus("http://127.0.0.1:5212/pdf-cad-bridge.d.ts");

const pathSafety = {
  sandboxInsideBridge: isInsideProject(sandboxFile),
  generatedInsideBridge: isInsideProject(generatedFile),
  previewInsideBridge: isInsideProject(previewFile),
  bridgeHarnessInsideBridge: isInsideProject(bridgeHarnessFile),
  bridgeApiHarnessInsideBridge: isInsideProject(bridgeApiHarnessFile),
  bridgeManifestInsideBridge: isInsideProject(bridgeManifestFile),
  bridgeTypesInsideBridge: isInsideProject(bridgeTypesFile),
  sourceInsideBridge: isInsideProject(sourceAppDir),
  hostSeparateFromSandbox: hostTemplateFile !== sandboxFile,
  targetShortcutsRemoved: !(await exists(path.join(projectDir, "apply-to-target.cmd"))) && !(await exists(path.join(projectDir, "serve-target.cmd"))),
  packageScriptsAvoidHost: !Object.values(packageJson.scripts || {}).some((script) => /kitakyushu-water-app|serve:target/.test(script)),
};

const outputState = {
  hostStaysOriginal: host.exists && !host.containsPdfCad && host.containsOldCadApp,
  sandboxIsPdfCad: sandbox.exists && sandbox.containsPdfCad && !sandbox.containsOldCadApp && (expectedSampleBundled ? sandbox.containsSamplePdf : !sandbox.containsSamplePdf),
  generatedMatchesSandbox: generated.exists && generated.sha256 === sandbox.sha256,
  previewGenerated: preview.exists && preview.bytes > 0,
  bridgeHarnessGenerated: bridgeHarness.exists && bridgeHarness.bytes > 0,
  bridgeApiHarnessGenerated: bridgeApiHarness.exists && bridgeApiHarness.bytes > 0,
  bridgeManifestGenerated: bridgeManifest.exists && bridgeManifest.bytes > 0,
  bridgeTypesGenerated: bridgeTypes.exists && bridgeTypes.bytes > 0,
  promotionPackageReady: promotionReady.exists && promotionReady.sha256 === sandbox.sha256,
  lightPackageReady: lightWrapper.exists && lightManifest.exists,
};

const coreOutputOk = [
  outputState.hostStaysOriginal,
  outputState.sandboxIsPdfCad,
  outputState.generatedMatchesSandbox,
  outputState.previewGenerated,
  outputState.bridgeHarnessGenerated,
  outputState.bridgeApiHarnessGenerated,
  outputState.bridgeManifestGenerated,
  outputState.bridgeTypesGenerated,
].every(Boolean);
const coreOk = Object.values(pathSafety).every(Boolean) && coreOutputOk && Boolean(appBuild);
const localVendorReady = localVendorStatus.every(isVendorReady);
const remainingWork = [
  ...(localVendorReady
    ? [outputState.lightPackageReady
      ? "Lightweight wrapper plus static pdf-cad folder is the recommended ordinary distribution package; get explicit approval before any real host write."
      : "Run npm run package:light if lightweight distribution is needed."]
    : ["Vendor PDF.js and Tesseract.js if offline operation is required."]),
  "Use npm run contract, the bridge API harness, manifest, and generated types for future host-side command checks.",
  "Sample PDF embedding is disabled for release output; keep source samples only for local development when needed.",
];
const previewServer = {
  rootRedirectsToPreview: rootStatus.status === 302 && rootStatus.location.includes(previewPath),
  previewHtmlServed: previewStatus.ok && previewStatus.status === 200 && previewStatus.bytes > 0,
  bridgeHarnessServed: bridgeHarnessStatus.ok && bridgeHarnessStatus.status === 200 && bridgeHarnessStatus.bytes > 0,
  bridgeApiHarnessServed: bridgeApiHarnessStatus.ok && bridgeApiHarnessStatus.status === 200 && bridgeApiHarnessStatus.bytes > 0,
  bridgeManifestServed: bridgeManifestStatus.ok && bridgeManifestStatus.status === 200 && bridgeManifestStatus.bytes > 0,
  bridgeTypesServed: bridgeTypesStatus.ok && bridgeTypesStatus.status === 200 && bridgeTypesStatus.bytes > 0,
  rootStatus,
  previewStatus,
  bridgeHarnessStatus,
  bridgeApiHarnessStatus,
  bridgeManifestStatus,
  bridgeTypesStatus,
};

console.log(JSON.stringify({
  ok: coreOk,
  progress: {
    appOutputBridge: localVendorReady && outputState.lightPackageReady && outputState.promotionPackageReady ? 99 : localVendorReady ? 98 : 96,
    note: "Sandbox generation, bridge I/O, promise API harness, manifest/type outputs, contract checks, safety checks, and release readiness checks are ready; the host app is intentionally not part of this completion pass.",
  },
  appBuild,
  pathSafety,
  outputState,
  previewServer,
  files: {
    hostTemplateFile,
    sandboxFile,
    generatedFile,
    previewFile,
    bridgeHarnessFile,
    bridgeApiHarnessFile,
    bridgeManifestFile,
    bridgeTypesFile,
    promotionReadyFile,
    promotionManifestFile,
    lightPackageDir,
    lightWrapperFile,
    lightManifestFile,
    host,
    sandbox,
    generated,
    preview,
    bridgeHarness,
    bridgeApiHarness,
    bridgeManifest,
    bridgeTypes,
    promotionReady,
    lightWrapper,
    lightManifest,
  },
  externalDependencies: {
    requiresNetworkForLibraries: remoteDependencies.length > 0,
    remoteDependencies,
    localVendorReady,
    localVendors: localVendorStatus,
  },
  remainingWork,
}, null, 2));
