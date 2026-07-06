# app-diagnosis prompt (v1)

あなたはApp Storeの市場調査アナリストです。以下のアプリを診断し、強み・弱み・改善点をJSONで出力してください。
成功や収益を保証する表現は使わないでください。

## 入力
- 対象アプリ: {{targetApp}}
- 同ジャンルTop{{compareLimit}}アプリ: {{competitorApps}}
- レビュー傾向要約（取得できた範囲）: {{reviewSummary}}

## 出力JSON形式
{
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "storePageReview": "",
  "competitorPosition": "",
  "improvementSuggestions": [],
  "monetizationSuggestions": [],
  "personalDevLessons": []
}
