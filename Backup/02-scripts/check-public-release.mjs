import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(projectDir, "public-release");
const publicSiteUrl = "https://fdoyoshikazuhora-sys.github.io/pdf-cad-tool/";
const googleVerificationFileName = "google3e9d027e494c35da.html";
const cloudflareAnalyticsToken = "ae8d459c6e734535a32301aa99ee1540";

const requiredFiles = [
  ".nojekyll",
  "404.html",
  googleVerificationFileName,
  "index.html",
  "PUBLIC_DEPLOYMENT_GUIDE.md",
  "PUBLIC_RELEASE_INVENTORY.md",
  "PUBLIC_RELEASE_MANIFEST.json",
  "README.md",
  "robots.txt",
  "sitemap.xml",
  "THIRD_PARTY_NOTICES.md",
  "pdf-cad/pdf-cad.css",
  "pdf-cad/pdf-cad.html",
  "pdf-cad/pdf-cad.js",
  "pdf-cad/vendor/pdfjs/pdf.min.mjs",
  "pdf-cad/vendor/pdfjs/pdf.worker.min.mjs",
  "pdf-cad/vendor/tesseract/tesseract.min.js",
  "pdf-cad/vendor/tesseract/tesseract.min.js.LICENSE.txt",
  "pdf-cad/vendor/tesseract/worker.min.js",
  "pdf-cad/vendor/tesseract/core/tesseract-core-lstm.wasm.js",
  "pdf-cad/vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js",
  "pdf-cad/vendor/tesseract/core/tesseract-core-simd.wasm.js",
  "pdf-cad/vendor/tesseract/core/tesseract-core.wasm.js",
  "pdf-cad/vendor/tesseract/lang/eng.traineddata.gz",
  "pdf-cad/vendor/tesseract/lang/jpn.traineddata.gz",
];

const allowedFiles = new Set(requiredFiles);

const forbiddenTextPatterns = [
  /C:[/\\]Users/i,
  /Dropbox/i,
  /kitakyushu/i,
  /_sample_M-08_sanitary/i,
  /app-output-bridge/i,
  /host-review/i,
  /bridge\.config/i,
  /App_minimal\.light/i,
  /LIGHT_PACKAGE_MANIFEST/i,
  /README_LIGHT/i,
  /light-api-harness/i,
  /preview-host/i,
  /pdf-cad-server\.mjs/i,
];

const referenceSourceFiles = new Set([
  "404.html",
  "index.html",
  "pdf-cad/pdf-cad.html",
  "pdf-cad/pdf-cad.js",
]);

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function listFiles(dir, root = dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath, root));
    } else if (entry.isFile()) {
      files.push(toPosix(path.relative(root, fullPath)));
    }
  }
  return files.sort();
}

function isTextLikeFile(filePath) {
  const lower = filePath.toLowerCase();
  return [".css", ".html", ".js", ".json", ".md", ".mjs", ".txt"].some((ext) => lower.endsWith(ext));
}

async function pathExistsInsidePublic(relativePath) {
  return exists(path.join(publicDir, relativePath));
}

async function readText(relativeFile) {
  return fs.readFile(path.join(publicDir, relativeFile), "utf8");
}

function normalizeReference(baseFile, reference) {
  const clean = reference.split("#")[0].split("?")[0];
  if (!clean || /^(https?:)?\/\//i.test(clean) || clean.startsWith("data:")) return "";
  const baseDir = path.dirname(baseFile);
  return toPosix(path.normalize(path.join(baseDir, clean)));
}

function collectReferences(relativeFile, text) {
  const refs = [];
  const attributeRegex = /\b(?:src|href)=["']([^"']+)["']/g;
  const localAssetRegex = /localAssetUrl\(["']([^"']+)["']\)/g;
  const importRegex = /from\s+["']([^"']+)["']/g;
  for (const regex of [attributeRegex, localAssetRegex, importRegex]) {
    for (const match of text.matchAll(regex)) {
      const normalized = normalizeReference(relativeFile, match[1]);
      if (normalized) refs.push(normalized);
    }
  }
  return refs;
}

const existingFiles = await listFiles(publicDir, publicDir);
const missingFiles = requiredFiles.filter((file) => !existingFiles.includes(file));
const unexpectedFiles = existingFiles.filter((file) => !allowedFiles.has(file));

const forbiddenMatches = [];
const missingReferences = [];
for (const file of existingFiles) {
  if (!isTextLikeFile(file)) continue;
  const text = await readText(file);
  for (const pattern of forbiddenTextPatterns) {
    if (pattern.test(text)) {
      forbiddenMatches.push({ file, pattern: String(pattern) });
    }
  }
  if (!referenceSourceFiles.has(file)) continue;
  for (const reference of collectReferences(file, text)) {
    if (!reference.startsWith("pdf-cad/") && reference !== "index.html") continue;
    if (!existingFiles.includes(reference) && !(await pathExistsInsidePublic(reference))) {
      missingReferences.push({ file, reference });
    }
  }
}

let manifest = null;
let manifestError = "";
try {
  manifest = JSON.parse(await readText("PUBLIC_RELEASE_MANIFEST.json"));
} catch (error) {
  manifestError = error?.message || String(error);
}

let robotsText = "";
let sitemapText = "";
let googleVerificationText = "";
let indexText = "";
let appHtmlText = "";
try {
  robotsText = await readText("robots.txt");
  sitemapText = await readText("sitemap.xml");
  googleVerificationText = await readText(googleVerificationFileName);
  indexText = await readText("index.html");
  appHtmlText = await readText("pdf-cad/pdf-cad.html");
} catch (_error) {
  // Missing file checks report this separately.
}

const checks = {
  publicDirExists: await exists(publicDir),
  manifestOk: manifest?.ok === true,
  manifestSamplePdfBundledFalse: manifest?.samplePdfBundled === false,
  manifestHostWrapperBundledFalse: manifest?.hostWrapperBundled === false,
  allRequiredFilesPresent: missingFiles.length === 0,
  noUnexpectedFiles: unexpectedFiles.length === 0,
  noForbiddenText: forbiddenMatches.length === 0,
  noMissingReferences: missingReferences.length === 0,
  robotsPointsToSitemap: robotsText.includes(`Sitemap: ${publicSiteUrl}sitemap.xml`),
  sitemapHasPublicEntry: sitemapText.includes(`<loc>${publicSiteUrl}</loc>`),
  sitemapHasDirectApp: sitemapText.includes(`<loc>${publicSiteUrl}pdf-cad/pdf-cad.html</loc>`),
  googleVerificationFileValid: googleVerificationText.trim() === `google-site-verification: ${googleVerificationFileName}`,
  cloudflareAnalyticsOnIndex: indexText.includes("static.cloudflareinsights.com/beacon.min.js") && indexText.includes(cloudflareAnalyticsToken),
  cloudflareAnalyticsOnApp: appHtmlText.includes("static.cloudflareinsights.com/beacon.min.js") && appHtmlText.includes(cloudflareAnalyticsToken),
};

const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  ok,
  publicDir,
  checks,
  missingFiles,
  unexpectedFiles,
  forbiddenMatches,
  missingReferences,
  manifestError,
}, null, 2));

if (!ok) {
  process.exitCode = 1;
}
