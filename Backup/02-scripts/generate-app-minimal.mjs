import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getVendorMappings } from "./vendor-config.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(projectDir, "bridge.config.json");

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldCheck = args.has("--check");
const skipBackup = args.has("--no-backup");

const config = JSON.parse(await fs.readFile(configPath, "utf8"));

const embedSourceAssets = args.has("--no-embed-assets")
  ? false
  : args.has("--embed-assets")
    ? true
    : config.embedSourceAssets !== false;

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertSafeSandboxFile(filePath) {
  if (isInsideProject(filePath)) return;
  throw new Error(
    `Refusing to write outside app-output-bridge: ${filePath}\n` +
      "Copy the host file into app-output-bridge/sandbox first.",
  );
}

function assertInsideProject(label, filePath) {
  if (isInsideProject(filePath)) return;
  throw new Error(`Refusing to write ${label} outside app-output-bridge: ${filePath}`);
}

async function pathExists(filePath) {
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBodyMarkup(html, sourceEntry) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = match ? match[1] : html;
  const entryName = path.basename(sourceEntry);
  const entryPattern = new RegExp(`<script\\b[^>]*src=["'][^"']*${escapeRegExp(entryName)}[^"']*["'][^>]*><\\/script>`, "gi");
  return body.replace(entryPattern, "").trim();
}

function extractExternalHeadScripts(html, sourceEntry) {
  const entryName = path.basename(sourceEntry);
  const scripts = [];
  const scriptPattern = /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  let match = scriptPattern.exec(html);

  while (match) {
    const tag = match[0];
    const src = match[1];
    if (!src.includes(entryName)) scripts.push(tag);
    match = scriptPattern.exec(html);
  }

  return scripts.join("\n    ");
}

function splitStaticImports(source, sourceCss) {
  const importLines = [];
  const bodyLines = [];
  const cssName = path.basename(sourceCss);
  let inOpeningImportBlock = true;

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    const isCssImport = new RegExp(`^import\\s+["'][^"']*${escapeRegExp(cssName)}[^"']*["'];?$`).test(trimmed);
    const isStaticImport = /^import\b/.test(trimmed);

    if (inOpeningImportBlock && isCssImport) continue;
    if (inOpeningImportBlock && isStaticImport) {
      importLines.push(line);
      continue;
    }

    if (trimmed) inOpeningImportBlock = false;
    bodyLines.push(line);
  }

  return {
    importBlock: importLines.join("\n"),
    body: bodyLines.join("\n").trimStart(),
  };
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".wasm") return "application/wasm";
  if (ext === ".gz") return "application/gzip";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function readEmbeddedAssets(sourceAppDir) {
  const assets = {};
  if (!embedSourceAssets) return assets;

  const configuredAssets = Array.isArray(config.sourceAssets) ? config.sourceAssets : [];

  for (const assetName of configuredAssets) {
    const assetPath = path.join(sourceAppDir, assetName);
    if (!(await pathExists(assetPath))) continue;
    const bytes = await fs.readFile(assetPath);
    const normalized = toPosixPath(assetName).replace(/^\/+/, "");
    assets[normalized] = {
      base64: bytes.toString("base64"),
      mimeType: mimeTypeFor(assetPath),
    };
  }

  return assets;
}

function toDataUrl(bytes, mimeType) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function vendorUrlCandidates(asset) {
  return [...new Set([
    asset.remote,
    asset.local,
    asset.localRef,
    `./${asset.local}`,
    asset.local.replace(/\\/g, "/"),
    asset.localRef.replace(/\\/g, "/"),
  ].filter(Boolean))];
}

function urlMatchesVendor(src, asset) {
  return vendorUrlCandidates(asset).includes(src);
}

function replaceUrlStringLiterals(source, candidates, replacementUrl) {
  let next = source;
  for (const candidate of candidates) {
    next = next.split(JSON.stringify(candidate)).join(JSON.stringify(replacementUrl));
    next = next.split(`'${candidate}'`).join(JSON.stringify(replacementUrl));
    next = next.split(`\`${candidate}\``).join(JSON.stringify(replacementUrl));
  }
  return next;
}

async function readLocalVendorAssets(sourceAppDir) {
  const assets = [];
  for (const mapping of getVendorMappings(config, sourceAppDir)) {
    if (!(await pathExists(mapping.localPath))) continue;
    const bytes = await fs.readFile(mapping.localPath);
    assets.push({
      ...mapping,
      bytes: bytes.length,
      text: bytes.toString("utf8"),
      dataUrl: toDataUrl(bytes, mimeTypeFor(mapping.localPath)),
    });
  }
  const worker = assets.find((asset) => asset.local === "vendor/tesseract/worker.min.js");
  if (worker) {
    const embeddedWorker = buildTesseractWorkerWithEmbeddedAssets(worker.text, assets);
    worker.text = embeddedWorker.text;
    worker.dataUrl = toDataUrl(Buffer.from(worker.text, "utf8"), "text/javascript; charset=utf-8");
    worker.embeddedLocalVendors = embeddedWorker.embeddedLocalVendors;
  }
  return assets;
}

