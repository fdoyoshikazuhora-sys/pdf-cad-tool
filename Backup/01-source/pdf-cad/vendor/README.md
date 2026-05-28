# Local Vendor Libraries

Place local runtime libraries here only when offline operation is required.

Expected files:

- `pdfjs/pdf.min.mjs`
- `pdfjs/pdf.worker.min.mjs`
- `tesseract/tesseract.min.js`
- `tesseract/worker.min.js`
- `tesseract/core/tesseract-core.wasm.js`
- `tesseract/core/tesseract-core-lstm.wasm.js`
- `tesseract/core/tesseract-core-simd.wasm.js`
- `tesseract/core/tesseract-core-simd-lstm.wasm.js`
- `tesseract/lang/eng.traineddata.gz`
- `tesseract/lang/jpn.traineddata.gz`

Run this from `app-output-bridge` to check the current state:

```powershell
npm run vendor:status
```

Download the files:

```powershell
npm run vendor:download
```

Switch the PDF-CAD source to local references after the files exist:

```powershell
npm run vendor:apply-local
```

The downloader and switcher are guarded to write only inside `app-output-bridge`. The generated wrapper embeds these files when they are available. Full OCR embedding is intentionally large; check output size before promoting it into another app.
