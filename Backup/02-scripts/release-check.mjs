import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(projectDir, "release");
const releaseJsonFile = path.join(releaseDir, "RELEASE_CHECK.json");
const releaseMarkdownFile = path.join(releaseDir, "RELEASE_CHECK.md");

const steps = [
  { name: "safety", script: "scripts/safety-check.mjs" },
  { name: "verify", script: "scripts/verify-workflow.mjs" },
  { name: "package:light", script: "scripts/package-light.mjs" },
  { name: "package:public", script: "scripts/package-public-release.mjs" },
  { name: "public:check", script: "scripts/check-public-release.mjs" },
  { name: "package:promotion", script: "scripts/package-promotion.mjs" },
  { name: "contract", script: "scripts/check-bridge-contract.mjs" },
  { name: "promotion:check", script: "scripts/check-promotion.mjs" },
  { name: "doctor", script: "scripts/doctor.mjs" },
];

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function relative(filePath) {
  return toPosix(path.relative(projectDir, filePath));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function fileState(filePath) {
  if (!(await exists(filePath))) {
    return { exists: false, bytes: 0, sha256: "" };
  }
  const bytes = await fs.readFile(filePath);
  return {
    exists: true,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
  };
}

async function readJsonIfExists(filePath) {
  if (!(await exists(filePath))) return null;
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function extractLastJson(text) {
  const starts = [];
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (text[index] === "{") starts.push(index);
  }
  for (const start of starts) {
    const candidate = text.slice(start).trim();
    try {
      return JSON.parse(candidate);
    } catch (_error) {
      // Keep trying earlier opening braces.
    }
  }
  return null;
}

async function runScriptStep(step, index) {
  const startedAt = new Date();
  const scriptUrl = `${pathToFileURL(path.join(projectDir, step.script)).href}?releaseCheck=${Date.now()}-${index}`;
  const originalLog = console.log;
  const originalError = console.error;
  const previousExitCode = process.exitCode;
  let output = "";
  let errorMessage = "";

  console.log = (...args) => {
    const text = args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");
    output += `${text}\n`;
    originalLog(...args);
  };
  console.error = (...args) => {
    const text = args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");
    output += `${text}\n`;
    originalError(...args);
  };

  process.exitCode = 0;
  try {
    await import(scriptUrl);
  } catch (error) {
    errorMessage = error?.stack || error?.message || String(error);
    console.error(errorMessage);
    process.exitCode = 1;
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  const endedAt = new Date();
  const code = Number(process.exitCode || 0);
  process.exitCode = previousExitCode;
  return {
    name: step.name,
    ok: code === 0,
    code,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    json: extractLastJson(output),
    error: errorMessage,
  };
}

function buildMarkdown(summary) {
  const lines = [
    "# App Output Bridge Release Check",
    "",
    `Created: ${summary.createdAt}`,
    `Overall: ${summary.ok ? "OK" : "FAILED"}`,
    `Recommended distribution: ${summary.recommendedDistribution}`,
    "",
    "## Step Results",
    "",
    "| Step | Result | Duration |",
    "| --- | --- | ---: |",
    ...summary.steps.map((step) => `| ${step.name} | ${step.ok ? "OK" : "FAILED"} | ${step.durationMs} ms |`),
    "",
    "## Outputs",
    "",
    `- Full single-file candidate: \`${summary.outputs.fullReady.file}\` (${summary.outputs.fullReady.bytes} bytes, sha256 ${summary.outputs.fullReady.sha256})`,
    `- Lightweight wrapper: \`${summary.outputs.lightWrapper.file}\` (${summary.outputs.lightWrapper.bytes} bytes, sha256 ${summary.outputs.lightWrapper.sha256})`,
    `- Lightweight static app: \`${summary.outputs.lightStatic.dir}\` (${summary.outputs.lightStatic.files} files, ${summary.outputs.lightStatic.bytes} bytes)`,
    `- Public static release: \`${summary.outputs.publicRelease.dir}\` (${summary.outputs.publicRelease.listedPayloadFiles} listed payload files, ${summary.outputs.publicRelease.listedPayloadBytes} bytes, ok ${summary.outputs.publicRelease.ok})`,
    `- Bridge manifest: \`${summary.outputs.bridgeManifest.file}\` (${summary.outputs.bridgeManifest.bytes} bytes, sha256 ${summary.outputs.bridgeManifest.sha256})`,
    "",
    "## Notes",
    "",
    "- The real host App_minimal.js is not written by this check.",
    "- Lightweight distribution is recommended for ordinary distribution because user settings remain available while the React wrapper stays small.",
    "- Public static release is the folder to publish externally; do not publish the whole parent workspace.",
    `- Sample PDF bundled in lightweight package: ${summary.manifests.light?.staticApp?.sampleBundled ? "yes" : "no"}.`,
    "- Full single-file output remains available for review-only or all-in-one offline use.",
    "- Run browser smoke pages after code changes that affect runtime behavior.",
  ];
  return `${lines.join("\n")}\n`;
}

await fs.mkdir(releaseDir, { recursive: true });

const stepResults = [];
for (const step of steps) {
  console.log(`\n[release-check] node ${step.script}`);
  const result = await runScriptStep(step, stepResults.length);
  stepResults.push(result);
  if (!result.ok) break;
}

const promotionManifestFile = path.join(projectDir, "promotion", "PROMOTION_MANIFEST.json");
const lightManifestFile = path.join(projectDir, "dist-light-package", "LIGHT_PACKAGE_MANIFEST.json");
const publicManifestFile = path.join(projectDir, "public-release", "PUBLIC_RELEASE_MANIFEST.json");
const fullReadyFile = path.join(projectDir, "promotion", "App_minimal.ready.js");
const lightWrapperFile = path.join(projectDir, "dist-light-package", "App_minimal.light.js");
const bridgeManifestFile = path.join(projectDir, "out", "bridge-manifest.json");
const promotionManifest = await readJsonIfExists(promotionManifestFile);
const lightManifest = await readJsonIfExists(lightManifestFile);
const publicManifest = await readJsonIfExists(publicManifestFile);
const fullReady = await fileState(fullReadyFile);
const lightWrapper = await fileState(lightWrapperFile);
const bridgeManifest = await fileState(bridgeManifestFile);

const summary = {
  ok: stepResults.length === steps.length && stepResults.every((step) => step.ok),
  createdAt: new Date().toISOString(),
  recommendedDistribution: "lightweight-static-app-plus-react-wrapper",
  hostWriteMode: "none",
  steps: stepResults,
  outputs: {
    fullReady: {
      file: relative(fullReadyFile),
      ...fullReady,
    },
    lightWrapper: {
      file: relative(lightWrapperFile),
      ...lightWrapper,
    },
    lightStatic: {
      dir: "dist-light-package/pdf-cad",
      files: lightManifest?.staticApp?.files ?? 0,
      bytes: lightManifest?.staticApp?.bytes ?? 0,
    },
    publicRelease: {
      dir: "public-release",
      ok: Boolean(publicManifest?.ok),
      listedPayloadFiles: publicManifest?.listedPayloadFiles ?? 0,
      listedPayloadBytes: publicManifest?.listedPayloadBytes ?? 0,
      samplePdfBundled: Boolean(publicManifest?.samplePdfBundled),
      hostWrapperBundled: Boolean(publicManifest?.hostWrapperBundled),
    },
    bridgeManifest: {
      file: relative(bridgeManifestFile),
      ...bridgeManifest,
    },
  },
  manifests: {
    promotion: promotionManifest,
    light: lightManifest,
    public: publicManifest,
  },
  releaseFiles: {
    json: relative(releaseJsonFile),
    markdown: relative(releaseMarkdownFile),
  },
};

await fs.writeFile(releaseJsonFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await fs.writeFile(releaseMarkdownFile, buildMarkdown(summary), "utf8");

console.log(JSON.stringify({
  ok: summary.ok,
  recommendedDistribution: summary.recommendedDistribution,
  releaseJsonFile,
  releaseMarkdownFile,
  fullReady: summary.outputs.fullReady,
  lightWrapper: summary.outputs.lightWrapper,
  lightStatic: summary.outputs.lightStatic,
  publicRelease: summary.outputs.publicRelease,
}, null, 2));

if (!summary.ok) {
  process.exitCode = 1;
}