function buildTesseractWorkerWithEmbeddedAssets(workerText, assets) {
  const workerAssets = assets
    .filter((asset) => (
      asset.local.startsWith("vendor/tesseract/")
      && asset.local !== "vendor/tesseract/tesseract.min.js"
      && asset.local !== "vendor/tesseract/worker.min.js"
    ))
    .map((asset) => ({
      local: asset.local,
      localRef: asset.localRef,
      fileName: path.basename(asset.local),
      dataUrl: asset.dataUrl,
      base64: Buffer.from(asset.text, "utf8").toString("base64") === asset.dataUrl.split(",")[1] ? undefined : asset.dataUrl.split(",")[1],
      mimeType: mimeTypeFor(asset.localPath),
    }));

  const prelude = `(() => {
  const assets = ${JSON.stringify(workerAssets)};
  const assetByKey = new Map();
  for (const asset of assets) {
    for (const key of [asset.local, asset.localRef, "./" + asset.local, asset.fileName]) {
      if (key) assetByKey.set(String(key).replace(/^\\.\\//, ""), asset);
      if (key) assetByKey.set(key, asset);
    }
  }
  const nativeFetch = self.fetch ? self.fetch.bind(self) : null;
  const nativeImportScripts = self.importScripts ? self.importScripts.bind(self) : null;
  function findAsset(input) {
    const raw = typeof input === "string" ? input : input?.url || "";
    if (!raw || raw.startsWith("data:")) return null;
    const rawKey = raw.replace(/^\\.\\//, "");
    if (assetByKey.has(raw) || assetByKey.has(rawKey)) return assetByKey.get(raw) || assetByKey.get(rawKey);
    try {
      const url = new URL(raw, self.location?.href || "http://app-output-bridge.local/");
      const pathKey = decodeURIComponent(url.pathname.replace(/^\\/+/, ""));
      const fileKey = decodeURIComponent(url.pathname.split("/").pop() || "");
      return assetByKey.get(pathKey) || assetByKey.get(fileKey) || null;
    } catch (_error) {
      return null;
    }
  }
  function bytesFromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  if (nativeFetch) {
    self.fetch = async (input, init) => {
      const asset = findAsset(input);
      if (asset) {
        const base64 = asset.base64 || asset.dataUrl.split(",")[1] || "";
        return new Response(bytesFromBase64(base64), {
          status: 200,
          headers: { "Content-Type": asset.mimeType || "application/octet-stream" },
        });
      }
      return nativeFetch(input, init);
    };
  }
  if (nativeImportScripts) {
    self.importScripts = (...urls) => nativeImportScripts(...urls.map((url) => findAsset(url)?.dataUrl || url));
  }
})();`;

  return {
    text: `${prelude}\n${workerText}`,
    embeddedLocalVendors: workerAssets.map((asset) => asset.local),
  };
}

function rewriteHeadScriptsWithLocalVendors(html, sourceEntry, localVendorAssets) {
  const entryName = path.basename(sourceEntry);
  const scripts = [];
  const embedded = [];
  const scriptPattern = /<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi;
  let match = scriptPattern.exec(html);

  while (match) {
    const tag = match[0];
    const src = match[2];
    if (src.includes(entryName)) {
      match = scriptPattern.exec(html);
      continue;
    }

    const asset = localVendorAssets.find((item) => item.sourceKey === "sourceHtml" && urlMatchesVendor(src, item));
    if (asset) {
      scripts.push(`<script data-app-output-bridge-vendor="${asset.local}">\n${escapeScriptContent(asset.text)}\n</script>`);
      embedded.push(asset.local);
    } else {
      scripts.push(tag);
    }
    match = scriptPattern.exec(html);
  }

  return {
    headScripts: scripts.join("\n    "),
    embeddedLocalVendors: [...new Set(embedded)],
  };
}

function rewriteModuleImportsWithLocalVendors(importBlock, body, localVendorAssets) {
  let nextImportBlock = importBlock;
  let nextBody = body;
  const embedded = [];

  for (const asset of localVendorAssets.filter((item) => item.sourceKey === "sourceEntry")) {
    const candidates = vendorUrlCandidates(asset);
    if (asset.local.endsWith(".mjs") && !asset.local.includes("worker")) {
      const before = nextImportBlock;
      nextImportBlock = replaceUrlStringLiterals(nextImportBlock, candidates, asset.dataUrl);
      if (nextImportBlock !== before) embedded.push(asset.local);
      continue;
    }

    const before = nextBody;
    nextBody = replaceUrlStringLiterals(nextBody, candidates, asset.dataUrl);
    if (nextBody !== before) embedded.push(asset.local);
  }

  return {
    importBlock: nextImportBlock,
    body: nextBody,
    embeddedLocalVendors: [...new Set(embedded)],
  };
}

function buildRuntimePrelude(embeddedAssets) {
  return `const __APP_OUTPUT_BRIDGE_ASSETS__ = ${JSON.stringify(embeddedAssets)};
const __appOutputBridgeNativeFetch = window.fetch.bind(window);
window.__APP_OUTPUT_BRIDGE_PARENT_SEARCH__ = window.__APP_OUTPUT_BRIDGE_PARENT_SEARCH__ || (() => {
  try {
    const parentSearch = window.parent?.location?.search;
    if (parentSearch) return parentSearch;
  } catch (_error) {
    // Fall back to document.referrer below.
  }
  try {
    return new URL(document.referrer).search || "";
  } catch (_error) {
    return "";
  }
})();
window.__APP_OUTPUT_BRIDGE_PARENT_HREF__ = window.__APP_OUTPUT_BRIDGE_PARENT_HREF__ || (() => {
  try {
    const parentHref = window.parent?.location?.href;
    if (parentHref) return parentHref;
  } catch (_error) {
    // Fall back to document.referrer below.
  }
  return document.referrer || "";
})();
window.fetch = async (input, init) => {
  const rawUrl = typeof input === "string" ? input : input?.href || input?.url;
  if (rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.href);
      const key = decodeURIComponent(url.pathname.replace(/^\\//, ""));
      const fileName = decodeURIComponent(url.pathname.split("/").pop() || "");
      const asset = __APP_OUTPUT_BRIDGE_ASSETS__[key] ?? __APP_OUTPUT_BRIDGE_ASSETS__[fileName];
      if (asset) {
        const binary = atob(asset.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": asset.mimeType },
        });
      }
    } catch (_error) {
      // Fall back to the browser fetch below.
    }
  }
  return __appOutputBridgeNativeFetch(input, init);
};
window.__APP_OUTPUT_BRIDGE_EMBEDDED__ = true;`;
}

