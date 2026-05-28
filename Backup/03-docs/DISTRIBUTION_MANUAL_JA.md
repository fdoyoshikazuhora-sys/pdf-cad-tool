# PDF-CAD 配布・取扱説明書

このアプリは、PDF 図面を読み込み、線・円弧・円・文字・用紙サイズを DXF に変換するためのツールです。  
ユーザーが画面上で細かく調整してから DXF 保存できる設計です。調整画面は軽量版でも削除しません。

## まず見る資料

短い配布手順:

```text
docs/QUICK_START_JA.md
```

ホスト組み込み前レビュー:

```text
docs/HOST_INTEGRATION_REVIEW_JA.md
```

## 配布形態

### 1. 完全同梱版

ファイル:

```text
promotion/App_minimal.ready.js
```

特徴:

- React 側に PDF-CAD 画面、PDF.js、Tesseract、OCR 言語データ、サンプル PDF をまとめて埋め込みます。
- 追加の `vendor` フォルダなしで動かしやすいです。
- ファイルサイズが大きいです。現在は約 51MB です。

使いどころ:

- 配布先で静的ファイル配置を増やしたくない場合
- オフライン OCR まで 1 ファイルに寄せたい場合

### 2. 軽量版

作成コマンド:

```powershell
npm run package:light
```

出力:

```text
dist-light-package/App_minimal.light.js
dist-light-package/pdf-cad/
dist-light-package/preview-host.html
dist-light-package/light-api-harness.html
dist-light-package/LIGHT_PACKAGE_MANIFEST.json
```

特徴:

- React wrapper は軽量です。
- PDF-CAD 本体、PDF.js、Tesseract、OCR 言語データは `pdf-cad/` フォルダとして配布します。
- ユーザー調整画面はそのまま使えます。

配置例:

```text
host-app/src/App_minimal.js          <- App_minimal.light.js を確認後に差し替え
host-app/public/pdf-cad/pdf-cad.html <- dist-light-package/pdf-cad/ を配置
```

標準の読み込み先:

```text
/pdf-cad/pdf-cad.html
```

別パスに置く場合は、ホスト側で次を設定します。

```js
window.PDF_CAD_LIGHT_SRC = "/your-path/pdf-cad.html";
```

## 基本操作

1. `Select PDF` から PDF 図面を選びます。
2. 必要に応じて各調整項目を変更します。
3. `Analyze` を押して解析します。
4. プレビューと Run Summary を確認します。
5. 必要なら調整して再度 `Analyze` します。
6. `Save DXF` で DXF を保存します。

## ユーザーが調整できる主な項目

### Page & Trace

- `Threshold`: 画像線を拾う濃さのしきい値です。
- `Min Line Length (px)`: 短すぎる線を除外する基準です。
- `Recreate dashed and center lines as DXF linetypes`: 破線・中心線を DXF 線種として再現します。
- `Line Type Sensitivity`: 線種判定の強さです。通常は `Firm` を基準にします。
- `Line Preview`: 画面表示だけをフィルタします。DXF 出力内容は変えません。
- `Prefer vector paths embedded in the PDF`: ベクター PDF の線を優先して読みます。

### Scale & Alignment

- `1 PDF pt`: PDF 座標を mm に換算する基準です。
- `Global X Shift` / `Global Y Shift`: DXF 全体の位置を mm 単位で微調整します。
- `Drawing Scale 1/`: Jw 等で表示される図面縮尺です。例: `100` なら `S=1/100`。
- `X Dimension Values` / `Y Dimension Values`: 図面上に書かれた子寸法をカンマ区切りで入力します。
- `X Dimension Points` / `Y Dimension Points`: 寸法の両端と中間点を画面で拾います。
- `Snap to endpoints and intersections`: 点指定時に端点・交点へスナップします。
- `Reset`: 寸法補正を解除します。

### Geometry

- `Detect circles as DXF CIRCLE entities`: 円を DXF の CIRCLE として出力します。
- `Min Circle Radius (px)` / `Max Circle Radius (px)`: 円として拾う半径範囲です。
- `Circle Sensitivity`: 円検出の強さです。
- `Deep circle scan`: 円検出を深く行います。時間がかかる場合があります。

