import * as pdfjsLib from "./vendor/pdfjs/pdf.min.mjs";

const APP_BUILD = "20260521-bridge-io-1";

const DXF_LINETYPES = [
  { name: "CONTINUOUS", description: "Solid line", pattern: [], color: "7" },
  { name: "DASHED", description: "Dashed __ __ __", pattern: [6, -3], color: "1" },
  { name: "HIDDEN", description: "Hidden __  __  __", pattern: [4, -4], color: "8" },
  { name: "CENTER", description: "Center ____ _ ____", pattern: [12, -3, 3, -3], color: "5" },
  { name: "DOT", description: "Dot . . .", pattern: [0.35, -3], color: "2" },
  { name: "DASHDOT", description: "Dash dot __ . __ .", pattern: [8, -3, 0.35, -3], color: "3" },
  { name: "DIVIDE", description: "Divide __ . . __", pattern: [8, -3, 0.35, -3, 0.35, -3], color: "4" },
  { name: "PHANTOM", description: "Phantom ____ __ __ ____", pattern: [12, -3, 4, -3, 4, -3], color: "6" },
  { name: "BORDER", description: "Border __ __ . __", pattern: [8, -3, 8, -3, 0.35, -3], color: "9" },
];

const LINETYPE_PRIORITY = {
  CONTINUOUS: 0,
  DOT: 20,
  DASHED: 30,
  HIDDEN: 32,
  DASHDOT: 40,
  DIVIDE: 45,
  CENTER: 50,
  PHANTOM: 55,
  BORDER: 55,
};

const PREVIEW_LINETYPE_COLORS = {
  CONTINUOUS: "#d92d20",
  DASHED: "#175cd3",
  HIDDEN: "#667085",
  CENTER: "#7a3dd8",
  DOT: "#039855",
  DASHDOT: "#0e9384",
  DIVIDE: "#b54708",
  PHANTOM: "#c11574",
  BORDER: "#875bf7",
};

const LINETYPE_SENSITIVITY_MODES = [
  { value: "safe", shortLabel: "Safe" },
  { value: "balanced", shortLabel: "Bal" },
  { value: "firm", shortLabel: "Firm" },
  { value: "diagnostic", shortLabel: "Diag" },
];

const LINE_OVERLAP_ANGLE_TOLERANCE = 0.9;
const LINE_OVERLAP_OFFSET_TOLERANCE = 0.65;
const PANEL_WIDTH_STORAGE_KEY = "pdfCadPanelWidth";
const CONTROL_GROUP_STORAGE_PREFIX = "pdfCadGroupOpen:";
const PANEL_DEFAULT_WIDTH = 360;
const PANEL_MIN_WIDTH = 300;
const PANEL_MAX_WIDTH = 620;
const BRIDGE_MESSAGE_TYPE = "pdf-cad:bridge";
const BRIDGE_COMMAND_TYPE = "pdf-cad:command";
const BRIDGE_INPUT_EVENT = "pdf-cad-input";
const BRIDGE_OUTPUT_EVENT = "pdf-cad-output";

function localAssetUrl(relativePath) {
  return new URL(relativePath, window.location.href).href;
}

const appShell = document.querySelector("#appShell");
const panelResizeHandle = document.querySelector("#panelResizeHandle");
const pdfDropzone = document.querySelector("#pdfDropzone");
const pdfInput = document.querySelector("#pdfInput");
const fileName = document.querySelector("#fileName");
const pageNumber = document.querySelector("#pageNumber");
const pageTotal = document.querySelector("#pageTotal");
const previousPageButton = document.querySelector("#previousPageButton");
const nextPageButton = document.querySelector("#nextPageButton");
const previousPageButtonTop = document.querySelector("#previousPageButtonTop");
const nextPageButtonTop = document.querySelector("#nextPageButtonTop");
const topPageStatus = document.querySelector("#topPageStatus");
const dpi = document.querySelector("#dpi");
const threshold = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");
const minRun = document.querySelector("#minRun");
const useBasicLinetypes = document.querySelector("#useBasicLinetypes");
const lineTypeSensitivity = document.querySelector("#lineTypeSensitivity");
const colorPreviewByLinetype = document.querySelector("#colorPreviewByLinetype");
const lineTypePreviewFilter = document.querySelector("#lineTypePreviewFilter");
const extractVectorPaths = document.querySelector("#extractVectorPaths");
const detectCircles = document.querySelector("#detectCircles");
const minCircleRadius = document.querySelector("#minCircleRadius");
const maxCircleRadius = document.querySelector("#maxCircleRadius");
const circleSensitivity = document.querySelector("#circleSensitivity");
const deepCircleScan = document.querySelector("#deepCircleScan");
const extractPdfText = document.querySelector("#extractPdfText");
const extractOcrText = document.querySelector("#extractOcrText");
const splitTextChars = document.querySelector("#splitTextChars");
const fitTextWidth = document.querySelector("#fitTextWidth");
const textHeightScale = document.querySelector("#textHeightScale");
const textWidthScale = document.querySelector("#textWidthScale");
const textShiftAlongMm = document.querySelector("#textShiftAlongMm");
const textShiftUpMm = document.querySelector("#textShiftUpMm");
const ocrLang = document.querySelector("#ocrLang");
const ocrMinConfidence = document.querySelector("#ocrMinConfidence");
const mmPerUnit = document.querySelector("#mmPerUnit");
const dxfShiftXMm = document.querySelector("#dxfShiftXMm");
const dxfShiftYMm = document.querySelector("#dxfShiftYMm");
const dimensionScale = document.querySelector("#dimensionScale");
const scaleFactorX = document.querySelector("#scaleFactorX");
const scaleFactorY = document.querySelector("#scaleFactorY");
const scaleChildrenX = document.querySelector("#scaleChildrenX");
const scaleChildrenY = document.querySelector("#scaleChildrenY");
const scaleBreaksX = document.querySelector("#scaleBreaksX");
const scaleBreaksY = document.querySelector("#scaleBreaksY");
const pickScaleBreaksX = document.querySelector("#pickScaleBreaksX");
const pickScaleBreaksY = document.querySelector("#pickScaleBreaksY");
const pickScaleBreaksXTop = document.querySelector("#pickScaleBreaksXTop");
const pickScaleBreaksYTop = document.querySelector("#pickScaleBreaksYTop");
const clearScalePicksTop = document.querySelector("#clearScalePicksTop");
const cancelModeButtonTop = document.querySelector("#cancelModeButtonTop");
const snapScalePick = document.querySelector("#snapScalePick");
const resetScaleCalibration = document.querySelector("#resetScaleCalibration");
const layerName = document.querySelector("#layerName");
const renderButton = document.querySelector("#renderButton");
const downloadButton = document.querySelector("#downloadButton");
const openPdfButtonTop = document.querySelector("#openPdfButtonTop");
const renderButtonTop = document.querySelector("#renderButtonTop");
const downloadButtonTop = document.querySelector("#downloadButtonTop");
const expandGroupsButton = document.querySelector("#expandGroupsButton");
const collapseGroupsButton = document.querySelector("#collapseGroupsButton");
const resetLayoutButton = document.querySelector("#resetLayoutButton");
const pageSize = document.querySelector("#pageSize");
const imageSize = document.querySelector("#imageSize");
const lineCount = document.querySelector("#lineCount");
const circleCount = document.querySelector("#circleCount");
const arcCount = document.querySelector("#arcCount");
const ellipseCount = document.querySelector("#ellipseCount");
const splineCount = document.querySelector("#splineCount");
const textCount = document.querySelector("#textCount");
const lineTypeMode = document.querySelector("#lineTypeMode");
const lineTypePreviewMode = document.querySelector("#lineTypePreviewMode");
const lineTypeModeCompareInline = document.querySelector("#lineTypeModeCompareInline");
const lineTypeModeCompare = document.querySelector("#lineTypeModeCompare");
const lineTypeCount = document.querySelector("#lineTypeCount");
const statusText = document.querySelector("#status");
const topStatus = document.querySelector("#topStatus");
const pdfCanvas = document.querySelector("#pdfCanvas");
const vectorCanvas = document.querySelector("#vectorCanvas");
const viewport = document.querySelector("#viewport");
const emptyState = document.querySelector("#emptyState");
const viewportBusy = document.querySelector("#viewportBusy");
const viewportBusyText = document.querySelector("#viewportBusyText");
const togglePanelButton = document.querySelector("#togglePanelButton");
const focusViewportButton = document.querySelector("#focusViewportButton");
const fitButton = document.querySelector("#fitButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const zoomInButton = document.querySelector("#zoomInButton");
const zoomValue = document.querySelector("#zoomValue");
const zoomResetButton = document.querySelector("#zoomResetButton");
const viewportZoomStatus = document.querySelector("#viewportZoomStatus");
const viewportModeInfo = document.querySelector("#viewportModeInfo");
const viewportRunInfo = document.querySelector("#viewportRunInfo");
const viewportCursorInfo = document.querySelector("#viewportCursorInfo");
const viewportFileInfo = document.querySelector("#viewportFileInfo");
const viewportScaleInfo = document.querySelector("#viewportScaleInfo");
const viewportPageInfo = document.querySelector("#viewportPageInfo");
const viewportImageInfo = document.querySelector("#viewportImageInfo");
const viewportEntityInfo = document.querySelector("#viewportEntityInfo");
const viewportLineTypeInfo = document.querySelector("#viewportLineTypeInfo");
const panModeButton = document.querySelector("#panModeButton");
const toggleDxfCompareButton = document.querySelector("#toggleDxfCompareButton");
const dxfCompareValue = document.querySelector("#dxfCompareValue");
const toggleImageButton = document.querySelector("#toggleImageButton");
const toggleVectorButton = document.querySelector("#toggleVectorButton");

let pdfDocument = null;
let currentFile = null;
let renderedViewport = null;
let currentPageSize = { widthMm: 0, heightMm: 0 };
let tracedLines = [];
let tracedCircles = [];
let tracedArcs = [];
let tracedEllipses = [];
let tracedSplines = [];
let tracedTexts = [];
let lineTypeSourceLines = [];
let lastMinLineRun = 4;
let safeLineTypeMapCache = null;
let lastOcrRejectedCount = 0;
let lastPdfFallbackTextCount = 0;
let lastTextGroupMergedCount = 0;
let lastTextDedupeRemovedCount = 0;
let lastLineOverlapRemoved = 0;
let lastPaperEdgeRemoved = 0;
let zoom = 1;
let panMode = false;
let panelCollapsed = false;
let panelResizeDrag = null;
let spacePanActive = false;
let panDrag = null;
let showDxfCompare = false;
let busy = false;
let analyzeDisabledRequested = true;
let downloadDisabledRequested = true;
let analysisDirty = false;
let overlayRedrawQueued = false;
let scaleCalibration = {
  mode: null,
  points: [],
  hover: null,
  x: null,
  y: null,
};

pdfjsLib.GlobalWorkerOptions.workerSrc = localAssetUrl("./vendor/pdfjs/pdf.worker.min.mjs");
console.info(`PDF CAD build ${APP_BUILD}`);

threshold.addEventListener("input", () => {
  thresholdValue.value = threshold.value;
  markAnalysisStale();
});
lineTypeSensitivity?.addEventListener("input", refreshLineTypesFromSource);
lineTypeSensitivity?.addEventListener("change", refreshLineTypesFromSource);

pdfInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  await loadSelectedPdf(file);
});

pdfDropzone?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.code !== "Space") return;
  event.preventDefault();
  pdfInput.click();
});

previousPageButton?.addEventListener("click", () => movePage(-1));
nextPageButton?.addEventListener("click", () => movePage(1));
previousPageButtonTop?.addEventListener("click", () => movePage(-1));
nextPageButtonTop?.addEventListener("click", () => movePage(1));
pageNumber?.addEventListener("change", () => {
  normalizePageNumber();
  clearAnalysisForPendingPage();
  updatePageControls();
});
pageNumber?.addEventListener("input", updatePageControls);

for (const target of [appShell, pdfDropzone, viewport]) {
  target?.addEventListener("dragenter", handleFileDrag);
  target?.addEventListener("dragover", handleFileDrag);
  target?.addEventListener("dragleave", handleFileDragLeave);
  target?.addEventListener("drop", handleFileDrop);
}

window.addEventListener("dragover", preventFileNavigation);
window.addEventListener("drop", preventFileNavigation);

renderButton.addEventListener("click", analyzeCurrentPage);
openPdfButtonTop?.addEventListener("click", () => pdfInput.click());
renderButtonTop?.addEventListener("click", analyzeCurrentPage);
downloadButton.addEventListener("click", saveCurrentDxf);
downloadButtonTop?.addEventListener("click", saveCurrentDxf);
expandGroupsButton?.addEventListener("click", () => setAllControlGroupsOpen(true));
collapseGroupsButton?.addEventListener("click", () => setAllControlGroupsOpen(false));
resetLayoutButton?.addEventListener("click", resetPanelLayout);

fitButton.addEventListener("click", fitToView);
togglePanelButton?.addEventListener("click", () => togglePanel());
panelResizeHandle?.addEventListener("pointerdown", startPanelResize);
panelResizeHandle?.addEventListener("dblclick", resetPanelWidth);
panelResizeHandle?.addEventListener("keydown", handlePanelResizeKeyDown);
focusViewportButton?.addEventListener("click", focusViewport);
zoomOutButton?.addEventListener("click", () => zoomBy(1 / 1.25));
zoomInButton?.addEventListener("click", () => zoomBy(1.25));
zoomResetButton?.addEventListener("click", () => setZoom(1, viewport.clientWidth / 2, viewport.clientHeight / 2));
panModeButton?.addEventListener("click", () => setPanMode(!panMode));
toggleDxfCompareButton?.addEventListener("click", toggleDxfCompare);
toggleImageButton.addEventListener("click", () => toggleCanvas(pdfCanvas, toggleImageButton));
toggleVectorButton.addEventListener("click", () => toggleCanvas(vectorCanvas, toggleVectorButton));
pickScaleBreaksX?.addEventListener("click", () => startScaleBreakPick("x"));
pickScaleBreaksY?.addEventListener("click", () => startScaleBreakPick("y"));
pickScaleBreaksXTop?.addEventListener("click", () => startScaleBreakPick("x"));
pickScaleBreaksYTop?.addEventListener("click", () => startScaleBreakPick("y"));
clearScalePicksTop?.addEventListener("click", resetScalePick);
cancelModeButtonTop?.addEventListener("click", cancelActiveMode);
resetScaleCalibration?.addEventListener("click", resetScalePick);
snapScalePick?.addEventListener("change", drawVectorOverlay);
registerAnalysisStaleControls();
registerOutputPreviewControls();
viewport.addEventListener("click", handleScalePickClick);
pdfCanvas.addEventListener("click", handleScalePickClick);
vectorCanvas.addEventListener("click", handleScalePickClick);
viewport.addEventListener("pointerdown", handlePanPointerDown);
viewport.addEventListener("pointermove", handlePanPointerMove);
viewport.addEventListener("pointerup", endPanDrag);
viewport.addEventListener("pointercancel", endPanDrag);
viewport.addEventListener("pointermove", handleScalePickMove);
viewport.addEventListener("pointermove", updateViewportCursor);
viewport.addEventListener("pointerleave", clearScalePickHover);
viewport.addEventListener("pointerleave", clearViewportCursor);
viewport.addEventListener("wheel", handleZoomWheel, { passive: false });
viewport.addEventListener("contextmenu", handleViewportContextMenu);
window.addEventListener("resize", () => {
  setPanelWidth(getPanelWidth(), false);
  if (renderedViewport) fitToView();
});
window.addEventListener("pointermove", handlePanelResizeMove);
window.addEventListener("pointerup", endPanelResize);
window.addEventListener("pointercancel", endPanelResize);
window.addEventListener("keydown", handleViewportKeyDown);
window.addEventListener("keyup", handleViewportKeyUp);
applyStoredPanelWidth();
initializeControlGroups();
updateScaleCalibrationUi();
updateZoomUi();
updatePanUi();
updateViewportSummary();
updateFileInfo();
setRunInfo();
updatePageControls();
updatePickButtons();
updateViewButtons();
setAnalyzeDisabled(true);
initializeBridgeApi();
setStatus(`Select a PDF / build ${APP_BUILD}`);
emitBridgeEvent("ready");
loadSampleFromQuery();

async function loadSelectedPdf(file) {
  if (busy) {
    setStatus("Wait for the current operation to finish.");
    return;
  }
  if (!isPdfFile(file)) {
    setStatus("Drop a PDF file", true);
    return;
  }
  currentFile = file;
  fileName.textContent = file.name;
  updateFileInfo();
  await loadPdf(file);
}

async function analyzeCurrentPage() {
  if (busy) return;
  if (!pdfDocument) {
    setStatus("Select a PDF");
    return;
  }
  await renderAndTrace();
}

function saveCurrentDxf() {
  if (busy) return;
  if ((!tracedLines.length && !tracedCircles.length && !tracedArcs.length && !tracedEllipses.length && !tracedSplines.length && !tracedTexts.length) || !renderedViewport) return;
  downloadDxf();
}

function movePage(delta) {
  if (!pdfDocument || busy) return;
  const current = normalizePageNumber();
  const next = clamp(current + delta, 1, pdfDocument.numPages);
  if (next === current) return;
  pageNumber.value = String(next);
  clearAnalysisForPendingPage();
  updatePageControls();
}

function normalizePageNumber() {
  const maxPage = pdfDocument?.numPages || 1;
  const value = clamp(Number(pageNumber?.value), 1, maxPage);
  if (pageNumber) pageNumber.value = String(value);
  return value;
}

function updatePageControls() {
  const hasPdf = Boolean(pdfDocument);
  const maxPage = pdfDocument?.numPages || 0;
  const current = hasPdf ? clamp(Number(pageNumber?.value), 1, maxPage) : 1;
  const pageLocked = busy || !hasPdf;
  if (pageNumber) pageNumber.disabled = pageLocked;
  if (previousPageButton) previousPageButton.disabled = pageLocked || current <= 1;
  if (nextPageButton) nextPageButton.disabled = pageLocked || current >= maxPage;
  if (previousPageButtonTop) previousPageButtonTop.disabled = pageLocked || current <= 1;
  if (nextPageButtonTop) nextPageButtonTop.disabled = pageLocked || current >= maxPage;
  setText(topPageStatus, hasPdf ? `Page ${current} / ${maxPage}` : "Page - / -");
}

function clearAnalysisForPendingPage() {
  if (!pdfDocument) return;
  analysisDirty = true;
  setRunInfo();
  clearTracedEntities();
  currentPageSize = { widthMm: 0, heightMm: 0 };
  renderedViewport = null;
  clearScaleCalibration();
  clearPreview("Ready to analyze");
  updateCounts();
  setDownloadDisabled(true);
  updatePickButtons();
  updateViewButtons();
  updateModeUi();
  setStatus("Loaded. Click Analyze.");
}

function clearTracedEntities() {
  tracedLines = [];
  tracedCircles = [];
  tracedArcs = [];
  tracedEllipses = [];
  tracedSplines = [];
  tracedTexts = [];
  lineTypeSourceLines = [];
  safeLineTypeMapCache = null;
  lastOcrRejectedCount = 0;
  lastPdfFallbackTextCount = 0;
  lastTextGroupMergedCount = 0;
  lastTextDedupeRemovedCount = 0;
  lastLineOverlapRemoved = 0;
  lastPaperEdgeRemoved = 0;
}

function markAnalysisStale() {
  if (!pdfDocument || !renderedViewport) return;
  analysisDirty = true;
  setRunInfo("Stale", "Settings changed after the last analysis");
  clearTracedEntities();
  drawVectorOverlay();
  updateCounts();
  setDownloadDisabled(true);
  updatePickButtons();
  updateViewButtons();
  updateModeUi();
  setStatus("Settings changed. Click Analyze again.");
}

function registerAnalysisStaleControls() {
  for (const control of [
    dpi,
    minRun,
    useBasicLinetypes,
    extractVectorPaths,
    detectCircles,
    minCircleRadius,
    maxCircleRadius,
    circleSensitivity,
    deepCircleScan,
    extractPdfText,
    extractOcrText,
    ocrLang,
    ocrMinConfidence,
  ]) {
    control?.addEventListener("input", markAnalysisStale);
    control?.addEventListener("change", markAnalysisStale);
  }
}

function registerOutputPreviewControls() {
  for (const control of [
    mmPerUnit,
    dimensionScale,
    scaleChildrenX,
    scaleChildrenY,
    textHeightScale,
    textWidthScale,
    textShiftAlongMm,
    textShiftUpMm,
    dxfShiftXMm,
    dxfShiftYMm,
    splitTextChars,
    fitTextWidth,
    colorPreviewByLinetype,
    lineTypePreviewFilter,
  ]) {
    control?.addEventListener("input", refreshOutputPreview);
    control?.addEventListener("change", refreshOutputPreview);
  }
}

function refreshOutputPreview() {
  updateScaleCalibrationUi();
  updatePickButtons();
  updateViewButtons();
  updateCounts();
  if (!renderedViewport) return;
  refreshPageSizeDisplay();
  drawVectorOverlay();
}

function refreshLineTypesFromSource() {
  if (busy || !pdfDocument || !renderedViewport) {
    updateCounts();
    return;
  }
  if (!lineTypeSourceLines.length) {
    updateCounts();
    drawVectorOverlay();
    return;
  }
  rebuildTracedLinesFromSource();
  updateCounts();
  drawVectorOverlay();
  updateViewButtons();
  updateModeUi();
  setDownloadDisabled(!hasTraceEntities());
  analysisDirty = false;
  setRunInfo("Line Types", `Line types refreshed with ${lineTypeModeLabel()}`);
  setStatus(hasTraceEntities()
    ? `DXF ready / build ${APP_BUILD}${analysisCleanupText()}`
    : `No lines, circles, or text detected / build ${APP_BUILD}`, !hasTraceEntities());
}

function preventFileNavigation(event) {
  if (!eventHasFiles(event)) return;
  event.preventDefault();
  if (event.type === "drop") {
    setDropActive(false);
  }
}

function handleFileDrag(event) {
  if (!eventHasFiles(event)) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "copy";
  setDropActive(true);
}

function handleFileDragLeave(event) {
  if (!eventHasFiles(event)) return;
  event.stopPropagation();
  if (event.currentTarget?.contains?.(event.relatedTarget)) return;
  setDropActive(false);
}

async function handleFileDrop(event) {
  if (!eventHasFiles(event)) return;
  event.preventDefault();
  event.stopPropagation();
  setDropActive(false);
  if (busy) {
    setStatus("Wait for the current operation to finish.");
    return;
  }
  const file = Array.from(event.dataTransfer?.files || []).find(isPdfFile);
  if (!file) {
    setStatus("Drop a PDF file", true);
    return;
  }
  await loadSelectedPdf(file);
}

function eventHasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function isPdfFile(file) {
  return Boolean(file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")));
}

function setDropActive(active) {
  appShell?.classList.toggle("drag-over", active);
  pdfDropzone?.classList.toggle("drag-over", active);
  viewport?.classList.toggle("drag-over", active);
}

async function loadPdf(file) {
  try {
    setBusy(true, "Loading PDF...");
    setStatus("Loading PDF...");
    setAnalyzeDisabled(true);
    setDownloadDisabled(true);
    analysisDirty = false;
    setRunInfo();
    clearTracedEntities();
    currentPageSize = { widthMm: 0, heightMm: 0 };
    renderedViewport = null;
    clearScaleCalibration();
    clearPreview("Ready to analyze");
    updateCounts();
    drawVectorOverlay();

    const buffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(buffer);
    pdfDocument = await pdfjsLib.getDocument({
      data: pdfData,
      disableWorker: Boolean(window.__APP_OUTPUT_BRIDGE_EMBEDDED__),
    }).promise;
    pageNumber.max = String(pdfDocument.numPages);
    pageNumber.value = "1";
    pageTotal.textContent = `/ ${pdfDocument.numPages}`;
    updatePageControls();
    setAnalyzeDisabled(false);
    analysisDirty = true;
    updatePickButtons();
    updateViewButtons();
    setStatus("Loaded. Click Analyze.");
    emitBridgeEvent("pdf-loaded", {
      fileName: currentFile?.name || "",
      pageCount: pdfDocument.numPages,
    });
  } catch (error) {
    console.error(error);
    pdfDocument = null;
    analysisDirty = false;
    setRunInfo();
    pageNumber.max = "1";
    pageNumber.value = "1";
    pageTotal.textContent = "/ 0";
    updatePageControls();
    setAnalyzeDisabled(true);
    updatePickButtons();
    updateViewButtons();
    setStatus(`Could not load the PDF: ${error?.message || error}`, true);
    emitBridgeEvent("error", {
      operation: "load-pdf",
      message: error?.message || String(error),
    });
  } finally {
    setBusy(false);
  }
}

async function loadSampleFromQuery() {
  const params = new URLSearchParams(window.__APP_OUTPUT_BRIDGE_PARENT_SEARCH__ || window.location.search);
  const sample = params.get("sample");
  if (!sample) return;
  await loadSamplePdf(sample);
}

async function loadSamplePdf(sample) {
  try {
    const baseHref = window.__APP_OUTPUT_BRIDGE_PARENT_HREF__ || window.location.href;
    const url = new URL(sample, baseHref);
    if (!window.__APP_OUTPUT_BRIDGE_EMBEDDED__ && url.origin !== window.location.origin) {
      throw new Error("same-origin sample only");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const name = decodeURIComponent(url.pathname.split("/").pop() || "sample.pdf");
    currentFile = { name, arrayBuffer: async () => buffer };
    fileName.textContent = name;
    updateFileInfo();
    await loadPdf(currentFile);
    emitBridgeEvent("sample-loaded", { sample, fileName: name });
  } catch (error) {
    console.error(error);
    setStatus(`Could not load sample PDF: ${error?.message || error}`, true);
    emitBridgeEvent("error", {
      operation: "load-sample",
      message: error?.message || String(error),
    });
  }
}

function initializeBridgeApi() {
  if (window.__PDF_CAD_BRIDGE_INITIALIZED__) return;
  window.__PDF_CAD_BRIDGE_INITIALIZED__ = true;

  window.PdfCadBridge = {
    build: APP_BUILD,
    getState: getBridgeState,
    loadPdfData: (payload) => loadBridgePdfData(payload),
    loadSample: (sample) => loadSamplePdf(sample),
    analyze: () => analyzeCurrentPage(),
    exportDxf: () => exportCurrentDxfPayload(),
    downloadDxf: () => {
      saveCurrentDxf();
      return getBridgeState();
    },
    setOptions: (options) => applyBridgeOptions(options),
    runCommand: (command, payload) => runBridgeCommand(command, payload),
  };

  window.addEventListener("message", handleBridgeMessage);
  window.addEventListener(BRIDGE_INPUT_EVENT, (event) => {
    const detail = event.detail || {};
    void runBridgeCommand(detail.command, detail.payload || {})
      .then((result) => emitBridgeEvent("command-complete", {
        requestId: detail.requestId || "",
        command: detail.command || "",
        result,
      }))
      .catch((error) => emitBridgeEvent("command-error", {
        requestId: detail.requestId || "",
        command: detail.command || "",
        message: error?.message || String(error),
      }));
  });
}

async function handleBridgeMessage(event) {
  const data = event.data || {};
  if (!data || data.type !== BRIDGE_COMMAND_TYPE) return;
  const requestId = data.requestId || "";
  const command = data.command || "";
  try {
    const result = await runBridgeCommand(command, data.payload || {});
    postBridgeResponse(event.source, {
      requestId,
      command,
      ok: true,
      result,
    });
  } catch (error) {
    postBridgeResponse(event.source, {
      requestId,
      command,
      ok: false,
      error: error?.message || String(error),
    });
    emitBridgeEvent("command-error", {
      requestId,
      command,
      message: error?.message || String(error),
    });
  }
}

async function runBridgeCommand(command, payload = {}) {
  const normalized = normalizeBridgeCommand(command);
  if (!normalized) throw new Error("Bridge command is required.");
  switch (normalized) {
    case "get-state":
      return getBridgeState();
    case "load-pdf":
      await loadBridgePdfData(payload);
      return getBridgeState();
    case "load-sample":
      if (!(payload.sample || payload.url)) {
        throw new Error("sample is required");
      }
      await loadSamplePdf(payload.sample || payload.url);
      return getBridgeState();
    case "set-options":
      return applyBridgeOptions(payload.options || payload);
    case "analyze":
      await analyzeCurrentPage();
      return getBridgeState();
    case "export-dxf":
      return exportCurrentDxfPayload(payload);
    case "download-dxf":
      saveCurrentDxf();
      return getBridgeState();
    case "fit":
      fitToView();
      return getBridgeState();
    default:
      throw new Error(`Unknown bridge command: ${command}`);
  }
}

function normalizeBridgeCommand(command) {
  const value = String(command || "").trim();
  const aliases = {
    getState: "get-state",
    loadPdf: "load-pdf",
    loadPdfData: "load-pdf",
    loadSample: "load-sample",
    setOptions: "set-options",
    exportDxf: "export-dxf",
    downloadDxf: "download-dxf",
  };
  return aliases[value] || value;
}

async function loadBridgePdfData(payload = {}) {
  if (payload.url) {
    const response = await fetch(payload.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const name = payload.name || decodeURIComponent(new URL(payload.url, window.location.href).pathname.split("/").pop() || "bridge.pdf");
    await loadSelectedPdf(fileLikeFromArrayBuffer(name, buffer));
    return;
  }

  let buffer = payload.arrayBuffer || null;
  if (!buffer && payload.base64) buffer = base64ToArrayBuffer(payload.base64);
  if (!buffer && payload.bytes) buffer = new Uint8Array(payload.bytes).buffer;
  if (!buffer) throw new Error("load-pdf requires url, base64, bytes, or arrayBuffer.");
  await loadSelectedPdf(fileLikeFromArrayBuffer(payload.name || "bridge.pdf", buffer));
}

function fileLikeFromArrayBuffer(name, buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return {
    name,
    type: "application/pdf",
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function base64ToArrayBuffer(base64) {
  const binary = atob(String(base64).replace(/^data:application\/pdf;base64,/, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function exportCurrentDxfPayload(payload = {}) {
  const { dxf, fileName, layerName: outputLayerName } = buildCurrentDxfDocument();
  const result = {
    fileName,
    layerName: outputLayerName,
    dxf: payload.includeText === false ? "" : dxf,
    dxfBase64: textToBase64(dxf),
    bytes: new TextEncoder().encode(dxf).length,
    counts: bridgeEntityCounts(),
    state: getBridgeState(),
  };
  emitBridgeEvent("dxf-exported", {
    fileName,
    bytes: result.bytes,
    counts: result.counts,
  });
  return result;
}

function textToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function applyBridgeOptions(options = {}) {
  for (const [id, value] of Object.entries(options || {})) {
    const control = document.getElementById(id);
    if (!control) continue;
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = Boolean(value);
    } else if ("value" in control) {
      control.value = String(value);
    }
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  emitBridgeEvent("options-applied", { options });
  return getBridgeState();
}

function emitBridgeEvent(event, detail = {}) {
  const message = {
    type: BRIDGE_MESSAGE_TYPE,
    event,
    build: APP_BUILD,
    timestamp: new Date().toISOString(),
    detail,
    state: getBridgeState(),
  };
  window.dispatchEvent(new CustomEvent(BRIDGE_OUTPUT_EVENT, { detail: message }));
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, "*");
    }
  } catch (_error) {
    // Standalone preview has no parent listener.
  }
}

function postBridgeResponse(target, response) {
  const message = {
    type: `${BRIDGE_MESSAGE_TYPE}:response`,
    build: APP_BUILD,
    timestamp: new Date().toISOString(),
    ...response,
    state: getBridgeState(),
  };
  try {
    (target || window.parent)?.postMessage(message, "*");
  } catch (_error) {
    // Some standalone/browser contexts do not expose a reply target.
  }
  window.dispatchEvent(new CustomEvent(BRIDGE_OUTPUT_EVENT, { detail: message }));
}

function getBridgeState() {
  return {
    build: APP_BUILD,
    embedded: Boolean(window.__APP_OUTPUT_BRIDGE_EMBEDDED__),
    busy,
    status: statusText?.textContent || "",
    file: {
      name: currentFile?.name || "",
      size: currentFile?.size || 0,
    },
    page: bridgePageState(),
    preview: {
      hasCanvas: hasPreviewCanvas(),
      zoom,
      analysisDirty,
      dxfReady: Boolean(renderedViewport && hasTraceEntities() && !analysisDirty),
    },
    counts: bridgeEntityCounts(),
    output: {
      layerName: layerName?.value || "PDF_TRACE",
      dimensionScale: getDimensionScaleDenominator(),
      mmPerUnit: safeNumber(mmPerUnit?.value, 0.352778),
    },
  };
}

function bridgePageState() {
  return {
    current: pdfDocument ? clamp(Number(pageNumber?.value), 1, pdfDocument.numPages) : 0,
    total: pdfDocument?.numPages || 0,
    widthMm: currentPageSize.widthMm || 0,
    heightMm: currentPageSize.heightMm || 0,
    imageWidth: pdfCanvas?.width || 0,
    imageHeight: pdfCanvas?.height || 0,
  };
}

function bridgeEntityCounts() {
  return {
    lines: tracedLines.length,
    circles: tracedCircles.length,
    arcs: tracedArcs.length,
    ellipses: tracedEllipses.length,
    splines: tracedSplines.length,
    text: tracedTexts.length,
  };
}

async function renderAndTrace() {
  try {
    setBusy(true, "Analyzing page...");
    setStatus("Analyzing page...");
    setAnalyzeDisabled(true);
    setDownloadDisabled(true);

    const pageIndex = clamp(Number(pageNumber?.value), 1, pdfDocument.numPages);
    pageNumber.value = String(pageIndex);
    const page = await pdfDocument.getPage(pageIndex);
    const scale = safeNumber(dpi?.value, 200) / 72;
    renderedViewport = page.getViewport({ scale });

    pdfCanvas.width = Math.ceil(renderedViewport.width);
    pdfCanvas.height = Math.ceil(renderedViewport.height);
    vectorCanvas.width = pdfCanvas.width;
    vectorCanvas.height = pdfCanvas.height;
    emptyState.style.display = "none";
    pdfCanvas.style.width = `${pdfCanvas.width}px`;
    pdfCanvas.style.height = `${pdfCanvas.height}px`;
    vectorCanvas.style.width = `${vectorCanvas.width}px`;
    vectorCanvas.style.height = `${vectorCanvas.height}px`;

    const ctx = pdfCanvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    await page.render({ canvasContext: ctx, viewport: renderedViewport }).promise;

    const imageData = ctx.getImageData(0, 0, pdfCanvas.width, pdfCanvas.height);
    const minLineRun = safeNumber(minRun?.value, 4);
    const vectorEntities = isChecked(extractVectorPaths) ? await safeExtractVectorEntities(page) : emptyVectorEntities();
    const vectorLines = tagLines(vectorEntities.lines, "vector");
    const rasterLines = traceImageToLines(imageData, safeNumber(threshold?.value, 150), minLineRun);
    if (vectorEntities.lines.length || vectorEntities.circles.length || vectorEntities.arcs.length || vectorEntities.ellipses.length || vectorEntities.splines.length) {
      lineTypeSourceLines = cloneLines(vectorLines.length >= Math.max(8, rasterLines.length * 0.08)
        ? vectorLines
        : mergeSupplementalLines(vectorLines, rasterLines));
      tracedCircles = vectorEntities.circles;
      tracedArcs = vectorEntities.arcs;
      tracedEllipses = vectorEntities.ellipses;
      tracedSplines = vectorEntities.splines;
    } else {
      lineTypeSourceLines = cloneLines(rasterLines);
      tracedCircles = isChecked(detectCircles)
        ? traceImageToCircles(imageData, safeNumber(threshold?.value, 150), safeNumber(minCircleRadius?.value, 8), safeNumber(maxCircleRadius?.value, 50), safeNumber(circleSensitivity?.value, 45), isChecked(deepCircleScan))
        : [];
      tracedArcs = [];
      tracedEllipses = [];
      tracedSplines = [];
    }
    safeLineTypeMapCache = null;
    lastMinLineRun = minLineRun;
    rebuildTracedLinesFromSource();
    if (isChecked(useBasicLinetypes) || tracedArcs.some((arc) => (arc.linetype || "CONTINUOUS") !== "CONTINUOUS")) {
      const mergedCurves = mergeArcFragmentsToBasicLinetypes(tracedArcs);
      tracedCircles = mergeCircleCandidates([...tracedCircles, ...mergedCurves.circles]);
      tracedArcs = mergedCurves.arcs;
    }
    tracedTexts = [];

    if (isChecked(extractPdfText)) {
      setStatus("Extracting embedded PDF text...");
      const pdfTexts = await extractTextFromPdf(page);
      tracedTexts.push(...pdfTexts);
    }

    if (isChecked(extractOcrText)) {
      setStatus("Running OCR on image text... First run can take a while.");
      tracedTexts.push(...await extractTextWithOcr(tracedTexts));
    }

    const beforeTextGroupCount = tracedTexts.length;
    tracedTexts = groupAdjacentTextRuns(tracedTexts);
    lastTextGroupMergedCount = Math.max(0, beforeTextGroupCount - tracedTexts.length);
    const beforeTextDedupeCount = tracedTexts.length;
    tracedTexts = dedupeTexts(tracedTexts);
    lastTextDedupeRemovedCount = Math.max(0, beforeTextDedupeCount - tracedTexts.length);
    updateCounts();
    updateSizes(page);
    drawVectorOverlay();
    fitToView();
    focusViewport();

    const hasEntities = tracedLines.length > 0 || tracedCircles.length > 0 || tracedArcs.length > 0 || tracedEllipses.length > 0 || tracedSplines.length > 0 || tracedTexts.length > 0;
    updatePageControls();
    setDownloadDisabled(!hasEntities);
    analysisDirty = false;
    const runTime = formatRunTime(new Date());
    setRunInfo(runTime, `Analyzed ${runTime}`);
    updateViewButtons();
    updateModeUi();
    setStatus(hasEntities ? `DXF ready / build ${APP_BUILD}${analysisCleanupText()}` : `No lines, circles, or text detected / build ${APP_BUILD}`, !hasEntities);
    emitBridgeEvent("analysis-complete", {
      hasEntities,
      counts: bridgeEntityCounts(),
      page: bridgePageState(),
    });
  } catch (error) {
    console.error(error);
    analysisDirty = true;
    setRunInfo("Failed", `Analysis failed: ${error?.message || error}`);
    updateViewButtons();
    setStatus(`Analysis failed: ${error?.message || error}`, true);
    emitBridgeEvent("error", {
      operation: "analyze",
      message: error?.message || String(error),
    });
  } finally {
    setAnalyzeDisabled(false);
    setBusy(false);
  }
}

function traceImageToLines(imageData, limit, minLength) {
  const { width, height, data } = imageData;
  const dark = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] / 255;
      const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) * alpha + 255 * (1 - alpha);
      dark[y * width + x] = gray < limit ? 1 : 0;
    }
  }

  const lines = [];
  collectRuns(dark, width, height, minLength, lines, true);
  collectRuns(dark, width, height, minLength, lines, false);
  return tagLines(mergeCollinear(lines), "raster");
}

function tagLines(lines, source) {
  return (Array.isArray(lines) ? lines : []).map((line) => ({
    ...line,
    source,
    linetype: normalizeDxfLinetype(line.linetype),
  }));
}

function cloneLines(lines) {
  return (Array.isArray(lines) ? lines : []).map((line) => ({ ...line }));
}

function rebuildTracedLinesFromSource() {
  let lines = processedLinesForSensitivity(lineTypeSensitivity?.value || "balanced");
  const beforeLineOverlapCleanup = lines.length;
  const overlapCleanedLines = cleanupOverlappingLines(lines);
  tracedLines = removePaperEdgeLines(overlapCleanedLines);
  lastLineOverlapRemoved = Math.max(0, beforeLineOverlapCleanup - overlapCleanedLines.length);
  lastPaperEdgeRemoved = removePaperEdgeLines.lastRemoved || 0;
}

function processedLinesForSensitivity(sensitivity) {
  let lines = cloneLines(lineTypeSourceLines);
  if (isChecked(useBasicLinetypes)) {
    lines = applyBasicLinetypesToRasterLines(lines, lastMinLineRun, sensitivity);
  }
  return lines;
}

function applyBasicLinetypesToRasterLines(lines, minLength, sensitivity = lineTypeSensitivity?.value || "balanced") {
  const vectorLines = lines.filter((line) => line.source === "vector");
  const rasterLines = lines.filter((line) => line.source !== "vector");
  const mergedVectorLines = mergeLinesPreservingExistingLinetypes(vectorLines, minLength, sensitivity);
  if (!rasterLines.length) return mergedVectorLines;
  return [
    ...mergedVectorLines,
    ...tagLines(mergeLineFragmentsToBasicLinetypes(rasterLines, minLength), "raster"),
  ];
}

function mergeLinesPreservingExistingLinetypes(lines, minLength, sensitivity = lineTypeSensitivity?.value || "balanced") {
  if (!lines.length) return [];
  const profile = vectorLinetypeSensitivityProfile(sensitivity);
  const byType = new Map();
  for (const line of lines) {
    const linetype = normalizeDxfLinetype(line.linetype);
    if (!byType.has(linetype)) byType.set(linetype, []);
    byType.get(linetype).push({ ...line, linetype });
  }

  const merged = [];
  for (const [linetype, typedLines] of byType) {
    const groups = groupLinesByAxis(typedLines, {
      angleBucketSize: profile.angleBucketSize,
      offsetBucketSize: profile.offsetBucketSize,
    });
    for (const group of groups.values()) {
      group.sort((a, b) => a.start - b.start);
      const chunks = splitProjectedChunks(group, minLength, profile.maxChunkGap);
      for (const chunk of chunks) {
        const inferred = linetype === "CONTINUOUS" ? classifyVectorFragmentLinetype(chunk, sensitivity) : linetype;
        const spanLine = projectedSpanLine(chunk, inferred);
        spanLine.linetypeSource = chunk.length >= 2 ? "one-line-gap" : "source";
        merged.push({ ...spanLine, source: "vector" });
      }
    }
  }
  return merged;
}

function vectorLinetypeSensitivityProfile(value = lineTypeSensitivity?.value || "balanced") {
  if (value === "diagnostic") {
    return {
      minChunk: 2,
      minGapCount: 1,
      gapCoverage: 0.12,
      minGapRatio: 0.015,
      maxGapRatio: 0.9,
      maxLenMedian: 30,
      maxLenRatio: 50,
      dashedLengthVariation: 3,
      dashedGapVariation: 3,
      minGapToLen: 0.04,
      dotMinChunk: 3,
      dotGapVariation: 2.5,
      complexMinChunk: 3,
      complexLengthVariation: 3,
      complexGapVariation: 3,
      complexGapRatio: 0.03,
      angleBucketSize: 6,
      offsetBucketSize: 10,
      maxChunkGap: 260,
    };
  }
  if (value === "firm") {
    return {
      minChunk: 3,
      minGapCount: 2,
      gapCoverage: 0.3,
      minGapRatio: 0.036,
      maxGapRatio: 0.8,
      maxLenMedian: 9,
      maxLenRatio: 16,
      dashedLengthVariation: 1.6,
      dashedGapVariation: 1.62,
      minGapToLen: 0.1,
      dotMinChunk: 5,
      dotGapVariation: 1.12,
      complexMinChunk: 7,
      complexLengthVariation: 1.05,
      complexGapVariation: 1.05,
      complexGapRatio: 0.1,
      angleBucketSize: 4.2,
      offsetBucketSize: 6.5,
      maxChunkGap: 170,
      looseDashed: true,
      looseMinChunk: 2,
      looseMinSpan: 70,
      looseGapCoverage: 0.34,
      looseMinGapRatio: 0.034,
      looseMaxGapRatio: 0.82,
      looseMaxLenMedian: 11,
      looseMaxLenRatio: 20,
      looseLengthVariation: 1.68,
      looseGapVariation: 1.58,
      looseMinGapToLen: 0.09,
      regularGapDashed: true,
      regularGapMinCount: 1,
      regularGapMinSpan: 120,
      regularGapMinRatio: 0.004,
      regularGapMaxRatio: 0.16,
      regularGapMaxMedian: 18,
      regularGapVariation: 0.9,
    };
  }
  if (value === "safe") {
    return {
      minChunk: 3,
      minGapCount: 2,
      gapCoverage: 0.42,
      minGapRatio: 0.04,
      maxGapRatio: 0.78,
      maxLenMedian: 7,
      maxLenRatio: 12,
      dashedLengthVariation: 1.35,
      dashedGapVariation: 1.4,
      minGapToLen: 0.12,
      dotMinChunk: 4,
      dotGapVariation: 1.25,
      complexMinChunk: 5,
      complexLengthVariation: 1.4,
      complexGapVariation: 1.35,
      complexGapRatio: 0.08,
      angleBucketSize: 4,
      offsetBucketSize: 6,
      maxChunkGap: 140,
    };
  }
  return {
    minChunk: 5,
    minGapCount: 4,
    gapCoverage: 0.66,
    minGapRatio: 0.11,
    maxGapRatio: 0.66,
    maxLenMedian: 3.9,
    maxLenRatio: 6.8,
    dashedLengthVariation: 0.62,
    dashedGapVariation: 0.72,
    minGapToLen: 0.27,
    dotMinChunk: 6,
    dotGapVariation: 0.72,
    complexMinChunk: 7,
    complexLengthVariation: 0.85,
    complexGapVariation: 0.82,
    complexGapRatio: 0.16,
    angleBucketSize: 2.5,
    offsetBucketSize: 2.5,
    maxChunkGap: 48,
  };
}

function classifyVectorFragmentLinetype(chunk, sensitivity = lineTypeSensitivity?.value || "balanced") {
  const profile = vectorLinetypeSensitivityProfile(sensitivity);
  const lengths = chunk.map((line) => line.length);
  const gaps = [];
  for (let i = 1; i < chunk.length; i += 1) {
    gaps.push(chunk[i].start - chunk[i - 1].end);
  }
  const positiveGaps = gaps.filter((gap) => gap > 1);
  const spanStart = Math.min(...chunk.map((line) => line.start));
  const spanEnd = Math.max(...chunk.map((line) => line.end));
  const span = Math.max(1, spanEnd - spanStart);
  const regularGapDashed = classifyOneLineGapDashed(chunk, lengths, positiveGaps, span, profile);
  if (regularGapDashed !== "CONTINUOUS") return regularGapDashed;
  const looseDashed = () => classifyLooseVectorDashed(lengths, positiveGaps, span, profile);
  if (chunk.length < profile.minChunk) return looseDashed();
  const requiredGapCount = Math.max(profile.minGapCount, Math.ceil((chunk.length - 1) * profile.gapCoverage));
  if (positiveGaps.length < requiredGapCount) return looseDashed();

  const gapRatio = positiveGaps.reduce((sum, gap) => sum + gap, 0) / span;
  if (gapRatio < profile.minGapRatio || gapRatio > profile.maxGapRatio) return looseDashed();

  const medianLen = median(lengths);
  const medianGap = median(positiveGaps);
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  if (medianLen < 1 || medianGap < 1) return "CONTINUOUS";
  if (maxLen > medianLen * profile.maxLenMedian) return looseDashed();
  if (maxLen / Math.max(1, minLen) > profile.maxLenRatio) return looseDashed();

  const linetype = classifyPatternLengths(lengths, positiveGaps);
  if (linetype === "CONTINUOUS") return looseDashed();

  const lengthVariation = coefficientOfVariation(lengths);
  const gapVariation = coefficientOfVariation(positiveGaps);
  if (linetype === "DASHED" || linetype === "HIDDEN") {
    if (lengthVariation > profile.dashedLengthVariation || gapVariation > profile.dashedGapVariation) return looseDashed();
    if (medianGap < medianLen * profile.minGapToLen) return looseDashed();
    return linetype;
  }
  if (linetype === "DOT") {
    if (chunk.length < profile.dotMinChunk || gapVariation > profile.dotGapVariation) return "CONTINUOUS";
    if (medianLen > medianGap * 0.8) return "CONTINUOUS";
    return linetype;
  }
  if (
    chunk.length < profile.complexMinChunk ||
    lengthVariation > profile.complexLengthVariation ||
    gapVariation > profile.complexGapVariation ||
    gapRatio < profile.complexGapRatio
  ) {
    return looseDashed();
  }
  return linetype;
}

function classifyOneLineGapDashed(chunk, lengths, positiveGaps, span, profile) {
  if (!profile.regularGapDashed || chunk.length < 2) return "CONTINUOUS";
  return classifyRegularGapDashed(lengths, positiveGaps, span, profile);
}

function classifyRegularGapDashed(lengths, positiveGaps, span, profile) {
  if (!profile.regularGapDashed) return "CONTINUOUS";
  if (span < (profile.regularGapMinSpan || 1)) return "CONTINUOUS";
  if (positiveGaps.length < (profile.regularGapMinCount || 2)) return "CONTINUOUS";
  const medianGap = median(positiveGaps);
  if (medianGap < 1 || medianGap > (profile.regularGapMaxMedian || 14)) return "CONTINUOUS";
  if (coefficientOfVariation(positiveGaps) > (profile.regularGapVariation || 0.75)) return "CONTINUOUS";
  const gapRatio = positiveGaps.reduce((sum, gap) => sum + gap, 0) / Math.max(1, span);
  if (gapRatio < (profile.regularGapMinRatio || 0.004) || gapRatio > (profile.regularGapMaxRatio || 0.16)) return "CONTINUOUS";
  const longSegments = lengths.filter((length) => length >= medianGap * 4).length;
  if (longSegments < Math.max(2, Math.ceil(lengths.length * 0.45))) return "CONTINUOUS";
  return "DASHED";
}

function classifyLooseVectorDashed(lengths, positiveGaps, span, profile) {
  const minChunk = profile.looseMinChunk || 3;
  if (!profile.looseDashed || lengths.length < minChunk) return "CONTINUOUS";
  if (span < (profile.looseMinSpan || 1)) return "CONTINUOUS";
  const requiredGaps = Math.max(minChunk <= 2 ? 1 : 2, Math.ceil((lengths.length - 1) * (profile.looseGapCoverage || 0.2)));
  if (positiveGaps.length < requiredGaps) return "CONTINUOUS";
  const gapRatio = positiveGaps.reduce((sum, gap) => sum + gap, 0) / Math.max(1, span);
  if (gapRatio < (profile.looseMinGapRatio || profile.minGapRatio) || gapRatio > (profile.looseMaxGapRatio || profile.maxGapRatio)) {
    return "CONTINUOUS";
  }
  const medianLen = median(lengths);
  const medianGap = median(positiveGaps);
  if (medianLen < 1 || medianGap < 1) return "CONTINUOUS";
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  if (maxLen > medianLen * (profile.looseMaxLenMedian || profile.maxLenMedian)) return "CONTINUOUS";
  if (maxLen / Math.max(1, minLen) > (profile.looseMaxLenRatio || profile.maxLenRatio)) return "CONTINUOUS";
  if (medianGap < medianLen * (profile.looseMinGapToLen || profile.minGapToLen)) return "CONTINUOUS";
  if (coefficientOfVariation(lengths) > (profile.looseLengthVariation || profile.dashedLengthVariation)) return "CONTINUOUS";
  if (coefficientOfVariation(positiveGaps) > (profile.looseGapVariation || profile.dashedGapVariation)) return "CONTINUOUS";
  return "DASHED";
}

async function extractVectorEntities(page) {
  const opList = await page.getOperatorList();
  const OPS = pdfjsLib.OPS;
  const lines = [];
  const circles = [];
  const arcs = [];
  const ellipses = [];
  const splines = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  let currentLinetype = "CONTINUOUS";
  let currentPath = null;

  for (let i = 0; i < opList.fnArray.length; i += 1) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] || [];

    if (fn === OPS.save) {
      stack.push({ ctm: [...ctm], linetype: currentLinetype });
      continue;
    }
    if (fn === OPS.restore) {
      const state = stack.pop();
      ctm = state?.ctm || [1, 0, 0, 1, 0, 0];
      currentLinetype = state?.linetype || "CONTINUOUS";
      continue;
    }
    if (fn === OPS.transform) {
      ctm = pdfjsLib.Util.transform(ctm, args);
      continue;
    }
    if (OPS.setDash !== undefined && fn === OPS.setDash) {
      currentLinetype = linetypeFromPdfDash(args);
      continue;
    }
    if (fn === OPS.constructPath) {
      currentPath = parseConstructedPath(args, ctm);
      continue;
    }
    if ((fn === OPS.stroke || fn === OPS.fill || fn === OPS.eoFill || fn === OPS.fillStroke || fn === OPS.eoFillStroke) && currentPath) {
      const entities = vectorEntitiesFromPath(currentPath, currentLinetype);
      lines.push(...entities.lines);
      circles.push(...entities.circles);
      arcs.push(...entities.arcs);
      ellipses.push(...entities.ellipses);
      splines.push(...entities.splines);
      currentPath = null;
    }
  }

  return {
    lines: dedupeVectorLines(lines),
    circles: mergeCircleCandidates(circles),
    arcs: dedupeVectorArcs(arcs),
    ellipses: dedupeVectorEllipses(ellipses),
    splines: dedupeVectorSplines(splines),
  };
}

