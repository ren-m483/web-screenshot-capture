# データ取得ポリシー

## 使用するデータソース

| 用途 | データソース | 備考 |
| --- | --- | --- |
| ランキング | Apple公式RSS（`itunes.apple.com/{cc}/rss/...`） | HTMLスクレイピングは行わない |
| アプリ詳細 | iTunes Search / Lookup API（`itunes.apple.com/lookup`） | 約20コール/分の制限を考慮しキューで直列化 |
| 公開レビュー（取得可能な範囲） | Apple公開カスタマーレビューフィード（`itunes.apple.com/{cc}/rss/customerreviews/...`） | 大量取得・網羅的取得は保証しない |
| レビュー（任意） | ユーザーがアップロードするCSV | ファイルサイズ上限あり（5MB） |

## 行わないこと

- App Store画面・App Store Connect・Developer PortalのHTMLスクレイピング
- 売上・ダウンロード数の推定表示
- 競合アプリのレビューの網羅的・大量取得の保証
- 成功や収益を保証する表現

## キャッシュ方針

- ランキングは同一条件で最低60分キャッシュ（`RANKING_CACHE_MINUTES`）
- アプリ詳細（Lookup結果）は24時間キャッシュ（`LOOKUP_CACHE_MINUTES`）
- 強制更新オプションで明示的に再取得可能

## 将来拡張（MVP対象外）

- App Store Connect API連携（自分のアプリの公式レビュー取得）
- 外部レビューAPI連携（競合アプリの大量レビュー取得）
- Google Play対応
