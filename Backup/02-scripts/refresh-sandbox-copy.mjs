import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(projectDir, "bridge.config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const args = new Set(process.argv.slice(2));
const skipBackup = args.has("--no-backup");

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

const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
if (!config.sandboxFile) {
  throw new Error("bridge.config.json must define sandboxFile.");
}
const sandboxTargetFile = resolveConfigPath(config.sandboxFile);
const backupDir = resolveConfigPath(config.backupDir);

if (!isInsideProject(sandboxTargetFile)) {
  throw new Error(`Sandbox target must stay inside app-output-bridge: ${sandboxTargetFile}`);
}
if (!isInsideProject(backupDir)) {
  throw new Error(`Sandbox backup directory must stay inside app-output-bridge: ${backupDir}`);
}
if (hostTemplateFile === sandboxTargetFile) {
  throw new Error("Host template and sandbox target must not point to the same file.");
}

await fs.mkdir(path.dirname(sandboxTargetFile), { recursive: true });
if ((await exists(sandboxTargetFile)) && !skipBackup) {
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `App_minimal.sandbox-refresh.${timestamp()}.backup.js`);
  await fs.copyFile(sandboxTargetFile, backupPath);
  console.log(`Backed up sandbox before refresh: ${backupPath}`);
}
await fs.copyFile(hostTemplateFile, sandboxTargetFile);

console.log(`Copied host App_minimal.js to sandbox: ${sandboxTargetFile}`);