async function safeExtractVectorEntities(page) {
  try {
    const entities = await extractVectorEntities(page);
    return {
      lines: entities.lines || [],
      circles: entities.circles || [],
      arcs: entities.arcs || [],
      ellipses: entities.ellipses || [],
      splines: entities.splines || [],
    };
  } catch (error) {
    console.warn("Vector extraction failed; falling back to raster tracing.", error);
    return emptyVectorEntities();
  }
}

function emptyVectorEntities() {
  return { lines: [], circles: [], arcs: [], ellipses: [], splines: [] };
}

function parseConstructedPath(args, ctm) {
  const pathOps = args[0] || [];
  const coords = args[1] || [];
  const OPS = pdfjsLib.OPS;
  const segments = [];
  let cursor = 0;
  let current = null;
  let start = null;

  for (const op of pathOps) {
    if (op === OPS.moveTo) {
      current = transformPdfPoint(coords[cursor], coords[cursor + 1], ctm);
      start = current;
      cursor += 2;
    } else if (op === OPS.lineTo) {
      const end = transformPdfPoint(coords[cursor], coords[cursor + 1], ctm);
      cursor += 2;
      if (current) segments.push({ type: "line", p1: current, p2: end });
      current = end;
    } else if (op === OPS.curveTo) {
      const c1 = transformPdfPoint(coords[cursor], coords[cursor + 1], ctm);
      const c2 = transformPdfPoint(coords[cursor + 2], coords[cursor + 3], ctm);
      const end = transformPdfPoint(coords[cursor + 4], coords[cursor + 5], ctm);
      cursor += 6;
      if (current) segments.push({ type: "curve", p1: current, c1, c2, p2: end });
      current = end;
    } else if (op === OPS.curveTo2) {
      const c1 = current;
      const c2 = transformPdfPoint(coords[cursor], coords[cursor + 1], ctm);
      const end = transformPdfPoint(coords[cursor + 2], coords[cursor + 3], ctm);
      cursor += 4;
      if (current) segments.push({ type: "curve", p1: current, c1, c2, p2: end });
      current = end;
    } else if (op === OPS.curveTo3) {
      const c1 = transformPdfPoint(coords[cursor], coords[cursor + 1], ctm);
      const end = transformPdfPoint(coords[cursor + 2], coords[cursor + 3], ctm);
      const c2 = end;
      cursor += 4;
      if (current) segments.push({ type: "curve", p1: current, c1, c2, p2: end });
      current = end;
    } else if (op === OPS.rectangle) {
      const x = coords[cursor];
      const y = coords[cursor + 1];
      const w = coords[cursor + 2];
      const h = coords[cursor + 3];
      cursor += 4;
      const p1 = transformPdfPoint(x, y, ctm);
      const p2 = transformPdfPoint(x + w, y, ctm);
      const p3 = transformPdfPoint(x + w, y + h, ctm);
      const p4 = transformPdfPoint(x, y + h, ctm);
      segments.push(
        { type: "line", p1, p2 },
        { type: "line", p1: p2, p2: p3 },
        { type: "line", p1: p3, p2: p4 },
        { type: "line", p1: p4, p2: p1 },
      );
      current = p1;
      start = p1;
    } else if (op === OPS.closePath) {
      if (current && start) segments.push({ type: "line", p1: current, p2: start, close: true });
      current = start;
    }
  }

  return segments;
}

function transformPdfPoint(x, y, ctm) {
  const p = pdfjsLib.Util.applyTransform([x, y], ctm);
  const v = pdfjsLib.Util.applyTransform(p, renderedViewport.transform);
  return { x: v[0], y: v[1] };
}

function vectorEntitiesFromPath(segments, linetype = "CONTINUOUS") {
  const circle = circleFromBezierPath(segments);
  if (circle) return { lines: [], circles: [{ ...circle, linetype }], arcs: [], ellipses: [], splines: [] };

  const lines = [];
  const arcs = [];
  const ellipses = [];
  const splines = [];
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.type === "line" && pointDistance(segment.p1, segment.p2) > 0.5) {
      lines.push({ x1: segment.p1.x, y1: segment.p1.y, x2: segment.p2.x, y2: segment.p2.y, linetype });
    } else if (segment.type === "curve") {
      const run = collectCurveRun(segments, i);
      const runArc = arcFromCurveRun(run);
      if (runArc) {
        arcs.push({ ...runArc, linetype });
        i += run.length - 1;
        continue;
      }
      const runEllipse = ellipseFromCurveRun(run);
      if (runEllipse) {
        ellipses.push({ ...runEllipse, linetype });
        i += run.length - 1;
        continue;
      }
      const arc = arcFromBezier(segment);
      if (arc) arcs.push({ ...arc, linetype });
      else {
        const ellipse = ellipseFromCurveRun([segment]);
        if (ellipse) ellipses.push({ ...ellipse, linetype });
        else splines.push(splineFromBezier(segment, linetype));
      }
    }
  }
  return { lines, circles: [], arcs, ellipses, splines };
}

function collectCurveRun(segments, startIndex) {
  const run = [];
  for (let i = startIndex; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.type !== "curve") break;
    if (run.length && pointDistance(run[run.length - 1].p2, segment.p1) > 2) break;
    run.push(segment);
  }
  return run;
}

function circleFromBezierPath(segments) {
  const curves = segments.filter((segment) => segment.type === "curve");
  if (curves.length < 3) return null;
  const points = [];
  for (const segment of curves) points.push(segment.p1, segment.c1, segment.c2, segment.p2);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 3 || h < 3) return null;
  if (Math.abs(w - h) / Math.max(w, h) > 0.12) return null;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const r = (w + h) / 4;
  const radialErrors = points.map((point) => Math.abs(Math.hypot(point.x - cx, point.y - cy) - r));
  const avgError = average(radialErrors);
  if (avgError > Math.max(1.5, r * 0.16)) return null;
  return { cx, cy, r, score: 1 };
}

function splineFromBezier(segment, linetype = "CONTINUOUS") {
  return {
    points: [segment.p1, segment.c1, segment.c2, segment.p2],
    linetype,
  };
}

function arcFromBezier(segment) {
  const p0 = segment.p1;
  const pm = cubicBezierPoint(segment.p1, segment.c1, segment.c2, segment.p2, 0.5);
  const p1 = segment.p2;
  const circle = circleFromThreePoints(p0, pm, p1);
  if (!circle) return null;

  const samples = [0.2, 0.35, 0.65, 0.8].map((t) => cubicBezierPoint(segment.p1, segment.c1, segment.c2, segment.p2, t));
  const maxError = Math.max(...samples.map((point) => Math.abs(Math.hypot(point.x - circle.cx, point.y - circle.cy) - circle.r)));
  if (circle.r < 2 || maxError > Math.max(1.25, circle.r * 0.08)) return null;

  const start = angleOfPoint(circle, p0);
  const mid = angleOfPoint(circle, pm);
  const end = angleOfPoint(circle, p1);
  const ccw = angleBetween(start, end, mid);
  return {
    cx: circle.cx,
    cy: circle.cy,
    r: circle.r,
    startAngle: ccw ? start : end,
    endAngle: ccw ? end : start,
  };
}

function arcFromCurveRun(run) {
  if (run.length < 2) return null;
  const samples = [];
  for (const segment of run) {
    for (const t of [0, 0.25, 0.5, 0.75]) {
      samples.push(cubicBezierPoint(segment.p1, segment.c1, segment.c2, segment.p2, t));
    }
  }
  samples.push(run[run.length - 1].p2);

  const first = samples[0];
  const middle = samples[Math.floor(samples.length / 2)];
  const last = samples[samples.length - 1];
  const circle = circleFromThreePoints(first, middle, last);
  if (!circle || circle.r < 2) return null;

  const errors = samples.map((point) => Math.abs(Math.hypot(point.x - circle.cx, point.y - circle.cy) - circle.r));
  const maxError = Math.max(...errors);
  if (maxError > Math.max(1.5, circle.r * 0.08)) return null;

  const start = angleOfPoint(circle, first);
  const mid = angleOfPoint(circle, middle);
  const end = angleOfPoint(circle, last);
  const ccw = angleBetween(start, end, mid);
  const sweep = ccw ? normalizeAngle(end - start) : normalizeAngle(start - end);
  if (sweep < 20 || sweep > 340) return null;

  return {
    cx: circle.cx,
    cy: circle.cy,
    r: circle.r,
    startAngle: ccw ? start : end,
    endAngle: ccw ? end : start,
  };
}

function ellipseFromCurveRun(run) {
  if (!run.length) return null;
  const samples = sampleCurveRun(run, 8);
  if (samples.length < 5) return null;

  const first = samples[0];
  const middle = samples[Math.floor(samples.length / 2)];
  const last = samples[samples.length - 1];
  if (pointDistance(first, last) < 1 && run.length < 3) return null;

  const mean = {
    x: average(samples.map((point) => point.x)),
    y: average(samples.map((point) => point.y)),
  };
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const point of samples) {
    const dx = point.x - mean.x;
    const dy = point.y - mean.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let majorAxis = { x: Math.cos(theta), y: Math.sin(theta) };
  let minorAxis = { x: -Math.sin(theta), y: Math.cos(theta) };
  let fit = fitEllipseOnAxes(samples, majorAxis, minorAxis);
  if (fit.rx < fit.ry) {
    [majorAxis, minorAxis] = [minorAxis, majorAxis];
    fit = fitEllipseOnAxes(samples, majorAxis, minorAxis);
  }
  if (fit.rx < 2 || fit.ry < 2) return null;

  const ratio = fit.ry / fit.rx;
  if (ratio < 0.08 || ratio > 0.96) return null;

  const errors = samples.map((point) => {
    const dx = point.x - fit.center.x;
    const dy = point.y - fit.center.y;
    const u = (dx * majorAxis.x + dy * majorAxis.y) / fit.rx;
    const v = (dx * minorAxis.x + dy * minorAxis.y) / fit.ry;
    return Math.abs(Math.hypot(u, v) - 1);
  });
  const avgError = average(errors);
  const maxError = Math.max(...errors);
  if (avgError > 0.14 || maxError > 0.38) return null;

  const startParam = ellipseParam(first, fit.center, majorAxis, minorAxis, fit.rx, fit.ry);
  const midParam = ellipseParam(middle, fit.center, majorAxis, minorAxis, fit.rx, fit.ry);
  const endParam = ellipseParam(last, fit.center, majorAxis, minorAxis, fit.rx, fit.ry);
  const ccw = angleBetweenRadians(startParam, endParam, midParam);
  const sweep = ccw ? normalizeRadians(endParam - startParam) : normalizeRadians(startParam - endParam);
  if (sweep < Math.PI / 12) return null;

  return {
    cx: fit.center.x,
    cy: fit.center.y,
    majorX: majorAxis.x * fit.rx,
    majorY: majorAxis.y * fit.rx,
    ratio,
    startParam: ccw ? startParam : endParam,
    endParam: ccw ? endParam : startParam,
  };
}

function sampleCurveRun(run, steps) {
  const samples = [];
  for (const segment of run) {
    for (let i = 0; i < steps; i += 1) {
      samples.push(cubicBezierPoint(segment.p1, segment.c1, segment.c2, segment.p2, i / steps));
    }
  }
  samples.push(run[run.length - 1].p2);
  return samples;
}

function fitEllipseOnAxes(points, majorAxis, minorAxis) {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const point of points) {
    const u = point.x * majorAxis.x + point.y * majorAxis.y;
    const v = point.x * minorAxis.x + point.y * minorAxis.y;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }
  const midU = (minU + maxU) / 2;
  const midV = (minV + maxV) / 2;
  return {
    center: {
      x: majorAxis.x * midU + minorAxis.x * midV,
      y: majorAxis.y * midU + minorAxis.y * midV,
    },
    rx: (maxU - minU) / 2,
    ry: (maxV - minV) / 2,
  };
}

function ellipseParam(point, center, majorAxis, minorAxis, rx, ry) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const u = (dx * majorAxis.x + dy * majorAxis.y) / rx;
  const v = (dx * minorAxis.x + dy * minorAxis.y) / ry;
  return normalizeRadians(Math.atan2(v, u));
}

function angleBetweenRadians(start, end, mid) {
  const sweep = normalizeRadians(end - start);
  const midSweep = normalizeRadians(mid - start);
  return midSweep <= sweep;
}

function circleFromThreePoints(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 0.0001) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  const r = Math.hypot(a.x - cx, a.y - cy);
  return { cx, cy, r };
}

function angleOfPoint(circle, point) {
  return normalizeAngle(Math.atan2(point.y - circle.cy, point.x - circle.cx) * 180 / Math.PI);
}

function angleBetween(start, end, mid) {
  const sweep = normalizeAngle(end - start);
  const midSweep = normalizeAngle(mid - start);
  return midSweep <= sweep;
}

function linetypeFromPdfDash(args) {
  const pattern = Array.isArray(args[0]) ? args[0].filter((value) => Number(value) > 0) : [];
  if (!pattern.length) return "CONTINUOUS";
  if (pattern.length >= 6) return "PHANTOM";
  if (pattern.length >= 4) {
    const sorted = [...pattern].sort((a, b) => b - a);
    if (sorted[0] >= sorted[1] * 2.2) return "CENTER";
    return "DASHDOT";
  }
  if (pattern.length >= 2) {
    const dash = pattern[0];
    const gap = pattern[1];
    if (dash <= gap * 0.35) return "DOT";
    if (gap >= dash * 1.3) return "HIDDEN";
    return "DASHED";
  }
  return "DASHED";
}

function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dedupeVectorLines(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const projected = projectLine(line);
    if (projected.length < 0.75) continue;
    const key = [
      Math.round(projected.angle * 2),
      Math.round(projected.offset * 2),
      Math.round(projected.start * 2),
      Math.round(projected.end * 2),
      normalizeDxfLinetype(line.linetype),
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function mergeSupplementalLines(primary, supplemental) {
  const merged = [...primary];
  for (const line of supplemental) {
    const duplicate = merged.some((existing) => areSimilarLines(existing, line));
    if (!duplicate) merged.push(line);
  }
  return merged;
}

function areSimilarLines(a, b) {
  const direct = pointDistance({ x: a.x1, y: a.y1 }, { x: b.x1, y: b.y1 })
    + pointDistance({ x: a.x2, y: a.y2 }, { x: b.x2, y: b.y2 });
  const reverse = pointDistance({ x: a.x1, y: a.y1 }, { x: b.x2, y: b.y2 })
    + pointDistance({ x: a.x2, y: a.y2 }, { x: b.x1, y: b.y1 });
  return Math.min(direct, reverse) <= 4;
}

function cleanupOverlappingLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) return Array.isArray(lines) ? lines : [];
  const groups = groupLinesByAxis(lines);
  const cleaned = [];
  for (const group of groups.values()) {
    cleaned.push(...cleanupProjectedLineGroup(group));
  }
  return suppressLowerPriorityOverlaps(cleaned);
}

function removePaperEdgeLines(lines) {
  if (!Array.isArray(lines) || !renderedViewport) {
    removePaperEdgeLines.lastRemoved = 0;
    return Array.isArray(lines) ? lines : [];
  }
  const width = pdfCanvas.width || renderedViewport.width || 0;
  const height = pdfCanvas.height || renderedViewport.height || 0;
  const tolerance = Math.max(2.5, (renderedViewport.scale || 1) * 1.25);
  const out = [];
  let removed = 0;
  for (const line of lines) {
    if (isPaperEdgeLine(line, width, height, tolerance)) removed += 1;
    else out.push(line);
  }
  removePaperEdgeLines.lastRemoved = removed;
  return out;
}

function isPaperEdgeLine(line, width, height, tolerance) {
  if (!width || !height) return false;
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return false;
  const horizontal = Math.abs(dy) <= Math.max(0.75, length * 0.01);
  const vertical = Math.abs(dx) <= Math.max(0.75, length * 0.01);
  if (!horizontal && !vertical) return false;

  if (horizontal) {
    const y = (line.y1 + line.y2) / 2;
    const onTopOrBottom = y <= tolerance || Math.abs(y - height) <= tolerance;
    if (!onTopOrBottom) return false;
    return lineWithinPaperSpan(line.x1, line.x2, width, tolerance);
  }

  const x = (line.x1 + line.x2) / 2;
  const onLeftOrRight = x <= tolerance || Math.abs(x - width) <= tolerance;
  if (!onLeftOrRight) return false;
  return lineWithinPaperSpan(line.y1, line.y2, height, tolerance);
}

function lineWithinPaperSpan(a, b, size, tolerance) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return max >= -tolerance && min <= size + tolerance;
}

function cleanupProjectedLineGroup(group) {
  const ordered = group
    .filter((line) => line.length >= 0.75)
    .map((line) => ({ ...line, linetype: normalizeDxfLinetype(line.linetype) }))
    .sort((a, b) => a.start - b.start || b.end - a.end || linePriority(b) - linePriority(a));
  const out = [];
  for (const line of ordered) {
    let candidate = { ...line };
    let skip = false;
    for (let i = out.length - 1; i >= 0; i -= 1) {
      const existing = out[i];
      if (existing.end < candidate.start - 1.2) break;
      const overlap = intervalOverlap(existing.start, existing.end, candidate.start, candidate.end);
      const shorter = Math.min(existing.length, candidate.length);
      const coverage = shorter > 0 ? overlap / shorter : 0;
      if (coverage >= 0.96) {
        const preferred = preferredLine(existing, candidate);
        if (preferred === existing) {
          skip = true;
          break;
        }
        out.splice(i, 1);
        continue;
      }
      if (existing.linetype === candidate.linetype && candidate.start <= existing.end + 0.75) {
        candidate = mergeProjectedLinePair(existing, candidate);
        out.splice(i, 1);
      }
    }
    if (!skip) out.push(candidate);
  }
  return out.map((line) => projectedSpanLine([line], line.linetype));
}

function intervalOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function preferredLine(a, b) {
  const aPriority = linePriority(a);
  const bPriority = linePriority(b);
  if (bPriority > aPriority + 0.01) return b;
  return a;
}

function linePriority(line) {
  return linetypeRank(line.linetype) * 100000 + (line.length || Math.max(0, line.end - line.start));
}

function linetypeRank(linetype) {
  return LINETYPE_PRIORITY[normalizeDxfLinetype(linetype)] ?? 0;
}

function mergeProjectedLinePair(a, b) {
  const totalLength = Math.max(1, (a.length || 0) + (b.length || 0));
  const weightA = (a.length || 0) / totalLength;
  const weightB = (b.length || 0) / totalLength;
  const start = Math.min(a.start, b.start);
  const end = Math.max(a.end, b.end);
  return {
    ...a,
    start,
    end,
    length: end - start,
    offset: a.offset * weightA + b.offset * weightB,
    linetype: preferredLine(a, b).linetype,
  };
}

function suppressLowerPriorityOverlaps(lines) {
  const projected = lines
    .map((line) => projectLine(line))
    .filter((line) => line.length >= 0.75)
    .map((line) => ({ ...line, linetype: normalizeDxfLinetype(line.linetype) }));
  if (projected.length < 2) return lines;

  const accepted = [];
  const out = [];
  const ordered = [...projected].sort((a, b) => (
    linePriority(b) - linePriority(a)
    || b.length - a.length
    || a.start - b.start
  ));

  for (const line of ordered) {
    let segments = [{ ...line }];
    for (const existing of accepted) {
      if (!shouldSuppressLineOverlap(existing, line)) continue;
      segments = segments.flatMap((segment) => subtractProjectedOverlap(segment, existing));
      if (!segments.length) break;
    }
    for (const segment of segments) {
      if (segment.length < 1.5) continue;
      accepted.push(segment);
      out.push(segment);
    }
  }

  return out
    .sort((a, b) => a.angle - b.angle || a.offset - b.offset || a.start - b.start)
    .map((line) => projectedSpanLine([line], line.linetype));
}

function shouldSuppressLineOverlap(existing, candidate) {
  if (!isSameProjectedAxis(existing, candidate)) return false;
  const overlap = intervalOverlap(existing.start, existing.end, candidate.start, candidate.end);
  if (overlap < 2) return false;
  const shorter = Math.min(existing.length, candidate.length);
  const coverage = shorter > 0 ? overlap / shorter : 0;

  const existingRank = linetypeRank(existing.linetype);
  const candidateRank = linetypeRank(candidate.linetype);
  if (existingRank > candidateRank) return coverage >= 0.45;
  if (existingRank === candidateRank && existing.linetype !== candidate.linetype) return coverage >= 0.72;
  if (existing.linetype === candidate.linetype) return coverage >= 0.82;
  return false;
}

function isSameProjectedAxis(a, b) {
  const angleDelta = Math.abs(a.angle - b.angle);
  const normalizedAngleDelta = Math.min(angleDelta, 180 - angleDelta);
  if (normalizedAngleDelta > LINE_OVERLAP_ANGLE_TOLERANCE) return false;
  return Math.abs(a.offset - b.offset) <= LINE_OVERLAP_OFFSET_TOLERANCE;
}

function subtractProjectedOverlap(segment, blocker) {
  const overlap = intervalOverlap(segment.start, segment.end, blocker.start, blocker.end);
  if (overlap < 2) return [segment];
  const shorter = Math.min(segment.length, blocker.length);
  if (shorter > 0 && overlap / shorter < 0.12) return [segment];

  const margin = 0.65;
  const cutStart = clamp(blocker.start - margin, segment.start, segment.end);
  const cutEnd = clamp(blocker.end + margin, segment.start, segment.end);
  const out = [];
  if (cutStart - segment.start >= 1.5) {
    out.push({ ...segment, end: cutStart, length: cutStart - segment.start });
  }
  if (segment.end - cutEnd >= 1.5) {
    out.push({ ...segment, start: cutEnd, length: segment.end - cutEnd });
  }
  return out;
}

function dedupeVectorArcs(arcs) {
  const seen = new Set();
  const out = [];
  for (const arc of arcs) {
    const key = [arc.cx, arc.cy, arc.r, arc.startAngle, arc.endAngle].map((value) => Math.round(value * 2)).join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(arc);
  }
  return out;
}

function dedupeVectorEllipses(ellipses) {
  const seen = new Set();
  const out = [];
  for (const ellipse of ellipses) {
    const key = [
      ellipse.cx,
      ellipse.cy,
      ellipse.majorX,
      ellipse.majorY,
      ellipse.ratio,
      ellipse.startParam,
      ellipse.endParam,
    ].map((value) => Math.round(value * 200)).join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ellipse);
  }
  return out;
}

function mergeArcFragmentsToBasicLinetypes(arcs) {
  const groups = new Map();
  for (const arc of arcs) {
    const key = [
      Math.round(arc.cx / 2) * 2,
      Math.round(arc.cy / 2) * 2,
      Math.round(arc.r / 2) * 2,
    ].join(":");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(normalizeArcSpan(arc));
  }

  const merged = { circles: [], arcs: [] };
  for (const group of groups.values()) {
    group.sort((a, b) => a.start - b.start);
    const closedCircle = circleFromArcFragmentGroup(group);
    if (closedCircle) {
      merged.circles.push(closedCircle);
      continue;
    }
    const dashedArc = arcFromArcFragmentGroup(group);
    if (dashedArc) {
      merged.arcs.push(dashedArc);
      continue;
    }
    const chunks = splitArcChunks(group);
    for (const chunk of chunks) {
      if (chunk.length < 2) {
        merged.arcs.push(...chunk);
        continue;
      }
      const linetype = classifyArcLinetype(chunk);
      merged.arcs.push(spanArcChunk(chunk, linetype));
    }
  }
  return merged;
}

function circleFromArcFragmentGroup(group) {
  if (group.length < 3) return null;
  const sorted = [...group].sort((a, b) => a.start - b.start);
  const radius = average(sorted.map((arc) => arc.r));
  const gaps = circularArcGaps(sorted).filter((gap) => gap.angle > 0.2);
  const spans = sorted.map((arc) => arc.span);
  const totalSpan = spans.reduce((sum, span) => sum + span, 0);
  const maxGap = Math.max(...gaps.map((gap) => gap.angle), 0);
  const largestSpan = Math.max(...spans);
  const angularCoverage = 360 - maxGap;
  if (angularCoverage < 300 || totalSpan < 80 || largestSpan > 220) return null;

  const linetype = nonContinuousLinetype(classifyPatternLengths(
    spans.map((span) => Math.max(0.1, span * radius * Math.PI / 180)),
    gaps.map((gap) => Math.max(0, gap.angle * radius * Math.PI / 180)),
  ), sorted);
  if (linetype === "CONTINUOUS") return null;

  return {
    cx: average(sorted.map((arc) => arc.cx)),
    cy: average(sorted.map((arc) => arc.cy)),
    r: radius,
    linetype,
    score: 1,
  };
}

