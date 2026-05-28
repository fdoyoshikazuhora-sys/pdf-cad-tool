# ホスト組み込み前レビュー手順

この手順は、PDF-CAD 軽量版を将来ホストアプリへ組み込むための事前確認です。  
実際の `App_minimal.js` は、明示承認があるまで差し替えません。

## 1. レビュー用パッケージを作成

```powershell
npm run package:host-review
```

このコマンドは先に軽量版を再生成してから、次のようなフォルダを作ります。

```text
host-review/YYYYMMDD_HHMMSS/
```

## 2. 中身

```text
src/App_minimal.original.copy.js
src/App_minimal.light.candidate.js
public/pdf-cad/
HOST_REVIEW_MANIFEST.json
README_HOST_REVIEW.md
```

- `App_minimal.original.copy.js`: 現在のホスト `App_minimal.js` の控えです。
- `App_minimal.light.candidate.js`: PDF-CAD 軽量版 wrapper です。
- `public/pdf-cad/`: PDF-CAD 本体、CSS、PDF.js、Tesseract、OCR 言語データです。
- `HOST_REVIEW_MANIFEST.json`: ハッシュ、ファイル数、サンプル非同封状態の確認用です。

## 3. 確認ポイント

- `HOST_REVIEW_MANIFEST.json` の `ok` が `true`
- `sampleBundled` が `false`
- `writesOutsideBridge` が `false`
- `staticApp.forbiddenStaticFiles` が空

## 4. ホスト側に必要な配置形

標準配置:

```text
host-app/src/App_minimal.js
host-app/public/pdf-cad/pdf-cad.html
```

wrapper は標準で次を読み込みます。

```text
/pdf-cad/pdf-cad.html
```

違うパスに置く場合は、ホスト側で次を設定します。

```js
window.PDF_CAD_LIGHT_SRC = "/your-path/pdf-cad.html";
```

## 5. まだやらないこと

- 実ホストの `App_minimal.js` へ直接上書きしない
- 実ホストの `public` へ直接コピーしない
- 既存アプリの完成品をこのプロジェクトから自動変更しない

実ホストへ進む時は、レビュー用コピーで挙動確認してから、明示承認後に別手順で行います。
