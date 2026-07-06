# App Store Market Research AI

App Storeのランキング・アプリ詳細・評価・レビュー傾向をもとに、今どのジャンルでどのようなアプリが
人気なのかを分析し、個人開発者・AI開発者向けに次に作るべきアプリ案、MVP要件、
Claude Code / Codex向け開発プロンプトまで生成する市場調査ツールです。

詳細な要件定義は本セッションの依頼内容（要件定義・詳細設計ドキュメント）を参照してください。

## できること（MVP）

- Apple公式RSSによるApp Storeランキング取得（無料/有料、Top10/25/50、ジャンル別）
- iTunes Search/Lookup APIによるアプリ詳細取得・任意URL診断
- ジャンル市場分析（上位アプリの共通点、価格傾向、レビュー不満、狙える余白）
- アプリURL診断（強み・弱み・改善点・診断スコア）
- レビュー分析（取得可能な範囲の公開レビュー＋CSVインポート、カテゴリ分類）
- 市場需要 / 競合過密 / 不満余地 / 個人開発向き / AI開発向き の5スコア算出
- 推奨アプリ案・作らない方がいいアプリ案・Claude Code / Codex向け開発プロンプト生成
- Markdown / JSON / CSVでのレポート出力・保存・再表示
- AI APIキー（OpenAI / Claude / Gemini）未設定時はルールベースの簡易分析にフォールバック

## スタック

Next.js (App Router) + TypeScript + SQLite (Prisma) + Tailwind CSS

## セットアップ

詳細は [`docs/setup.md`](./docs/setup.md) を参照してください。

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run db:seed:demo   # 任意: 外部ネットワークなしで試せる架空のデモデータを投入
npm run dev
```

## ドキュメント

- [セットアップ](./docs/setup.md)
- [使い方](./docs/usage.md)
- [トラブルシューティング](./docs/troubleshooting.md)
- [データ取得ポリシー](./docs/api-policy.md)
- [販売ページ用ドラフト](./docs/sales-page-draft.md)

## 注意事項

- App Store画面のHTMLスクレイピングは行わず、Apple公式RSSとiTunes Search/Lookup APIのみを使用します。
- レビュー本文の大量取得・売上/ダウンロード数の推定は行いません。
- 分析結果・スコア・アプリ案は参考情報であり、成功や収益を保証するものではありません。
- 本ツールの実行には `apps.apple.com` / `itunes.apple.com` への外部ネットワークアクセスが必要です。
  アウトバウンド通信が制限された環境（一部のCIやサンドボックス）では、ランキング取得・アプリ診断・
  公開レビュー取得が失敗しますが、その場合もエラーメッセージを表示して安全にフォールバックします。

## テスト

```bash
npm test
```

URLパーサー、RSS/Lookupレスポンスの正規化、スコアリング、CSVパーサー、レビュー分類の
ユニットテストを含みます（外部ネットワーク不要）。
