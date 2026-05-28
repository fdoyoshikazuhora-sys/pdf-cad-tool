import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));

function resolveConfigPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

const backupDir = resolveConfigPath(config.backupDir);

if (!(await exists(backupDir))) {
  console.log(JSON.stringify({ ok: true, backupDir, backups: [] }, null, 2));
  process.exit(0);
}

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
    sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
    containsPdfCad: text.includes("PDF to CAD Tool"),
    containsOldCadApp: text.includes("Line: click start point"),
    containsSamplePdf: text.includes("_sample_M-08_sanitary.pdf"),
  });
}

backups.sort((a, b) => b.modified.localeCompare(a.modified));

console.log(JSON.stringify({
  ok: true,
  backupDir,
  count: backups.length,
  backups,
}, null, 2));