function arcFromArcFragmentGroup(group) {
  if (group.length < 2) return null;
  const sorted = [...group].sort((a, b) => a.start - b.start);
  const radius = average(sorted.map((arc) => arc.r));
  const ordered = orderedArcFragmentsByLargestGap(sorted);
  if (ordered.length < 2) return null;

  const spans = ordered.map((arc) => arc.span);
  const gaps = [];
  for (let i = 1; i < ordered.length; i += 1) {
    gaps.push(Math.max(0, ordered[i].start - ordered[i - 1].end));
  }
  const totalSpan = spans.reduce((sum, span) => sum + span, 0);
  const arcSweep = ordered[ordered.length - 1].end - ordered[0].start;
  if (totalSpan < 12 || arcSweep < 20 || arcSweep > 330) return null;

  const linetype = nonContinuousLinetype(classifyPatternLengths(
    spans.map((span) => Math.max(0.1, span * radius * Math.PI / 180)),
    gaps.map((gap) => Math.max(0, gap * radius * Math.PI / 180)),
  ), sorted);
  if (linetype === "CONTINUOUS") return null;

  return {
    cx: average(sorted.map((arc) => arc.cx)),
    cy: average(sorted.map((arc) => arc.cy)),
    r: radius,
    startAngle: normalizeAngle(ordered[0].start),
    endAngle: normalizeAngle(ordered[ordered.length - 1].end),
    linetype,
  };
}

function circularArcGaps(group) {
  const gaps = [];
  for (let i = 1; i < group.length; i += 1) {
    gaps.push({ index: i, angle: Math.max(0, group[i].start - group[i - 1].end) });
  }
  gaps.push({ index: 0, angle: Math.max(0, group[0].start + 360 - group[group.length - 1].end) });
  return gaps;
}

function orderedArcFragmentsByLargestGap(group) {
  const gaps = circularArcGaps(group);
  const largestGap = gaps.reduce((best, gap) => gap.angle > best.angle ? gap : best, gaps[0]);
  const ordered = [];
  for (let offset = 0; offset < group.length; offset += 1) {
    const index = (largestGap.index + offset) % group.length;
    const lap = index < largestGap.index ? 360 : 0;
    ordered.push({
      ...group[index],
      start: group[index].start + lap,
      end: group[index].end + lap,
    });
  }
  return ordered;
}

function nonContinuousLinetype(classified, items) {
  if (classified && classified !== "CONTINUOUS") return classified;
  return dominantNonContinuousLinetype(items) || "CONTINUOUS";
}

function dominantNonContinuousLinetype(items) {
  const counts = new Map();
  for (const item of items) {
    const linetype = item.linetype || "CONTINUOUS";
    if (linetype === "CONTINUOUS") continue;
    counts.set(linetype, (counts.get(linetype) || 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [linetype, count] of counts.entries()) {
    if (count > bestCount) {
      best = linetype;
      bestCount = count;
    }
  }
  return best || null;
}

function normalizeArcSpan(arc) {
  let start = normalizeAngle(arc.startAngle);
  let end = normalizeAngle(arc.endAngle);
  if (end < start) end += 360;
  const span = Math.max(0, end - start);
  return { ...arc, start, end, span };
}

function splitArcChunks(group) {
  const chunks = [];
  let active = [];
  for (const arc of group) {
    if (!active.length) {
      active.push(arc);
      continue;
    }
    const last = active[active.length - 1];
    const gap = arc.start - last.end;
    const maxGap = Math.max(2, (last.span + arc.span) * 2.2);
    if (gap >= -1 && gap <= maxGap) active.push(arc);
    else {
      chunks.push(active);
      active = [arc];
    }
  }
  if (active.length) chunks.push(active);
  return chunks;
}

function classifyArcLinetype(chunk) {
  const lengths = chunk.map((arc) => Math.max(0.1, arc.span * arc.r * Math.PI / 180));
  const gaps = [];
  for (let i = 1; i < chunk.length; i += 1) {
    gaps.push(Math.max(0, (chunk[i].start - chunk[i - 1].end) * chunk[i].r * Math.PI / 180));
  }
  return classifyPatternLengths(lengths, gaps);
}

function spanArcChunk(chunk, linetype) {
  const first = chunk[0];
  return {
    cx: average(chunk.map((arc) => arc.cx)),
    cy: average(chunk.map((arc) => arc.cy)),
    r: average(chunk.map((arc) => arc.r)),
    startAngle: normalizeAngle(Math.min(...chunk.map((arc) => arc.start))),
    endAngle: normalizeAngle(Math.max(...chunk.map((arc) => arc.end))),
    linetype,
  };
}

function dedupeVectorSplines(splines) {
  const seen = new Set();
  const out = [];
  for (const spline of splines) {
    const key = spline.points.flatMap((point) => [point.x, point.y]).map((value) => Math.round(value * 2)).join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(spline);
  }
  return out;
}

function traceImageToCircles(imageData, limit, minRadius, maxRadius, sensitivity, deepScan) {
  const { width, height, data } = imageData;
  const dark = new Uint8Array(width * height);
  const circleLimit = Math.min(245, Math.max(limit, limit + 35));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      dark[y * width + x] = gray < circleLimit ? 1 : 0;
    }
  }

  const rMin = clamp(Math.round(minRadius) || 8, 3, Math.min(width, height) / 2);
  const rMax = clamp(Math.round(maxRadius) || 80, rMin + 1, Math.min(width, height) / 2);
  const minScore = clamp((Number(sensitivity) || 45) / 100, 0.2, 0.95);
  const candidates = circleCandidatesFromComponents(dark, width, height, rMin, rMax, minScore);
  if (deepScan) {
    candidates.push(...circleCandidatesByRingScan(dark, width, height, rMin, rMax, minScore));
  }
  return mergeCircleCandidates(candidates);
}

function circleCandidatesFromComponents(dark, width, height, rMin, rMax, minScore) {
  const visited = new Uint8Array(width * height);
  const candidates = [];
  const queue = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const start = y * width + x;
      if (!dark[start] || visited[start]) continue;

      let head = 0;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      queue.length = 0;
      queue.push(start);
      visited[start] = 1;

      while (head < queue.length) {
        const idx = queue[head];
        head += 1;
        const px = idx % width;
        const py = Math.floor(idx / width);
        count += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
            const nidx = ny * width + nx;
            if (dark[nidx] && !visited[nidx]) {
              visited[nidx] = 1;
              queue.push(nidx);
            }
          }
        }
      }

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const r = (boxW + boxH) / 4;
      if (r < rMin || r > rMax) continue;
      if (boxW < rMin * 2 || boxH < rMin * 2) continue;
      if (Math.abs(boxW - boxH) / Math.max(boxW, boxH) > 0.22) continue;

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const ringScore = circleScore(dark, width, height, cx, cy, r);
      const fillRatio = count / Math.max(1, boxW * boxH);
      const expectedRingRatio = Math.min(0.55, Math.max(0.03, (2 * Math.PI * r * 2.4) / (boxW * boxH)));
      if (ringScore >= Math.max(0.5, minScore) && fillRatio <= Math.max(0.42, expectedRingRatio * 4.5)) {
        candidates.push({ cx, cy, r, score: ringScore, linetype: "CONTINUOUS" });
      }
    }
  }

  return candidates;
}

function circleCandidatesByRingScan(dark, width, height, rMin, rMax, minScore) {
  const candidates = [];
  const radiusStep = Math.max(4, Math.floor((rMax - rMin) / 12));
  let attempts = 0;
  const maxAttempts = 45000;

  for (let r = rMin; r <= rMax; r += radiusStep) {
    const centerStep = Math.max(8, Math.floor(r / 2));
    for (let cy = r + 1; cy < height - r - 1; cy += centerStep) {
      for (let cx = r + 1; cx < width - r - 1; cx += centerStep) {
        attempts += 1;
        if (attempts > maxAttempts) return refineCircleCandidates(dark, width, height, candidates, minScore);
        const score = circleScore(dark, width, height, cx, cy, r);
        if (score < minScore) continue;
        const fill = circleInteriorFill(dark, width, cx, cy, r);
        if (fill > 0.34) continue;
        candidates.push({ cx, cy, r, score, linetype: "CONTINUOUS" });
      }
    }
  }

  return refineCircleCandidates(dark, width, height, candidates, minScore);
}

function refineCircleCandidates(dark, width, height, candidates, minScore) {
  const refined = [];
  for (const candidate of candidates) {
    let best = candidate;
    const delta = Math.max(1, Math.floor(candidate.r / 10));
    for (let cy = candidate.cy - delta; cy <= candidate.cy + delta; cy += 1) {
      for (let cx = candidate.cx - delta; cx <= candidate.cx + delta; cx += 1) {
        for (let r = candidate.r - 1; r <= candidate.r + 1; r += 1) {
          if (r < 3 || cx < r || cy < r || cx >= width - r || cy >= height - r) continue;
          const score = circleScore(dark, width, height, cx, cy, r);
          if (score > best.score) best = { cx, cy, r, score, linetype: candidate.linetype || "CONTINUOUS" };
        }
      }
    }
    if (best.score >= minScore) refined.push(best);
  }
  return refined;
}

function circleScore(dark, width, height, cx, cy, r) {
  const samples = Math.max(36, Math.round(r * 5));
  let hits = 0;
  let tested = 0;
  for (let i = 0; i < samples; i += 1) {
    const angle = i * Math.PI * 2 / samples;
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r);
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) continue;
    tested += 1;
    if (hasDarkNear(dark, width, x, y)) hits += 1;
  }
  return tested ? hits / tested : 0;
}

function hasDarkNear(dark, width, x, y) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dark[(y + dy) * width + x + dx]) return true;
    }
  }
  return false;
}

function circleInteriorFill(dark, width, cx, cy, r) {
  const inner = Math.max(1, Math.floor(r * 0.55));
  let hits = 0;
  let tested = 0;
  for (let y = Math.round(cy - inner); y <= Math.round(cy + inner); y += 2) {
    for (let x = Math.round(cx - inner); x <= Math.round(cx + inner); x += 2) {
      if (Math.hypot(x - cx, y - cy) > inner) continue;
      tested += 1;
      if (dark[y * width + x]) hits += 1;
    }
  }
  return tested ? hits / tested : 0;
}

function mergeCircleCandidates(candidates) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const circles = [];
  for (const candidate of sorted) {
    const duplicate = circles.some((circle) => {
      const distance = Math.hypot(circle.cx - candidate.cx, circle.cy - candidate.cy);
      return distance <= Math.max(4, candidate.r * 0.18) && Math.abs(circle.r - candidate.r) <= Math.max(3, candidate.r * 0.16);
    });
    if (!duplicate) circles.push(candidate);
    if (circles.length >= 300) break;
  }
  return circles;
}

function collectRuns(dark, width, height, minLength, lines, horizontal) {
  const primary = horizontal ? height : width;
  const secondary = horizontal ? width : height;

  for (let a = 0; a < primary; a += 1) {
    let start = -1;
    for (let b = 0; b <= secondary; b += 1) {
      const x = horizontal ? b : a;
      const y = horizontal ? a : b;
      const isDark = b < secondary && dark[y * width + x] === 1;

      if (isDark && start < 0) start = b;
      if ((!isDark || b === secondary) && start >= 0) {
        const end = b - 1;
        if (end - start + 1 >= minLength) {
          if (horizontal) lines.push({ x1: start, y1: a, x2: end + 1, y2: a });
          else lines.push({ x1: a, y1: start, x2: a, y2: end + 1 });
        }
        start = -1;
      }
    }
  }
}

function mergeCollinear(lines) {
  const keyOf = (line) => line.y1 === line.y2 ? `h:${line.y1}` : `v:${line.x1}`;
  const groups = new Map();
  for (const line of lines) {
    const key = keyOf(line);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(line);
  }

  const merged = [];
  for (const [key, group] of groups) {
    const horizontal = key.startsWith("h:");
    group.sort((a, b) => horizontal ? a.x1 - b.x1 : a.y1 - b.y1);
    let active = null;
    for (const line of group) {
      if (!active) {
        active = { ...line };
        continue;
      }
      const touches = horizontal ? line.x1 <= active.x2 + 1 : line.y1 <= active.y2 + 1;
      if (touches) {
        if (horizontal) active.x2 = Math.max(active.x2, line.x2);
        else active.y2 = Math.max(active.y2, line.y2);
      } else {
        merged.push(active);
        active = { ...line };
      }
    }
    if (active) merged.push(active);
  }
  return merged;
}

function mergeWithBasicLinetypes(lines, minLength) {
  return mergeLineFragmentsToBasicLinetypes(lines, minLength);
}

function mergeLineFragmentsToBasicLinetypes(lines, minLength) {
  const groups = groupLinesByAxis(lines);
  const merged = [];

  for (const group of groups.values()) {
    group.sort((a, b) => a.start - b.start);
    const chunks = splitProjectedChunks(group, minLength);
    for (const chunk of chunks) {
      const linetype = classifyProjectedLinetype(chunk);
      if (linetype === "CONTINUOUS") {
        merged.push(...mergeProjectedContinuous(chunk));
      } else {
        merged.push(projectedSpanLine(chunk, linetype));
      }
    }
  }

  return merged;
}

function groupLinesByAxis(lines, options = {}) {
  const groups = new Map();
  const angleBucketSize = options.angleBucketSize || 2;
  const offsetBucketSize = options.offsetBucketSize || 2;
  for (const line of lines) {
    const projected = projectLine(line);
    if (projected.length < 1) continue;
    const angleBucket = Math.round(projected.angle / angleBucketSize) * angleBucketSize;
    const offsetBucket = Math.round(projected.offset / offsetBucketSize) * offsetBucketSize;
    const key = `${angleBucket}:${offsetBucket}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(projected);
  }
  return groups;
}

function projectLine(line) {
  let dx = line.x2 - line.x1;
  let dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return { ...line, length: 0 };
  dx /= length;
  dy /= length;
  let angle = normalizeAngle(Math.atan2(dy, dx) * 180 / Math.PI);
  if (angle >= 180) angle -= 180;
  if (angle >= 90) {
    dx = -dx;
    dy = -dy;
    angle -= 180;
  }
  const offset = -dy * line.x1 + dx * line.y1;
  const p1 = dx * line.x1 + dy * line.y1;
  const p2 = dx * line.x2 + dy * line.y2;
  const start = Math.min(p1, p2);
  const end = Math.max(p1, p2);
  return { ...line, dx, dy, angle, offset, start, end, length: end - start };
}

function splitProjectedChunks(group, minLength, maxGapOverride = null) {
  const chunks = [];
  let active = [];
  const maxGap = Number.isFinite(maxGapOverride) ? maxGapOverride : Math.max(12, minLength * 8);
  for (const line of group) {
    if (!active.length) {
      active.push(line);
      continue;
    }
    const last = active[active.length - 1];
    const gap = line.start - last.end;
    if (gap >= -3 && gap <= maxGap) active.push(line);
    else {
      chunks.push(active);
      active = [line];
    }
  }
  if (active.length) chunks.push(active);
  return chunks;
}

function classifyProjectedLinetype(chunk) {
  if (chunk.length < 3) return "CONTINUOUS";
  const lengths = chunk.map((line) => line.length);
  const gaps = [];
  for (let i = 1; i < chunk.length; i += 1) {
    gaps.push(chunk[i].start - chunk[i - 1].end);
  }
  const positiveGaps = gaps.filter((gap) => gap > 0.5);
  return classifyPatternLengths(lengths, positiveGaps);
}

function classifyPatternLengths(lengths, positiveGaps) {
  if (positiveGaps.length < 1) return "CONTINUOUS";
  const avgGap = average(positiveGaps);
  const avgLen = average(lengths);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  if (avgGap < 1 || avgGap > avgLen * 5) return "CONTINUOUS";
  const lengthRatio = maxLen / Math.max(1, minLen);
  const shortCount = lengths.filter((length) => length <= avgLen * 0.45).length;
  const longCount = lengths.filter((length) => length >= avgLen * 1.35).length;
  const hasDoubleLong = hasAdjacentLongSegments(lengths, avgLen);
  if (lengthRatio >= 4 && shortCount >= 2 && longCount >= 1) return "PHANTOM";
  if (hasDoubleLong && shortCount >= 1) return "BORDER";
  if (shortCount >= 2 && longCount >= 1) return "DIVIDE";
  if (lengthRatio >= 2.6 && lengths.length >= 4) return "CENTER";
  if (shortCount >= 1 && longCount >= 1) return "DASHDOT";
  if (avgLen <= avgGap * 0.45) return "DOT";
  if (avgGap >= avgLen * 1.5) return "HIDDEN";
  return "DASHED";
}

function hasAdjacentLongSegments(lengths, avgLen) {
  for (let i = 1; i < lengths.length; i += 1) {
    if (lengths[i - 1] >= avgLen * 1.15 && lengths[i] >= avgLen * 1.15) return true;
  }
  return false;
}

function mergeProjectedContinuous(chunk) {
  const out = [];
  let active = null;
  for (const line of chunk) {
    if (!active) {
      active = { ...line };
      continue;
    }
    if (line.start <= active.end + 2) active.end = Math.max(active.end, line.end);
    else {
      out.push(projectedSpanLine([active], line.linetype || "CONTINUOUS"));
      active = { ...line };
    }
  }
  if (active) out.push(projectedSpanLine([active], active.linetype || "CONTINUOUS"));
  return out;
}

function projectedSpanLine(chunk, linetype) {
  const first = chunk[0];
  const start = Math.min(...chunk.map((line) => line.start));
  const end = Math.max(...chunk.map((line) => line.end));
  const offset = average(chunk.map((line) => line.offset));
  const x1 = first.dx * start - first.dy * offset;
  const y1 = first.dy * start + first.dx * offset;
  const x2 = first.dx * end - first.dy * offset;
  const y2 = first.dy * end + first.dx * offset;
  return { x1, y1, x2, y2, linetype };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 1;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function coefficientOfVariation(values) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!finite.length) return 0;
  const avg = average(finite);
  if (avg <= 0) return 0;
  const variance = average(finite.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance) / avg;
}

async function extractTextFromPdf(page) {
  const fineItems = await extractPdfTextPass(page, { disableCombineTextItems: true }, "fine");
  const combinedItems = await extractPdfTextPass(page, { disableCombineTextItems: false }, "combined");
  const merged = mergePdfTextPasses(fineItems, combinedItems);
  lastPdfFallbackTextCount = merged.filter((item) => item.pdfTextPass === "combined").length;
  return merged;
}

async function extractPdfTextPass(page, options, pass) {
  const content = await page.getTextContent(options);
  const texts = [];
  for (const item of content.items) {
    const traced = pdfTextItemToTrace(item, pass);
    if (traced) texts.push(traced);
  }
  return texts;
}

function pdfTextItemToTrace(item, pass) {
  const text = normalizeText(item.str);
  if (!text) return null;
  const tx = pdfjsLib.Util.transform(renderedViewport.transform, item.transform);
  const xScale = Math.hypot(tx[0], tx[1]);
  const yScale = Math.hypot(tx[2], tx[3]);
  const measuredHeight = Math.abs((item.height || 0) * renderedViewport.scale);
  const measuredWidth = Math.abs((item.width || 0) * renderedViewport.scale);
  const height = Math.max(
    1.5,
    measuredHeight,
    yScale,
    xScale * 0.75,
  );
  const width = measuredWidth > 0
    ? Math.max(height * 0.12, measuredWidth)
    : estimateTextWidth(text, height);
  const charSpacing = estimateCharSpacing(text, width, height);
  const canvasAngle = textCanvasAngleFromTransform(tx);
  const angle = textDxfAngleFromTransform(tx);
  const base = {
    text,
    x: tx[4],
    y: tx[5],
    height,
    width,
    charSpacing,
    angle,
    canvasAngle,
    source: "pdf",
    pdfTextPass: pass,
  };
  return {
    ...base,
    glyphs: glyphsFromTextItem(base),
  };
}

function mergePdfTextPasses(fineItems, combinedItems) {
  if (!combinedItems.length) return fineItems;
  const out = [...fineItems];
  for (const combined of combinedItems) {
    for (const candidate of splitCombinedPdfTextItem(combined)) {
      if (shouldUsePdfFallbackText(out, candidate)) out.push(candidate);
    }
  }
  return out;
}

function splitCombinedPdfTextItem(item) {
  const parts = splitTextByLargeWhitespace(item.text);
  if (parts.length <= 1) return [item];
  const totalWeight = Math.max(1, parts.reduce((sum, part) => sum + part.spaceBefore + part.weight, 0));
  let weightOffset = 0;
  return parts.map((part) => {
    const start = (weightOffset + part.spaceBefore) / totalWeight * item.width;
    const width = Math.max(item.height * 0.6, part.weight / totalWeight * item.width);
    weightOffset += part.spaceBefore + part.weight;
    const point = pointAtAngle(item.x, item.y, start, textCanvasAngle(item));
    const split = {
      ...item,
      text: part.text,
      x: point.x,
      y: point.y,
      width,
      charSpacing: estimateCharSpacing(part.text, width, item.height),
      pdfTextPass: "combined",
    };
    return {
      ...split,
      glyphs: glyphsFromTextItem(split),
    };
  });
}

function splitTextByLargeWhitespace(text) {
  const chunks = String(text || "").split(/(\s{2,})/);
  const parts = [];
  let pendingSpaceWeight = 0;
  for (const chunk of chunks) {
    if (!chunk) continue;
    if (/^\s+$/.test(chunk)) {
      pendingSpaceWeight += textAdvanceWeight(chunk);
      continue;
    }
    const normalized = normalizeText(chunk);
    if (!normalized) continue;
    const weight = textAdvanceWeight(normalized);
    parts.push({ text: normalized, weight, spaceBefore: pendingSpaceWeight });
    pendingSpaceWeight = 0;
  }
  return parts;
}

function shouldUsePdfFallbackText(existingItems, candidate) {
  if (!isUsefulPdfTextCandidate(candidate)) return false;
  if (existingItems.some((existing) => isDuplicateText(existing, candidate))) return false;
  if (isBroadPdfFallbackCovered(existingItems, candidate)) return false;
  return true;
}

function isUsefulPdfTextCandidate(item) {
  const keyLength = textKey(item.text).length;
  if (keyLength < 1) return false;
  const aspect = (item.width || 0) / Math.max(1, item.height || 1);
  if (aspect > 40) return false;
  if (keyLength > 42 && aspect > 12) return false;
  return true;
}

function isBroadPdfFallbackCovered(existingItems, candidate) {
  const candidateKey = textKey(candidate.text);
  if (candidateKey.length < 14) return false;
  const candidateBox = textBox(candidate);
  let coveredTextLength = 0;
  let overlapCount = 0;
  for (const existing of existingItems) {
    const existingKey = textKey(existing.text);
    if (!existingKey || !(candidateKey.includes(existingKey) || existingKey.includes(candidateKey))) continue;
    const overlap = intersectionArea(candidateBox, textBox(existing));
    if (overlap <= 0) continue;
    overlapCount += 1;
    coveredTextLength += Math.min(candidateKey.length, existingKey.length);
  }
  return overlapCount >= 2 && coveredTextLength >= candidateKey.length * 0.45;
}

async function extractTextWithOcr(referenceTexts = []) {
  if (!globalThis.Tesseract) {
    setStatus("OCR library could not be loaded. Embedded PDF text only.", true);
    return [];
  }
  const reference = buildOcrReference(referenceTexts);
  lastOcrRejectedCount = 0;

  const result = await globalThis.Tesseract.recognize(pdfCanvas, ocrLang?.value || "jpn+eng", {
    workerPath: localAssetUrl("./vendor/tesseract/worker.min.js"),
    corePath: localAssetUrl("./vendor/tesseract/core"),
    langPath: localAssetUrl("./vendor/tesseract/lang"),
    gzip: true,
    cacheMethod: "none",
    logger: (message) => {
      if (message.status === "recognizing text") {
        setStatus(`Running OCR on image text... ${Math.round(message.progress * 100)}%`);
      }
    },
  });

  const items = result?.data?.words?.length ? result.data.words : result?.data?.lines || [];
  return items
    .map((ocrItem) => {
      const text = normalizeText(ocrItem.text);
      const box = ocrItem.bbox;
      if (!text || !box) return null;
      const rawHeight = Math.max(4, box.y1 - box.y0);
      const rawWidth = Math.max(rawHeight * 0.6, box.x1 - box.x0);
      if (!isLikelyOcrText(text, rawWidth, rawHeight, ocrItem.confidence)) {
        lastOcrRejectedCount += 1;
        return null;
      }
      const normalized = normalizeOcrMetrics(text, rawWidth, rawHeight, reference);
      if (!normalized) {
        lastOcrRejectedCount += 1;
        return null;
      }
      const charSpacing = estimateCharSpacing(text, normalized.width, normalized.height);
      const item = {
        text,
        x: box.x0,
        y: box.y1,
        height: normalized.height,
        width: normalized.width,
        rawHeight,
        rawWidth,
        charSpacing,
        confidence: ocrItem.confidence,
        angle: 0,
        canvasAngle: 0,
        source: "ocr",
      };
      if (!isOcrTextAllowedByPdfContext(item, reference)) {
        lastOcrRejectedCount += 1;
        return null;
      }
      if (isBadOcrComplement(item, reference)) {
        lastOcrRejectedCount += 1;
        return null;
      }
      return {
        ...item,
        glyphs: glyphsFromTextItem(item),
      };
    })
    .filter(Boolean);
}

function buildOcrReference(referenceTexts) {
  const pdfTexts = referenceTexts.filter((item) => item.source === "pdf");
  const heights = pdfTexts.map((item) => item.height || 0).filter((value) => Number.isFinite(value) && value > 0);
  const medianHeight = heights.length ? median(heights) : 0;
  return {
    items: pdfTexts.map((item) => ({
      ...item,
      box: textBox(item),
    })),
    vocabulary: buildPdfTextVocabulary(pdfTexts),
    medianHeight,
    pageWidth: renderedViewport?.width || pdfCanvas.width || 0,
    pageHeight: renderedViewport?.height || pdfCanvas.height || 0,
  };
}

function buildPdfTextVocabulary(items) {
  const keys = new Set();
  for (const item of items) {
    for (const part of pdfTextVocabularyParts(item.text)) {
      const key = textKey(part);
      if (key.length >= 2) keys.add(key);
    }
  }
  return keys;
}

function pdfTextVocabularyParts(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return [
    normalized,
    ...normalized.split(/[\s,，、/／|｜()（）\[\]【】]+/).filter(Boolean),
  ];
}

function isOcrTextAllowedByPdfContext(item, reference) {
  const key = textKey(item.text);
  if (!key) return false;
  if (!reference.items.length) return true;
  if (isStrongDimensionOrTagKey(key)) return true;
  if (hasJapaneseTextKey(key)) return isKnownPdfTextLike(key, reference.vocabulary);
  if (/[A-Za-z]/.test(key)) return isKnownPdfTextLike(key, reference.vocabulary);
  return key.length >= 2 && /\d/.test(key);
}

function isStrongDimensionOrTagKey(key) {
  if (/^sd\d{2,}$/i.test(key)) return true;
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(key)) return true;
  if (/^\d+(?:\.\d+)?[-－–]\d+(?:\.\d+)?$/.test(key)) return true;
  if (/^[φΦ]\d+(?:\.\d+)?$/.test(key)) return true;
  return false;
}

function hasJapaneseTextKey(key) {
  return /[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/u.test(key);
}

function isKnownPdfTextLike(key, vocabulary) {
  if (!vocabulary || !vocabulary.size) return false;
  if (vocabulary.has(key)) return true;
  for (const known of vocabulary) {
    if (known.length < 2) continue;
    if (key.includes(known) || known.includes(key)) return true;
    const minLength = Math.min(key.length, known.length);
    if (minLength >= 4 && stringSimilarity(key, known) >= 0.72) return true;
  }
  return false;
}

function stringSimilarity(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (!maxLength) return 1;
  return 1 - editDistance(a, b) / maxLength;
}

function editDistance(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const dp = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = dp[j];
      dp[j] = left[i - 1] === right[j - 1]
        ? prev
        : Math.min(prev, dp[j - 1], dp[j]) + 1;
      prev = old;
    }
  }
  return dp[right.length];
}

function normalizeOcrMetrics(text, rawWidth, rawHeight, reference) {
  const keyLength = Math.max(1, textKey(text).length);
  const medianHeight = reference.medianHeight || rawHeight || 10;
  const pageWidth = reference.pageWidth || pdfCanvas.width || 1;
  const pageHeight = reference.pageHeight || pdfCanvas.height || 1;
  const rawAspect = rawWidth / Math.max(1, rawHeight);

  if (rawHeight > Math.max(28, medianHeight * 3.4) && keyLength > 3) return null;
  if (rawWidth > Math.max(pageWidth * 0.2, medianHeight * 24) && keyLength > 8) return null;
  if (rawHeight > pageHeight * 0.055 && keyLength > 4) return null;
  if (rawAspect > 18 && keyLength > 10) return null;

  const height = clamp(rawHeight, Math.max(5, medianHeight * 0.65), Math.max(8, medianHeight * 1.45));
  const estimated = estimateTextWidth(text, height);
  const maxWidth = Math.max(estimated * 1.8, height * Math.min(18, keyLength + 2));
  const width = clamp(rawWidth, Math.max(height * 0.45, estimated * 0.45), maxWidth);
  return { height, width };
}

function isBadOcrComplement(item, reference) {
  const box = textBox({
    ...item,
    width: item.rawWidth || item.width,
    height: item.rawHeight || item.height,
  });
  const key = textKey(item.text);
  const medianHeight = reference.medianHeight || item.height || 1;
  const pageWidth = reference.pageWidth || pdfCanvas.width || 1;
  const pageHeight = reference.pageHeight || pdfCanvas.height || 1;

  const rawHeight = item.rawHeight || item.height;
  const rawWidth = item.rawWidth || item.width;

  if (reference.items.length) {
    if (rawHeight > Math.max(28, medianHeight * 3.2) && key.length > 3) return true;
    if (rawWidth > Math.max(medianHeight * 24, pageWidth * 0.22) && key.length > 8) return true;
    if (rawHeight > pageHeight * 0.05 && key.length > 4) return true;
  }

  let overlapArea = 0;
  let overlapCount = 0;
  for (const existing of reference.items) {
    const guardBox = expandBox(existing.box, Math.max(2, medianHeight * 0.75));
    if (pointInBox(box.cx, box.cy, guardBox)) return true;
    if (boxCenterDistance(box, existing.box) <= Math.max(medianHeight * 1.8, rawHeight * 1.4)) return true;
    const area = intersectionArea(box, existing.box);
    if (area <= 0) continue;
    overlapArea += area;
    if (area / Math.max(1, box.area) > 0.35) return true;
    if (area / Math.max(1, Math.min(box.area, existing.box.area)) > 0.08) {
      overlapCount += 1;
    }
    if (isSimilarText(item.text, existing.text) && area / Math.max(1, Math.min(box.area, existing.box.area)) > 0.12) {
      return true;
    }
  }

  const overlapRatio = overlapArea / Math.max(1, box.area);
  if (overlapCount >= 4 && overlapRatio > 0.4) return true;
  if (overlapRatio > 0.75) return true;

  return false;
}

function expandBox(box, amount) {
  const expanded = {
    left: box.left - amount,
    right: box.right + amount,
    top: box.top - amount,
    bottom: box.bottom + amount,
  };
  expanded.area = Math.max(1, (expanded.right - expanded.left) * (expanded.bottom - expanded.top));
  expanded.cx = (expanded.left + expanded.right) / 2;
  expanded.cy = (expanded.top + expanded.bottom) / 2;
  return expanded;
}

function pointInBox(x, y, box) {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function boxCenterDistance(a, b) {
  return Math.hypot((a.cx || 0) - (b.cx || 0), (a.cy || 0) - (b.cy || 0));
}

function dedupeTexts(texts) {
  const out = [];
  const sorted = [...texts].sort((a, b) => sourceRank(a) - sourceRank(b));

  for (const item of sorted) {
    const duplicateIndex = out.findIndex((existing) => isDuplicateText(existing, item));
    if (duplicateIndex >= 0) {
      const existing = out[duplicateIndex];
      if (shouldReplaceText(existing, item)) out[duplicateIndex] = item;
      continue;
    }
    out.push(item);
  }

  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

function groupAdjacentTextRuns(texts) {
  const ocrItems = texts.filter((item) => item.source === "ocr");
  const mergeableItems = texts.filter((item) => item.source !== "ocr");
  const groups = new Map();
  for (const item of mergeableItems) {
    const angle = Math.round((item.angle || 0) / 5) * 5;
    const key = `${item.source}:${angle}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...item, angle });
  }

  const merged = [];
  for (const items of groups.values()) {
    merged.push(...groupSameAngleTextRuns(items));
  }
  return [...merged, ...ocrItems];
}