function escapeScriptContent(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function buildSrcDoc({ title, bodyMarkup, css, headScripts, moduleSource }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
${css}
    </style>
    ${headScripts}
  </head>
  <body>
${bodyMarkup}
    <script type="module">
${escapeScriptContent(moduleSource)}
    </script>
  </body>
</html>`;
}

function jsStringLiteral(value) {
  return JSON.stringify(value);
}

function buildReactComponent({ componentName, title, srcDoc }) {
  return `/* eslint-disable no-template-curly-in-string */
import React, { useEffect, useMemo, useRef } from "react";

const APP_OUTPUT_BRIDGE_SRC_DOC = ${jsStringLiteral(srcDoc)};
const APP_OUTPUT_BRIDGE_COMMAND_TYPE = "pdf-cad:command";
const APP_OUTPUT_BRIDGE_EVENT_TYPE = "pdf-cad:bridge";
const APP_OUTPUT_BRIDGE_RESPONSE_TYPE = "pdf-cad:bridge:response";
const APP_OUTPUT_BRIDGE_FRAME_LOAD_EVENT = "pdf-cad-frame-load";

export default function ${componentName}() {
  const srcDoc = useMemo(() => APP_OUTPUT_BRIDGE_SRC_DOC, []);
  const iframeRef = useRef(null);
  const childReadyRef = useRef(false);
  const pendingRequestsRef = useRef(new Map());
  const queuedCommandsRef = useRef([]);
  const requestCounterRef = useRef(0);

  useEffect(() => {
    const postMessageToChild = (message) => {
      const child = iframeRef.current?.contentWindow;
      if (!child) return false;
      child.postMessage(message, "*");
      return true;
    };

    const flushQueuedCommands = () => {
      const queued = queuedCommandsRef.current.splice(0);
      for (const message of queued) {
        if (!postMessageToChild(message)) queuedCommandsRef.current.push(message);
      }
    };

    const sendToChild = (command, payload = {}, requestId = "", options = {}) => {
      const message = {
        type: APP_OUTPUT_BRIDGE_COMMAND_TYPE,
        command,
        payload,
        requestId,
      };
      if (!childReadyRef.current && !options.immediate) {
        queuedCommandsRef.current.push(message);
        return requestId;
      }
      if (!postMessageToChild(message)) queuedCommandsRef.current.push(message);
      return requestId;
    };

    const nextRequestId = (command) => {
      requestCounterRef.current += 1;
      return command + "-" + Date.now() + "-" + requestCounterRef.current;
    };

    const request = (command, payload = {}, options = {}) => {
      const requestId = options.requestId || nextRequestId(command);
      const timeoutMs = options.timeoutMs ?? 180000;
      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          pendingRequestsRef.current.delete(requestId);
          reject(new Error("PDF-CAD bridge command timed out: " + command));
        }, timeoutMs);
        pendingRequestsRef.current.set(requestId, { resolve, reject, timeout });
        sendToChild(command, payload, requestId, options);
      });
    };

    const api = {
      send: sendToChild,
      request,
      getState: (options = {}) => request("get-state", {}, { timeoutMs: 30000, ...options }),
      loadPdfData: (payload, options = {}) => request("load-pdf", payload, options),
      loadSample: (sample, options = {}) => request("load-sample", { sample }, options),
      setOptions: (optionsPayload, options = {}) => request("set-options", { options: optionsPayload }, options),
      analyze: (options = {}) => request("analyze", {}, options),
      exportDxf: (payload = {}, options = {}) => request("export-dxf", payload, options),
      downloadDxf: (options = {}) => request("download-dxf", {}, options),
      fit: (options = {}) => request("fit", {}, { timeoutMs: 30000, ...options }),
    };

    const previousApi = window.PdfCadAppBridge;
    window.PdfCadAppBridge = api;

    const handleInputEvent = (event) => {
      const detail = event.detail || {};
      if (!detail.command) return;
      sendToChild(detail.command, detail.payload || {}, detail.requestId || "", { immediate: Boolean(detail.immediate) });
    };

    const handleMessage = (event) => {
      const childWindow = iframeRef.current?.contentWindow;
      if (childWindow && event.source !== childWindow) return;
      const data = event.data || {};
      if (data.type !== APP_OUTPUT_BRIDGE_EVENT_TYPE && data.type !== APP_OUTPUT_BRIDGE_RESPONSE_TYPE) return;
      if (data.type === APP_OUTPUT_BRIDGE_EVENT_TYPE && data.event === "ready") {
        childReadyRef.current = true;
        flushQueuedCommands();
      }
      if (data.type === APP_OUTPUT_BRIDGE_RESPONSE_TYPE && data.requestId) {
        const pending = pendingRequestsRef.current.get(data.requestId);
        if (pending) {
          window.clearTimeout(pending.timeout);
          pendingRequestsRef.current.delete(data.requestId);
          if (data.ok) pending.resolve(data.result);
          else pending.reject(new Error(data.error || "PDF-CAD bridge command failed"));
        }
      }
      window.dispatchEvent(new CustomEvent("pdf-cad-output", { detail: data }));
      if (data.event) {
        window.dispatchEvent(new CustomEvent("pdf-cad-" + data.event, { detail: data }));
      }
      if (data.requestId) {
        window.dispatchEvent(new CustomEvent("pdf-cad-response", { detail: data }));
      }
    };

    const handleFrameLoad = () => {
      childReadyRef.current = true;
      window.setTimeout(flushQueuedCommands, 0);
    };

    window.addEventListener("pdf-cad-input", handleInputEvent);
    window.addEventListener("message", handleMessage);
    window.addEventListener(APP_OUTPUT_BRIDGE_FRAME_LOAD_EVENT, handleFrameLoad);
    return () => {
      window.removeEventListener("pdf-cad-input", handleInputEvent);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener(APP_OUTPUT_BRIDGE_FRAME_LOAD_EVENT, handleFrameLoad);
      for (const pending of pendingRequestsRef.current.values()) {
        window.clearTimeout(pending.timeout);
      }
      pendingRequestsRef.current.clear();
      queuedCommandsRef.current = [];
      if (previousApi) window.PdfCadAppBridge = previousApi;
      else delete window.PdfCadAppBridge;
    };
  }, []);

  const handleFrameLoad = () => {
    window.dispatchEvent(new Event(APP_OUTPUT_BRIDGE_FRAME_LOAD_EVENT));
  };

  return (
    <main style={styles.shell}>
      <iframe
        ref={iframeRef}
        title="${title}"
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin allow-downloads"
        onLoad={handleFrameLoad}
        style={styles.frame}
      />
    </main>
  );
}

