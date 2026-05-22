# PDF to CAD Tool - Public Static Release

This folder is the public static release package.

Upload the whole folder to a static web host such as GitHub Pages, Netlify, Cloudflare Pages, or a normal web server.

## Entry

- Public entry page: `index.html`
- Direct app page: `pdf-cad/pdf-cad.html`

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

1. Open `index.html` through a web server.
2. Select a PDF in the app.
3. Run analysis.
4. Adjust scale, line type, text, layer, OCR, circle, and DXF settings as needed.
5. Save the DXF.

Opening the HTML file directly from the filesystem may block browser features in some environments. Static hosting or a local web server is recommended.

## Release Check

See `PUBLIC_RELEASE_MANIFEST.json` for file counts, byte counts, and the sanitization result.

See `PUBLIC_RELEASE_INVENTORY.md` for the release inventory.

See `PUBLIC_DEPLOYMENT_GUIDE.md` before uploading this folder to a public host.