function groupSameAngleTextRuns(items) {
  const runs = [];
  const sorted = [...items].sort((a, b) => {
    const ap = textProjection(a);
    const bp = textProjection(b);
    return ap.cross - bp.cross || ap.along - bp.along;
  });

  for (const item of sorted) {
    const projection = textProjection(item);
    let target = null;
    for (const run of runs) {
      if (canAppendToTextRun(run, item, projection)) {
        target = run;
        break;
      }
    }

    if (!target) {
      runs.push({
        items: [item],
        angle: item.angle || 0,
        source: item.source,
        cross: projection.cross,
        start: projection.along,
        end: projection.along + runTextWidth(item),
        height: item.height || 10,
      });
      continue;
    }

    target.items.push(item);
    target.end = Math.max(target.end, projection.along + runTextWidth(item));
    target.height = Math.max(target.height, item.height || target.height);
    target.cross = (target.cross * (target.items.length - 1) + projection.cross) / target.items.length;
  }

  return runs.flatMap((run) => mergeTextRun(run));
}

function canAppendToTextRun(run, item, projection) {
  if (run.source !== item.source) return false;
  const height = Math.max(run.height || 1, item.height || 1);
  const sameBaseline = Math.abs(run.cross - projection.cross) <= height * 0.9;
  const gap = projection.along - run.end;
  const closeEnough = gap >= -height * 1.2 && gap <= height * 3.2;
  return sameBaseline && closeEnough;
}

function mergeTextRun(run) {
  const items = [...run.items].sort((a, b) => textProjection(a).along - textProjection(b).along);
  if (items.length <= 1) return items;

  const merged = [];
  let active = [items[0]];
  for (let i = 1; i < items.length; i += 1) {
    const prev = active[active.length - 1];
    const next = items[i];
    if (shouldJoinTextItems(prev, next)) active.push(next);
    else {
      merged.push(buildMergedTextItem(active));
      active = [next];
    }
  }
  merged.push(buildMergedTextItem(active));
  return merged;
}

function shouldJoinTextItems(prev, next) {
  const prevProjection = textProjection(prev);
  const nextProjection = textProjection(next);
  const prevWidth = runTextWidth(prev);
  const gap = nextProjection.along - (prevProjection.along + prevWidth);
  const height = Math.max(prev.height || 1, next.height || 1);
  const sameBaseline = Math.abs(prevProjection.cross - nextProjection.cross) <= height * 0.9;
  return sameBaseline && gap >= -height * 1.2 && gap <= height * 3.2;
}

function buildMergedTextItem(items) {
  const first = items[0];
  const angle = first.angle || 0;
  const canvasAngle = textCanvasAngle(first);
  const projections = items.map(textProjection);
  const start = Math.min(...projections.map((projection) => projection.along));
  const end = Math.max(...items.map((item, index) => {
    const width = runTextWidth(item);
    return projections[index].along + width;
  }));
  const text = joinTextItems(items);
  const glyphs = items.flatMap((item) => item.glyphs?.length ? item.glyphs : glyphsFromTextItem(item));
  const rawWidth = Math.max(1, end - start);
  const medianHeight = median(items.map((item) => item.height || 1));
  const height = Math.max(1, medianHeight);
  const cross = average(projections.map((projection) => projection.cross));
  const origin = pointFromProjection(start, cross, canvasAngle);

  return {
    ...first,
    text,
    x: origin.x,
    y: origin.y,
    width: Math.max(height * 0.6, rawWidth),
    height,
    charSpacing: estimateCharSpacing(text, Math.max(height * 0.6, end - start), height),
    angle,
    canvasAngle,
    glyphs,
  };
}

function glyphsFromTextItem(item) {
  const chars = Array.from(normalizeText(item.text));
  if (!chars.length) return [];
  const advances = distributeCharacterAdvances(chars, Math.max(1, item.width || estimateTextWidth(item.text, item.height || 10)));
  const canvasAngle = textCanvasAngle(item);
  let offset = 0;
  return chars.map((char, index) => {
    const point = pointAtAngle(item.x, item.y, offset, canvasAngle);
    const glyph = {
      text: char,
      x: point.x,
      y: point.y,
      width: advances[index],
      height: item.height || 10,
      angle: item.angle || 0,
      canvasAngle,
    };
    offset += advances[index];
    return glyph;
  });
}

function joinTextItems(items) {
  let out = normalizeText(items[0].text);
  for (let i = 1; i < items.length; i += 1) {
    const prev = items[i - 1];
    const next = items[i];
    const prevProjection = textProjection(prev);
    const nextProjection = textProjection(next);
    const prevWidth = runTextWidth(prev);
    const gap = nextProjection.along - (prevProjection.along + prevWidth);
    const height = Math.max(prev.height || 1, next.height || 1);
    out += gap > height * 0.65 ? " " : "";
    out += normalizeText(next.text);
  }
  return out;
}

function textProjection(item) {
  const radians = textCanvasAngle(item) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    along: item.x * cos + item.y * sin,
    cross: -item.x * sin + item.y * cos,
  };
}

function textCanvasAngle(item) {
  return Number.isFinite(item?.canvasAngle) ? item.canvasAngle : normalizeAngle(-(item?.angle || 0));
}

function textCanvasAngleFromTransform(transform) {
  return normalizeAngle(Math.atan2(transform[1], transform[0]) * 180 / Math.PI);
}

function textDxfAngleFromTransform(transform) {
  return normalizeAngle(Math.atan2(-transform[1], transform[0]) * 180 / Math.PI);
}

function runTextWidth(item) {
  const estimated = estimateTextWidth(item.text, item.height || 10);
  const measured = Number(item.width) || 0;
  if (measured <= 0) return estimated;
  return Math.max(measured, estimated * 0.15);
}

function pointFromProjection(along, cross, angle) {
  const radians = angle * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: along * cos - cross * sin,
    y: along * sin + cross * cos,
  };
}

function isDuplicateText(a, b) {
  if (!isSimilarText(a.text, b.text)) return false;
  if (a.source === "pdf" && b.source === "pdf") return isDuplicatePdfText(a, b);
  const abox = textBox(a);
  const bbox = textBox(b);
  const overlap = intersectionArea(abox, bbox);
  const smaller = Math.min(boxArea(abox), boxArea(bbox));
  const height = Math.max(a.height || 1, b.height || 1);
  const samePlace = isSameTextPlacement(a, b, height);
  return overlap / Math.max(1, smaller) > 0.12
    || samePlace
    || isSameTextBaseline(a, b, height)
    || isTextSpanContained(a, b, height);
}

function isDuplicatePdfText(a, b) {
  const abox = textBox(a);
  const bbox = textBox(b);
  const overlap = intersectionArea(abox, bbox);
  const smaller = Math.min(boxArea(abox), boxArea(bbox));
  const height = Math.max(a.height || 1, b.height || 1);
  return overlap / Math.max(1, smaller) > 0.34
    || isSameTextPlacement(a, b, height);
}

function isSameTextPlacement(a, b, height) {
  const angleDiff = Math.abs(shortAngleDiff(a.angle || 0, b.angle || 0));
  if (angleDiff > 5) return false;
  const ap = textProjection(a);
  const bp = textProjection(b);
  const alongDistance = Math.abs(ap.along - bp.along);
  const crossDistance = Math.abs(ap.cross - bp.cross);
  return alongDistance <= height * 0.45 && crossDistance <= height * 0.45;
}

function shouldReplaceText(existing, next) {
  if (existing.source !== "pdf" && next.source === "pdf") return true;
  if (existing.source === "pdf" && next.source !== "pdf") return false;
  const existingLength = textKey(existing.text).length;
  const nextLength = textKey(next.text).length;
  if (nextLength !== existingLength) return nextLength > existingLength;
  return textBox(next).area > textBox(existing).area;
}

