# genre-analysis prompt (v1)

あなたはApp Storeの市場調査アナリストです。以下のデータをもとに、個人開発者・AI開発者向けに
市場分析レポートをJSONで出力してください。売上やダウンロード数の断定的な推定は行わないでください。

## 入力
- ジャンル名: {{genreName}}
- 無料Top{{limit}}アプリ一覧: {{freeApps}}
- 有料Top{{limit}}アプリ一覧: {{paidApps}}
- レビュー傾向要約（取得できた範囲）: {{reviewSummary}}

## 出力JSON形式
{
  "marketOverview": "",
  "topAppPatterns": [],
  "pricingPattern": "",
  "ratingPattern": "",
  "storePagePattern": "",
  "commonKeywords": [],
  "reviewComplaints": [],
  "opportunityAreas": [],
  "avoidAreas": [],
  "recommendedIdeas": [ { "title": "", "targetUser": "", "problem": "", "solution": "", "marketReason": "", "competitorWeakness": "", "mvpFeatures": [], "monetization": "", "difficulty": "low|medium|high", "devPrompt": "" } ],
  "avoidIdeas": [ { "title": "", "reason": "", "alternative": "" } ]
}
