import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const args = process.argv.slice(2);

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

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function hash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
}

function backupNameFromArgs() {
  const fileIndex = args.indexOf("--file");
  if (fileIndex >= 0) return args[fileIndex + 1] || "";
  return args[0] || "";
}

async function listBackups(backupDir) {
  if (!(await exists(backupDir))) return [];
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const backups = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const filePath = path.join(backupDir, entry.name);
    const bytes = await fs.readFile(filePath);
    const text = bytes.toString("utf8");
    const stat = await fs.stat(filePath);
    backups.push({
      file: entry.name,
      bytes: bytes.length,
      modified: stat.mtime.toISOString(),
      sha256: hash(bytes),
      containsPdfCad: text.includes("PDF to CAD Tool"),
      containsOldCadApp: text.includes("Line: click start point"),
    });
  }
  backups.sort((a, b) => b.modified.localeCompare(a.modified));
  return backups;
}

if (!config.sandboxFile) {
  throw new Error("bridge.config.json must define sandboxFile.");
}

const backupDir = resolveConfigPath(config.backupDir);
const sandboxFile = resolveConfigPath(config.sandboxFile);
const requestedBackup = backupNameFromArgs();

if (!isInsideProject(sandboxFile)) {
  throw new Error(`Sandbox file must stay inside app-output-bridge: ${sandboxFile}`);
}

if (!requestedBackup) {
  console.log(JSON.stringify({
    ok: true,
    mode: "usage",
    message: "Pass an exact backup file name to restore only the sandbox file.",
    example: "npm run restore:sandbox -- --file App_minimal.20260521_102943.backup.js",
    backupDir,
    recentBackups: (await listBackups(backupDir)).slice(0, 10),
  }, null, 2));
  process.exit(0);
}

if (requestedBackup !== path.basename(requestedBackup)) {
  throw new Error("Use a backup file name only, not a path.");
}

const backupFile = path.resolve(backupDir, requestedBackup);
if (!isInsideProject(backupFile)) {
  throw new Error(`Backup file must stay inside app-output-bridge: ${backupFile}`);
}
if (!(await exists(backupFile))) {
  throw new Error(`Backup file was not found: ${backupFile}`);
}

await fs.mkdir(path.dirname(sandboxFile), { recursive: true });
await fs.mkdir(backupDir, { recursive: true });

if (await exists(sandboxFile)) {
  const preRestoreBackup = path.join(backupDir, `App_minimal.before-restore.${timestamp()}.backup.js`);
  await fs.copyFile(sandboxFile, preRestoreBackup);
  console.log(`Backed up current sandbox before restore: ${preRestoreBackup}`);
}

await fs.copyFile(backupFile, sandboxFile);

const restoredBytes = await fs.readFile(sandboxFile);
const restoredText = restoredBytes.toString("utf8");
console.log(JSON.stringify({
  ok: true,
  restored: requestedBackup,
  sandboxFile,
  bytes: restoredBytes.length,
  sha256: hash(restoredBytes),
  containsPdfCad: restoredText.includes("PDF to CAD Tool"),
  containsOldCadApp: restoredText.includes("Line: click start point"),
}, null, 2));
