import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const vendorDefinitions = [
  {
    name: "Tesseract.js browser bundle",
    sourceKey: "sourceHtml",
    remote: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    local: "vendor/tesseract/tesseract.min.js",
    explicitRuntime: true,
  },
  {
    name: "Tesseract.js worker",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/dist/worker.min.js",
    local: "vendor/tesseract/worker.min.js",
    ocrRuntime: true,
  },
  {
    name: "Tesseract.js core",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/tesseract-core.wasm.js",
    local: "vendor/tesseract/core/tesseract-core.wasm.js",
    ocrRuntime: true,
  },
  {
    name: "Tesseract.js core LSTM",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/tesseract-core-lstm.wasm.js",
    local: "vendor/tesseract/core/tesseract-core-lstm.wasm.js",
    ocrRuntime: true,
  },
  {
    name: "Tesseract.js core SIMD",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/tesseract-core-simd.wasm.js",
    local: "vendor/tesseract/core/tesseract-core-simd.wasm.js",
    ocrRuntime: true,
  },
  {
    name: "Tesseract.js core SIMD LSTM",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/tesseract-core-simd-lstm.wasm.js",
    local: "vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js",
    ocrRuntime: true,
  },
  {
    name: "Tesseract.js English traineddata",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    local: "vendor/tesseract/lang/eng.traineddata.gz",
    ocrRuntime: true,
  },
  {
    name: "Tesseract.js Japanese traineddata",
    sourceKey: "sourceEntry",
    remote: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/jpn/4.0.0_best_int/jpn.traineddata.gz",
    local: "vendor/tesseract/lang/jpn.traineddata.gz",
    ocrRuntime: true,
  },
  {
    name: "PDF.js module",
    sourceKey: "sourceEntry",
    remote: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs",
    local: "vendor/pdfjs/pdf.min.mjs",
    explicitRuntime: true,
  },
  {
    name: "PDF.js worker",
    sourceKey: "sourceEntry",
    remote: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs",
    local: "vendor/pdfjs/pdf.worker.min.mjs",
    explicitRuntime: true,
  },
];

export function getVendorMappings(config, sourceAppDir) {
  return vendorDefinitions.map((definition) => ({
    ...definition,
    sourceFileName: definition.sourceKey ? config[definition.sourceKey] : "",
    sourceFile: definition.sourceKey ? path.join(sourceAppDir, config[definition.sourceKey]) : "",
    localRef: `./${definition.local}`,
    localPath: path.join(sourceAppDir, definition.local),
  }));
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

export async function dependencyFileState(filePath) {
  if (!(await pathExists(filePath))) {
    return {
      exists: false,
      bytes: 0,
      sha256: "",
    };
  }
  const bytes = await fs.readFile(filePath);
  return {
    exists: true,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12),
  };
}

async function readTextIfExists(filePath) {
  return (await pathExists(filePath)) ? fs.readFile(filePath, "utf8") : "";
}

export async function collectVendorStatus(mappings) {
  const sourceTextByFile = new Map();
  for (const mapping of mappings.filter((item) => item.sourceFile)) {
    if (!sourceTextByFile.has(mapping.sourceFile)) {
      sourceTextByFile.set(mapping.sourceFile, await readTextIfExists(mapping.sourceFile));
    }
  }

  const vendors = [];
  for (const mapping of mappings) {
    const source = mapping.sourceFile ? sourceTextByFile.get(mapping.sourceFile) || "" : "";
    vendors.push({
      name: mapping.name,
      remote: mapping.remote,
      local: mapping.local,
      localRef: mapping.localRef,
      explicitRuntime: Boolean(mapping.explicitRuntime),
      ocrRuntime: Boolean(mapping.ocrRuntime),
      sourceFile: mapping.sourceFileName,
      sourceFilePath: mapping.sourceFile,
      localPath: mapping.localPath,
      localFile: await dependencyFileState(mapping.localPath),
      sourceUsesRemote: source.includes(mapping.remote),
      sourceUsesLocal: mapping.sourceFile ? source.includes(mapping.local) || source.includes(mapping.localRef) : false,
    });
  }
  return vendors;
}

export function isVendorReady(item) {
  if (!item.localFile.exists || item.sourceUsesRemote) return false;
  return item.ocrRuntime && !item.explicitRuntime ? true : item.sourceUsesLocal;
}
