# review-analysis prompt (v1)

以下はApp Storeレビュー（取得可能な範囲・またはCSVインポート分）です。カテゴリ集計とあわせて
高評価理由・低評価理由・要望・改善余地を日本語でJSON要約してください。

## 入力
- レビュー件数: {{reviewCount}}
- カテゴリ別件数: {{categoryCounts}}
- レビュー抜粋: {{reviewExcerpts}}

## 出力JSON形式
{
  "positiveSummary": "",
  "negativeSummary": "",
  "topComplaints": [],
  "requestedFeatures": [],
  "pricingSentiment": "",
  "uxIssues": [],
  "opportunityAreas": [],
  "mvpHints": []
}
