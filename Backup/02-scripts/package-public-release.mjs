import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lightPackageDir = path.join(projectDir, "dist-light-package");
const sourceStaticDir = path.join(lightPackageDir, "pdf-cad");
const publicDir = path.join(projectDir, "public-release");
const publicStaticDir = path.join(publicDir, "pdf-cad");
const publicManifestFile = path.join(publicDir, "PUBLIC_RELEASE_MANIFEST.json");
const publicInventoryFile = path.join(publicDir, "PUBLIC_RELEASE_INVENTORY.md");
const publicReadmeFile = path.join(publicDir, "README.md");
const publicNoticesFile = path.join(publicDir, "THIRD_PARTY_NOTICES.md");
const publicIndexFile = path.join(publicDir, "index.html");
const publicNotFoundFile = path.join(publicDir, "404.html");
const publicNoJekyllFile = path.join(publicDir, ".nojekyll");
const publicRobotsFile = path.join(publicDir, "robots.txt");
const publicSitemapFile = path.join(publicDir, "sitemap.xml");
const publicDeploymentGuideFile = path.join(publicDir, "PUBLIC_DEPLOYMENT_GUIDE.md");
const publicSiteUrl = "https://fdoyoshikazuhora-sys.github.io/pdf-cad-tool/";
const googleVerificationFileName = "google3e9d027e494c35da.html";
const googleVerificationText = `google-site-verification: ${googleVerificationFileName}
`;
const cloudflareAnalyticsTag = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"ae8d459c6e734535a32301aa99ee1540"}'></script>`;

const refreshLightPackage = !process.argv.includes("--no-refresh");

const staticFiles = [
  "pdf-cad.css",
  "pdf-cad.html",
  "pdf-cad.js",
  "vendor/pdfjs/pdf.min.mjs",
  "vendor/pdfjs/pdf.worker.min.mjs",
  "vendor/tesseract/tesseract.min.js",
  "vendor/tesseract/worker.min.js",
  "vendor/tesseract/core/tesseract-core-lstm.wasm.js",
  "vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js",
  "vendor/tesseract/core/tesseract-core-simd.wasm.js",
  "vendor/tesseract/core/tesseract-core.wasm.js",
  "vendor/tesseract/lang/eng.traineddata.gz",
  "vendor/tesseract/lang/jpn.traineddata.gz",
];

const generatedNoticeFiles = [
  "vendor/tesseract/tesseract.min.js.LICENSE.txt",
];

const expectedPublicFiles = new Set([
  ".nojekyll",
  "404.html",
  "index.html",
  "PUBLIC_DEPLOYMENT_GUIDE.md",
  "PUBLIC_RELEASE_INVENTORY.md",
  "PUBLIC_RELEASE_MANIFEST.json",
  "README.md",
  googleVerificationFileName,
  "robots.txt",
  "sitemap.xml",
  "THIRD_PARTY_NOTICES.md",
  ...staticFiles.map((file) => `pdf-cad/${file}`),
  ...generatedNoticeFiles.map((file) => `pdf-cad/${file}`),
]);

const forbiddenFileNames = [
  "App_minimal.light.js",
  "LIGHT_PACKAGE_MANIFEST.json",
  "README_LIGHT.md",
  "light-api-harness.html",
  "preview-host.html",
  "pdf-cad-server.mjs",
  "_sample_M-08_sanitary.pdf",
];

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

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function relativeToPublic(filePath) {
  return toPosix(path.relative(publicDir, filePath));
}