const styles = {
  shell: {
    width: "100vw",
    height: "100vh",
    margin: 0,
    padding: 0,
    overflow: "hidden",
    background: "#101316",
  },
  frame: {
    display: "block",
    width: "100%",
    height: "100%",
    border: 0,
    background: "#101316",
  },
};
`;
}

function buildPreviewHtml({ srcDoc }) {
  return srcDoc;
}

function extractAppBuild(source) {
  return source.match(/const\s+APP_BUILD\s*=\s*["']([^"']+)["']/)?.[1] || "";
}

function buildBridgeManifest({ appBuild, title, componentName, sourceAssets, previewFileName, bridgeHarnessFileName, bridgeApiHarnessFileName, embeddedLocalVendors = [] }) {
  return {
    contract: "pdf-cad-app-output-bridge",
    contractVersion: 1,
    generatedAt: new Date().toISOString(),
    title,
    componentName,
    appBuild,
    hostWriteMode: "none",
    safety: {
      writesOnlyInsideProject: true,
      realHostAppIsReadOnlyTemplate: true,
    },
    generatedFiles: {
      reactWrapper: path.basename(config.generatedFile),
      preview: previewFileName,
      rawMessageHarness: bridgeHarnessFileName,
      promiseApiHarness: bridgeApiHarnessFileName,
      manifest: path.basename(config.bridgeManifestFile || "bridge-manifest.json"),
      types: path.basename(config.bridgeTypesFile || "pdf-cad-bridge.d.ts"),
    },
    sourceAssets,
    embeddedLocalVendors,
    parentApi: {
      global: "window.PdfCadAppBridge",
      methods: [
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
      ],
      events: [
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
      ],
    },
    childCommands: [
      "get-state",
      "load-sample",
      "load-pdf",
      "set-options",
      "analyze",
      "export-dxf",
      "download-dxf",
      "fit",
    ],
    exportDxfResult: [
      "fileName",
      "layerName",
      "dxf",
      "dxfBase64",
      "bytes",
      "counts",
      "state",
    ],
  };
}

function buildBridgeTypesDts({ appBuild }) {
  return `export type PdfCadBridgeCommand =
  | "get-state"
  | "load-sample"
  | "load-pdf"
  | "set-options"
  | "analyze"
  | "export-dxf"
  | "download-dxf"
  | "fit";

export type PdfCadBridgeEventName =
  | "ready"
  | "status"
  | "pdf-loaded"
  | "sample-loaded"
  | "analysis-complete"
  | "dxf-exported"
  | "dxf-download-started"
  | "error"
  | "command-error";

export interface PdfCadBridgeCounts {
  lines: number;
  circles: number;
  arcs: number;
  ellipses: number;
  splines: number;
  text: number;
}

export interface PdfCadBridgeState {
  build: "${appBuild || "unknown"}" | string;
  embedded: boolean;
  busy: boolean;
  status: string;
  file: {
    name: string;
    size: number;
  };
  page: {
    current: number;
    total: number;
    widthMm: number;
    heightMm: number;
    imageWidth: number;
    imageHeight: number;
  };
  preview: {
    hasCanvas: boolean;
    zoom: number;
    analysisDirty: boolean;
    dxfReady: boolean;
  };
  counts: PdfCadBridgeCounts;
  output: {
    layerName: string;
    dimensionScale: number;
    mmPerUnit: number;
  };
}

export interface PdfCadExportDxfResult {
  fileName: string;
  layerName: string;
  dxf: string;
  dxfBase64: string;
  bytes: number;
  counts: PdfCadBridgeCounts;
  state: PdfCadBridgeState;
}

export interface PdfCadLoadPdfPayload {
  name: string;
  base64?: string;
  bytes?: number[] | Uint8Array;
  arrayBuffer?: ArrayBuffer;
  url?: string;
}

export interface PdfCadBridgeRequestOptions {
  requestId?: string;
  timeoutMs?: number;
  immediate?: boolean;
}

export interface PdfCadBridgeApi {
  send(command: PdfCadBridgeCommand, payload?: unknown, requestId?: string, options?: PdfCadBridgeRequestOptions): string;
  request<T = unknown>(command: PdfCadBridgeCommand, payload?: unknown, options?: PdfCadBridgeRequestOptions): Promise<T>;
  getState(options?: PdfCadBridgeRequestOptions): Promise<PdfCadBridgeState>;
  loadPdfData(payload: PdfCadLoadPdfPayload, options?: PdfCadBridgeRequestOptions): Promise<PdfCadBridgeState>;
  loadSample(sample: string, options?: PdfCadBridgeRequestOptions): Promise<PdfCadBridgeState>;
  setOptions(optionsPayload: Record<string, unknown>, options?: PdfCadBridgeRequestOptions): Promise<PdfCadBridgeState>;
  analyze(options?: PdfCadBridgeRequestOptions): Promise<PdfCadBridgeState>;
  exportDxf(payload?: Record<string, unknown>, options?: PdfCadBridgeRequestOptions): Promise<PdfCadExportDxfResult>;
  downloadDxf(options?: PdfCadBridgeRequestOptions): Promise<PdfCadExportDxfResult>;
  fit(options?: PdfCadBridgeRequestOptions): Promise<PdfCadBridgeState>;
}

export interface PdfCadBridgeOutputEvent {
  type: "pdf-cad:bridge";
  event: PdfCadBridgeEventName;
  build: string;
  timestamp: string;
  detail: Record<string, unknown>;
  state: PdfCadBridgeState;
}

export interface PdfCadBridgeResponseEvent<T = unknown> {
  type: "pdf-cad:bridge:response";
  requestId: string;
  command: PdfCadBridgeCommand;
  ok: boolean;
  result?: T;
  error?: string;
}

