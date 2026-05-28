import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const distDir = path.join(projectDir, "dist-light-package");
const staticAppDir = path.join(distDir, "pdf-cad");
const wrapperFile = path.join(distDir, "App_minimal.light.js");
const manifestFile = path.join(distDir, "LIGHT_PACKAGE_MANIFEST.json");
const readmeFile = path.join(distDir, "README_LIGHT.md");
const previewHostFile = path.join(distDir, "preview-host.html");
const apiHarnessFile = path.join(distDir, "light-api-harness.html");

function normalizePathForManifest(filePath) {
  return filePath.replace(/\\/g, "/");
}

const configuredSourceAssets = Array.isArray(config.sourceAssets)
  ? config.sourceAssets.map(normalizePathForManifest).filter(Boolean)
  : [];
const sourceAssetEmbeddingEnabled = config.embedSourceAssets !== false;
const activeSampleName = sourceAssetEmbeddingEnabled ? configuredSourceAssets[0] || "" : "";
const excludedStaticFiles = new Set([
  "pdf-cad-server.mjs",
  "PDF-CAD化ツールを開く.cmd",
  ...(!sourceAssetEmbeddingEnabled ? configuredSourceAssets : []),
]);

function isExcludedStaticFile(relativePath) {
  return excludedStaticFiles.has(normalizePathForManifest(relativePath));
}

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isInsideDir(rootDir, filePath) {
  const relative = path.relative(rootDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
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

async function listFiles(dir, root = dir) {
  if (!(await pathExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (isExcludedStaticFile(relativePath)) continue;
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath, root));
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      files.push({
        path: normalizePathForManifest(relativePath),
        bytes: stat.size,
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function filesEqual(leftPath, rightPath) {
  try {
    const [left, right] = await Promise.all([
      fs.readFile(leftPath),
      fs.readFile(rightPath),
    ]);
    return left.length === right.length && left.equals(right);
  } catch (_error) {
    return false;
  }
}

async function syncStaticApp(sourceDir, targetDir, root = sourceDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  let copied = 0;
  let skipped = 0;

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.relative(root, sourcePath);
    if (isExcludedStaticFile(relativePath)) {
      skipped += 1;
      continue;
    }

    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      const result = await syncStaticApp(sourcePath, targetPath, root);
      copied += result.copied;
      skipped += result.skipped;
      continue;
    }

    if (!entry.isFile()) {
      skipped += 1;
      continue;
    }

    if (await filesEqual(sourcePath, targetPath)) {
      skipped += 1;
      continue;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
    copied += 1;
  }

  return { copied, skipped };
}

async function removeExcludedStaticFiles(targetDir) {
  const removed = [];
  const scrubbed = [];
  for (const relativeFile of excludedStaticFiles) {
    const targetPath = path.resolve(targetDir, relativeFile);
    if (!isInsideDir(targetDir, targetPath)) {
      throw new Error(`Refusing to remove excluded static file outside light package: ${relativeFile}`);
    }
    if (!(await pathExists(targetPath))) continue;
    try {
      await fs.rm(targetPath, { force: true, recursive: true });
      removed.push(relativeFile);
    } catch (error) {
      if (error?.code !== "EPERM" && error?.code !== "EACCES") throw error;
      await fs.writeFile(targetPath, "", "utf8");
      scrubbed.push(relativeFile);
    }
  }
  return {
    removed: removed.sort(),
    scrubbed: scrubbed.sort(),
  };
}

function buildLightWrapper({ componentName, title }) {
  return `import React, { useEffect, useMemo, useRef } from "react";

const PDF_CAD_LIGHT_DEFAULT_SRC = "/pdf-cad/pdf-cad.html";
const APP_OUTPUT_BRIDGE_COMMAND_TYPE = "pdf-cad:command";
const APP_OUTPUT_BRIDGE_EVENT_TYPE = "pdf-cad:bridge";
const APP_OUTPUT_BRIDGE_RESPONSE_TYPE = "pdf-cad:bridge:response";
const APP_OUTPUT_BRIDGE_FRAME_LOAD_EVENT = "pdf-cad-frame-load";

function buildPdfCadSource() {
  const configured = window.PDF_CAD_LIGHT_SRC || PDF_CAD_LIGHT_DEFAULT_SRC;
  const url = new URL(configured, window.location.href);
  const parentParams = new URLSearchParams(window.location.search);
  for (const key of ["sample"]) {
    if (parentParams.has(key) && !url.searchParams.has(key)) {
      url.searchParams.set(key, parentParams.get(key) || "");
    }
  }
  return url.toString();
}

export default function ${componentName}() {
  const src = useMemo(buildPdfCadSource, []);
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
        src={src}
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

function buildPreviewHost() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PDF-CAD Light Preview</title>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; background: #101316; }
      iframe { display: block; width: 100%; height: 100%; border: 0; background: #101316; }
    </style>
  </head>
  <body>
    <iframe id="pdfCadFrame" title="PDF-CAD Light Preview" src="./pdf-cad/pdf-cad.html"></iframe>
    <script>
      const frame = document.querySelector("#pdfCadFrame");
      const params = new URLSearchParams(window.location.search);
      const childUrl = new URL("./pdf-cad/pdf-cad.html", window.location.href);
      if (params.has("sample")) childUrl.searchParams.set("sample", params.get("sample") || "");
      frame.src = childUrl.toString();
    </script>
  </body>
</html>
`;
}

function buildLightApiHarness({ sampleName = "" } = {}) {
  const sampleLiteral = JSON.stringify(sampleName || "");
  const previewParams = new URLSearchParams();
  if (sampleName) previewParams.set("sample", sampleName);
  const previewQuery = previewParams.toString();
  const previewSrc = `./pdf-cad/pdf-cad.html${previewQuery ? `?${previewQuery}` : ""}`;
  const loadSampleDisabled = sampleName ? "" : " disabled";
  const fullFlowDisabled = sampleName ? "" : " disabled";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PDF-CAD Light API Harness</title>
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
      .smoke-status[data-state="pass"] { color: #0b5f59; background: #ecfdf3; }
      .smoke-status[data-state="fail"] { color: #b42318; background: #fff1f3; }
      button {
        min-height: 36px;
        border: 1px solid #d9e0e7;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
      }
      button:hover { border-color: #0f766e; }
      button:disabled { cursor: not-allowed; opacity: 0.45; }
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
      iframe { width: 100%; height: 100vh; border: 0; background: #101316; }
    </style>
  </head>
  <body>
    <aside>
      <h1>Light API Harness</h1>
      <p>Tests the lightweight static pdf-cad folder and bridge messages.</p>
      <div class="actions">
        <button id="getStateButton" type="button">Get State</button>
        <button id="loadSampleButton" type="button"${loadSampleDisabled}>Load Sample</button>
        <button id="analyzeButton" type="button">Analyze</button>
        <button id="exportButton" type="button">Export DXF</button>
        <button id="fullFlowButton" class="primary" type="button"${fullFlowDisabled}>Run Full Flow</button>
      </div>
      <output id="smokeResult" class="smoke-status" data-state="idle">Smoke: idle</output>
      <pre id="log">Waiting for PDF-CAD...</pre>
    </aside>
    <iframe id="pdfCadFrame" title="PDF-CAD Light" src="${previewSrc}"></iframe>
    <script>
      const COMMAND_TYPE = "pdf-cad:command";
      const EVENT_TYPE = "pdf-cad:bridge";
      const RESPONSE_TYPE = "pdf-cad:bridge:response";
      const SAMPLE_NAME = ${sampleLiteral};
      const QUERY = new URLSearchParams(window.location.search);
      const AUTO_RUN = QUERY.get("autorun") === "1";
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
        const message = { type: COMMAND_TYPE, command, payload, requestId };
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
        const timeoutMs = options.timeoutMs || 180000;
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
        loadSample: (sample, options = {}) => request("load-sample", { sample }, options),
        setOptions: (optionsPayload, options = {}) => request("set-options", { options: optionsPayload }, options),
        analyze: (options = {}) => request("analyze", {}, options),
        exportDxf: (payload = {}, options = {}) => request("export-dxf", payload, options),
        fit: (options = {}) => request("fit", {}, { timeoutMs: 30000, ...options }),
      };

      function requireSampleName() {
        if (!SAMPLE_NAME) {
          throw new Error("No bundled sample PDF is configured.");
        }
        return SAMPLE_NAME;
      }

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
        append({ direction: "in", data });
      });

      frame.addEventListener("load", () => {
        childReady = true;
        window.setTimeout(flushQueuedCommands, 0);
      });

      function smokeOptionsFromQuery(params) {
        const options = {};
        if (params.get("ocr") === "1") options.extractOcrText = true;
        if (params.get("pdfText") === "0") options.extractPdfText = false;
        if (params.has("ocrLang")) options.ocrLang = params.get("ocrLang") || "jpn+eng";
        if (params.has("ocrMinConfidence")) options.ocrMinConfidence = params.get("ocrMinConfidence") || "55";
        return options;
      }

      function setSmokeResult(value) {
        const result = { timestamp: new Date().toISOString(), ...value };
        window.__PDF_CAD_LIGHT_SMOKE_RESULT__ = result;
        smokeResult.dataset.state = result.pending ? "idle" : result.ok ? "pass" : "fail";
        smokeResult.textContent = result.pending
          ? "Smoke: running"
          : result.ok
            ? "Smoke: pass / " + (result.result?.bytes || 0) + " bytes / " + (result.result?.fileName || "")
            : "Smoke: fail / " + (result.error || "unknown error");
        smokeResult.dataset.result = JSON.stringify(result);
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

      async function runFullFlow() {
        await window.PdfCadAppBridge.loadSample(requireSampleName());
        const options = smokeOptionsFromQuery(QUERY);
        if (Object.keys(options).length) await window.PdfCadAppBridge.setOptions(options);
        await window.PdfCadAppBridge.analyze({ timeoutMs: 600000 });
        return window.PdfCadAppBridge.exportDxf({ includeText: false });
      }

      document.querySelector("#getStateButton").addEventListener("click", () => run("getState", () => window.PdfCadAppBridge.getState()));
      document.querySelector("#loadSampleButton").addEventListener("click", () => run("loadSample", () => window.PdfCadAppBridge.loadSample(requireSampleName())));
      document.querySelector("#analyzeButton").addEventListener("click", () => run("analyze", () => window.PdfCadAppBridge.analyze({ timeoutMs: 600000 })));
      document.querySelector("#exportButton").addEventListener("click", () => run("exportDxf", () => window.PdfCadAppBridge.exportDxf({ includeText: false })));
      document.querySelector("#fullFlowButton").addEventListener("click", () => run("fullFlow", runFullFlow));

      if (AUTO_RUN) {
        setSmokeResult({ ok: false, label: "autorunFullFlow", pending: true });
        window.setTimeout(() => {
          run("autorunFullFlow", runFullFlow).catch(() => undefined);
        }, 0);
      }
    </script>
  </body>
</html>
`;
}

function buildLightReadme() {
  return `# PDF-CAD Light Package

This folder is the lightweight distribution package.

## Files

- \`App_minimal.light.js\`: React wrapper for the host app.
- \`pdf-cad/\`: Static PDF-CAD app files and vendor libraries. Sample PDFs are not bundled in the release package.
- \`preview-host.html\`: Simple static preview for checking the copied \`pdf-cad/\` folder.
- \`light-api-harness.html\`: API smoke page for checking load, analyze, and DXF export.
- \`LIGHT_PACKAGE_MANIFEST.json\`: File list and sizes.

## Install Shape

Copy \`App_minimal.light.js\` into the host source only after approval.

Copy the \`pdf-cad/\` folder to the host public/static root so this URL works:

\`\`\`text
/pdf-cad/pdf-cad.html
\`\`\`

If the host serves static files from another path, set this before mounting the wrapper:

\`\`\`js
window.PDF_CAD_LIGHT_SRC = "/your-path/pdf-cad.html";
\`\`\`

The fine adjustment UI is not removed. Users can still change line type, scale, text, OCR, circle, and output layer settings inside the PDF-CAD screen.

## Smoke Test

The release package intentionally does not include a sample PDF. Open the harness, load your own PDF in the PDF-CAD screen, then run analyze/export checks.

\`\`\`text
preview-host.html
light-api-harness.html
\`\`\`
`;
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
assertInsideProject("light package directory", distDir);
assertInsideProject("light static app directory", staticAppDir);
assertInsideProject("light wrapper", wrapperFile);
assertInsideProject("light manifest", manifestFile);
assertInsideProject("light readme", readmeFile);
assertInsideProject("light preview host", previewHostFile);
assertInsideProject("light API harness", apiHarnessFile);

await fs.mkdir(distDir, { recursive: true });
const staticSync = await syncStaticApp(sourceAppDir, staticAppDir);
const staticCleanup = await removeExcludedStaticFiles(staticAppDir);
await fs.writeFile(wrapperFile, buildLightWrapper({
  componentName: "AppMinimalLightPdfCad",
  title: config.title || "PDF to CAD Tool",
}), "utf8");
await fs.writeFile(previewHostFile, buildPreviewHost(), "utf8");
await fs.writeFile(apiHarnessFile, buildLightApiHarness({ sampleName: activeSampleName }), "utf8");
await fs.writeFile(readmeFile, buildLightReadme(), "utf8");

const staticFiles = await listFiles(staticAppDir, staticAppDir);
const wrapperStat = await fs.stat(wrapperFile);
const previewStat = await fs.stat(previewHostFile);
const apiHarnessStat = await fs.stat(apiHarnessFile);
const totalStaticBytes = staticFiles.reduce((sum, file) => sum + file.bytes, 0);
const manifest = {
  ok: true,
  generatedAt: new Date().toISOString(),
  packageType: "lightweight-static-app-plus-react-wrapper",
  wrapper: {
    file: path.relative(distDir, wrapperFile).replace(/\\/g, "/"),
    bytes: wrapperStat.size,
  },
  staticApp: {
    dir: "pdf-cad",
    files: staticFiles.length,
    bytes: totalStaticBytes,
    copied: staticSync.copied,
    skipped: staticSync.skipped,
    removedExcludedFiles: staticCleanup.removed,
    scrubbedExcludedFiles: staticCleanup.scrubbed,
    excludedFiles: Array.from(excludedStaticFiles).sort(),
    sourceAssetEmbeddingEnabled,
    sampleBundled: Boolean(activeSampleName),
  },
  preview: {
    file: path.relative(distDir, previewHostFile).replace(/\\/g, "/"),
    bytes: previewStat.size,
  },
  apiHarness: {
    file: path.relative(distDir, apiHarnessFile).replace(/\\/g, "/"),
    bytes: apiHarnessStat.size,
  },
  userAdjustmentsRemainAvailable: true,
  hostWriteMode: "none",
};

await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ok: true,
  distDir,
  wrapperFile,
  staticAppDir,
  staticFiles: staticFiles.length,
  wrapperBytes: wrapperStat.size,
  staticBytes: totalStaticBytes,
  staticCopied: staticSync.copied,
  staticSkipped: staticSync.skipped,
  staticRemoved: staticCleanup.removed,
  staticScrubbed: staticCleanup.scrubbed,
  sourceAssetEmbeddingEnabled,
  sampleBundled: Boolean(activeSampleName),
  previewHostFile,
  apiHarnessFile,
  manifestFile,
}, null, 2));
