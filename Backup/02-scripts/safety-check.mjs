import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(projectDir, "bridge.config.json"), "utf8"));
const packageJson = JSON.parse(await fs.readFile(path.join(projectDir, "package.json"), "utf8"));

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

const hostTemplateFile = resolveConfigPath(config.hostTemplateFile);
if (!config.sandboxFile) {
  throw new Error("bridge.config.json must define sandboxFile.");
}
const sandboxFile = resolveConfigPath(config.sandboxFile);
const generatedFile = resolveConfigPath(config.generatedFile);
const previewFile = resolveConfigPath(config.previewFile);
const bridgeHarnessFile = resolveConfigPath(config.bridgeHarnessFile || path.join(path.dirname(generatedFile), "bridge-io-harness.html"));
const bridgeApiHarnessFile = resolveConfigPath(config.bridgeApiHarnessFile || path.join(path.dirname(generatedFile), "bridge-api-harness.html"));
const bridgeManifestFile = resolveConfigPath(config.bridgeManifestFile || path.join(path.dirname(generatedFile), "bridge-manifest.json"));
const bridgeTypesFile = resolveConfigPath(config.bridgeTypesFile || path.join(path.dirname(generatedFile), "pdf-cad-bridge.d.ts"));
const sourceAppDir = resolveConfigPath(config.sourceAppDir);

const checks = [
  {
    name: "sandbox target stays inside app-output-bridge",
    ok: isInsideProject(sandboxFile),
    value: sandboxFile,
  },
  {
    name: "generated file stays inside app-output-bridge",
    ok: isInsideProject(generatedFile),
    value: generatedFile,
  },
  {
    name: "preview file stays inside app-output-bridge",
    ok: isInsideProject(previewFile),
    value: previewFile,
  },
  {
    name: "bridge I/O harness stays inside app-output-bridge",
    ok: isInsideProject(bridgeHarnessFile),
    value: bridgeHarnessFile,
  },
  {
    name: "bridge API harness stays inside app-output-bridge",
    ok: isInsideProject(bridgeApiHarnessFile),
    value: bridgeApiHarnessFile,
  },
  {
    name: "bridge manifest stays inside app-output-bridge",
    ok: isInsideProject(bridgeManifestFile),
    value: bridgeManifestFile,
  },
  {
    name: "bridge types stay inside app-output-bridge",
    ok: isInsideProject(bridgeTypesFile),
    value: bridgeTypesFile,
  },
  {
    name: "source app stays inside app-output-bridge",
    ok: isInsideProject(sourceAppDir),
    value: sourceAppDir,
  },
  {
    name: "host template is read-only and separate from sandbox target",
    ok: hostTemplateFile !== sandboxFile,
    value: hostTemplateFile,
  },
  {
    name: "host template exists",
    ok: await exists(hostTemplateFile),
    value: hostTemplateFile,
  },
  {
    name: "target write shortcut was removed",
    ok: !(await exists(path.join(projectDir, "apply-to-target.cmd"))),
    value: "apply-to-target.cmd",
  },
  {
    name: "target serve shortcut was removed",
    ok: !(await exists(path.join(projectDir, "serve-target.cmd"))),
    value: "serve-target.cmd",
  },
  {
    name: "npm scripts do not serve or apply the host app",
    ok: !Object.values(packageJson.scripts || {}).some((script) => /kitakyushu-water-app|serve:target/.test(script)),
    value: packageJson.scripts,
  },
];

const failed = checks.filter((check) => !check.ok);

console.log(JSON.stringify({
  ok: failed.length === 0,
  checks,
}, null, 2));

if (failed.length) {
  process.exitCode = 1;
}
