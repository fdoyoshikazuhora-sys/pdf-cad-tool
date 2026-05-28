import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getVendorMappings, pathExists } from "./vendor-config.mjs";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const shouldApply = new Set(process.argv.slice(2)).has("--apply");

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const sourceAppDir = resolveConfigPath(config.sourceAppDir);
const sourceHtmlPath = path.join(sourceAppDir, config.sourceHtml);
const sourceEntryPath = path.join(sourceAppDir, config.sourceEntry);
const backupDir = resolveConfigPath(config.backupDir);

function isInsideProject(filePath) {
  const relative = path.relative(projectDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function fail(message, details = {}) {
  console.error(JSON.stringify({
    ok: false,
    applied: false,
    reason: message,
    ...details,
  }, null, 2));
  process.exit(1);
}

const mappings = getVendorMappings(config, sourceAppDir);

const guardPaths = [
  { name: "sourceAppDir", value: sourceAppDir },
  { name: "sourceHtmlPath", value: sourceHtmlPath },
  { name: "sourceEntryPath", value: sourceEntryPath },
  { name: "backupDir", value: backupDir },
  ...mappings.map((mapping, index) => ({ name: `localFile${index + 1}`, value: mapping.localPath })),
];

const unsafePaths = guardPaths.filter((item) => !isInsideProject(item.value));
if (unsafePaths.length) {
  fail("Local vendor switching is allowed only inside app-output-bridge.", {
    projectDir,
    unsafePaths,
  });
}

const missing = [];
for (const mapping of mappings) {
  if (!(await pathExists(mapping.localPath))) {
    missing.push({
      remote: mapping.remote,
      expectedLocalPath: mapping.localPath,
    });
  }
}

if (missing.length) {
  console.log(JSON.stringify({
    ok: false,
    applied: false,
    mode: shouldApply ? "apply" : "dry-run",
    reason: "Local vendor files are missing. No source files were changed.",
    missing,
  }, null, 2));
  process.exit(shouldApply ? 1 : 0);
}

const planned = [];
for (const sourceFile of [...new Set(mappings.map((mapping) => mapping.sourceFile))]) {
  let source = await fs.readFile(sourceFile, "utf8");
  let next = source;
  for (const mapping of mappings.filter((item) => item.sourceFile === sourceFile)) {
    next = next.split(mapping.remote).join(mapping.localRef);
  }
  planned.push({
    sourceFile,
    changed: next !== source,
    sourceAlreadyLocal: next === source && mappings.some((item) => item.sourceFile === sourceFile && source.includes(item.localRef)),
    beforeRemoteCount: mappings.filter((item) => item.sourceFile === sourceFile && source.includes(item.remote)).length,
    afterRemoteCount: mappings.filter((item) => item.sourceFile === sourceFile && next.includes(item.remote)).length,
    next,
  });
}

if (!shouldApply) {
  console.log(JSON.stringify({
    ok: true,
    applied: false,
    mode: "dry-run",
    planned: planned.map(({ next: _next, ...item }) => item),
  }, null, 2));
  process.exit(0);
}

await fs.mkdir(backupDir, { recursive: true });
for (const item of planned) {
  if (!item.changed) continue;
  const backupName = `${path.basename(item.sourceFile)}.vendor-local.${timestamp()}.backup`;
  const backupPath = path.join(backupDir, backupName);
  await fs.copyFile(item.sourceFile, backupPath);
  await fs.writeFile(item.sourceFile, item.next, "utf8");
  console.log(`Backed up source: ${backupPath}`);
  console.log(`Wrote local vendor references: ${item.sourceFile}`);
}

console.log(JSON.stringify({
  ok: true,
  applied: true,
  mode: "apply",
  changedFiles: planned.filter((item) => item.changed).map((item) => item.sourceFile),
  unchangedFiles: planned.filter((item) => !item.changed).map((item) => item.sourceFile),
}, null, 2));