function assertInsideProject(label, filePath) {
  const relative = path.relative(projectDir, filePath);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return;
  throw new Error(`Refusing to write ${label} outside this project: ${filePath}`);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function copyFileRelative(relativeFile) {
  const sourcePath = path.join(sourceStaticDir, relativeFile);
  const targetPath = path.join(publicStaticDir, relativeFile);
  if (!(await exists(sourcePath))) {
    throw new Error(`Missing required public static file: ${toPosix(path.relative(lightPackageDir, sourcePath))}`);
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  if (relativeFile.endsWith(".html")) {
    const html = await fs.readFile(sourcePath, "utf8");
    await fs.writeFile(targetPath, injectCloudflareAnalytics(html), "utf8");
  } else {
    await fs.copyFile(sourcePath, targetPath);
  }
}

function injectCloudflareAnalytics(html) {
  if (html.includes("static.cloudflareinsights.com/beacon.min.js")) return html;
  return html.replace("</head>", `  ${cloudflareAnalyticsTag}\n</head>`);
}

async function listFiles(dir, root = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath, root));
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      const bytes = await fs.readFile(fullPath);
      files.push({
        path: toPosix(path.relative(root, fullPath)),
        bytes: stat.size,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function isTextLikeFile(filePath) {
  const lower = filePath.toLowerCase();
  return [".css", ".html", ".js", ".json", ".md", ".mjs", ".txt"].some((ext) => lower.endsWith(ext));
}

async function findForbiddenMatches() {
  const matches = [];
  const files = await listFiles(publicDir, publicDir);
  for (const file of files) {
    const normalizedPath = file.path;
    const baseName = path.basename(normalizedPath);
    if (forbiddenFileNames.includes(baseName)) {
      matches.push({ file: normalizedPath, reason: "forbidden file name" });
    }
    if (!isTextLikeFile(normalizedPath)) continue;
    const text = await fs.readFile(path.join(publicDir, normalizedPath), "utf8");
    for (const pattern of forbiddenTextPatterns) {
      if (pattern.test(text)) {
        matches.push({ file: normalizedPath, reason: `forbidden text ${pattern}` });
      }
    }
  }
  return matches.sort((a, b) => a.file.localeCompare(b.file) || a.reason.localeCompare(b.reason));
}

async function findUnexpectedFiles() {
  if (!(await exists(publicDir))) return [];
  const files = await listFiles(publicDir, publicDir);
  return files
    .map((file) => file.path)
    .filter((file) => !expectedPublicFiles.has(file))
    .sort();
}

function buildIndexHtml() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PDF to CAD Tool</title>
    <meta name="description" content="PDF図面をブラウザ上で解析し、線・文字・円・縮尺補正をDXFへ変換する静的PDF-CAD変換ツールです。">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${publicSiteUrl}">
    <meta property="og:title" content="PDF to CAD Tool">
    <meta property="og:description" content="PDF図面をブラウザで読み込み、DXFへ変換する静的PDF-CADツール。サンプルPDFは同梱していません。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${publicSiteUrl}">
    <meta name="twitter:card" content="summary">
    ${cloudflareAnalyticsTag}
    <style>
      :root {
        color-scheme: light;
        --ink: #17202a;
        --muted: #5d6978;
        --line: #dce3ea;
        --accent: #0f766e;
        --accent-strong: #0b4d45;
        --warn: #8a5a00;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, "Segoe UI", "Yu Gothic UI", "Meiryo", sans-serif;
        color: var(--ink);
        background: #fff;
        line-height: 1.65;
      }
      header, main, footer {
        width: min(1080px, calc(100% - 32px));
        margin: 0 auto;
      }
      header {
        padding: 30px 0;
        border-bottom: 1px solid var(--line);
      }
      nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 42px;
      }
      .brand {
        font-size: 18px;
        font-weight: 750;
      }
      .links {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 16px;
        font-size: 14px;
      }
      a {
        color: var(--accent-strong);
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }
      h1 {
        max-width: 820px;
        margin: 0 0 18px;
        font-size: clamp(34px, 7vw, 70px);
        line-height: 1.04;
        letter-spacing: 0;
      }
      .lead {
        max-width: 780px;
        margin: 0;
        color: var(--muted);
        font-size: 18px;
      }
      .notice {
        margin-top: 18px;
        color: var(--warn);
        font-weight: 650;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 22px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 16px;
        border: 1px solid var(--accent);
        border-radius: 8px;
        color: var(--accent-strong);
        background: #fff;
        text-decoration: none;
        font-weight: 700;
      }
      .button.primary {
        color: #fff;
        background: var(--accent);
      }
      section {
        padding: 32px 0;
        border-bottom: 1px solid var(--line);
      }
      h2 {
        margin: 0 0 14px;
        font-size: 24px;
      }
      p { margin: 0 0 14px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
      }
      .item {
        border-left: 3px solid var(--accent);
        padding: 2px 0 2px 14px;
      }
      .item h3 {
        margin: 0 0 6px;
        font-size: 16px;
      }
      .item p {
        color: var(--muted);
        font-size: 14px;
      }
      ol {
        margin: 0;
        padding-left: 22px;
      }
      li { margin: 8px 0; }
      code {
        padding: 2px 5px;
        border-radius: 4px;
        background: #e8eef4;
        font-family: "Cascadia Mono", "Consolas", monospace;
      }
      footer {
        padding: 26px 0 40px;
        color: var(--muted);
        font-size: 14px;
      }
      @media (max-width: 760px) {
        nav {
          align-items: flex-start;
          flex-direction: column;
          margin-bottom: 30px;
        }
        .links { justify-content: flex-start; }
        .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <header>
      <nav aria-label="Primary">
        <div class="brand">PDF to CAD Tool</div>
        <div class="links">
          <a href="pdf-cad/pdf-cad.html">Open App</a>
          <a href="README.md">README</a>
          <a href="PUBLIC_DEPLOYMENT_GUIDE.md">Deployment Guide</a>
          <a href="https://github.com/fdoyoshikazuhora-sys/pdf-cad-tool">GitHub</a>
        </div>
      </nav>

      <h1>PDF図面をブラウザでDXFへ変換</h1>
      <p class="lead">PDF図面を読み込み、線・文字・円・曲線・画像サイズを解析してDXFとして保存する静的ブラウザツールです。処理はブラウザ内で行います。</p>
      <p class="notice">公開版にはサンプルPDFを同梱していません。利用者自身のPDFを画面から選択して使います。</p>
      <div class="actions">
        <a class="button primary" href="pdf-cad/pdf-cad.html">アプリを開く</a>
        <a class="button" href="README.md">取扱説明を見る</a>
        <a class="button" href="https://github.com/fdoyoshikazuhora-sys/pdf-cad-tool">GitHubで開く</a>
      </div>
    </header>

    <main>
      <section aria-labelledby="workflow">
        <h2 id="workflow">使い方</h2>
        <ol>
          <li><a href="pdf-cad/pdf-cad.html">アプリ画面</a>を開く</li>
          <li><code>Select PDF</code> からPDF図面を選ぶ</li>
          <li><code>Analyze</code> で解析する</li>
          <li>縮尺、線種、文字、OCR、円、レイヤー設定を必要に応じて調整する</li>
          <li><code>Save DXF</code> でDXFを書き出す</li>
        </ol>
      </section>

      <section aria-labelledby="features">
        <h2 id="features">公開版の内容</h2>
        <div class="grid">
          <div class="item">
            <h3>静的ホスティング対応</h3>
            <p>GitHub Pagesなどの静的ホストに置くだけで動く構成です。</p>
          </div>
          <div class="item">
            <h3>ローカル処理</h3>
            <p>PDF解析とDXF保存はブラウザ内で行います。公開版に図面データは含めていません。</p>
          </div>
          <div class="item">
            <h3>DXF出力</h3>
            <p>文字、線、円、曲線、縮尺補正、レイヤー分けを調整してDXFを保存できます。</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="docs">
        <h2 id="docs">ドキュメント</h2>
        <p><a href="README.md">README</a> に基本的な取扱説明、<a href="THIRD_PARTY_NOTICES.md">Third-Party Notices</a> に同梱ライブラリの注意、<a href="PUBLIC_RELEASE_MANIFEST.json">Manifest</a> に公開ファイルの棚卸しを載せています。</p>
      </section>
    </main>

    <footer>
      <p>PDF to CAD Tool / build 20260521-bridge-io-1</p>
    </footer>
  </body>
</html>
`;
}

function buildNotFoundHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PDF to CAD Tool</title>
    <meta http-equiv="refresh" content="0; url=./index.html">
    <style>
      body { margin: 0; padding: 24px; font: 16px system-ui, sans-serif; background: #101316; color: #fff; }
      a { color: #5eead4; }
    </style>
  </head>
  <body>
    <p>Opening <a href="./index.html">PDF to CAD Tool</a>...</p>
  </body>
</html>
`;
}

function buildPublicReadme() {
  return `# PDF to CAD Tool - Public Static Release

This folder is the public static release package.

Upload the whole folder to a static web host such as GitHub Pages, Netlify, Cloudflare Pages, or a normal web server.

## Entry

- Public entry page: \`index.html\`
- Direct app page: \`pdf-cad/pdf-cad.html\`

## What is included

- The PDF-CAD browser app.
- Local PDF.js runtime files.
- Local Tesseract.js runtime files and English/Japanese OCR data.
- Public inventory and manifest files.

## What is not included

- Sample PDF files.
- Host application wrappers.
- Local development scripts.
- Internal review harnesses.
- Machine-specific paths.

## Basic Use

1. Open \`index.html\` through a web server.
2. Select a PDF in the app.
3. Run analysis.
4. Adjust scale, line type, text, layer, OCR, circle, and DXF settings as needed.
5. Save the DXF.

Opening the HTML file directly from the filesystem may block browser features in some environments. Static hosting or a local web server is recommended.

## Release Check

See \`PUBLIC_RELEASE_MANIFEST.json\` for file counts, byte counts, and the sanitization result.

See \`PUBLIC_RELEASE_INVENTORY.md\` for the release inventory.

See \`PUBLIC_DEPLOYMENT_GUIDE.md\` before uploading this folder to a public host.
`;
}

function buildDeploymentGuide() {
  return `# Public Deployment Guide

Publish only this folder's contents. Do not upload the parent workspace.

## Recommended Upload Shape

Upload these files and folders at the web root:

- \`index.html\`
- \`404.html\`
- \`.nojekyll\`
- \`${googleVerificationFileName}\`
- \`robots.txt\`
- \`sitemap.xml\`
- \`pdf-cad/\`
- \`README.md\`
- \`THIRD_PARTY_NOTICES.md\`
- \`PUBLIC_DEPLOYMENT_GUIDE.md\`
- \`PUBLIC_RELEASE_INVENTORY.md\`
- \`PUBLIC_RELEASE_MANIFEST.json\`

## GitHub Pages Notes

- Keep \`.nojekyll\` so static vendor files are served as normal files.
- Use \`index.html\` as the public entry.
- Upload the whole \`pdf-cad/\` folder without renaming it.
- Keep \`${googleVerificationFileName}\` at the web root for Google Search Console URL-prefix verification.
- After publishing, open the public URL and manually load a PDF.
- Run analysis and save a DXF before announcing the URL.

## Do Not Upload

- Sample PDFs unless you intentionally want them public.
- Local host integration wrappers.
- Development scripts or command files.
- Private drawings, private paths, or review harness pages.

## Expected Runtime

The app runs entirely in the browser. PDF processing and DXF export happen locally in the user's browser session.
`;
}

function buildThirdPartyNotices() {
  return `# Third-Party Notices

This public release includes local browser runtime files from third-party projects.

## Included Runtime Assets

- PDF.js runtime and worker files.
- Tesseract.js runtime, worker, WebAssembly loader files, and OCR traineddata files.

## Redistribution Note

Keep upstream license notices with the distributed files, and review upstream project licenses before external redistribution.

The PDF.js files include license notice comments in the distributed source.

The Tesseract.js browser bundle references \`tesseract.min.js.LICENSE.txt\`; this package includes a local notice file beside that bundle so the reference is not missing in the public folder.
`;
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${publicSiteUrl}sitemap.xml
`;
}

function buildSitemapXml({ createdAt }) {
  const date = createdAt.slice(0, 10);
  const urls = [
    publicSiteUrl,
    `${publicSiteUrl}pdf-cad/pdf-cad.html`,
    `${publicSiteUrl}README.md`,
    `${publicSiteUrl}THIRD_PARTY_NOTICES.md`,
    `${publicSiteUrl}PUBLIC_DEPLOYMENT_GUIDE.md`,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${date}</lastmod>
  </url>`).join("\n")}
</urlset>
`;
}

function buildTesseractLicenseStub() {
  return `Tesseract.js browser bundle notice

This file is included because the distributed tesseract.min.js bundle references
"tesseract.min.js.LICENSE.txt".

The bundle is a third-party runtime asset. Review and keep the upstream license
information for Tesseract.js, its bundled dependencies, Tesseract OCR, Leptonica,
and the OCR traineddata files before public redistribution.
`;
}

function buildInventory({ createdAt, files, appBuild }) {
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const lines = [
    "# Public Release Inventory",
    "",
    `Created: ${createdAt}`,
    `App build: ${appBuild}`,
    `Listed payload files: ${files.length}`,
    `Listed payload bytes: ${totalBytes}`,
    "Self-describing files not shown in the hash table: PUBLIC_RELEASE_MANIFEST.json, PUBLIC_RELEASE_INVENTORY.md",
    "",
    "## Included",
    "",
    "- Static entry page.",
    "- PDF-CAD app HTML, CSS, and JavaScript.",
    "- Local PDF parsing runtime.",
    "- Local OCR runtime and English/Japanese OCR data.",
    "- Public manifest, inventory, README, and third-party notice files.",
    "",
    "## Excluded",
    "",
    "- Sample PDFs.",
    "- React host wrappers.",
    "- Host integration review pages.",
    "- Local development commands and scripts.",
    "- Machine-specific absolute paths.",
    "",
    "## File List",
    "",
    "| File | Bytes | SHA-256 |",
    "| --- | ---: | --- |",
    ...files.map((file) => `| \`${file.path}\` | ${file.bytes} | ${file.sha256} |`),
  ];
  return `${lines.join("\n")}\n`;
}

