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

## GitHub Actions

`.github/workflows/capture.yml`を含んでいます。

手動実行した場合、撮影結果はActionsのArtifactsから取得できます。

## セキュリティ

- パスワードやAPIキーをソースコードへ直接書かないでください。
- 認証情報が必要な場合はGitHub Secretsまたは環境変数を使用してください。
- 個人情報を含むスクリーンショットを公開リポジトリへコミットしないでください。
