import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const reviewRoot = path.join(projectDir, "host-review");
const lightPackageScript = path.join(projectDir, "scripts", "package-light.mjs");
const lightPackageDir = path.join(projectDir, "dist-light-package");
const lightWrapperFile = path.join(lightPackageDir, "App_minimal.light.js");
const lightStaticAppDir = path.join(lightPackageDir, "pdf-cad");

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function relativeToReview(reviewDir, filePath) {
  return toPosix(path.relative(reviewDir, filePath));
}

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertInsideProject(label, filePath) {
  if (isInsideProject(filePath)) return;
  throw new Error(`Refusing to write ${label} outside app-output-bridge: ${filePath}`);
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
  const bytes = await fs.readFile(filePath);
  return {
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
  };
}

async function listFiles(dir, root = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = toPosix(path.relative(root, fullPath));
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath, root));
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(fullPath);
    files.push({
      path: relativePath,
      bytes: stat.size,
    });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function buildReadme({ hostTemplateFile, manifest }) {
  return `# PDF-CAD Host Review Package

This folder is a review-only package. It does not modify the real host app.

## Files

- \`${manifest.files.originalCopy}\`: copy of the current host \`App_minimal.js\`.
- \`${manifest.files.candidateWrapper}\`: PDF-CAD lightweight React wrapper candidate.
- \`${manifest.files.staticAppDir}/\`: static PDF-CAD app folder for the host public/static root.
- \`${manifest.files.manifest}\`: machine-readable review manifest.

## Intended Host Shape

\`\`\`text
host-app/src/App_minimal.js          <- review candidate wrapper
host-app/public/pdf-cad/pdf-cad.html <- review static app folder
\`\`\`

The candidate expects this URL to exist:

\`\`\`text
/pdf-cad/pdf-cad.html
\`\`\`

If the host serves the folder from another path, set this before mounting the wrapper:

\`\`\`js
window.PDF_CAD_LIGHT_SRC = "/your-path/pdf-cad.html";
\`\`\`

## Guardrails

- Do not replace the real host app from this review package without explicit approval.
- Sample PDFs are not bundled.
- User adjustment controls remain inside the PDF-CAD screen.
- The source host template used for this package was:

\`\`\`text
${hostTemplateFile}
\`\`\`
`;
}

assertInsideProject("host review root", reviewRoot);
await import(`${pathToFileURL(lightPackageScript).href}?hostReview=${Date.now()}`);

const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
if (!(await exists(hostTemplateFile))) {
  throw new Error(`Host template file was not found: ${hostTemplateFile}`);
}
if (!(await exists(lightWrapperFile))) {
  throw new Error("Light wrapper was not found. Run npm run package:light first.");
}
if (!(await exists(lightStaticAppDir))) {
  throw new Error("Light static app folder was not found. Run npm run package:light first.");
}

const reviewDir = path.join(reviewRoot, timestamp());
const reviewSrcDir = path.join(reviewDir, "src");
const reviewPublicDir = path.join(reviewDir, "public");
const reviewStaticAppDir = path.join(reviewPublicDir, "pdf-cad");
const originalCopyFile = path.join(reviewSrcDir, "App_minimal.original.copy.js");
const candidateWrapperFile = path.join(reviewSrcDir, "App_minimal.light.candidate.js");
const manifestFile = path.join(reviewDir, "HOST_REVIEW_MANIFEST.json");
const readmeFile = path.join(reviewDir, "README_HOST_REVIEW.md");

for (const [label, filePath] of [
  ["host review directory", reviewDir],
  ["host review src directory", reviewSrcDir],
  ["host review public directory", reviewPublicDir],
  ["host review static app directory", reviewStaticAppDir],
  ["host review original copy", originalCopyFile],
  ["host review candidate wrapper", candidateWrapperFile],
  ["host review manifest", manifestFile],
  ["host review readme", readmeFile],
]) {
  assertInsideProject(label, filePath);
}

await fs.mkdir(reviewSrcDir, { recursive: true });
await fs.mkdir(reviewPublicDir, { recursive: true });
await fs.copyFile(hostTemplateFile, originalCopyFile);
await fs.copyFile(lightWrapperFile, candidateWrapperFile);
await fs.cp(lightStaticAppDir, reviewStaticAppDir, { recursive: true, force: true });

const staticFiles = await listFiles(reviewStaticAppDir, reviewStaticAppDir);
const forbiddenStaticFiles = staticFiles
  .map((file) => file.path)
  .filter((filePath) => filePath === "_sample_M-08_sanitary.pdf" || filePath === "pdf-cad-server.mjs");
if (forbiddenStaticFiles.length) {
  throw new Error(`Review package unexpectedly contains excluded files: ${forbiddenStaticFiles.join(", ")}`);
}

const [originalState, candidateState] = await Promise.all([
  fileState(originalCopyFile),
  fileState(candidateWrapperFile),
]);
const manifest = {
  ok: true,
  createdAt: new Date().toISOString(),
  packageType: "host-review-copy",
  reviewDir,
  writesOutsideBridge: false,
  hostTemplateFile,
  sampleBundled: false,
  files: {
    originalCopy: relativeToReview(reviewDir, originalCopyFile),
    candidateWrapper: relativeToReview(reviewDir, candidateWrapperFile),
    staticAppDir: relativeToReview(reviewDir, reviewStaticAppDir),
    manifest: relativeToReview(reviewDir, manifestFile),
    readme: relativeToReview(reviewDir, readmeFile),
  },
  originalCopy: originalState,
  candidateWrapper: candidateState,
  staticApp: {
    files: staticFiles.length,
    bytes: staticFiles.reduce((sum, file) => sum + file.bytes, 0),
    forbiddenStaticFiles,
  },
};

await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await fs.writeFile(readmeFile, buildReadme({ hostTemplateFile, manifest }), "utf8");

console.log(JSON.stringify({
  ok: true,
  reviewDir,
  originalCopyFile,
  candidateWrapperFile,
  reviewStaticAppDir,
  manifestFile,
  readmeFile,
  sampleBundled: false,
  writesOutsideBridge: false,
}, null, 2));