function extractAppBuild(text) {
  const match = text.match(/const APP_BUILD = "([^"]+)"/);
  return match?.[1] || "unknown";
}

assertInsideProject("public release directory", publicDir);
assertInsideProject("public static directory", publicStaticDir);
if (path.basename(publicDir) !== "public-release") {
  throw new Error(`Refusing to replace unexpected public release directory: ${publicDir}`);
}

if (refreshLightPackage) {
  const packageLightUrl = `${pathToFileURL(path.join(projectDir, "scripts", "package-light.mjs")).href}?publicRelease=${Date.now()}`;
  await import(packageLightUrl);
}

if (!(await exists(sourceStaticDir))) {
  throw new Error("Run npm run package:light before creating the public release.");
}

await fs.mkdir(publicDir, { recursive: true });
await fs.mkdir(publicStaticDir, { recursive: true });
for (const file of staticFiles) {
  await copyFileRelative(file);
}

await fs.writeFile(publicIndexFile, buildIndexHtml(), "utf8");
await fs.writeFile(publicNotFoundFile, buildNotFoundHtml(), "utf8");
await fs.writeFile(publicNoJekyllFile, "", "utf8");
await fs.writeFile(publicRobotsFile, buildRobotsTxt(), "utf8");
await fs.writeFile(path.join(publicDir, googleVerificationFileName), googleVerificationText, "utf8");
await fs.writeFile(publicReadmeFile, buildPublicReadme(), "utf8");
await fs.writeFile(publicDeploymentGuideFile, buildDeploymentGuide(), "utf8");
await fs.writeFile(publicNoticesFile, buildThirdPartyNotices(), "utf8");
await fs.writeFile(path.join(publicStaticDir, generatedNoticeFiles[0]), buildTesseractLicenseStub(), "utf8");
const createdAt = new Date().toISOString();
await fs.writeFile(publicSitemapFile, buildSitemapXml({ createdAt }), "utf8");

