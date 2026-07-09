# Web Screenshot Capture

Playwrightを使い、複数のWebページをスマートフォン・タブレット・PC相当の画面サイズで一括撮影するツールです。

## 特徴

- 複数URLを一括撮影
- iPhone・iPad・Android相当サイズ
- PC・ノートPC相当サイズ
- viewport版とfullPage版をPNG保存
- 撮影日時・URL・端末名ごとに整理
- 一部の撮影に失敗しても処理を継続
- JSON形式の実行レポートを出力
- Windowsではバッチファイルから実行可能

## 注意

このツールは画面サイズ、User-Agent、タッチ操作などをエミュレーションしますが、実機のOS・ブラウザを完全に再現するものではありません。

公開サイトを撮影するときは、対象サイトの利用規約、著作権、個人情報、アクセス負荷に注意してください。

## 必要環境

- Node.js 20以上を推奨
- npm
- Windows、macOS、Linux

## セットアップ

```bash
git clone <YOUR_REPOSITORY_URL>
cd web-screenshot-capture
npm install
npx playwright install chromium
```

## 撮影対象URLの設定

`config/targets.js`を編集します。

```javascript
export const targets = [
  {
    name: "top",
    url: "https://example.com/",
  },
  {
    name: "about",
    url: "https://example.com/about/",
  },
];
```

## 端末サイズの設定

`config/devices.js`を編集します。

```javascript
{
  name: "Desktop-1440x900",
  category: "desktop",
  settings: {
    viewport: {
      width: 1440,
      height: 900,
    },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
}
```

## 任意機能の設定

`config/options.js`で切り替えます。

```javascript
export const options = {
  autoScroll: false,
  injectAnimationStopCss: false,
  captureMenuOpen: false,
  colorScheme: "light",
  waitForImages: true,
};
```

## 実行

```bash
npm run capture
```

Windowsでは、`run-capture.bat`をダブルクリックして実行できます。

## 出力例

```text
screenshots/
└── 2026-06-20_210000/
    └── chromium/
        ├── top/
        │   ├── iPhone-13-viewport.png
        │   ├── iPhone-13-full.png
        │   ├── Desktop-1440x900-viewport.png
        │   └── Desktop-1440x900-full.png
        └── capture-report.json
```

## デバッグ実行

ブラウザを表示した状態で実行します。

```bash
npm run capture:debug
```

---

# X（旧Twitter）バズ投稿ジェネレーター

バズった投稿を分析して共通する特徴を抽出し、その型をなぞって
新しい投稿案を自動生成するツールです。スクリーンショット機能とは
独立して動き、外部APIやログインは不要です。

## できること

- バズ投稿サンプルの特徴を機械的に抽出（`npm run analyze`）
  - 文字数・行数・箇条書きの有無
  - 冒頭フックの型（問いかけ／数字提示／告白・体験など）
  - 絵文字・ハッシュタグ・CTA（保存・フォロー等）の傾向
  - 反応数（いいね・リポスト）で重み付けし、伸びた投稿ほど強く反映
- 抽出した「スタイルプロファイル」とお題から、投稿案を複数生成
  （`npm run generate`）

## 注意

分析対象は、自分が権利を持つ投稿か、分析目的で許諾を得た投稿に
してください。同梱の`config/viral-samples.js`は、実在の投稿では
なく典型的なパターンを表す合成サンプルです。

生成された文章は下書きです。事実確認と最終的な調整をしたうえで
投稿してください。

## 使い方

### 1. 分析対象を用意する

`config/viral-samples.js`を編集し、分析したい投稿を並べます。
`metrics`にいいね数・リポスト数を入れると、反応の大きい投稿ほど
特徴へ強く反映されます。

```javascript
export const viralSamples = [
  {
    id: "sample-001",
    theme: "副業",
    text: "ここに投稿本文",
    metrics: { likes: 12800, reposts: 3200, replies: 210 },
  },
];
```

### 2. 分析する

```bash
npm run analyze
```

特徴レポートが表示され、`data/profile.json`に保存されます。

### 3. 投稿案を生成する

お題や要点は`config/post-options.js`で指定するか、コマンドライン
引数で上書きできます。

```bash
# 設定ファイルの内容で生成
npm run generate

# お題と件数を指定
npm run generate -- --topic "朝活" --count 4

# 要点も指定（カンマ区切り）
npm run generate -- --topic "読書" --points "1日10分,寝る前に読む,感想を残す"
```

生成結果は画面に表示され、`data/generated-posts.json`にも保存されます。

## 出力例

```text
data/
├── profile.json           分析で得たスタイルプロファイル
└── generated-posts.json   生成した投稿案
```

## 仕組み

| ファイル | 役割 |
| --- | --- |
| `lib/analyzer.js` | 1投稿から特徴量を抽出 |
| `lib/profile.js` | 複数投稿を重み付き集計してプロファイル化 |
| `lib/generator.js` | プロファイルとお題から投稿案を組み立て |
| `scripts/analyze.js` | 分析の実行入口 |
| `scripts/generate.js` | 生成の実行入口 |

## GitHub Actions

`.github/workflows/capture.yml`を含んでいます。

手動実行した場合、撮影結果はActionsのArtifactsから取得できます。

## セキュリティ

- パスワードやAPIキーをソースコードへ直接書かないでください。
- 認証情報が必要な場合はGitHub Secretsまたは環境変数を使用してください。
- 個人情報を含むスクリーンショットを公開リポジトリへコミットしないでください。
