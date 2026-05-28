# PDF-CAD Bridge I/O

This is the sandbox I/O contract for the embedded PDF-CAD app.

The real host app is not written by this project. Use this contract while the sandbox app is still being completed.

## Parent To PDF-CAD

When using the generated React wrapper, commands can be sent through the global helper:

```js
const state = await window.PdfCadAppBridge.getState();
await window.PdfCadAppBridge.loadPdfData({ name: "drawing.pdf", base64: pdfBase64 });
await window.PdfCadAppBridge.analyze();
const dxf = await window.PdfCadAppBridge.exportDxf();
```

These helper methods return promises. Use `send(command, payload, requestId)` only when fire-and-forget behavior is needed.

Use this generated page to test the Promise API without touching the real host app:

```text
out/bridge-api-harness.html
```

The `Export & Save DXF` button on that page verifies that the parent side can save the returned `exportDxf()` result without calling the child app's download button.

Add `?autorun=1` to run load, analyze, and export automatically only when a sample PDF is intentionally bundled:

```text
out/bridge-api-harness.html?autorun=1
```

The result is also exposed on `window.__PDF_CAD_BRIDGE_SMOKE_RESULT__` for browser-based smoke checks.

Use this generated page to test raw `postMessage` command/response behavior:

```text
out/bridge-io-harness.html
```

The generated machine-readable contract is:

```text
out/bridge-manifest.json
```

The generated TypeScript declarations are:

```text
out/pdf-cad-bridge.d.ts
```

A future host-side calling example is available at:

```text
examples/PdfCadBridgeClient.example.js
```

Run the contract check after changing any bridge command, event, type, or example:

```powershell
npm run contract
```

Or by dispatching an event:

```js
window.dispatchEvent(new CustomEvent("pdf-cad-input", {
  detail: {
    requestId: "request-1",
    command: "get-state",
    payload: {}
  }
}));
```

Supported commands:

- `get-state`
- `load-sample`
- `load-pdf`
- `set-options`
- `analyze`
- `export-dxf`
- `download-dxf`
- `fit`

Promise helper methods:

- `PdfCadAppBridge.request(command, payload, options)`
- `PdfCadAppBridge.getState(options)`
- `PdfCadAppBridge.loadSample(sample, options)`
- `PdfCadAppBridge.loadPdfData(payload, options)`
- `PdfCadAppBridge.setOptions(optionsPayload, options)`
- `PdfCadAppBridge.analyze(options)`
- `PdfCadAppBridge.exportDxf(payload, options)`
- `PdfCadAppBridge.downloadDxf(options)`
- `PdfCadAppBridge.fit(options)`

`options.timeoutMs` controls the command timeout. Analysis and export default to 180 seconds.

`load-pdf` payload accepts one of:

```js
{ name: "drawing.pdf", base64: "..." }
{ name: "drawing.pdf", bytes: [37, 80, 68, 70] }
{ name: "drawing.pdf", arrayBuffer }
{ name: "drawing.pdf", url: "./drawing.pdf" }
```

`set-options` payload uses DOM control ids:

```js
{
  options: {
    dimensionScale: 100,
    scaleChildrenX: "24470,7530,12470",
    extractOcrText: false
  }
}
```

## PDF-CAD To Parent

The wrapper re-emits output as browser events:

```js
window.addEventListener("pdf-cad-output", (event) => {
  console.log(event.detail);
});

window.addEventListener("pdf-cad-response", (event) => {
  console.log(event.detail.requestId, event.detail.ok, event.detail.result);
});
```

Common event names:

- `ready`
- `status`
- `pdf-loaded`
- `sample-loaded`
- `analysis-complete`
- `dxf-exported`
- `dxf-download-started`
- `error`
- `command-error`

`export-dxf` returns:

```js
{
  fileName,
  layerName,
  dxf,
  dxfBase64,
  bytes,
  counts,
  state
}
```

## Standalone Preview

In `out/preview.html`, the same inner API exists directly:

```js
await window.PdfCadBridge.runCommand("get-state");
await window.PdfCadBridge.runCommand("export-dxf");
```