const unexpectedFiles = await findUnexpectedFiles();
if (unexpectedFiles.length) {
  throw new Error(`Public release contains unexpected files: ${JSON.stringify(unexpectedFiles, null, 2)}`);
}

let files = (await listFiles(publicDir, publicDir))
  .filter((file) => !["PUBLIC_RELEASE_INVENTORY.md", "PUBLIC_RELEASE_MANIFEST.json"].includes(file.path));
const appBuild = extractAppBuild(await fs.readFile(path.join(publicStaticDir, "pdf-cad.js"), "utf8"));
await fs.writeFile(publicInventoryFile, buildInventory({ createdAt, files, appBuild }), "utf8");

files = (await listFiles(publicDir, publicDir))
  .filter((file) => !["PUBLIC_RELEASE_INVENTORY.md", "PUBLIC_RELEASE_MANIFEST.json"].includes(file.path));
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
const forbiddenMatches = await findForbiddenMatches();
const manifest = {
  ok: forbiddenMatches.length === 0,
  createdAt,
  packageType: "public-static-pdf-cad",
  appBuild,
  entry: "index.html",
  app: "pdf-cad/pdf-cad.html",
  listedPayloadFiles: files.length,
  listedPayloadBytes: totalBytes,
  selfDescribingFilesExcludedFromHashList: [
    "PUBLIC_RELEASE_MANIFEST.json",
    "PUBLIC_RELEASE_INVENTORY.md",
  ],
  samplePdfBundled: false,
  hostWrapperBundled: false,
  developmentScriptsBundled: false,
  hostWriteMode: "none",
  sanitization: {
    internalPathReferences: false,
    forbiddenMatches,
  },
  fileList: files,
};

await fs.writeFile(publicManifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const finalMatches = await findForbiddenMatches();
const allFiles = await listFiles(publicDir, publicDir);
if (finalMatches.length) {
  await fs.writeFile(publicManifestFile, `${JSON.stringify({
    ...manifest,
    ok: false,
    sanitization: {
      ...manifest.sanitization,
      internalPathReferences: true,
      forbiddenMatches: finalMatches,
    },
  }, null, 2)}\n`, "utf8");
  throw new Error(`Public release contains forbidden internal references: ${JSON.stringify(finalMatches, null, 2)}`);
}

console.log(JSON.stringify({
  ok: true,
  publicDir,
  entry: relativeToPublic(publicIndexFile),
  app: "pdf-cad/pdf-cad.html",
  appBuild,
  listedPayloadFiles: files.length,
  listedPayloadBytes: totalBytes,
  totalFiles: allFiles.length,
  samplePdfBundled: false,
  hostWrapperBundled: false,
  forbiddenMatches: finalMatches.length,
  manifest: relativeToPublic(publicManifestFile),
  inventory: relativeToPublic(publicInventoryFile),
}, null, 2));
