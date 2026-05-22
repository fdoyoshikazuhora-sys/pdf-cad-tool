# Public Deployment Guide

Publish only this folder's contents. Do not upload the parent workspace.

## Recommended Upload Shape

Upload these files and folders at the web root:

- `index.html`
- `404.html`
- `.nojekyll`
- `robots.txt`
- `sitemap.xml`
- `pdf-cad/`
- `README.md`
- `THIRD_PARTY_NOTICES.md`
- `PUBLIC_DEPLOYMENT_GUIDE.md`
- `PUBLIC_RELEASE_INVENTORY.md`
- `PUBLIC_RELEASE_MANIFEST.json`

## GitHub Pages Notes

- Keep `.nojekyll` so static vendor files are served as normal files.
- Use `index.html` as the public entry.
- Upload the whole `pdf-cad/` folder without renaming it.
- After publishing, open the public URL and manually load a PDF.
- Run analysis and save a DXF before announcing the URL.

## Do Not Upload

- Sample PDFs unless you intentionally want them public.
- Local host integration wrappers.
- Development scripts or command files.
- Private drawings, private paths, or review harness pages.

## Expected Runtime

The app runs entirely in the browser. PDF processing and DXF export happen locally in the user's browser session.