declare global {
  interface Window {
    PdfCadAppBridge?: PdfCadBridgeApi;
  }
}
`;
}

function buildBridgeHarnessHtml({ previewFileName, sampleName }) {
  const previewParams = new URLSearchParams({ harness: "1" });
  if (sampleName) previewParams.set("sample", sampleName);
  const previewSrc = `./${previewFileName}?${previewParams}`;
  const loadSampleDisabled = sampleName ? "" : " disabled";
  const fullFlowDisabled = sampleName ? "" : " disabled";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PDF-CAD Bridge I/O Harness</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        height: 100vh;
        display: grid;
        grid-template-columns: minmax(320px, 420px) 1fr;
        font-family: "Yu Gothic UI", "Meiryo", system-ui, sans-serif;
        background: #f4f6f8;
        color: #17202a;
      }
      aside {
        min-height: 0;
        overflow: auto;
        padding: 16px;
        border-right: 1px solid #d9e0e7;
        background: #fff;
      }
      h1 { margin: 0 0 12px; font-size: 18px; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      button {
        min-height: 36px;
        border: 1px solid #d9e0e7;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
      }
      button:hover { border-color: #0f766e; }
      pre {
        min-height: 240px;
        max-height: calc(100vh - 150px);
        overflow: auto;
        margin: 0;
        padding: 10px;
        border: 1px solid #d9e0e7;
        border-radius: 6px;
        background: #101316;
        color: #e6edf3;
        font-size: 12px;
        white-space: pre-wrap;
      }
      iframe {
        width: 100%;
        height: 100vh;
        border: 0;
        background: #101316;
      }
    </style>
  </head>
  <body>
    <aside>
      <h1>Bridge I/O Harness</h1>
      <div class="actions">
        <button id="getStateButton" type="button">Get State</button>
        <button id="loadSampleButton" type="button"${loadSampleDisabled}>Load Sample</button>
        <button id="analyzeButton" type="button">Analyze</button>
        <button id="exportButton" type="button">Export DXF</button>
      </div>
      <pre id="log">Waiting for PDF-CAD...</pre>
    </aside>
    <iframe id="pdfCadFrame" title="PDF-CAD Preview" src="${previewSrc}"></iframe>
    <script>
      const frame = document.querySelector("#pdfCadFrame");
      const log = document.querySelector("#log");
      const history = [];

      function append(entry) {
        history.unshift(redactLargeFields(entry));
        log.textContent = JSON.stringify(history.slice(0, 8), null, 2);
      }

      function redactLargeFields(value) {
        if (!value || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(redactLargeFields);
        const output = {};
        for (const [key, item] of Object.entries(value)) {
          if ((key === "dxf" || key === "dxfBase64") && typeof item === "string") {
            output[key] = item.slice(0, 160) + (item.length > 160 ? "... (" + item.length + " chars)" : "");
          } else {
            output[key] = redactLargeFields(item);
          }
        }
        return output;
      }

      function send(command, payload = {}) {
        const requestId = command + "-" + Date.now();
        frame.contentWindow?.postMessage({
          type: "pdf-cad:command",
          command,
          payload,
          requestId,
        }, "*");
        append({ direction: "out", requestId, command, payload });
      }

      window.addEventListener("message", (event) => {
        const data = event.data || {};
        if (data.type !== "pdf-cad:bridge" && data.type !== "pdf-cad:bridge:response") return;
        append({ direction: "in", data });
      });

      document.querySelector("#getStateButton").addEventListener("click", () => send("get-state"));
      document.querySelector("#loadSampleButton").addEventListener("click", () => send("load-sample", { sample: "${sampleName || ""}" }));
      document.querySelector("#analyzeButton").addEventListener("click", () => send("analyze"));
      document.querySelector("#exportButton").addEventListener("click", () => send("export-dxf", { includeText: false }));
    </script>
  </body>
</html>`;
}

