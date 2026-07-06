# idea-generation prompt (v1)

ジャンル分析・レビュー分析・スコアリング結果をもとに、新規アプリ案を生成してください。
推奨アプリ案3個、ニッチ狙いアプリ案2個、作らない方がいいアプリ案3個を出力してください。

## 入力
- ジャンル分析結果: {{genreAnalysis}}
- スコア: {{scores}}

## 出力JSON形式
{
  "recommendedIdeas": [ { "title": "", "targetUser": "", "problem": "", "solution": "", "marketReason": "", "competitorWeakness": "", "mvpFeatures": [], "monetization": "", "difficulty": "low|medium|high", "devPrompt": "" } ],
  "nicheIdeas": [ ... 同構造 ... ],
  "avoidIdeas": [ { "title": "", "reason": "", "alternative": "" } ]
}
