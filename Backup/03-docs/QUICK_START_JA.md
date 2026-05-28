# PDF-CAD 配布クイックスタート

## いま配布するもの

通常配布は軽量版を使います。

```text
dist-light-package/App_minimal.light.js
dist-light-package/pdf-cad/
```

サンプル PDF は同封しません。利用者が画面の `Select PDF` から自分の PDF を読み込みます。

## 配置イメージ

```text
host-app/src/App_minimal.js          <- App_minimal.light.js の内容
host-app/public/pdf-cad/pdf-cad.html <- pdf-cad/ フォルダ
```

標準では wrapper が次を読み込みます。

```text
/pdf-cad/pdf-cad.html
```

別の場所に置く場合は、ホスト側で次を設定します。

```js
window.PDF_CAD_LIGHT_SRC = "/your-path/pdf-cad.html";
```

## 配布前に確認すること

```powershell
npm run release:check
```

結果は次に出ます。

```text
release/RELEASE_CHECK.md
release/RELEASE_CHECK.json
```

`Overall: OK` で、`Sample PDF bundled in lightweight package: no.` なら配布用として問題ありません。

## ローカル確認 URL

```powershell
npm run serve:light
```

```text
http://127.0.0.1:5213/preview-host.html
```

API 受け渡し確認:

```powershell
npm run serve:light-api
```

```text
http://127.0.0.1:5213/light-api-harness.html
```

サンプル PDF は同封しないため、`Load Sample` と `Run Full Flow` は無効です。PDF を画面から選んでから `Analyze` と `Export DXF` を確認します。

## 安全な検証用コピー

実アプリを書き換える前に、レビュー用フォルダを作れます。

```powershell
npm run package:host-review
```

出力例:

```text
host-review/20260522_153000/
```

中には次が入ります。

```text
src/App_minimal.original.copy.js
src/App_minimal.light.candidate.js
public/pdf-cad/
HOST_REVIEW_MANIFEST.json
README_HOST_REVIEW.md
```

これは実ホストには書き込みません。