function buildBridgeApiHarnessHtml({ previewFileName, sampleName }) {
  const sampleLiteral = JSON.stringify(sampleName || "");
  const previewParams = new URLSearchParams({ apiHarness: "1" });
  if (sampleName) previewParams.set("sample", sampleName);
  const previewSrc = `./${previewFileName}?${previewParams}`;
  const loadSampleDisabled = sampleName ? "" : " disabled";
  const fullFlowDisabled = sampleName ? "" : " disabled";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PDF-CAD Bridge API Harness</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        height: 100vh;
        display: grid;
        grid-template-columns: minmax(340px, 460px) 1fr;
        font-family: "Yu Gothic UI", "Meiryo", system-ui, sans-serif;
        background: #f4f6f8;
        color: #17202a;
      }
      aside {
        min-height: 0;
        overflow: auto;
        padding: 16px;
        border-right: 1px solid #d9e0e7;
        background: #fff;
      }
      h1 { margin: 0 0 6px; font-size: 18px; }
      p { margin: 0 0 12px; color: #657282; font-size: 13px; line-height: 1.5; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      .smoke-status {
        min-height: 34px;
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding: 7px 9px;
        border: 1px solid #d9e0e7;
        border-radius: 6px;
        background: #f8fafc;
        color: #344054;
        font-size: 12px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .smoke-status[data-state="pass"] {
        color: #0b5f59;
        background: #ecfdf3;
      }
      .smoke-status[data-state="fail"] {
        color: #b42318;
        background: #fff1f3;
      }
      button {
        min-height: 36px;
        border: 1px solid #d9e0e7;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
      }
      button:hover { border-color: #0f766e; }
      button.primary {
        grid-column: 1 / -1;
        background: #0f766e;
        border-color: #0f766e;
        color: #fff;
        font-weight: 700;
      }
      pre {
        min-height: 260px;
        max-height: calc(100vh - 188px);
        overflow: auto;
        margin: 0;
        padding: 10px;
        border: 1px solid #d9e0e7;
        border-radius: 6px;
        background: #101316;
        color: #e6edf3;
        font-size: 12px;
        white-space: pre-wrap;
      }
      iframe {
        width: 100%;
        height: 100vh;
        border: 0;
        background: #101316;
      }
    </style>
  </head>
  <body>
    <aside>
      <h1>Bridge API Harness</h1>
      <p>Exercises window.PdfCadAppBridge without writing to the real host app.</p>
      <div class="actions">
        <button id="getStateButton" type="button">Get State</button>
        <button id="loadSampleButton" type="button"${loadSampleDisabled}>Load Sample</button>
        <button id="analyzeButton" type="button">Analyze</button>
        <button id="exportButton" type="button">Export DXF</button>
        <button id="saveExportButton" type="button">Export & Save DXF</button>
        <button id="fullFlowButton" class="primary" type="button"${fullFlowDisabled}>Run Full Flow</button>
      </div>
      <output id="smokeResult" class="smoke-status" data-state="idle">Smoke: idle</output>
      <pre id="log">Waiting for PDF-CAD...</pre>
    </aside>
    <iframe id="pdfCadFrame" title="PDF-CAD Preview" src="${previewSrc}"></iframe>
    <script>
      const COMMAND_TYPE = "pdf-cad:command";
      const EVENT_TYPE = "pdf-cad:bridge";
      const RESPONSE_TYPE = "pdf-cad:bridge:response";
      const SAMPLE_NAME = ${sampleLiteral};
      const QUERY = new URLSearchParams(window.location.search);
      const AUTO_RUN = QUERY.get("autorun") === "1";
      const SMOKE_OPTIONS = smokeOptionsFromQuery(QUERY);
      const frame = document.querySelector("#pdfCadFrame");
      const log = document.querySelector("#log");
      const smokeResult = document.querySelector("#smokeResult");
      const history = [];
      const pendingRequests = new Map();
      const queuedCommands = [];
      let childReady = false;
      let requestCounter = 0;

      function append(entry) {
        history.unshift(redactLargeFields(entry));
        log.textContent = JSON.stringify(history.slice(0, 10), null, 2);
      }

      function redactLargeFields(value) {
        if (!value || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(redactLargeFields);
        const output = {};
        for (const [key, item] of Object.entries(value)) {
          if ((key === "dxf" || key === "dxfBase64") && typeof item === "string") {
            output[key] = item.slice(0, 160) + (item.length > 160 ? "... (" + item.length + " chars)" : "");
          } else {
            output[key] = redactLargeFields(item);
          }
        }
        return output;
      }

      function postMessageToChild(message) {
        const child = frame.contentWindow;
        if (!child) return false;
        child.postMessage(message, "*");
        return true;
      }

      function flushQueuedCommands() {
        const queued = queuedCommands.splice(0);
        for (const message of queued) {
          if (!postMessageToChild(message)) queuedCommands.push(message);
        }
      }

      function send(command, payload = {}, requestId = "", options = {}) {
        const message = {
          type: COMMAND_TYPE,
          command,
          payload,
          requestId,
        };
        if (!childReady && !options.immediate) {
          queuedCommands.push(message);
          append({ direction: "queue", requestId, command, payload });
          return requestId;
        }
        if (!postMessageToChild(message)) queuedCommands.push(message);
        append({ direction: "out", requestId, command, payload });
        return requestId;
      }

      function nextRequestId(command) {
        requestCounter += 1;
        return command + "-" + Date.now() + "-" + requestCounter;
      }

      function request(command, payload = {}, options = {}) {
        const requestId = options.requestId || nextRequestId(command);
        const timeoutMs = options.timeoutMs ?? 180000;
        return new Promise((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error("PDF-CAD bridge command timed out: " + command));
          }, timeoutMs);
          pendingRequests.set(requestId, { resolve, reject, timeout });
          send(command, payload, requestId, options);
        });
      }

      window.PdfCadAppBridge = {
        send,
        request,
        getState: (options = {}) => request("get-state", {}, { timeoutMs: 30000, ...options }),
        loadPdfData: (payload, options = {}) => request("load-pdf", payload, options),
        loadSample: (sample, options = {}) => request("load-sample", { sample }, options),
        setOptions: (optionsPayload, options = {}) => request("set-options", { options: optionsPayload }, options),
        analyze: (options = {}) => request("analyze", {}, options),
        exportDxf: (payload = {}, options = {}) => request("export-dxf", payload, options),
        downloadDxf: (options = {}) => request("download-dxf", {}, options),
        fit: (options = {}) => request("fit", {}, { timeoutMs: 30000, ...options }),
      };

      window.addEventListener("message", (event) => {
        if (event.source !== frame.contentWindow) return;
        const data = event.data || {};
        if (data.type !== EVENT_TYPE && data.type !== RESPONSE_TYPE) return;
        if (data.type === EVENT_TYPE && data.event === "ready") {
          childReady = true;
          flushQueuedCommands();
        }
        if (data.type === RESPONSE_TYPE && data.requestId) {
          const pending = pendingRequests.get(data.requestId);
          if (pending) {
            window.clearTimeout(pending.timeout);
            pendingRequests.delete(data.requestId);
            if (data.ok) pending.resolve(data.result);
            else pending.reject(new Error(data.error || "PDF-CAD bridge command failed"));
          }
        }
        window.dispatchEvent(new CustomEvent("pdf-cad-output", { detail: data }));
        if (data.requestId) {
          window.dispatchEvent(new CustomEvent("pdf-cad-response", { detail: data }));
        }
        append({ direction: "in", data });
      });

      frame.addEventListener("load", () => {
        childReady = true;
        window.setTimeout(flushQueuedCommands, 0);
      });

      async function run(label, action) {
        try {
          append({ direction: "api", action: label, state: "start" });
          const result = await action();
          append({ direction: "api", action: label, state: "done", result });
          if (label === "autorunFullFlow" || label === "fullFlow") {
            setSmokeResult({ ok: true, label, result: assertFullFlowResult(result) });
          }
          return result;
        } catch (error) {
          append({ direction: "api", action: label, state: "failed", error: error.message });
          if (label === "autorunFullFlow" || label === "fullFlow") {
            setSmokeResult({ ok: false, label, error: error.message });
          }
          throw error;
        }
      }

      function setSmokeResult(value) {
        const result = {
          timestamp: new Date().toISOString(),
          ...value,
        };
        window.__PDF_CAD_BRIDGE_SMOKE_RESULT__ = result;
        if (smokeResult) {
          smokeResult.dataset.state = result.pending ? "idle" : result.ok ? "pass" : "fail";
          smokeResult.textContent = result.pending
            ? "Smoke: running"
            : result.ok
              ? "Smoke: pass / " + (result.result?.bytes || 0) + " bytes / " + (result.result?.fileName || "")
              : "Smoke: fail / " + (result.error || "unknown error");
          smokeResult.dataset.result = JSON.stringify(result);
        }
      }

      function summarizeResult(result) {
        if (!result || typeof result !== "object") return result;
        return {
          fileName: result.fileName || "",
          layerName: result.layerName || "",
          bytes: result.bytes || 0,
          counts: result.counts || {},
          state: result.state ? {
            build: result.state.build,
            status: result.state.status,
            file: result.state.file,
            page: result.state.page,
            preview: result.state.preview,
            counts: result.state.counts,
          } : null,
        };
      }

      function assertFullFlowResult(result) {
        const summary = summarizeResult(result);
        const status = String(summary?.state?.status || "");
        if (!result?.bytes || !result?.fileName) {
          throw new Error("DXF export did not return a usable file.");
        }
        if (summary?.state?.preview?.dxfReady === false) {
          throw new Error(status || "DXF was not ready after analysis.");
        }
        if (/analysis failed|failed|error/i.test(status)) {
          throw new Error(status);
        }
        return summary;
      }

      function smokeOptionsFromQuery(params) {
        const options = {};
        if (params.get("ocr") === "1") options.extractOcrText = true;
        if (params.get("pdfText") === "0") options.extractPdfText = false;
        if (params.has("ocrLang")) options.ocrLang = params.get("ocrLang") || "jpn+eng";
        if (params.has("ocrMinConfidence")) options.ocrMinConfidence = params.get("ocrMinConfidence") || "55";
        return options;
      }

      function requireSampleName() {
        if (!SAMPLE_NAME) {
          throw new Error("No bundled sample PDF is configured.");
        }
        return SAMPLE_NAME;
      }

      async function runFullFlow() {
        await window.PdfCadAppBridge.loadSample(requireSampleName());
        if (Object.keys(SMOKE_OPTIONS).length) {
          await window.PdfCadAppBridge.setOptions(SMOKE_OPTIONS);
        }
        await window.PdfCadAppBridge.analyze({ timeoutMs: 600000 });
        return window.PdfCadAppBridge.exportDxf({ includeText: false });
      }

      function saveDxfResult(result) {
        if (!result?.dxf) throw new Error("No DXF data returned.");
        const blob = new Blob([result.dxf], { type: "application/dxf;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName || "pdf-cad-output.dxf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return {
          fileName: link.download,
          bytes: result.bytes,
          counts: result.counts,
        };
      }

      document.querySelector("#getStateButton").addEventListener("click", () => run("getState", () => window.PdfCadAppBridge.getState()));
      document.querySelector("#loadSampleButton").addEventListener("click", () => run("loadSample", () => window.PdfCadAppBridge.loadSample(requireSampleName())));
      document.querySelector("#analyzeButton").addEventListener("click", () => run("analyze", () => window.PdfCadAppBridge.analyze()));
      document.querySelector("#exportButton").addEventListener("click", () => run("exportDxf", () => window.PdfCadAppBridge.exportDxf({ includeText: false })));
      document.querySelector("#saveExportButton").addEventListener("click", () => run("exportAndSaveDxf", async () => saveDxfResult(await window.PdfCadAppBridge.exportDxf({ includeText: false }))));
      document.querySelector("#fullFlowButton").addEventListener("click", () => run("fullFlow", runFullFlow));

      if (AUTO_RUN) {
        setSmokeResult({ ok: false, label: "autorunFullFlow", pending: true });
        window.setTimeout(() => {
          run("autorunFullFlow", runFullFlow).catch(() => undefined);
        }, 0);
      }
    </script>
  </body>
</html>`;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function makeGeneratedOutput() {
  const sourceAppDir = resolveConfigPath(config.sourceAppDir);
  const sourceHtmlPath = path.join(sourceAppDir, config.sourceHtml);
  const sourceEntryPath = path.join(sourceAppDir, config.sourceEntry);
  const sourceCssPath = path.join(sourceAppDir, config.sourceCss);

  for (const required of [sourceHtmlPath, sourceEntryPath, sourceCssPath]) {
    if (!(await pathExists(required))) {
      throw new Error(`Required source file was not found: ${required}`);
    }
  }

  const html = await readText(sourceHtmlPath);
  const mainJs = await readText(sourceEntryPath);
  const css = await readText(sourceCssPath);
  const appBuild = extractAppBuild(mainJs);
  const embeddedAssets = await readEmbeddedAssets(sourceAppDir);
  const localVendorAssets = await readLocalVendorAssets(sourceAppDir);
  const embeddedWorkerVendors = localVendorAssets.flatMap((asset) => asset.embeddedLocalVendors || []);
  const { importBlock, body } = splitStaticImports(mainJs, config.sourceCss);
  const rewrittenModule = rewriteModuleImportsWithLocalVendors(importBlock, body, localVendorAssets);
  const rewrittenHead = rewriteHeadScriptsWithLocalVendors(html, config.sourceEntry, localVendorAssets);
  const runtimePrelude = buildRuntimePrelude(embeddedAssets);
  const activeSampleName = embedSourceAssets ? (config.sourceAssets || [])[0] || "" : "";
  const moduleSource = `${rewrittenModule.importBlock}

${runtimePrelude}

${rewrittenModule.body}`;

  const srcDoc = buildSrcDoc({
    title: config.title,
    bodyMarkup: extractBodyMarkup(html, config.sourceEntry),
    css,
    headScripts: rewrittenHead.headScripts,
    moduleSource,
  });

  return {
    component: buildReactComponent({
      componentName: config.componentName,
      title: config.title,
      srcDoc,
    }),
    previewHtml: buildPreviewHtml({
      srcDoc,
    }),
    bridgeHarnessHtml: buildBridgeHarnessHtml({
      previewFileName: path.basename(config.previewFile || "preview.html"),
      sampleName: activeSampleName,
    }),
    bridgeApiHarnessHtml: buildBridgeApiHarnessHtml({
      previewFileName: path.basename(config.previewFile || "preview.html"),
      sampleName: activeSampleName,
    }),
    bridgeManifestJson: `${JSON.stringify(buildBridgeManifest({
      appBuild,
      title: config.title,
      componentName: config.componentName,
      sourceAssets: Object.keys(embeddedAssets),
      previewFileName: path.basename(config.previewFile || "preview.html"),
      bridgeHarnessFileName: path.basename(config.bridgeHarnessFile || "bridge-io-harness.html"),
      bridgeApiHarnessFileName: path.basename(config.bridgeApiHarnessFile || "bridge-api-harness.html"),
      embeddedLocalVendors: [...new Set([
        ...rewrittenHead.embeddedLocalVendors,
        ...rewrittenModule.embeddedLocalVendors,
        ...embeddedWorkerVendors,
      ])],
    }), null, 2)}\n`,
    bridgeTypesDts: buildBridgeTypesDts({
      appBuild,
    }),
  };
}

const generatedFile = resolveConfigPath(config.generatedFile);
const previewFile = resolveConfigPath(config.previewFile || path.join(path.dirname(generatedFile), "preview.html"));
const bridgeHarnessFile = resolveConfigPath(config.bridgeHarnessFile || path.join(path.dirname(generatedFile), "bridge-io-harness.html"));
const bridgeApiHarnessFile = resolveConfigPath(config.bridgeApiHarnessFile || path.join(path.dirname(generatedFile), "bridge-api-harness.html"));
const bridgeManifestFile = resolveConfigPath(config.bridgeManifestFile || path.join(path.dirname(generatedFile), "bridge-manifest.json"));
const bridgeTypesFile = resolveConfigPath(config.bridgeTypesFile || path.join(path.dirname(generatedFile), "pdf-cad-bridge.d.ts"));
if (!config.sandboxFile) {
  throw new Error("bridge.config.json must define sandboxFile.");
}
const sandboxFile = resolveConfigPath(config.sandboxFile);
const backupDir = resolveConfigPath(config.backupDir);

assertInsideProject("generated output", generatedFile);
assertInsideProject("browser preview", previewFile);
assertInsideProject("bridge I/O harness", bridgeHarnessFile);
assertInsideProject("bridge API harness", bridgeApiHarnessFile);
assertInsideProject("bridge manifest", bridgeManifestFile);
assertInsideProject("bridge types", bridgeTypesFile);
assertInsideProject("backup directory", backupDir);
assertSafeSandboxFile(sandboxFile);

const { component: generated, previewHtml, bridgeHarnessHtml, bridgeApiHarnessHtml, bridgeManifestJson, bridgeTypesDts } = await makeGeneratedOutput();

if (shouldCheck) {
  console.log(JSON.stringify({
    ok: true,
    sourceAppDir: toPosixPath(resolveConfigPath(config.sourceAppDir)),
    embedSourceAssets,
    generatedBytes: Buffer.byteLength(generated, "utf8"),
    previewBytes: Buffer.byteLength(previewHtml, "utf8"),
    bridgeHarnessBytes: Buffer.byteLength(bridgeHarnessHtml, "utf8"),
    bridgeApiHarnessBytes: Buffer.byteLength(bridgeApiHarnessHtml, "utf8"),
    bridgeManifestBytes: Buffer.byteLength(bridgeManifestJson, "utf8"),
    bridgeTypesBytes: Buffer.byteLength(bridgeTypesDts, "utf8"),
    generatedFile: toPosixPath(generatedFile),
    previewFile: toPosixPath(previewFile),
    bridgeHarnessFile: toPosixPath(bridgeHarnessFile),
    bridgeApiHarnessFile: toPosixPath(bridgeApiHarnessFile),
    bridgeManifestFile: toPosixPath(bridgeManifestFile),
    bridgeTypesFile: toPosixPath(bridgeTypesFile),
    sandboxFile: toPosixPath(sandboxFile),
    applyWritesInsideBridge: isInsideProject(sandboxFile),
  }, null, 2));
  process.exit(0);
}

await fs.mkdir(path.dirname(generatedFile), { recursive: true });
await fs.writeFile(generatedFile, generated, "utf8");
await fs.mkdir(path.dirname(previewFile), { recursive: true });
await fs.writeFile(previewFile, previewHtml, "utf8");
await fs.mkdir(path.dirname(bridgeHarnessFile), { recursive: true });
await fs.writeFile(bridgeHarnessFile, bridgeHarnessHtml, "utf8");
await fs.mkdir(path.dirname(bridgeApiHarnessFile), { recursive: true });
await fs.writeFile(bridgeApiHarnessFile, bridgeApiHarnessHtml, "utf8");
await fs.mkdir(path.dirname(bridgeManifestFile), { recursive: true });
await fs.writeFile(bridgeManifestFile, bridgeManifestJson, "utf8");
await fs.mkdir(path.dirname(bridgeTypesFile), { recursive: true });
await fs.writeFile(bridgeTypesFile, bridgeTypesDts, "utf8");
console.log(`Generated preview: ${generatedFile}`);
console.log(`Generated browser preview: ${previewFile}`);
console.log(`Generated bridge I/O harness: ${bridgeHarnessFile}`);
console.log(`Generated bridge API harness: ${bridgeApiHarnessFile}`);
console.log(`Generated bridge manifest: ${bridgeManifestFile}`);
console.log(`Generated bridge types: ${bridgeTypesFile}`);

if (shouldApply) {
  const targetExists = await pathExists(sandboxFile);
  await fs.mkdir(backupDir, { recursive: true });
  if (targetExists && !skipBackup) {
    const backupPath = path.join(backupDir, `App_minimal.${timestamp()}.backup.js`);
    await fs.copyFile(sandboxFile, backupPath);
    console.log(`Backed up sandbox target: ${backupPath}`);
  } else if (targetExists) {
    console.log("Skipped sandbox backup for this verification run.");
  } else {
    await fs.mkdir(path.dirname(sandboxFile), { recursive: true });
    console.log(`Sandbox file did not exist; creating: ${sandboxFile}`);
  }
  await fs.writeFile(sandboxFile, generated, "utf8");
  console.log(`Wrote sandbox file: ${sandboxFile}`);
} else {
  console.log("Dry run only. Use --apply to write the sandbox file after backup.");
}
