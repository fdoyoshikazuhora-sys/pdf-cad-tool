# Public Release Checklist

Use this checklist when preparing the PDF-CAD tool for external publication.

## Build

```powershell
npm run package:public
```

The output is:

```text
public-release/
```

The command refreshes the lightweight package first, then copies only public static files.

## Check

```powershell
npm run public:check
```

The check verifies:

- Required public files exist.
- No unexpected files were mixed into the public folder.
- Public HTML and JavaScript references point to existing local files.
- Internal paths and review-only names are not present.
- The manifest says no sample PDF and no host wrapper are bundled.

## Local Preview

```powershell
npm run serve:public
```

Open:

```text
http://127.0.0.1:5214/index.html
```

## Public Folder Contents

- `.nojekyll`
- `404.html`
- `index.html`
- `pdf-cad/`
- `README.md`
- `robots.txt`
- `PUBLIC_DEPLOYMENT_GUIDE.md`
- `THIRD_PARTY_NOTICES.md`
- `PUBLIC_RELEASE_INVENTORY.md`
- `PUBLIC_RELEASE_MANIFEST.json`

## Excluded From Public Release

- Sample PDFs.
- Host app wrappers.
- Host integration review pages.
- Development scripts and command files.
- Machine-specific absolute paths.

## Before External Publication

1. Confirm `PUBLIC_RELEASE_MANIFEST.json` has `"ok": true`.
2. Confirm `samplePdfBundled` is `false`.
3. Confirm `hostWrapperBundled` is `false`.
4. Open the local preview and load a real PDF manually.
5. Run analysis and save a DXF.
6. Review third-party runtime licenses before uploading to a public host.

Do not publish the whole parent workspace. Publish only the contents of `public-release/` or a dedicated clean repository created from that folder.
