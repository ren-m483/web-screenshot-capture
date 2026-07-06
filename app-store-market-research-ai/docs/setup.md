# セットアップ

## 必要環境

- Node.js 20以上
- npm

## インストール

```bash
cd app-store-market-research-ai
npm install
cp .env.example .env
```

## データベースの初期化

SQLite + Prisma を使用します。

```bash
npm run db:migrate   # マイグレーション適用（初回は prisma migrate dev と同等）
npm run db:seed      # storefronts / genres の初期データ投入
```

## デモデータの投入（任意）

`apps.apple.com` / `itunes.apple.com` への外部アクセスができない環境（社内ネットワーク、CI、
一部のサンドボックス等）でも画面を一通り確認できるように、架空のジャンル分析レポート・
アプリ案・レビューをまとめて投入するスクリプトを用意しています。

```bash
npm run db:seed:demo
```

何度実行しても重複せず、常に最新のデモデータ1件に置き換わります（実在のアプリ・開発者名では
ありません）。レビューCSVインポート機能を試す場合は [`docs/sample-reviews.csv`](./sample-reviews.csv)
を利用してください。

## AI APIキーの設定（任意）

`.env` に以下のいずれか1つ以上を設定すると、ジャンル分析・アプリ診断・レビュー分析でLLMによる
詳細な分析が生成されます。未設定の場合はルールベースの簡易分析にフォールバックします。
設定画面（`/settings`）からも登録・変更できます（DBに暗号化保存されます）。

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

## 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスしてください。

## テスト

```bash
npm test
```

## ビルド

```bash
npm run build
npm start
```