### Text & OCR

- `Convert embedded PDF text to TEXT`: PDF に埋め込まれた文字を DXF TEXT にします。
- `Fill missing image/vector text with OCR`: 画像化・線画化された文字を OCR で補います。
- `Split text into characters to preserve spacing`: 文字間隔重視で 1 文字ずつ出力します。
- `Use DXF FIT to preserve text width`: DXF の FIT を使って文字幅を合わせます。
- `Text Height Scale`: 文字高さの倍率です。大きすぎる場合は下げます。
- `Text Width Scale`: 文字幅の倍率です。
- `Text Along Shift` / `Text Vertical Shift`: 文字位置を文字方向・縦方向に mm 単位でずらします。
- `OCR Language`: OCR 言語です。通常は `Japanese + English`、検証時は `English` だけにすると軽くなります。
- `OCR Confidence`: OCR 採用の信頼度下限です。低いほど拾いますが誤認識も増えます。

### Output

- `Layer Name`: DXF 出力レイヤー名です。線・文字などは内部で種別レイヤーに分かれます。

## 連携側から指定できる項目

ホストアプリからは `window.PdfCadAppBridge.setOptions()` で、画面の input/select の `id` を指定できます。  
これはユーザー調整を禁止するものではなく、初期値やプリセットを外側から入れるための仕組みです。

例:

```js
await window.PdfCadAppBridge.setOptions({
  lineTypeSensitivity: "firm",
  dimensionScale: 100,
  textHeightScale: 0.75,
  textWidthScale: 1,
  extractPdfText: true,
  extractOcrText: false,
  fitTextWidth: true,
  layerName: "PDF_TRACE"
});
```

主な API:

- `loadSample(sampleName)`: 同一オリジン上に置いた PDF をファイル名指定で読み込みます。配布版にはサンプル PDF を同梱しません。
- `loadPdfData({ name, base64 })`: 外側から PDF データを渡します。
- `setOptions(options)`: 解析設定を指定します。
- `analyze()`: 解析を実行します。
- `exportDxf({ includeText })`: DXF データを返します。
- `downloadDxf()`: 画面側で DXF 保存を開始します。
- `getState()`: 現在の状態、カウント、ページサイズ等を返します。

## 配布前チェック

まとめて確認:

```powershell
npm run release:check
```

結果は `release/RELEASE_CHECK.md` と `release/RELEASE_CHECK.json` に出力されます。

現在の配布設定ではサンプル PDF を同梱しません。`bridge.config.json` の `embedSourceAssets` は `false` のままにし、必要な PDF は利用者が画面から読み込む前提です。生成サイズを確認する場合は次を使えます。

```powershell
npm run check:no-sample
```

完全同梱版:

```powershell
npm run verify
npm run contract
npm run safety
npm run promotion:check
```

軽量版:

```powershell
npm run package:light
```

ホスト組み込み前のレビュー用コピー:

```powershell
npm run package:host-review
```

出力先:

```text
host-review/YYYYMMDD_HHMMSS/
```

ブラウザ確認:

```text
http://127.0.0.1:5212/preview.html
http://127.0.0.1:5212/bridge-api-harness.html
http://127.0.0.1:5213/preview-host.html
http://127.0.0.1:5213/light-api-harness.html
```

サンプル PDF を同梱しないため、通常の配布確認では画面から PDF を読み込んでから解析・DXF出力を確認します。`autorun=1` の smoke は、サンプル同梱ビルドを意図的に作る場合だけ使用します。

## 注意

- 本体アプリの `App_minimal.js` は、明示承認があるまで差し替えません。
- 軽量版では `pdf-cad/` フォルダを一緒に配布しないと PDF.js / OCR / CSS が読み込めません。
- OCR は便利ですが、文字ではないものを文字扱いする場合があります。通常は埋め込み PDF text を優先し、必要な時だけ OCR を有効にしてください。