function isSimilarText(a, b) {
  const left = textKey(a);
  const right = textKey(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function textKey(value) {
  return normalizeText(value).replace(/\s+/g, "").toLowerCase();
}

function sourceRank(item) {
  return item.source === "pdf" ? 0 : 1;
}

function isSameTextBaseline(a, b, height) {
  const angleDiff = Math.abs(shortAngleDiff(a.angle || 0, b.angle || 0));
  if (angleDiff > 8) return false;

  const ap = textProjection(a);
  const bp = textProjection(b);
  const alongDistance = Math.abs(ap.along - bp.along);
  const crossDistance = Math.abs(ap.cross - bp.cross);
  const maxWidth = Math.max(runTextWidth(a), runTextWidth(b), height);
  return crossDistance <= height * 1.1 && alongDistance <= Math.max(height * 2.5, maxWidth * 0.45);
}

function isTextSpanContained(a, b, height) {
  const aKey = textKey(a.text);
  const bKey = textKey(b.text);
  if (!aKey || !bKey) return false;
  if (!(aKey.includes(bKey) || bKey.includes(aKey))) return false;

  const angleDiff = Math.abs(shortAngleDiff(a.angle || 0, b.angle || 0));
  if (angleDiff > 8) return false;

  const ap = textProjection(a);
  const bp = textProjection(b);
  const spans = [
    { start: ap.along, end: ap.along + runTextWidth(a), cross: ap.cross },
    { start: bp.along, end: bp.along + runTextWidth(b), cross: bp.cross },
  ];
  spans.forEach((span) => {
    span.width = Math.max(0, span.end - span.start);
  });
  const crossDistance = Math.abs(spans[0].cross - spans[1].cross);
  if (crossDistance > height * 1.25) return false;

  const [small, large] = spans[0].width <= spans[1].width
    ? [spans[0], spans[1]]
    : [spans[1], spans[0]];
  const pad = height * 1.4;
  return small.start >= large.start - pad && small.end <= large.end + pad;
}

function shortAngleDiff(a, b) {
  let diff = (a - b) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function textBox(item) {
  const width = Math.max(item.height || 1, item.width || estimateTextWidth(item.text, item.height || 10));
  const height = Math.max(1, item.height || 10);
  const left = item.x;
  const right = item.x + width;
  const top = item.y - height;
  const bottom = item.y;
  const area = Math.max(1, (right - left) * (bottom - top));
  return {
    left,
    right,
    top,
    bottom,
    area,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
  };
}

function intersectionArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function boxArea(box) {
  return box.area;
}

function drawVectorOverlay() {
  const ctx = vectorCanvas.getContext("2d");
  ctx.clearRect(0, 0, vectorCanvas.width, vectorCanvas.height);

  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.78;
  for (const line of tracedLines) {
    if (!shouldPreviewLine(line)) continue;
    ctx.strokeStyle = previewLinetypeColor(line.linetype, "#d92d20");
    ctx.setLineDash(canvasDashPattern(line.linetype));
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = "#7a3dd8";
  ctx.lineWidth = 1.5;
  for (const circle of tracedCircles) {
    if (!shouldPreviewLinetype(circle.linetype)) continue;
    ctx.strokeStyle = previewLinetypeColor(circle.linetype, "#7a3dd8");
    ctx.setLineDash(canvasDashPattern(circle.linetype));
    ctx.beginPath();
    ctx.arc(circle.cx, circle.cy, circle.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const arc of tracedArcs) {
    if (!shouldPreviewLinetype(arc.linetype)) continue;
    ctx.strokeStyle = previewLinetypeColor(arc.linetype, "#7a3dd8");
    ctx.setLineDash(canvasDashPattern(arc.linetype));
    ctx.beginPath();
    ctx.arc(arc.cx, arc.cy, arc.r, arc.startAngle * Math.PI / 180, arc.endAngle * Math.PI / 180);
    ctx.stroke();
  }
  for (const ellipse of tracedEllipses) {
    if (!shouldPreviewLinetype(ellipse.linetype)) continue;
    const rx = Math.hypot(ellipse.majorX, ellipse.majorY);
    const ry = rx * ellipse.ratio;
    const rotation = Math.atan2(ellipse.majorY, ellipse.majorX);
    ctx.strokeStyle = previewLinetypeColor(ellipse.linetype, "#7a3dd8");
    ctx.setLineDash(canvasDashPattern(ellipse.linetype));
    ctx.beginPath();
    ctx.ellipse(ellipse.cx, ellipse.cy, rx, ry, rotation, ellipse.startParam, ellipse.endParam);
    ctx.stroke();
  }
  for (const spline of tracedSplines) {
    if (!shouldPreviewLinetype(spline.linetype)) continue;
    ctx.strokeStyle = previewLinetypeColor(spline.linetype, "#7a3dd8");
    ctx.setLineDash(canvasDashPattern(spline.linetype));
    ctx.beginPath();
    ctx.moveTo(spline.points[0].x, spline.points[0].y);
    ctx.bezierCurveTo(
      spline.points[1].x,
      spline.points[1].y,
      spline.points[2].x,
      spline.points[2].y,
      spline.points[3].x,
      spline.points[3].y,
    );
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.92;
  for (const item of tracedTexts) {
    ctx.fillStyle = item.source === "ocr" ? "#7a2e83" : "#0b5f59";
    ctx.strokeStyle = item.source === "ocr" ? "#7a2e83" : "#0b5f59";
    drawTextOverlayItem(ctx, item);
  }
  if (showDxfCompare) {
    drawDxfCompareOverlay(ctx);
  } else {
    setText(dxfCompareValue, "Delta -");
  }
  drawScaleCalibrationOverlay(ctx);
  ctx.globalAlpha = 1;
}

function drawTextOverlayItem(ctx, item) {
  const sourceHeight = Math.max(1, item.height || 8);
  const sourceWidth = Math.max(sourceHeight * 0.12, item.width || estimateTextWidth(item.text, sourceHeight));
  const height = Math.max(1, sourceHeight * safeScale(textHeightScale?.value));
  const rawWidth = sourceWidth * safeScale(textWidthScale?.value);
  const hasMeasuredGlyphs = Array.isArray(item.glyphs) && item.glyphs.length > 0;
  const width = hasMeasuredGlyphs ? Math.max(height * 0.12, rawWidth) : Math.max(height * 0.6, rawWidth);
  const point = shiftedTextPoint(item);
  const angle = textCanvasAngle(item) * Math.PI / 180;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.font = `${height}px sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(item.text, 0, 0);
  ctx.strokeRect(0, -height, width, height);
  ctx.restore();
}

function drawDxfCompareOverlay(ctx) {
  if (!renderedViewport) return;
  const transform = makeDxfTransform();
  const project = makeDxfToPreviewProjector();
  const stats = createCompareStats();

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = "#0ba5ec";
  ctx.fillStyle = "#0ba5ec";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([]);

  for (const line of tracedLines) {
    if (!shouldPreviewLine(line)) continue;
    ctx.setLineDash(canvasDashPattern(line.linetype));
    const p1 = project(transform.point(line.x1, line.y1));
    const p2 = project(transform.point(line.x2, line.y2));
    addComparePoint(stats, { x: line.x1, y: line.y1 }, p1);
    addComparePoint(stats, { x: line.x2, y: line.y2 }, p2);
    drawProjectedPolyline(ctx, [p1, p2]);
  }

  ctx.setLineDash([]);
  for (const circle of tracedCircles) {
    if (!shouldPreviewLinetype(circle.linetype)) continue;
    ctx.setLineDash(canvasDashPattern(circle.linetype));
    drawProjectedSampledPath(ctx, sampleCirclePoints(circle, 96), transform, project, stats);
  }
  for (const arc of tracedArcs) {
    if (!shouldPreviewLinetype(arc.linetype)) continue;
    ctx.setLineDash(canvasDashPattern(arc.linetype));
    drawProjectedSampledPath(ctx, sampleArcPoints(arc, 48), transform, project, stats);
  }
  for (const ellipse of tracedEllipses) {
    if (!shouldPreviewLinetype(ellipse.linetype)) continue;
    ctx.setLineDash(canvasDashPattern(ellipse.linetype));
    drawProjectedSampledPath(ctx, sampleEllipsePoints(ellipse, 72), transform, project, stats);
  }
  for (const spline of tracedSplines) {
    if (!shouldPreviewLinetype(spline.linetype)) continue;
    ctx.setLineDash(canvasDashPattern(spline.linetype));
    drawProjectedSampledPath(ctx, sampleSplinePoints(spline, 32), transform, project, stats);
  }
  ctx.setLineDash([]);

  for (const item of tracedTexts) {
    drawProjectedTextCompare(ctx, item, transform, project, stats);
  }

  ctx.restore();
  updateDxfCompareSummary(stats);
}

function makeDxfToPreviewProjector() {
  const k = baseDxfUnit();
  const denominator = getDimensionScaleDenominator();
  const paperToCanvas = k * denominator;
  const h = renderedViewport.height;
  return (point) => ({
    x: point.x / paperToCanvas,
    y: h - point.y / paperToCanvas,
  });
}

function drawProjectedSampledPath(ctx, points, transform, project, stats) {
  if (points.length < 2) return;
  const projected = points.map((point) => {
    const out = project(transform.point(point.x, point.y));
    addComparePoint(stats, point, out);
    return out;
  });
  drawProjectedPolyline(ctx, projected);
}

function drawProjectedPolyline(ctx, points) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function drawProjectedTextCompare(ctx, item, transform, project, stats) {
  const angle = item.angle || 0;
  const source = shiftedTextPoint(item);
  const dxfPoint = transform.point(source.x, source.y);
  const point = project(dxfPoint);
  const heightScale = safeScale(textHeightScale?.value);
  const widthScale = safeScale(textWidthScale?.value);
  const denominator = getDimensionScaleDenominator();
  const sourceHeight = Math.max(1, item.height || 1);
  const sourceWidth = Math.max(sourceHeight * 0.12, item.width || estimateTextWidth(item.text, sourceHeight));
  const height = Math.max(1, sourceHeight * transform.perpScale(angle, source.x, source.y) * heightScale / denominator);
  const rawWidth = sourceWidth * transform.alongScale(angle, source.x, source.y) / denominator;
  const hasMeasuredGlyphs = Array.isArray(item.glyphs) && item.glyphs.length > 0;
  const width = hasMeasuredGlyphs
    ? Math.max(height * 0.12, rawWidth * widthScale)
    : Math.max(height * 0.6, rawWidth * widthScale);
  const canvasAngleDegrees = normalizeAngle(-transform.angle(angle, source.x, source.y));
  const canvasAngle = canvasAngleDegrees * Math.PI / 180;

  const sourceCorners = textBoxCorners(item.x, item.y, sourceWidth, sourceHeight, textCanvasAngle(item));
  const projectedCorners = textBoxCorners(point.x, point.y, width, height, canvasAngleDegrees);
  for (let i = 0; i < sourceCorners.length; i += 1) {
    addComparePoint(stats, sourceCorners[i], projectedCorners[i]);
  }

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(canvasAngle);
  ctx.font = `${height}px sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(item.text, 0, 0);
  ctx.strokeRect(0, -height, width, height);
  ctx.restore();
}

function textBoxCorners(x, y, width, height, angleDegrees) {
  const radians = angleDegrees * Math.PI / 180;
  const along = { x: Math.cos(radians), y: Math.sin(radians) };
  const up = { x: Math.cos(radians - Math.PI / 2), y: Math.sin(radians - Math.PI / 2) };
  const p0 = { x, y };
  const p1 = { x: x + along.x * width, y: y + along.y * width };
  const p3 = { x: x + up.x * height, y: y + up.y * height };
  const p2 = { x: p1.x + up.x * height, y: p1.y + up.y * height };
  return [p0, p1, p2, p3];
}

function shiftedTextPoint(item, x = item.x, y = item.y) {
  const k = Math.max(0.000001, baseDxfUnit());
  const along = safeNumber(textShiftAlongMm?.value, 0) / k;
  const up = safeNumber(textShiftUpMm?.value, 0) / k;
  if (Math.abs(along) < 0.000001 && Math.abs(up) < 0.000001) {
    return { x, y };
  }
  const angle = textCanvasAngle(item);
  const radians = angle * Math.PI / 180;
  return {
    x: x + Math.cos(radians) * along + Math.cos(radians - Math.PI / 2) * up,
    y: y + Math.sin(radians) * along + Math.sin(radians - Math.PI / 2) * up,
  };
}

function textFineShiftSummary() {
  const along = safeNumber(textShiftAlongMm?.value, 0);
  const up = safeNumber(textShiftUpMm?.value, 0);
  if (Math.abs(along) < 0.000001 && Math.abs(up) < 0.000001) return "";
  return ` / text shift along ${formatNumber(along)}mm vertical ${formatNumber(up)}mm`;
}

function textSourceSummary() {
  const pdfCount = tracedTexts.filter((item) => item.source === "pdf").length;
  const ocrCount = tracedTexts.filter((item) => item.source === "ocr").length;
  const otherCount = tracedTexts.length - pdfCount - ocrCount;
  const parts = [];
  if (pdfCount) {
    parts.push(lastPdfFallbackTextCount ? `PDF ${pdfCount} incl fallback ${lastPdfFallbackTextCount}` : `PDF ${pdfCount}`);
  }
  if (ocrCount) parts.push(`OCR ${ocrCount}`);
  if (otherCount) parts.push(`Other ${otherCount}`);
  return parts.length ? ` (${parts.join(" / ")})` : "";
}

function analysisCleanupText() {
  const measuredGlyphCount = tracedTexts.reduce((sum, item) => sum + (Array.isArray(item.glyphs) ? item.glyphs.length : 0), 0);
  const sourceText = textSourceSummary();
  const heightScaleText = formatNumber(safeScale(textHeightScale?.value));
  const dxfScale = getDxfScale();
  const scaleText = ` / ScaleXx${formatNumber(dxfScale.x)} Yx${formatNumber(dxfScale.y)}`;
  const fixedScaleText = ` / Drawing scale 1/${formatNumber(getDimensionScaleDenominator())}`;
  const rejectedText = lastOcrRejectedCount ? ` / OCR rejected ${lastOcrRejectedCount}` : "";
  const textGroupText = lastTextGroupMergedCount ? ` / text runs merged ${lastTextGroupMergedCount}` : "";
  const textDedupeText = lastTextDedupeRemovedCount ? ` / text duplicates removed ${lastTextDedupeRemovedCount}` : "";
  const lineCleanupText = lastLineOverlapRemoved ? ` / duplicate lines removed ${lastLineOverlapRemoved}` : "";
  const paperEdgeText = lastPaperEdgeRemoved ? ` / paper-edge lines removed ${lastPaperEdgeRemoved}` : "";
  return ` / text items ${tracedTexts.length}${sourceText}${rejectedText}${textGroupText}${textDedupeText} / measured glyphs ${measuredGlyphCount} / text height x${heightScaleText}${dxfFineShiftSummary()}${textFineShiftSummary()}${scaleText}${fixedScaleText}${lineTypeSummaryText()}${lineCleanupText}${paperEdgeText} / curve-line cleanup OFF`;
}

function lineTypeModeLabel() {
  const value = lineTypeSensitivity?.value || "balanced";
  if (value === "safe") return "Safe";
  if (value === "diagnostic") return "Diagnostic";
  if (value === "firm") return "Firm";
  return "Balanced";
}

function lineTypePreviewFilterLabel() {
  const value = lineTypePreviewFilter?.value || "all";
  if (value === "all") return "All";
  if (value === "changed") return "Changed";
  if (value === "continuous") return "Continuous";
  if (value === "non-solid") return "Non-solid";
  const linetype = DXF_LINETYPES.find((item) => item.name === value);
  return linetype ? linetype.name : "All";
}

function lineTypeStats(lines = tracedLines) {
  const counts = new Map();
  for (const line of lines) {
    const name = normalizeDxfLinetype(line.linetype);
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const continuous = counts.get("CONTINUOUS") || 0;
  const total = Array.isArray(lines) ? lines.length : 0;
  const nonSolid = total - continuous;
  return { counts, continuous, nonSolid, total };
}

function lineTypeDetailText(stats = lineTypeStats()) {
  if (!stats.total) return "-";
  const detail = DXF_LINETYPES
    .map((linetype) => linetype.name)
    .filter((name) => stats.counts.get(name))
    .map((name) => `${name} ${stats.counts.get(name).toLocaleString("ja-JP")}`)
    .join(" / ");
  return detail || "-";
}

function lineTypeCompactText(stats = lineTypeStats()) {
  if (!stats.total) return "-";
  if (!stats.nonSolid) return "continuous only";
  return `${stats.nonSolid.toLocaleString("ja-JP")} non-solid`;
}

function lineTypeModeCompareText() {
  if (!lineTypeSourceLines.length) return "-";
  return LINETYPE_SENSITIVITY_MODES
    .map((mode) => {
      const lines = cleanedLinesForSensitivity(mode.value);
      const stats = lineTypeStats(lines);
      return `${mode.shortLabel} ${stats.nonSolid.toLocaleString("ja-JP")}`;
    })
    .join(" / ");
}

function cleanedLinesForSensitivity(sensitivity) {
  const lines = processedLinesForSensitivity(sensitivity);
  return removePaperEdgeLines(cleanupOverlappingLines(lines));
}

function lineTypeSummaryText() {
  const stats = lineTypeStats();
  if (!stats.total) return "";
  const sensitivity = lineTypeModeLabel();
  if (!stats.nonSolid) return ` / linetypes continuous / sensitivity ${sensitivity}`;
  const detail = DXF_LINETYPES
    .map((linetype) => linetype.name)
    .filter((name) => name !== "CONTINUOUS" && stats.counts.get(name))
    .map((name) => `${name} ${stats.counts.get(name)}`)
    .join(" ");
  return ` / non-solid lines ${stats.nonSolid}${detail ? ` (${detail})` : ""} / sensitivity ${sensitivity}`;
}

function dxfFineShiftActual() {
  const denominator = getDimensionScaleDenominator();
  return {
    x: safeNumber(dxfShiftXMm?.value, 0) * denominator,
    y: safeNumber(dxfShiftYMm?.value, 0) * denominator,
  };
}

function dxfFineShiftSummary() {
  const x = safeNumber(dxfShiftXMm?.value, 0);
  const y = safeNumber(dxfShiftYMm?.value, 0);
  if (Math.abs(x) < 0.000001 && Math.abs(y) < 0.000001) return "";
  return ` / global shift X${formatNumber(x)}mm Y${formatNumber(y)}mm`;
}

function sampleCirclePoints(circle, steps) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = i / steps * Math.PI * 2;
    points.push({
      x: circle.cx + Math.cos(angle) * circle.r,
      y: circle.cy + Math.sin(angle) * circle.r,
    });
  }
  return points;
}

function sampleArcPoints(arc, steps) {
  const start = arc.startAngle * Math.PI / 180;
  let end = arc.endAngle * Math.PI / 180;
  if (end < start) end += Math.PI * 2;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = start + (end - start) * i / steps;
    points.push({
      x: arc.cx + Math.cos(angle) * arc.r,
      y: arc.cy + Math.sin(angle) * arc.r,
    });
  }
  return points;
}

function sampleEllipsePoints(ellipse, steps) {
  const rx = Math.hypot(ellipse.majorX, ellipse.majorY);
  const ry = rx * ellipse.ratio;
  const rotation = Math.atan2(ellipse.majorY, ellipse.majorX);
  let start = ellipse.startParam;
  let end = ellipse.endParam;
  if (end < start) end += Math.PI * 2;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (end - start) * i / steps;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    points.push({
      x: ellipse.cx + x * Math.cos(rotation) - y * Math.sin(rotation),
      y: ellipse.cy + x * Math.sin(rotation) + y * Math.cos(rotation),
    });
  }
  return points;
}

function sampleSplinePoints(spline, steps) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(cubicBezierPoint(spline.points[0], spline.points[1], spline.points[2], spline.points[3], i / steps));
  }
  return points;
}

function createCompareStats() {
  return { count: 0, sumPx: 0, maxPx: 0 };
}

function addComparePoint(stats, source, projected) {
  const distance = Math.hypot((projected.x || 0) - source.x, (projected.y || 0) - source.y);
  if (!Number.isFinite(distance)) return;
  stats.count += 1;
  stats.sumPx += distance;
  stats.maxPx = Math.max(stats.maxPx, distance);
}

function updateDxfCompareSummary(stats) {
  if (!stats.count) {
    setText(dxfCompareValue, "Delta -");
    return;
  }
  const k = baseDxfUnit();
  const avgMm = stats.sumPx / stats.count * k;
  const maxMm = stats.maxPx * k;
  setText(dxfCompareValue, `Delta avg ${formatNumber(avgMm)}mm max ${formatNumber(maxMm)}mm`);
}

function drawScaleCalibrationOverlay(ctx) {
  const entries = [
    ["x", scaleCalibration.x],
    ["y", scaleCalibration.y],
  ].filter(([, measure]) => measure);

  if (scaleCalibration.mode && scaleCalibration.points.length) {
    const axis = scalePickAxis();
    entries.push([axis, {
      p1: scaleCalibration.points[scaleCalibration.points.length - 1],
      p2: scaleCalibration.hover || scaleCalibration.points[scaleCalibration.points.length - 1],
      preview: true,
    }]);
  } else if (scaleCalibration.mode && scaleCalibration.hover) {
    entries.push([scalePickAxis(), {
      p1: scaleCalibration.hover,
      p2: scaleCalibration.hover,
      preview: true,
    }]);
  }

  if (!entries.length) return;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.font = "12px sans-serif";
  ctx.textBaseline = "bottom";

  for (const [axis, measure] of entries) {
    const color = axis === "x" ? "#1570ef" : "#dc6803";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.setLineDash(measure.preview ? [4, 4] : [8, 4]);
    ctx.beginPath();
    ctx.moveTo(measure.p1.x, measure.p1.y);
    ctx.lineTo(measure.p2.x, measure.p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPickPoint(ctx, measure.p1);
    drawPickPoint(ctx, measure.p2);
    if (!measure.preview) {
      const mx = (measure.p1.x + measure.p2.x) / 2;
      const my = (measure.p1.y + measure.p2.y) / 2;
      ctx.fillText(`${axis.toUpperCase()} ${formatNumber(measure.baseLength)} mm`, mx + 6, my - 6);
      drawScaleBreakPoints(ctx, axis, measure);
    }
  }

  ctx.restore();
}

function drawScaleBreakPoints(ctx, axis, measure) {
  const points = getScaleChildPoints(axis, measure);
  if (!points.length) return;
  const childLengths = getChildLengths(axis);
  points.forEach((point, index) => {
    drawPickPoint(ctx, point);
    ctx.fillText(`${index + 1}/${Math.max(1, childLengths.length + 1)}`, point.x + 6, point.y - 6);
  });
}

function drawPickPoint(ctx, point) {
  if (point.snapped) {
    ctx.save();
    ctx.lineWidth = 2;
    if (point.snapType === "line") {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(point.x - 5, point.y - 5, 10, 10);
      ctx.beginPath();
      ctx.moveTo(point.x - 7, point.y);
      ctx.lineTo(point.x + 7, point.y);
      ctx.moveTo(point.x, point.y - 7);
      ctx.lineTo(point.x, point.y + 7);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function canvasDashPattern(linetype) {
  if (linetype === "DASHED") return [8, 4];
  if (linetype === "HIDDEN") return [5, 5];
  if (linetype === "CENTER") return [14, 4, 4, 4];
  if (linetype === "DOT") return [1.5, 5];
  if (linetype === "DASHDOT") return [10, 4, 2, 4];
  if (linetype === "DIVIDE") return [10, 4, 2, 4, 2, 4];
  if (linetype === "PHANTOM") return [16, 4, 4, 4, 4, 4];
  if (linetype === "BORDER") return [12, 4, 12, 4, 2, 4];
  return [];
}

function shouldPreviewLinetype(linetype) {
  const value = lineTypePreviewFilter?.value || "all";
  const normalized = normalizeDxfLinetype(linetype);
  if (value === "all") return true;
  if (value === "changed") return false;
  if (value === "continuous") return normalized === "CONTINUOUS";
  if (value === "non-solid") return normalized !== "CONTINUOUS";
  return normalized === value;
}

function shouldPreviewLine(line) {
  const value = lineTypePreviewFilter?.value || "all";
  if (value === "changed") return lineChangedFromConservative(line);
  return shouldPreviewLinetype(line.linetype);
}

function lineChangedFromConservative(line) {
  const current = normalizeDxfLinetype(line.linetype);
  const baseline = safeLineTypeMap().get(comparableLineKey(line)) || "CONTINUOUS";
  return current !== baseline;
}

function safeLineTypeMap() {
  if (safeLineTypeMapCache) return safeLineTypeMapCache;
  const map = new Map();
  for (const line of cleanedLinesForSensitivity("safe")) {
    map.set(comparableLineKey(line), normalizeDxfLinetype(line.linetype));
  }
  safeLineTypeMapCache = map;
  return map;
}

function comparableLineKey(line) {
  const projected = projectLine(line);
  return [
    Math.round((projected.angle || 0) * 10),
    Math.round((projected.offset || 0) * 2),
    Math.round((projected.start || 0) * 2),
    Math.round((projected.end || 0) * 2),
  ].join(":");
}

function previewLinetypeColor(linetype, fallback) {
  if (!isChecked(colorPreviewByLinetype)) return fallback;
  return PREVIEW_LINETYPE_COLORS[normalizeDxfLinetype(linetype)] || fallback;
}

function startScaleBreakPick(axis) {
  if (!renderedViewport || !pdfCanvas.width || !pdfCanvas.height) {
    setStatus("Analyze the PDF before picking dimension points.", true);
    return;
  }
  setPanMode(false);
  const childLengths = getChildLengths(axis);
  if (childLengths.length < 1) {
    setStatus(`Enter at least one ${axis.toUpperCase()} dimension value.`, true);
    return;
  }
  scaleCalibration.mode = `${axis}Breaks`;
  scaleCalibration.points = [];
  scaleCalibration.hover = null;
  viewport.classList.add("picking-scale");
  updateModeUi();
  setStatus(`Click ${childLengths.length + 1} ${axis.toUpperCase()} dimension points.`);
  drawVectorOverlay();
}

function handleScalePickClick(event) {
  if (!scaleCalibration.mode) return;
  event.preventDefault();
  event.stopPropagation();
  const point = canvasPointFromEvent(event);
  if (!point) return;
  scaleCalibration.hover = null;
  scaleCalibration.points.push(point);

  const axis = scalePickAxis();
  const requiredPoints = getChildLengths(axis).length + 1;

  if (scaleCalibration.points.length >= requiredPoints) {
    scaleCalibration[axis] = makeScaleMeasure(axis, scaleCalibration.points[0], scaleCalibration.points[scaleCalibration.points.length - 1]);
    scaleCalibration[axis].childPoints = [...scaleCalibration.points];
    scaleCalibration[axis].breaks = scaleCalibration.points.slice(1, -1);
    scaleCalibration.mode = null;
    scaleCalibration.points = [];
    viewport.classList.remove("picking-scale");
    updateModeUi();
    updateScaleCalibrationUi();
    const pickedPoints = scaleCalibration[axis].childPoints;
    const snapText = pickedPoints.some((picked) => picked.snapped) ? " / snapped" : "";
    const doneText = `Captured ${scaleCalibration[axis].childPoints.length} ${axis.toUpperCase()} dimension points`;
    setStatus(`${doneText}${snapText}`);
  } else {
    updateModeUi();
    const snapText = point.snapped ? ` / snapped to ${point.snapLabel}` : "";
    const remaining = requiredPoints - scaleCalibration.points.length;
    setStatus(`Captured ${axis.toUpperCase()} dimension point ${scaleCalibration.points.length}. ${remaining} remaining${snapText}`);
  }

  drawVectorOverlay();
}

function scalePickAxis() {
  return String(scaleCalibration.mode || "").startsWith("y") ? "y" : "x";
}

function handleScalePickMove(event) {
  if (!scaleCalibration.mode) return;
  const point = canvasPointFromEvent(event);
  scaleCalibration.hover = point;
  queueDrawVectorOverlay();
}

function clearScalePickHover() {
  if (!scaleCalibration.mode || !scaleCalibration.hover) return;
  scaleCalibration.hover = null;
  queueDrawVectorOverlay();
}

function canvasPointFromEvent(event) {
  const raw = rawCanvasPointFromEvent(event);
  if (!raw) return null;
  const { point, reference, rect } = raw;
  if (!isChecked(snapScalePick)) return point;
  const screenToCanvas = reference.width / rect.width;
  const tolerance = clamp(24 * screenToCanvas, 8, 120);
  return snapCanvasPoint(point, tolerance);
}

function rawCanvasPointFromEvent(event) {
  const reference = pickReferenceCanvas();
  if (!reference) return null;
  const rect = reference.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (event.clientX - rect.left) * reference.width / rect.width;
  const y = (event.clientY - rect.top) * reference.height / rect.height;
  if (x < 0 || y < 0 || x > reference.width || y > reference.height) return null;
  return { point: { x, y }, reference, rect };
}

function updateViewportCursor(event) {
  const raw = rawCanvasPointFromEvent(event);
  if (!raw || !renderedViewport) {
    clearViewportCursor();
    return;
  }
  const k = baseDxfUnit();
  const x = raw.point.x * k;
  const y = (renderedViewport.height - raw.point.y) * k;
  setText(viewportCursorInfo, `X ${formatNumber(x)} / Y ${formatNumber(y)} mm`);
}

function clearViewportCursor() {
  setText(viewportCursorInfo, "-");
}

function pickReferenceCanvas() {
  const canvases = [pdfCanvas, vectorCanvas];
  for (const canvas of canvases) {
    const style = getComputedStyle(canvas);
    const rect = canvas.getBoundingClientRect();
    if (style.display !== "none" && rect.width > 0 && rect.height > 0) return canvas;
  }
  return null;
}

function snapCanvasPoint(point, tolerance) {
  let best = null;
  const consider = (candidate) => {
    if (!candidate) return;
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance > tolerance) return;
    const priority = candidate.priority || 0;
    const score = distance + priority;
    if (!best || score < best.score) {
      best = { ...candidate, distance, score };
    }
  };

  for (const line of tracedLines) {
    consider({ x: line.x1, y: line.y1, snapType: "endpoint", snapLabel: "endpoint", priority: -6 });
    consider({ x: line.x2, y: line.y2, snapType: "endpoint", snapLabel: "endpoint", priority: -6 });
    consider(projectPointToSegment(point, line));
  }

  for (const intersection of nearbyLineIntersections(point, tolerance)) {
    consider(intersection);
  }

  if (!best) return point;
  return {
    x: best.x,
    y: best.y,
    snapped: true,
    snapType: best.snapType,
    snapLabel: best.snapLabel,
  };
}

function nearbyLineIntersections(point, tolerance) {
  const candidates = [];
  const maxCandidates = 120;

  for (const line of tracedLines) {
    if (!lineBoundsContainsPoint(line, point, tolerance)) continue;
    const distance = distancePointToSegment(point, line);
    if (distance <= tolerance) candidates.push({ line, distance });
  }

  candidates.sort((a, b) => a.distance - b.distance);
  const nearby = candidates.slice(0, maxCandidates).map((entry) => entry.line);
  const intersections = [];

  for (let i = 0; i < nearby.length; i += 1) {
    for (let j = i + 1; j < nearby.length; j += 1) {
      const intersection = segmentIntersection(nearby[i], nearby[j]);
      if (!intersection) continue;
      if (Math.hypot(intersection.x - point.x, intersection.y - point.y) <= tolerance) {
        intersections.push({
          ...intersection,
          snapType: "intersection",
          snapLabel: "intersection",
          priority: -8,
        });
      }
    }
  }

  return intersections;
}

function lineBoundsContainsPoint(line, point, tolerance) {
  const minX = Math.min(line.x1, line.x2) - tolerance;
  const maxX = Math.max(line.x1, line.x2) + tolerance;
  const minY = Math.min(line.y1, line.y2) - tolerance;
  const maxY = Math.max(line.y1, line.y2) + tolerance;
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

function distancePointToSegment(point, line) {
  const projected = projectPointToSegment(point, line);
  return projected ? Math.hypot(point.x - projected.x, point.y - projected.y) : Infinity;
}

function projectPointToSegment(point, line) {
  const vx = line.x2 - line.x1;
  const vy = line.y2 - line.y1;
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq <= 0.000001) return null;
  const t = clamp(((point.x - line.x1) * vx + (point.y - line.y1) * vy) / lengthSq, 0, 1);
  return {
    x: line.x1 + vx * t,
    y: line.y1 + vy * t,
    snapType: "line",
    snapLabel: "line",
    priority: 2,
  };
}

function segmentIntersection(a, b) {
  const ax = a.x2 - a.x1;
  const ay = a.y2 - a.y1;
  const bx = b.x2 - b.x1;
  const by = b.y2 - b.y1;
  const denominator = ax * by - ay * bx;
  if (Math.abs(denominator) < 0.000001) return null;

  const cx = b.x1 - a.x1;
  const cy = b.y1 - a.y1;
  const t = (cx * by - cy * bx) / denominator;
  const u = (cx * ay - cy * ax) / denominator;
  const epsilon = 0.0001;
  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) return null;

  return {
    x: a.x1 + ax * clamp(t, 0, 1),
    y: a.y1 + ay * clamp(t, 0, 1),
  };
}

function makeScaleMeasure(axis, p1, p2) {
  const k = baseDxfUnit();
  const dx = Math.abs(p2.x - p1.x) * k;
  const dy = Math.abs(p2.y - p1.y) * k;
  const axisLength = axis === "x" ? dx : dy;
  const fallbackLength = Math.hypot(dx, dy);
  const baseLength = axisLength >= fallbackLength * 0.25 ? axisLength : fallbackLength;
  return {
    p1,
    p2,
    baseLength,
    breaks: [],
    childPoints: [],
  };
}

function resetScalePick() {
  clearScaleCalibration();
  drawVectorOverlay();
  setStatus("Dimension calibration reset.");
}

function clearScaleCalibration() {
  scaleCalibration = {
    mode: null,
    points: [],
    hover: null,
    x: null,
    y: null,
  };
  viewport?.classList.remove("picking-scale");
  updateScaleCalibrationUi();
}

function updateScaleCalibrationUi() {
  const scale = getDxfScale();
  setText(scaleBreaksX, scaleBreakText("x"));
  setText(scaleBreaksY, scaleBreakText("y"));
  setText(scaleFactorX, scaleFactorText("x", scale.x));
  setText(scaleFactorY, scaleFactorText("y", scale.y));
  updateScaleStatus(scale);
  updateClearPicksButton();
}

function getDxfScale() {
  const xMap = buildPiecewiseAxisMap("x");
  const yMap = buildPiecewiseAxisMap("y");
  const shared = xMap?.globalScale ?? yMap?.globalScale ?? getDimensionScaleDenominator();
  return {
    x: xMap?.globalScale ?? shared,
    y: yMap?.globalScale ?? shared,
  };
}

function getDimensionScaleDenominator() {
  const denominator = safeNumber(dimensionScale?.value, 100);
  return Number.isFinite(denominator) && denominator > 0 ? denominator : 100;
}

function dimensionValueToDxfLength(value) {
  return value > 0 ? value : 0;
}

function scaleBreakText(axis) {
  const measure = scaleCalibration[axis];
  const childCount = getChildLengths(axis).length;
  if (childCount < 1) return "Enter values";
  const picked = getScaleChildPoints(axis, measure).length;
  if (picked < 1) return `Pick ${childCount + 1} pts`;
  return `${picked}/${childCount + 1} pts picked`;
}

function scaleFactorText(axis, fallbackScale) {
  const map = buildPiecewiseAxisMap(axis);
  if (map?.piecewise) return `${map.segmentCount} segments`;
  return `x ${formatNumber(fallbackScale)}`;
}

function updateScaleStatus(scale = getDxfScale()) {
  const denominator = getDimensionScaleDenominator();
  setText(
    viewportScaleInfo,
    `S=1/${formatNumber(denominator)} / ${axisScaleStatus("x", scale.x)} / ${axisScaleStatus("y", scale.y)}`,
  );
}

function axisScaleStatus(axis, fallbackScale) {
  const map = buildPiecewiseAxisMap(axis);
  if (map?.piecewise) return `${axis.toUpperCase()} ${map.segmentCount} seg`;
  return `${axis.toUpperCase()}x${formatNumber(fallbackScale)}`;
}

function getChildLengths(axis) {
  return parseDimensionList(axis === "x" ? scaleChildrenX?.value : scaleChildrenY?.value);
}

function getScaleChildPoints(_axis, measure) {
  if (!measure) return [];
  if (Array.isArray(measure.childPoints) && measure.childPoints.length) return measure.childPoints;
  if (measure.p1 && measure.p2 && Array.isArray(measure.breaks) && measure.breaks.length) {
    return [measure.p1, ...measure.breaks, measure.p2];
  }
  return [];
}

function parseDimensionList(value) {
  return String(value || "")
    .split(/[,\s\u3001\uFF0C]+/)
    .map((part) => readDimensionValue(part))
    .filter((number) => number > 0);
}

function buildPiecewiseAxisMap(axis) {
  if (!renderedViewport) return null;
  const measure = scaleCalibration[axis];
  const children = getChildLengths(axis);
  if (!measure || children.length < 1) return null;
  const childPoints = getScaleChildPoints(axis, measure);
  if (childPoints.length !== children.length + 1) return null;

  const k = baseDxfUnit();
  const sourceCoords = childPoints
    .map((point) => axisPointCoord(axis, point))
    .sort((a, b) => a - b);
  if (sourceCoords.length !== children.length + 1) return null;
  if (sourceCoords[sourceCoords.length - 1] - sourceCoords[0] <= 0.0001) return null;
  const sourceMin = sourceCoords[0];

  const childTotal = children.reduce((sum, value) => sum + value, 0);
  const actualTotal = dimensionValueToDxfLength(childTotal);
  if (childTotal <= 0 || actualTotal <= 0) return null;
  const sourceTotal = (sourceCoords[sourceCoords.length - 1] - sourceCoords[0]) * k;
  const globalScale = sourceTotal > 0 ? actualTotal / sourceTotal : 1;

  const targetCoords = [sourceMin * k];
  let cumulative = targetCoords[0];
  for (const child of children) {
    cumulative += child;
    targetCoords.push(cumulative);
  }

  const slopes = [];
  for (let i = 0; i < sourceCoords.length - 1; i += 1) {
    const sourceLength = sourceCoords[i + 1] - sourceCoords[i];
    const targetLength = targetCoords[i + 1] - targetCoords[i];
    slopes.push(sourceLength > 0 ? targetLength / sourceLength : k);
  }

  const map = (value) => {
    if (value <= sourceCoords[0]) return targetCoords[0] + (value - sourceCoords[0]) * slopes[0];
    const last = sourceCoords.length - 1;
    if (value >= sourceCoords[last]) return targetCoords[last] + (value - sourceCoords[last]) * slopes[last - 1];
    for (let i = 0; i < sourceCoords.length - 1; i += 1) {
      if (value >= sourceCoords[i] && value <= sourceCoords[i + 1]) {
        return targetCoords[i] + (value - sourceCoords[i]) * slopes[i];
      }
    }
    return value * k;
  };

  const localScale = (value) => {
    if (value <= sourceCoords[0]) return slopes[0] / k;
    const last = sourceCoords.length - 1;
    if (value >= sourceCoords[last]) return slopes[last - 1] / k;
    for (let i = 0; i < sourceCoords.length - 1; i += 1) {
      if (value >= sourceCoords[i] && value <= sourceCoords[i + 1]) return slopes[i] / k;
    }
    return 1;
  };

  return {
    map,
    localScale,
    piecewise: true,
    segmentCount: children.length,
    globalScale,
    min: sourceCoords[0],
    max: sourceCoords[sourceCoords.length - 1],
  };
}

function axisPointCoord(axis, point) {
  if (axis === "x") return point.x;
  return renderedViewport.height - point.y;
}

function readDimensionValue(value) {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function baseDxfUnit() {
  const unit = safeNumber(mmPerUnit?.value, 0.352778);
  return renderedViewport?.scale ? unit / renderedViewport.scale : unit;
}

function queueDrawVectorOverlay() {
  if (overlayRedrawQueued) return;
  overlayRedrawQueued = true;
  requestAnimationFrame(() => {
    overlayRedrawQueued = false;
    drawVectorOverlay();
  });
}

function downloadDxf() {
  try {
    setBusy(true, "Generating DXF...");
    setStatus("Generating DXF...");
    const { dxf, fileName } = buildCurrentDxfDocument();
    const blob = new Blob([dxf], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    setStatus("DXF download started.");
    emitBridgeEvent("dxf-download-started", {
      fileName,
      bytes: dxf.length,
      counts: bridgeEntityCounts(),
    });
  } catch (error) {
    console.error(error);
    setStatus(`DXF save failed: ${error?.message || error}`, true);
    emitBridgeEvent("error", {
      operation: "download-dxf",
      message: error?.message || String(error),
    });
  } finally {
    setBusy(false);
  }
}

function buildCurrentDxfDocument() {
  if (!renderedViewport || !hasTraceEntities()) {
    throw new Error("Analyze a PDF before exporting DXF.");
  }
  const name = sanitizeLayer(layerName?.value || "PDF_TRACE");
  const dxf = buildDxf(tracedLines, tracedCircles, tracedArcs, tracedEllipses, tracedSplines, tracedTexts, name);
  const baseName = currentFile?.name?.replace(/\.pdf$/i, "") || "pdf-cad";
  return {
    dxf,
    fileName: `${baseName}.dxf`,
    layerName: name,
  };
}

function buildDxf(lines, circles, arcs, ellipses, splines, texts, layer) {
  const textLayer = dxfLayerName(layer, "TEXT");
  const lineLayers = Object.fromEntries(DXF_LINETYPES.map((linetype) => [linetype.name, dxfLayerName(layer, linetype.name)]));
  const lineLayer = (linetype) => lineLayers[normalizeDxfLinetype(linetype)] || lineLayers.CONTINUOUS;
  const exportLines = removePaperEdgeLines(cleanupOverlappingLines(lines));
  const transform = makeDxfTransform();
  const paperWidth = transform.paperWidth();
  const paperHeight = transform.paperHeight();
  const drawingScale = getDimensionScaleDenominator();
  const out = [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1015",
    "9", "$INSUNITS", "70", "4",
    "9", "$DIMSTYLE", "2", "STANDARD",
    "9", "$DIMSCALE", "40", formatNumber(drawingScale),
    "9", "$DIMLFAC", "40", "1",
    "9", "$EXTMIN", "10", "0", "20", "0", "30", "0",
    "9", "$EXTMAX", "10", formatNumber(paperWidth), "20", formatNumber(paperHeight), "30", "0",
    "9", "$LIMMIN", "10", "0", "20", "0",
    "9", "$LIMMAX", "10", formatNumber(paperWidth), "20", formatNumber(paperHeight),
    "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES",
    "0", "TABLE", "2", "LTYPE", "70", String(DXF_LINETYPES.length),
    ...DXF_LINETYPES.flatMap((linetype) => dxfLinetype(linetype.name, linetype.description, linetype.pattern)),
    "0", "ENDTAB",
    "0", "TABLE", "2", "DIMSTYLE", "70", "1",
    ...dxfDimstyle("STANDARD", drawingScale),
    "0", "ENDTAB",
    "0", "TABLE", "2", "LAYER", "70", String(DXF_LINETYPES.length + 1),
    ...dxfLayer(textLayer, "3", "CONTINUOUS"),
    ...DXF_LINETYPES.flatMap((linetype) => dxfLayer(lineLayers[linetype.name], linetype.color, linetype.name)),
    "0", "ENDTAB",
    "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES",
  ];

  for (const line of exportLines) {
    const linetype = normalizeDxfLinetype(line.linetype);
    const p1 = transform.point(line.x1, line.y1);
    const p2 = transform.point(line.x2, line.y2);
    out.push(
      "0", "LINE",
      "8", lineLayer(linetype),
      "6", linetype,
      "10", formatNumber(p1.x),
      "20", formatNumber(p1.y),
      "30", "0",
      "11", formatNumber(p2.x),
      "21", formatNumber(p2.y),
      "31", "0",
    );
  }

  for (const circle of circles) {
    const linetype = normalizeDxfLinetype(circle.linetype);
    const center = transform.point(circle.cx, circle.cy);
    const rx = circle.r * transform.k * transform.localScaleX(circle.cx);
    const ry = circle.r * transform.k * transform.localScaleY(circle.cy);
    if (transform.uniform) {
      out.push(
        "0", "CIRCLE",
        "8", lineLayer(linetype),
        "6", linetype,
        "10", formatNumber(center.x),
        "20", formatNumber(center.y),
        "30", "0",
        "40", formatNumber(circle.r * transform.uniformK),
      );
    } else {
      pushAxisAlignedEllipseEntity(out, lineLayer(linetype), center, rx, ry, 0, 360, linetype);
    }
  }

  for (const arc of arcs) {
    const linetype = normalizeDxfLinetype(arc.linetype);
    const center = transform.point(arc.cx, arc.cy);
    const rx = arc.r * transform.k * transform.localScaleX(arc.cx);
    const ry = arc.r * transform.k * transform.localScaleY(arc.cy);
    if (transform.uniform) {
      out.push(
        "0", "ARC",
        "8", lineLayer(linetype),
        "6", linetype,
        "10", formatNumber(center.x),
        "20", formatNumber(center.y),
        "30", "0",
        "40", formatNumber(arc.r * transform.uniformK),
        "50", formatNumber(normalizeAngle(-arc.endAngle)),
        "51", formatNumber(normalizeAngle(-arc.startAngle)),
      );
    } else {
      pushAxisAlignedEllipseEntity(out, lineLayer(linetype), center, rx, ry, arc.startAngle, arc.endAngle, linetype);
    }
  }

  for (const ellipse of ellipses) {
    pushEllipseEntity(out, lineLayer(ellipse.linetype), ellipse, transform);
  }

  for (const spline of splines) {
    pushSplineEntity(out, lineLayer(spline.linetype), spline, transform);
  }

  for (const item of texts) {
    const heightScale = safeScale(textHeightScale?.value);
    const widthScale = safeScale(textWidthScale?.value);
    const angle = item.angle || 0;
    const source = shiftedTextPoint(item);
    const textAngle = transform.angle(angle, source.x, source.y);
    const alongScale = transform.alongScale(angle, source.x, source.y);
    const height = Math.max(1.5, item.height * transform.k * transform.perpScale(angle, source.x, source.y) * heightScale);
    const rawWidth = (item.width || estimateTextWidth(item.text, item.height)) * transform.k * alongScale;
    const hasMeasuredGlyphs = Array.isArray(item.glyphs) && item.glyphs.length > 0;
    const width = hasMeasuredGlyphs
      ? Math.max(height * 0.12, rawWidth * widthScale)
      : Math.max(height * 0.6, rawWidth * widthScale);
    if (isChecked(splitTextChars)) {
      pushSplitText(out, item, textLayer, transform, height, width, { heightScale, widthScale, source });
    } else {
      const p = transform.point(source.x, source.y);
      const useFit = shouldFitTextItem(item, width, height);
      const fitEnd = useFit ? pointAtAngle(p.x, p.y, width, textAngle) : null;
      const widthFactor = useFit ? 1 : dxfWidthFactor(item.text, width, height);
      pushTextEntity(out, textLayer, p.x, p.y, height, widthFactor, item.text, fitEnd, textAngle);
    }
  }

  out.push("0", "ENDSEC", "0", "EOF", "");
  return out.join("\r\n");
}

function makeDxfTransform() {
  const k = baseDxfUnit();
  const fineShift = dxfFineShiftActual();
  const xMap = buildPiecewiseAxisMap("x");
  const yMap = buildPiecewiseAxisMap("y");
  const xAxisScale = xMap?.globalScale ?? null;
  const yAxisScale = yMap?.globalScale ?? null;
  const sharedScale = xAxisScale ?? yAxisScale ?? getDimensionScaleDenominator();
  const scaleX = xAxisScale ?? sharedScale;
  const scaleY = yAxisScale ?? sharedScale;
  const kx = k * scaleX;
  const ky = k * scaleY;
  const h = renderedViewport.height;
  const scaleXAt = (x) => xMap?.localScale(x) ?? scaleX;
  const scaleYAt = (y) => yMap?.localScale(h - y) ?? scaleY;
  const rawMapX = (x) => xMap?.map(x) ?? x * kx;
  const rawMapY = (y) => yMap?.map(h - y) ?? (h - y) * ky;
  const originX = rawMapX(0);
  const originY = rawMapY(h);
  const mapX = (x) => rawMapX(x) - originX;
  const mapY = (y) => rawMapY(y) - originY;
  const uniform = !xMap && !yMap && Math.abs(scaleX - scaleY) <= Math.max(0.0001, Math.max(scaleX, scaleY) * 0.001);
  return {
    k,
    kx,
    ky,
    h,
    scaleX,
    scaleY,
    xMap,
    yMap,
    uniform,
    uniformK: k * ((scaleX + scaleY) / 2),
    point(x, y) {
      return {
        x: mapX(x) + fineShift.x,
        y: mapY(y) + fineShift.y,
      };
    },
    paperWidth() {
      const mapped = mapX(renderedViewport.width) - mapX(0);
      return Math.max(1, Math.abs(mapped || (currentPageSize.widthMm || renderedViewport.width * k) * scaleX));
    },
    paperHeight() {
      const mapped = mapY(0) - mapY(renderedViewport.height);
      return Math.max(1, Math.abs(mapped || (currentPageSize.heightMm || renderedViewport.height * k) * scaleY));
    },
    vector(dx, dy) {
      return {
        x: dx * kx,
        y: -dy * ky,
      };
    },
    localScaleX(x) {
      return scaleXAt(x);
    },
    localScaleY(y) {
      return scaleYAt(y);
    },
    angle(angleDegrees, x = 0, y = 0) {
      const radians = angleDegrees * Math.PI / 180;
      return Math.atan2(Math.sin(radians) * scaleYAt(y), Math.cos(radians) * scaleXAt(x)) * 180 / Math.PI;
    },
    alongScale(angleDegrees, x = 0, y = 0) {
      const radians = angleDegrees * Math.PI / 180;
      return Math.hypot(Math.cos(radians) * scaleXAt(x), Math.sin(radians) * scaleYAt(y));
    },
    perpScale(angleDegrees, x = 0, y = 0) {
      const radians = angleDegrees * Math.PI / 180;
      return Math.hypot(Math.sin(radians) * scaleXAt(x), Math.cos(radians) * scaleYAt(y));
    },
  };
}

function pushSplineEntity(out, layer, spline, transform) {
  const linetype = normalizeDxfLinetype(spline.linetype);
  const points = spline.points.map((point) => ({
    ...transform.point(point.x, point.y),
  }));
  out.push(
    "0", "SPLINE",
    "8", layer,
    "6", linetype,
    "70", "8",
    "71", "3",
    "72", "8",
    "73", "4",
    "74", "0",
  );

  for (const knot of [0, 0, 0, 0, 1, 1, 1, 1]) {
    out.push("40", formatNumber(knot));
  }
  for (const point of points) {
    out.push(
      "10", formatNumber(point.x),
      "20", formatNumber(point.y),
      "30", "0",
    );
  }
}

function pushEllipseEntity(out, layer, ellipse, transform) {
  const linetype = normalizeDxfLinetype(ellipse.linetype);
  const center = transform.point(ellipse.cx, ellipse.cy);
  const major = transform.vector(ellipse.majorX, ellipse.majorY);
  const start = normalizeRadians(-ellipse.endParam);
  const end = normalizeRadians(-ellipse.startParam);
  out.push(
    "0", "ELLIPSE",
    "8", layer,
    "6", linetype,
    "10", formatNumber(center.x),
    "20", formatNumber(center.y),
    "30", "0",
    "11", formatNumber(major.x),
    "21", formatNumber(major.y),
    "31", "0",
    "40", formatNumber(ellipse.ratio),
    "41", formatNumber(start),
    "42", formatNumber(end),
  );
}

function pushAxisAlignedEllipseEntity(out, layer, center, rx, ry, startAngle, endAngle, linetype = "CONTINUOUS") {
  if (rx <= 0 || ry <= 0) return;
  const normalizedLinetype = normalizeDxfLinetype(linetype);
  const full = normalizeAngle(endAngle - startAngle) >= 359.5 || Math.abs(endAngle - startAngle) >= 359.5;
  const xMajor = rx >= ry;
  const majorX = xMajor ? rx : 0;
  const majorY = xMajor ? 0 : ry;
  const ratio = xMajor ? ry / rx : rx / ry;
  const paramForCanvasAngle = (angle) => {
    const degrees = xMajor ? -angle : 270 - angle;
    return normalizeRadians(degrees * Math.PI / 180);
  };
  const start = full ? 0 : paramForCanvasAngle(endAngle);
  const end = full ? Math.PI * 2 : paramForCanvasAngle(startAngle);

  out.push(
    "0", "ELLIPSE",
    "8", layer,
    "6", normalizedLinetype,
    "10", formatNumber(center.x),
    "20", formatNumber(center.y),
    "30", "0",
    "11", formatNumber(majorX),
    "21", formatNumber(majorY),
    "31", "0",
    "40", formatNumber(ratio),
    "41", formatNumber(start),
    "42", formatNumber(end),
  );
}

function dxfLinetype(name, description, pattern) {
  const totalLength = pattern.reduce((sum, value) => sum + Math.abs(value), 0);
  const out = [
    "0", "LTYPE",
    "2", name,
    "70", "0",
    "3", description,
    "72", "65",
    "73", String(pattern.length),
    "40", formatNumber(totalLength),
  ];

  for (const value of pattern) {
    out.push("49", formatNumber(value), "74", "0");
  }

  return out;
}

function dxfLayer(name, color, linetype) {
  return [
    "0", "LAYER",
    "2", name,
    "70", "0",
    "62", String(color),
    "6", normalizeDxfLinetype(linetype),
  ];
}

function dxfDimstyle(name, drawingScale) {
  return [
    "0", "DIMSTYLE",
    "2", name,
    "70", "0",
    "3", "",
    "4", "",
    "5", "",
    "6", "",
    "7", "",
    "40", formatNumber(drawingScale),
    "41", "2.5",
    "42", "0.625",
    "43", "3.75",
    "44", "2.25",
    "45", "0",
    "46", "0",
    "47", "0",
    "48", "0",
    "140", "2.5",
    "141", "2.5",
    "142", "0",
    "143", "25.4",
    "144", "1",
    "145", "0",
    "146", "1",
    "147", "0.625",
    "71", "0",
    "72", "0",
    "73", "0",
    "74", "0",
    "75", "0",
    "76", "0",
    "77", "1",
    "78", "8",
    "170", "0",
    "171", "2",
    "172", "0",
    "173", "0",
    "174", "0",
    "175", "0",
    "176", "0",
    "177", "0",
    "178", "0",
  ];
}

function shouldFitTextItem(item, width, height) {
  const text = dxfText(item.text);
  if (!isChecked(fitTextWidth)) return false;
  if (Array.from(text).length <= 1) return false;
  return Number.isFinite(width) && Number.isFinite(height) && width > height * 0.25;
}

function pushSplitText(out, item, textLayer, transform, textHeight, textWidth, scales = {}) {
  if (Array.isArray(item.glyphs) && item.glyphs.length) {
    pushMeasuredGlyphText(out, item, textLayer, transform, textHeight, textWidth, scales);
    return;
  }

  const chars = Array.from(dxfText(item.text));
  if (!chars.length) return;

  const advances = distributeCharacterAdvances(chars, textWidth);
  const angle = item.angle || 0;
  const source = scales.source ?? shiftedTextPoint(item);
  const textAngle = transform.angle(angle, source.x, source.y);
  const base = transform.point(source.x, source.y);
  let offset = 0;

  chars.forEach((char, index) => {
    const advance = advances[index];
    if (char !== " ") {
      const point = pointAtAngle(base.x, base.y, offset, textAngle);
      const visibleWidth = Math.max(textHeight * 0.12, advance * 0.92);
      const widthFactor = dxfWidthFactor(char, visibleWidth, textHeight);
      pushTextEntity(out, textLayer, point.x, point.y, textHeight, widthFactor, char, null, textAngle);
    }
    offset += advance;
  });
}

function pushMeasuredGlyphText(out, item, textLayer, transform, textHeight, textWidth, scales = {}) {
  const glyphs = item.glyphs;
  const baseAngle = item.angle || 0;
  const baseSource = scales.source ?? shiftedTextPoint(item);
  const heightRatio = safeScale(scales.heightScale ?? (textHeight / Math.max(0.001, (item.height || 1) * transform.k * transform.perpScale(baseAngle, baseSource.x, baseSource.y))));
  const widthRatio = safeScale(scales.widthScale ?? (textWidth / Math.max(0.001, (item.width || 1) * transform.k * transform.alongScale(baseAngle, baseSource.x, baseSource.y))));
  for (const glyph of glyphs) {
    const char = dxfText(glyph.text);
    if (!char || char === " ") continue;
    const angle = glyph.angle ?? item.angle ?? 0;
    const glyphSource = shiftedTextPoint(glyph, glyph.x, glyph.y);
    const height = Math.max(1.5, (glyph.height || item.height || 1) * transform.k * transform.perpScale(angle, glyphSource.x, glyphSource.y) * heightRatio);
    const width = Math.max(height * 0.12, (glyph.width || estimateTextWidth(char, glyph.height || item.height || 10)) * transform.k * transform.alongScale(angle, glyphSource.x, glyphSource.y) * widthRatio);
    const point = transform.point(glyphSource.x, glyphSource.y);
    const textAngle = transform.angle(angle, glyphSource.x, glyphSource.y);
    const widthFactor = dxfWidthFactor(char, width, height);
    pushTextEntity(out, textLayer, point.x, point.y, height, widthFactor, char, null, textAngle);
  }
}

function distributeCharacterAdvances(chars, totalWidth) {
  const weights = chars.map(characterAdvanceWeight);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((weight) => totalWidth * weight / totalWeight);
}

function characterAdvanceWeight(char) {
  if (char === " ") return 0.55;
  if (/[ilI1|!]/.test(char)) return 0.38;
  if (/[.,:;'"`]/.test(char)) return 0.32;
  if (/[mwMW@%&]/.test(char)) return 0.95;
  if (/[A-Z0-9]/.test(char)) return 0.72;
  if (/[a-z]/.test(char)) return 0.58;
  if (/[｡-ﾟ]/u.test(char)) return 0.5;
  if (/[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/u.test(char)) return 1;
  return 0.7;
}

function pushTextEntity(out, textLayer, x, y, height, widthFactor, text, fitEnd = null, angle = 0) {
  const dxfAngle = signedDxfAngle(angle);
  out.push(
    "0", "TEXT",
    "8", textLayer,
    "10", formatNumber(x),
    "20", formatNumber(y),
    "30", "0",
    "40", formatNumber(height),
    "41", formatNumber(widthFactor),
    "1", dxfText(text),
    "50", formatNumber(dxfAngle),
    "7", "STANDARD",
  );

  if (fitEnd && Number.isFinite(fitEnd.x) && Number.isFinite(fitEnd.y)) {
    out.push(
      "11", formatNumber(fitEnd.x),
      "21", formatNumber(fitEnd.y),
      "31", "0",
      "72", "5",
      "73", "0",
    );
  }
}

function fitToView() {
  if (!pdfCanvas.width || !pdfCanvas.height) return;
  const availableW = Math.max(160, viewport.clientWidth - 64);
  const availableH = Math.max(160, viewport.clientHeight - 64);
  setZoom(Math.min(1, availableW / pdfCanvas.width, availableH / pdfCanvas.height));
}

function zoomBy(factor) {
  if (!pdfCanvas.width || !pdfCanvas.height) return;
  setZoom(zoom * factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
}

function zoomAtViewportCenter(nextZoom) {
  setZoom(nextZoom, viewport.clientWidth / 2, viewport.clientHeight / 2);
}

function setZoom(nextZoom, anchorX = null, anchorY = null) {
  const oldZoom = zoom;
  zoom = clamp(nextZoom, 0.03, 24);

  const hasAnchor = Number.isFinite(anchorX) && Number.isFinite(anchorY) && oldZoom > 0;
  const canvasLeft = pdfCanvas.offsetLeft;
  const canvasTop = pdfCanvas.offsetTop;
  const beforeX = hasAnchor ? (viewport.scrollLeft + anchorX - canvasLeft) / oldZoom : 0;
  const beforeY = hasAnchor ? (viewport.scrollTop + anchorY - canvasTop) / oldZoom : 0;

  applyZoom();

  if (hasAnchor) {
    viewport.scrollLeft = Math.max(0, beforeX * zoom + canvasLeft - anchorX);
    viewport.scrollTop = Math.max(0, beforeY * zoom + canvasTop - anchorY);
  }
}

function applyZoom() {
  for (const canvas of [pdfCanvas, vectorCanvas]) {
    canvas.style.transform = "";
    canvas.style.width = `${Math.max(1, canvas.width * zoom)}px`;
    canvas.style.height = `${Math.max(1, canvas.height * zoom)}px`;
  }
  updateZoomUi();
}

function updateZoomUi() {
  const text = `${Math.round(zoom * 100)}%`;
  setText(zoomValue, text);
  setText(viewportZoomStatus, text);
}

function handleZoomWheel(event) {
  if (event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    viewport.scrollLeft += event.deltaY;
    event.preventDefault();
    return;
  }
  if (!pdfCanvas.width || !pdfCanvas.height) return;
  event.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const wheelDelta = event.deltaY || event.deltaX;
  const factor = wheelDelta < 0 ? 1.12 : 1 / 1.12;
  setZoom(zoom * factor, event.clientX - rect.left, event.clientY - rect.top);
}

function setPanMode(enabled) {
  if (enabled && (!hasPreviewCanvas() || busy)) return;
  panMode = Boolean(enabled);
  updatePanUi();
}

function updatePanUi() {
  panModeButton?.setAttribute("aria-pressed", String(panMode));
  viewport?.classList.toggle("pan-mode", panMode);
  viewport?.classList.toggle("space-pan", spacePanActive);
  viewport?.classList.toggle("panning", Boolean(panDrag));
  updateModeUi();
}

function updateModeUi() {
  let text = "Ready";
  const canCancelMode = Boolean(scaleCalibration.mode || panMode || spacePanActive || panDrag);
  if (busy) {
    text = "Busy";
  } else if (scaleCalibration.mode) {
    const axis = scalePickAxis();
    const required = getChildLengths(axis).length + 1;
    text = `Pick ${axis.toUpperCase()} ${scaleCalibration.points.length}/${required}`;
  } else if (panDrag) {
    text = "Panning";
  } else if (panMode || spacePanActive) {
    text = "Pan";
  } else if (analysisDirty) {
    text = "Needs Analyze";
  }
  setText(viewportModeInfo, text);
  if (viewportModeInfo) viewportModeInfo.title = text;
  if (cancelModeButtonTop) cancelModeButtonTop.disabled = !canCancelMode;
  updateClearPicksButton();
}

function handlePanPointerDown(event) {
  if (!shouldStartPan(event)) return;
  event.preventDefault();
  event.stopPropagation();
  panDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
  };
  viewport.setPointerCapture?.(event.pointerId);
  updatePanUi();
}

function handlePanPointerMove(event) {
  if (!panDrag || event.pointerId !== panDrag.pointerId) return;
  event.preventDefault();
  viewport.scrollLeft = panDrag.scrollLeft - (event.clientX - panDrag.startX);
  viewport.scrollTop = panDrag.scrollTop - (event.clientY - panDrag.startY);
}

function endPanDrag(event) {
  if (!panDrag || event.pointerId !== panDrag.pointerId) return;
  viewport.releasePointerCapture?.(event.pointerId);
  panDrag = null;
  updatePanUi();
}

function shouldStartPan(event) {
  if (!renderedViewport || scaleCalibration.mode) return false;
  if (event.button === 1) return true;
  if (event.button === 0 && (panMode || spacePanActive)) return true;
  return false;
}

function handleViewportContextMenu(event) {
  if (panMode || panDrag) event.preventDefault();
}

function handleViewportKeyDown(event) {
  if (isEditingControl(event.target)) return;
  const key = event.key.toLowerCase();

  if (key === "r") {
    runAnalysisFromKeyboard();
    event.preventDefault();
    return;
  }
  if (key === "s" || key === "d") {
    saveDxfFromKeyboard();
    event.preventDefault();
    return;
  }
  if (key === "m") {
    togglePanel();
    event.preventDefault();
    return;
  }
  if (key === "escape") {
    cancelActiveMode();
    event.preventDefault();
    return;
  }
  if (event.code === "Space") {
    if (!spacePanActive) {
      spacePanActive = true;
      updatePanUi();
    }
    event.preventDefault();
    return;
  }
  if (!renderedViewport) return;
  if (key === "c") {
    toggleDxfCompare();
    event.preventDefault();
  } else if (key === "i") {
    toggleCanvas(pdfCanvas, toggleImageButton);
    event.preventDefault();
  } else if (key === "v") {
    toggleCanvas(vectorCanvas, toggleVectorButton);
    event.preventDefault();
  } else if (key === "p") {
    setPanMode(!panMode);
    event.preventDefault();
  } else if (panViewportByKey(event)) {
    event.preventDefault();
  } else
  if (event.key === "+" || event.key === "=") {
    zoomAtViewportCenter(zoom * 1.25);
    event.preventDefault();
  } else if (event.key === "-" || event.key === "_") {
    zoomAtViewportCenter(zoom / 1.25);
    event.preventDefault();
  } else if (event.key === "0") {
    zoomAtViewportCenter(1);
    event.preventDefault();
  } else if (event.key.toLowerCase() === "f") {
    fitToView();
    event.preventDefault();
  }
}

function panViewportByKey(event) {
  const step = event.shiftKey ? 240 : 72;
  if (event.key === "ArrowLeft") {
    viewport.scrollLeft -= step;
    return true;
  }
  if (event.key === "ArrowRight") {
    viewport.scrollLeft += step;
    return true;
  }
  if (event.key === "ArrowUp") {
    viewport.scrollTop -= step;
    return true;
  }
  if (event.key === "ArrowDown") {
    viewport.scrollTop += step;
    return true;
  }
  if (event.key === "PageUp") {
    viewport.scrollTop -= Math.max(120, viewport.clientHeight * 0.8);
    return true;
  }
  if (event.key === "PageDown") {
    viewport.scrollTop += Math.max(120, viewport.clientHeight * 0.8);
    return true;
  }
  if (event.key === "Home") {
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    return true;
  }
  if (event.key === "End") {
    viewport.scrollLeft = viewport.scrollWidth;
    viewport.scrollTop = viewport.scrollHeight;
    return true;
  }
  return false;
}

function handleViewportKeyUp(event) {
  if (event.code !== "Space") return;
  spacePanActive = false;
  updatePanUi();
}

function isEditingControl(target) {
  if (!target || target === viewport) return false;
  return Boolean(target.closest?.("input, textarea, select, button, a, label, [contenteditable='true']"))
    || Boolean(target?.isContentEditable);
}

function toggleDxfCompare() {
  updateViewButtons();
  if (toggleDxfCompareButton?.disabled) return;
  showDxfCompare = !showDxfCompare;
  toggleDxfCompareButton?.setAttribute("aria-pressed", String(showDxfCompare));
  if (showDxfCompare) {
    setCanvasVisible(vectorCanvas, toggleVectorButton, true);
  }
  drawVectorOverlay();
}

function applyStoredPanelWidth() {
  const stored = getStoredPanelWidth();
  if (stored) {
    setPanelWidth(stored, false);
  }
}

function getStoredPanelWidth() {
  try {
    const stored = Number(localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch (_error) {
    return null;
  }
}

function startPanelResize(event) {
  if (panelCollapsed || event.button !== 0) return;
  panelResizeDrag = { pointerId: event.pointerId };
  appShell?.classList.add("resizing-panel");
  panelResizeHandle?.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handlePanelResizeMove(event) {
  if (!panelResizeDrag) return;
  setPanelWidth(event.clientX);
  event.preventDefault();
}

function endPanelResize(event) {
  if (!panelResizeDrag) return;
  try {
    panelResizeHandle?.releasePointerCapture?.(panelResizeDrag.pointerId ?? event.pointerId);
  } catch (_error) {
    // The pointer may already be released if the browser canceled the drag.
  }
  panelResizeDrag = null;
  appShell?.classList.remove("resizing-panel");
  if (renderedViewport) fitToView();
}

function handlePanelResizeKeyDown(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const direction = event.key === "ArrowRight" ? 1 : -1;
  setPanelWidth(getPanelWidth() + direction * 20);
  if (renderedViewport) fitToView();
  event.preventDefault();
}

function resetPanelWidth() {
  setPanelWidth(PANEL_DEFAULT_WIDTH);
  if (renderedViewport) fitToView();
}

function resetPanelLayout() {
  setPanelWidth(PANEL_DEFAULT_WIDTH);
  setDefaultControlGroupsOpen();
  togglePanel(false);
  setStatus("Layout reset.");
}

function initializeControlGroups() {
  document.querySelectorAll("details.control-group").forEach((details) => {
    const key = controlGroupStorageKey(details);
    if (!key) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        details.open = stored === "true";
      }
    } catch (_error) {
      // Storage can be unavailable in some browser modes.
    }
    details.addEventListener("toggle", () => saveControlGroupOpenState(details));
  });
}

function setDefaultControlGroupsOpen() {
  document.querySelectorAll("details.control-group").forEach((details) => {
    details.open = details.dataset.defaultOpen === "true";
    saveControlGroupOpenState(details);
  });
}

function setAllControlGroupsOpen(open) {
  document.querySelectorAll("details.control-group").forEach((details) => {
    details.open = open;
    saveControlGroupOpenState(details);
  });
}

function saveControlGroupOpenState(details) {
  const key = controlGroupStorageKey(details);
  if (!key) return;
  try {
    localStorage.setItem(key, String(details.open));
  } catch (_error) {
    // Keep the live toggle behavior even if storage fails.
  }
}

function controlGroupStorageKey(details) {
  const name = details.querySelector("summary")?.textContent?.trim();
  return name ? `${CONTROL_GROUP_STORAGE_PREFIX}${name}` : "";
}

function getPanelWidth() {
  const value = getComputedStyle(appShell).getPropertyValue("--panel-width");
  const width = Number.parseFloat(value);
  return Number.isFinite(width) ? width : PANEL_DEFAULT_WIDTH;
}

function setPanelWidth(width, save = true) {
  if (!appShell) return;
  const maxWidth = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, window.innerWidth * 0.6));
  const clamped = Math.round(Math.min(Math.max(width, PANEL_MIN_WIDTH), maxWidth));
  appShell.style.setProperty("--panel-width", `${clamped}px`);
  if (!save) return;
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(clamped));
  } catch (_error) {
    // Ignore storage failures; the live resize should still work.
  }
}

function togglePanel(force = null) {
  panelCollapsed = force == null ? !panelCollapsed : Boolean(force);
  appShell?.classList.toggle("panel-collapsed", panelCollapsed);
  togglePanelButton?.setAttribute("aria-pressed", String(!panelCollapsed));
  requestAnimationFrame(() => {
    if (renderedViewport) fitToView();
    focusViewport();
  });
}

function focusViewport() {
  viewport?.focus({ preventScroll: true });
}

async function runAnalysisFromKeyboard() {
  if (!pdfDocument || renderButton.disabled) return;
  await renderAndTrace();
}

function saveDxfFromKeyboard() {
  if (downloadButton.disabled) return;
  downloadDxf();
}

function cancelActiveMode() {
  if (scaleCalibration.mode) {
    scaleCalibration.mode = null;
    scaleCalibration.points = [];
    scaleCalibration.hover = null;
    viewport.classList.remove("picking-scale");
    drawVectorOverlay();
  }
  spacePanActive = false;
  panDrag = null;
  setPanMode(false);
}

function toggleCanvas(canvas, button) {
  updateViewButtons();
  if (button?.disabled) return;
  const pressed = button.getAttribute("aria-pressed") === "true";
  const nextVisible = !pressed;
  if (!nextVisible) {
    const fallback = canvas === pdfCanvas
      ? { canvas: vectorCanvas, button: toggleVectorButton }
      : { canvas: pdfCanvas, button: toggleImageButton };
    if (!isCanvasVisible(fallback.canvas)) {
      setCanvasVisible(fallback.canvas, fallback.button, true);
    }
  }
  if (canvas === vectorCanvas && !nextVisible && showDxfCompare) {
    showDxfCompare = false;
    toggleDxfCompareButton?.setAttribute("aria-pressed", "false");
    setText(dxfCompareValue, "Delta -");
  }
  setCanvasVisible(canvas, button, nextVisible);
  drawVectorOverlay();
}

function setCanvasVisible(canvas, button, visible) {
  button?.setAttribute("aria-pressed", String(visible));
  if (canvas) canvas.style.display = visible ? "block" : "none";
}

function isCanvasVisible(canvas) {
  return Boolean(canvas && canvas.style.display !== "none");
}

function clearPreview(message = "Select a PDF to show the preview") {
  showDxfCompare = false;
  setCanvasVisible(pdfCanvas, toggleImageButton, true);
  setCanvasVisible(vectorCanvas, toggleVectorButton, true);
  toggleDxfCompareButton?.setAttribute("aria-pressed", "false");
  setText(dxfCompareValue, "Delta -");
  for (const canvas of [pdfCanvas, vectorCanvas]) {
    if (!canvas) continue;
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.width = "0px";
    canvas.style.height = "0px";
  }
  emptyState.textContent = message;
  emptyState.style.display = "grid";
  updateViewportSummary();
  updateViewButtons();
}

function updateSizes(page) {
  const widthPt = renderedViewport ? renderedViewport.width / renderedViewport.scale : Math.abs(page.view[2] - page.view[0]);
  const heightPt = renderedViewport ? renderedViewport.height / renderedViewport.scale : Math.abs(page.view[3] - page.view[1]);
  setPageSizeDisplay(widthPt, heightPt);
  imageSize.textContent = `${pdfCanvas.width} x ${pdfCanvas.height} px`;
  updateViewportSummary();
}

function refreshPageSizeDisplay() {
  if (!renderedViewport) return;
  setPageSizeDisplay(renderedViewport.width / renderedViewport.scale, renderedViewport.height / renderedViewport.scale);
  updateViewportSummary();
}

function setPageSizeDisplay(widthPt, heightPt) {
  const unit = safeNumber(mmPerUnit?.value, 0.352778);
  currentPageSize = {
    widthMm: widthPt * unit,
    heightMm: heightPt * unit,
  };
  pageSize.textContent = `${formatNumber(currentPageSize.widthMm)} x ${formatNumber(currentPageSize.heightMm)} mm`;
}

function updateCounts() {
  setText(lineCount, tracedLines.length.toLocaleString("ja-JP"));
  setText(circleCount, tracedCircles.length.toLocaleString("ja-JP"));
  setText(arcCount, tracedArcs.length.toLocaleString("ja-JP"));
  setText(ellipseCount, tracedEllipses.length.toLocaleString("ja-JP"));
  setText(splineCount, tracedSplines.length.toLocaleString("ja-JP"));
  setText(textCount, tracedTexts.length.toLocaleString("ja-JP"));
  const stats = lineTypeStats();
  const mode = lineTypeModeLabel();
  const previewMode = lineTypePreviewFilterLabel();
  setText(lineTypeMode, mode);
  setText(lineTypePreviewMode, previewMode);
  const compareText = lineTypeModeCompareText();
  setText(lineTypeModeCompare, compareText);
  setText(lineTypeModeCompareInline, compareText);
  setText(lineTypeCount, lineTypeDetailText(stats));
  setText(viewportLineTypeInfo, `${mode} / ${lineTypeCompactText(stats)} / ${previewMode}`);
  if (viewportLineTypeInfo) viewportLineTypeInfo.title = `${lineTypeDetailText(stats)} / preview ${previewMode}`;
  updateViewportSummary();
}

function updateViewportSummary() {
  const pageText = currentPageSize.widthMm && currentPageSize.heightMm
    ? `${formatNumber(currentPageSize.widthMm)} x ${formatNumber(currentPageSize.heightMm)} mm`
    : "-";
  const imageText = renderedViewport && pdfCanvas.width && pdfCanvas.height
    ? `${pdfCanvas.width} x ${pdfCanvas.height} px`
    : "-";
  const curveCount = tracedCircles.length + tracedArcs.length + tracedEllipses.length + tracedSplines.length;
  const entityText = `${tracedLines.length.toLocaleString("ja-JP")} lines / ${curveCount.toLocaleString("ja-JP")} curves / ${tracedTexts.length.toLocaleString("ja-JP")} text`;
  setText(viewportPageInfo, pageText);
  setText(viewportImageInfo, imageText);
  setText(viewportEntityInfo, entityText);
}

function updateFileInfo() {
  const name = currentFile?.name || "";
  setText(viewportFileInfo, name || "-");
  if (viewportFileInfo) viewportFileInfo.title = name;
}

function setRunInfo(value = "-", title = value) {
  setText(viewportRunInfo, value);
  if (viewportRunInfo) {
    viewportRunInfo.title = title;
    viewportRunInfo.dataset.state = runInfoState(value);
  }
}

function runInfoState(value) {
  if (value === "Failed") return "failed";
  if (value === "Stale") return "stale";
  if (value === "-") return "idle";
  return "ready";
}

function formatRunTime(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  const state = statusMessageState(message, isError);
  statusText.dataset.state = state;
  statusText.style.color = "";
  if (topStatus) {
    topStatus.textContent = compactTopStatusMessage(message);
    topStatus.title = message;
    topStatus.dataset.state = state;
    topStatus.style.color = "";
  }
  if (busy) {
    setText(viewportBusyText, message);
  }
  emitBridgeEvent("status", {
    message,
    state,
    isError,
  });
}

function statusMessageState(message, isError) {
  if (isError) return "failed";
  if (message.startsWith("DXF ready")) return "ready";
  if (message.startsWith("Settings changed") || message.includes("Click Analyze")) return "stale";
  if (message.startsWith("Analyzing") || message.startsWith("Loading") || message.startsWith("Generating")) return "busy";
  return "idle";
}

function compactTopStatusMessage(message) {
  if (message.startsWith("DXF ready")) {
    const curveCount = tracedCircles.length + tracedArcs.length + tracedEllipses.length + tracedSplines.length;
    return `DXF ready / ${tracedLines.length.toLocaleString("ja-JP")} lines / ${curveCount.toLocaleString("ja-JP")} curves / ${tracedTexts.length.toLocaleString("ja-JP")} text`;
  }
  if (message.startsWith("No lines")) return "No entities detected";
  if (message.endsWith(` / build ${APP_BUILD}`)) return message.replace(` / build ${APP_BUILD}`, "");
  if (message.length <= 86) return message;
  return `${message.slice(0, 83).trimEnd()}...`;
}

function setBusy(active, message = "") {
  busy = Boolean(active);
  viewport?.classList.toggle("busy", busy);
  viewport?.setAttribute("aria-busy", String(busy));
  viewportBusy?.setAttribute("aria-hidden", String(!busy));
  updateBusyControls();
  applyPrimaryButtonState();
  updatePageControls();
  updatePickButtons();
  updateViewButtons();
  updateModeUi();
  if (message) {
    setText(viewportBusyText, message);
  }
}

function setAnalyzeDisabled(disabled) {
  analyzeDisabledRequested = Boolean(disabled);
  applyPrimaryButtonState();
}

function setDownloadDisabled(disabled) {
  downloadDisabledRequested = Boolean(disabled);
  applyPrimaryButtonState();
}

function applyPrimaryButtonState() {
  const analyzeDisabled = busy || analyzeDisabledRequested;
  const downloadDisabled = busy || downloadDisabledRequested;
  if (renderButton) renderButton.disabled = analyzeDisabled;
  if (renderButtonTop) renderButtonTop.disabled = analyzeDisabled;
  if (downloadButton) downloadButton.disabled = downloadDisabled;
  if (downloadButtonTop) downloadButtonTop.disabled = downloadDisabled;
  updatePrimaryButtonLabels();
}

function updatePrimaryButtonLabels() {
  const analyzeLabel = pdfDocument && renderedViewport && analysisDirty ? "Re-analyze" : "Analyze";
  setText(renderButton, analyzeLabel);
  setText(renderButtonTop, analyzeLabel);

  const analyzeTitle = busy
    ? "Wait for the current operation to finish"
    : !pdfDocument
      ? "Open a PDF first"
      : analyzeLabel === "Re-analyze"
        ? "Re-analyze with current settings"
        : "Analyze current page";
  const saveTitle = busy
    ? "Wait for the current operation to finish"
    : downloadDisabledRequested
      ? renderedViewport && analysisDirty
        ? "Analyze again before saving"
        : "Analyze the PDF before saving"
      : "Save DXF";

  for (const button of [renderButton, renderButtonTop]) {
    if (button) button.title = analyzeTitle;
  }
  for (const button of [downloadButton, downloadButtonTop]) {
    if (button) button.title = saveTitle;
  }
}

function updateBusyControls() {
  if (pdfInput) pdfInput.disabled = busy;
  setBusyControl(openPdfButtonTop, "Open PDF");
  setBusyControl(togglePanelButton, "Toggle settings panel");
  pdfDropzone?.classList.toggle("is-disabled", busy);
  pdfDropzone?.setAttribute("aria-disabled", String(busy));
  if (pdfDropzone) {
    pdfDropzone.title = busy ? "Wait for the current operation to finish" : "";
  }
}

function setBusyControl(button, enabledTitle) {
  if (!button) return;
  button.disabled = busy;
  button.title = busy ? "Wait for the current operation to finish" : enabledTitle;
}

function hasPreviewCanvas() {
  return Boolean(renderedViewport && pdfCanvas.width && pdfCanvas.height);
}

function hasTraceEntities() {
  return Boolean(
    tracedLines.length
    || tracedCircles.length
    || tracedArcs.length
    || tracedEllipses.length
    || tracedSplines.length
    || tracedTexts.length
  );
}

function updateViewButtons() {
  const hasPreview = hasPreviewCanvas();
  const canNavigatePreview = hasPreview && !busy;
  const canToggleLayers = canNavigatePreview;
  const canCompare = canToggleLayers && !analysisDirty && hasTraceEntities();

  setPreviewActionButton(fitButton, canNavigatePreview, "Fit preview to the workspace");
  setPreviewActionButton(zoomOutButton, canNavigatePreview, "Zoom out");
  setPreviewActionButton(zoomInButton, canNavigatePreview, "Zoom in");
  setPreviewActionButton(zoomResetButton, canNavigatePreview, "Reset zoom to 100%");
  setPreviewActionButton(panModeButton, canNavigatePreview, "Toggle pan mode");

  if (!canNavigatePreview && panMode) {
    panMode = false;
    updatePanUi();
  }

  setViewButtonState(toggleImageButton, canToggleLayers, hasPreview ? "Toggle PDF image" : "Analyze the PDF before toggling the PDF layer");
  setViewButtonState(toggleVectorButton, canToggleLayers, hasPreview ? "Toggle vector preview" : "Analyze the PDF before toggling the vector layer");

  if (toggleDxfCompareButton) {
    toggleDxfCompareButton.disabled = !canCompare;
    toggleDxfCompareButton.title = canCompare
      ? "Toggle PDF/DXF comparison"
      : compareDisabledTitle(hasPreview);
  }

  if (!canCompare && showDxfCompare) {
    showDxfCompare = false;
    toggleDxfCompareButton?.setAttribute("aria-pressed", "false");
    setText(dxfCompareValue, "Delta -");
    queueOverlayRedraw();
  }
}

function setPreviewActionButton(button, enabled, enabledTitle) {
  if (!button) return;
  button.disabled = !enabled;
  button.title = enabled ? enabledTitle : (busy ? "Wait for the current operation to finish" : "Analyze the PDF before using preview controls");
}

function setViewButtonState(button, enabled, title) {
  if (!button) return;
  button.disabled = !enabled;
  button.title = enabled ? title : (busy ? "Wait for the current operation to finish" : title);
}

function compareDisabledTitle(hasPreview) {
  if (busy) return "Wait for the current operation to finish";
  if (!hasPreview) return "Analyze the PDF before comparing";
  if (analysisDirty) return "Analyze again before comparing";
  return "No traced entities to compare";
}

function queueOverlayRedraw() {
  if (overlayRedrawQueued || !vectorCanvas.width || !vectorCanvas.height) return;
  overlayRedrawQueued = true;
  requestAnimationFrame(() => {
    overlayRedrawQueued = false;
    drawVectorOverlay();
  });
}

function updatePickButtons() {
  const hasAnalyzedPreview = Boolean(renderedViewport && pdfCanvas.width && pdfCanvas.height && !analysisDirty && !busy);
  setPickButtonsForAxis("x", [pickScaleBreaksX, pickScaleBreaksXTop], hasAnalyzedPreview);
  setPickButtonsForAxis("y", [pickScaleBreaksY, pickScaleBreaksYTop], hasAnalyzedPreview);
}

function setPickButtonsForAxis(axis, buttons, hasAnalyzedPreview) {
  const hasValues = getChildLengths(axis).length > 0;
  const canPick = hasAnalyzedPreview && hasValues;
  const title = canPick
    ? `Pick ${axis.toUpperCase()} dimension points`
    : !hasAnalyzedPreview
      ? analysisDirty
        ? "Analyze again before picking dimension points"
        : "Analyze the PDF before picking dimension points"
      : `Enter ${axis.toUpperCase()} dimension values before picking`;
  for (const button of buttons) {
    if (!button) continue;
    button.disabled = !canPick;
    button.title = title;
  }
}

function updateClearPicksButton() {
  const hasPickState = Boolean(
    scaleCalibration.mode
    || scaleCalibration.points.length
    || scaleCalibration.x
    || scaleCalibration.y
  );
  if (!clearScalePicksTop) return;
  clearScalePicksTop.disabled = !hasPickState;
  clearScalePicksTop.title = hasPickState ? "Clear picked dimension points" : "No dimension points to clear";
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function isChecked(element) {
  return Boolean(element?.checked);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function safeScale(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeLayer(value) {
  return value.replace(/[<>/\\":;?*|=,]/g, "_").trim().slice(0, 64) || "PDF_TRACE";
}

function dxfLayerName(base, suffix) {
  const cleanSuffix = sanitizeLayer(suffix);
  const cleanBase = sanitizeLayer(base);
  const baseLength = Math.max(1, 63 - cleanSuffix.length);
  return `${cleanBase.slice(0, baseLength)}_${cleanSuffix}`.slice(0, 64);
}

function normalizeDxfLinetype(value) {
  const name = String(value || "CONTINUOUS").trim().toUpperCase();
  return DXF_LINETYPES.some((linetype) => linetype.name === name) ? name : "CONTINUOUS";
}

function normalizeText(value) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim();
}

function dxfText(value) {
  return normalizeText(value).replace(/[{}]/g, "");
}

function pointAtAngle(x, y, distance, angleDegrees) {
  const radians = angleDegrees * Math.PI / 180;
  return {
    x: x + Math.cos(radians) * distance,
    y: y + Math.sin(radians) * distance,
  };
}

function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) return 0;
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

function signedDxfAngle(angle) {
  const normalized = normalizeAngle(angle);
  return normalized > 180 ? normalized - 360 : normalized;
}

function normalizeRadians(angle) {
  if (!Number.isFinite(angle)) return 0;
  const tau = Math.PI * 2;
  let normalized = angle % tau;
  if (normalized < 0) normalized += tau;
  return normalized;
}

function isLikelyOcrText(text, width, height, confidence) {
  const minConfidence = safeNumber(ocrMinConfidence?.value, 55);
  if (Number.isFinite(confidence) && confidence < minConfidence) return false;

  const key = textKey(text);
  if (!key) return false;
  if (isLikelyOcrNoiseKey(key, confidence)) return false;
  if (key.length === 1 && !/[A-Za-z0-9\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/u.test(key)) return false;
  if (!/[A-Za-z0-9\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/u.test(key)) return false;

  const punctuationCount = Array.from(key).filter((char) => !/[A-Za-z0-9\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/u.test(char)).length;
  if (punctuationCount / Math.max(1, key.length) > 0.45) return false;

  const aspect = width / Math.max(1, height);
  if (height < 5 || width < 4) return false;
  if (aspect > 30 || aspect < 0.08) return false;

  return true;
}

function isLikelyOcrNoiseKey(key, confidence) {
  const hasJapanese = /[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/u.test(key);
  const hasDigit = /\d/.test(key);
  const hasUpper = /[A-Z]/.test(key);
  const lowerish = /^[a-z.,:'"`~_-]+$/.test(key);
  if (!hasJapanese && lowerish && key.length <= 6) return true;
  if (!hasJapanese && !hasDigit && !hasUpper && key.length <= 8) return true;
  if (!hasJapanese && /^[a-z]+\d?[a-z]*$/.test(key) && key.length <= 8) return true;
  if (!hasJapanese && /^\d{1,2}$/.test(key) && safeNumber(confidence, 0) < 85) return true;
  if (!hasJapanese && /^[a-z0-9.,:'"`~_-]{1,4}$/.test(key) && /[a-z]/.test(key)) return true;
  return false;
}

function estimateTextWidth(text, height) {
  const weight = textAdvanceWeight(text);
  return Math.max(height * 0.6, weight * height * 0.78);
}

function textAdvanceWeight(text) {
  return Math.max(0.1, Array.from(String(text || "")).reduce((sum, char) => sum + characterAdvanceWeight(char), 0));
}

function estimateCharSpacing(text, width, height) {
  const chars = Array.from(String(text || ""));
  if (chars.length <= 1) return 0;
  const nominalWidth = estimateTextWidth(text, height);
  return (width - nominalWidth) / (chars.length - 1);
}

function dxfWidthFactor(text, width, height) {
  const nominalWidth = estimateTextWidth(text, height);
  if (nominalWidth <= 0) return 1;
  return clamp(width / nominalWidth, 0.1, 10);
}

function formatNumber(value) {
  return Number(value.toFixed(4)).toString();
}
