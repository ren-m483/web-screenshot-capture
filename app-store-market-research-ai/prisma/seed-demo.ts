import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

/**
 * ライブのApple API接続なしでも画面を一通り確認できるように、
 * 架空のデモデータ（ランキング・ジャンル分析・アプリ診断・レビュー）を投入するスクリプト。
 * ここに登場するアプリ名・開発者名・数値はすべて説明用の架空データであり、実在のアプリではない。
 */

const DEMO_GENRE_ID = "6017"; // Education
const DEMO_STOREFRONT = "jp";

const DEMO_APPS = [
  { id: "5000000001", name: "資格スピード復習", developerName: "Demo Studio A", rating: 4.6, ratingCount: 8200, price: 0, formattedPrice: "無料" },
  { id: "5000000002", name: "たんぷらす暗記カード", developerName: "Demo Studio B", rating: 4.4, ratingCount: 15300, price: 0, formattedPrice: "無料" },
  { id: "5000000003", name: "英単語マスターAI", developerName: "Demo Studio C", rating: 4.2, ratingCount: 42000, price: 0, formattedPrice: "無料" },
  { id: "5000000004", name: "親子まなびノート", developerName: "Demo Studio D", rating: 4.7, ratingCount: 1200, price: 0, formattedPrice: "無料" },
  { id: "5000000005", name: "総合学習アプリPro", developerName: "Big Edu Corp", rating: 4.0, ratingCount: 210000, price: 0, formattedPrice: "無料" },
  { id: "5000000006", name: "5分資格ドリル（買い切り）", developerName: "Demo Studio E", rating: 4.5, ratingCount: 640, price: 480, formattedPrice: "¥480" },
  { id: "5000000007", name: "習慣化まなびログ", developerName: "Demo Studio F", rating: 4.1, ratingCount: 980, price: 0, formattedPrice: "無料" },
];

async function main() {
  // 再実行してもレコードが重複しないよう、以前投入したデモデータを先に削除する
  // （Analysisの削除はスキーマのonDelete: CascadeでAppIdea/Reportも一緒に削除される）
  await prisma.analysis.deleteMany({ where: { modelName: "demo-seed" } });
  await prisma.review.deleteMany({ where: { appId: DEMO_APPS[4].id, sourceType: "csv", author: { startsWith: "demo_user_" } } });

  await prisma.storefront.upsert({
    where: { id: DEMO_STOREFRONT },
    update: {},
    create: { id: DEMO_STOREFRONT, name: "日本", defaultLang: "ja_jp" },
  });
  await prisma.genre.upsert({
    where: { id: DEMO_GENRE_ID },
    update: {},
    create: { id: DEMO_GENRE_ID, name: "Education", type: "app" },
  });

  for (const app of DEMO_APPS) {
    await prisma.app.upsert({
      where: { id: app.id },
      update: {
        name: app.name,
        developerName: app.developerName,
        averageUserRating: app.rating,
        userRatingCount: app.ratingCount,
        price: app.price,
        formattedPrice: app.formattedPrice,
        primaryGenreId: DEMO_GENRE_ID,
        primaryGenreName: "Education",
        currentVersionReleaseDate: new Date(),
        trackViewUrl: `https://apps.apple.com/jp/app/id${app.id}`,
        description: `${app.name}のデモ用説明文です。これは架空のサンプルデータです。`,
        screenshotUrls: JSON.stringify([]),
        lastLookupAt: new Date(),
      },
      create: {
        id: app.id,
        name: app.name,
        developerName: app.developerName,
        averageUserRating: app.rating,
        userRatingCount: app.ratingCount,
        price: app.price,
        formattedPrice: app.formattedPrice,
        primaryGenreId: DEMO_GENRE_ID,
        primaryGenreName: "Education",
        currentVersionReleaseDate: new Date(),
        trackViewUrl: `https://apps.apple.com/jp/app/id${app.id}`,
        description: `${app.name}のデモ用説明文です。これは架空のサンプルデータです。`,
        screenshotUrls: JSON.stringify([]),
        lastLookupAt: new Date(),
      },
    });
  }

  const sourceUrlHash = crypto.createHash("sha256").update(`demo-${DEMO_GENRE_ID}-free`).digest("hex");
  const existingSnapshot = await prisma.rankingSnapshot.findFirst({ where: { sourceUrlHash } });
  if (!existingSnapshot) {
    await prisma.rankingSnapshot.create({
      data: {
        storefrontId: DEMO_STOREFRONT,
        genreId: DEMO_GENRE_ID,
        chartType: "free",
        limit: 10,
        source: "demo_seed",
        sourceUrlHash,
        fetchedAt: new Date(),
        entries: {
          create: DEMO_APPS.map((app, index) => ({
            appId: app.id,
            rank: index + 1,
            appNameAtFetch: app.name,
            developerNameAtFetch: app.developerName,
          })),
        },
      },
    });
  }

  const scores = {
    marketDemandScore: 78,
    competitionScore: 62,
    opportunityScore: 71,
    personalDevFitScore: 68,
    aiDevFitScore: 74,
  };

  const recommendedIdeas = [
    {
      title: "社会人向け5分資格復習アプリ",
      targetUser: "通勤時間などスキマ時間で資格試験の復習をしたい社会人",
      problem: "総合学習アプリは教材が多すぎて何から手をつけていいか迷う",
      solution: "1回5分で終わる復習セッションだけに機能を絞る",
      marketReason: "上位アプリのレビューに「教材が多すぎて迷う」という不満が繰り返し見られた",
      competitorWeakness: "総合型アプリは機能過多でスキマ時間用途に向いていない",
      mvpFeatures: ["5分1セッションのクイズ出題", "進捗の記録", "苦手分野の復習リスト"],
      monetization: "買い切り、または月額低価格のサブスク",
      difficulty: "low",
      personalDevScore: 82,
      aiDevScore: 80,
      recommendation: "recommend",
    },
    {
      title: "親向け学習進捗メモアプリ",
      targetUser: "子どもの学習状況を簡単に記録したい親",
      problem: "既存の学習記録アプリは機能が複雑で継続しにくい",
      solution: "1日1タップで記録できるシンプルな学習ログアプリ",
      marketReason: "「親子まなびノート」のような特化アプリはまだ評価件数が少なく、余地がある",
      competitorWeakness: "総合学習アプリ（Big Edu Corp）は子ども向け機能が主体で親向け導線が弱い",
      mvpFeatures: ["科目別の学習時間記録", "週次サマリー表示", "簡単なメモ機能"],
      monetization: "無料 + 買い切りの詳細レポート機能",
      difficulty: "low",
      personalDevScore: 85,
      aiDevScore: 78,
      recommendation: "recommend",
    },
    {
      title: "買い切り型暗記カード生成アプリ",
      targetUser: "サブスクを避けたい学習者",
      problem: "暗記カード系アプリの多くはサブスク前提で課金不満が多い",
      solution: "買い切り一括で暗記カードを自動生成・復習できるアプリ",
      marketReason: "レビューに価格・課金に関する不満が多く見られた",
      competitorWeakness: "無料+サブスク型が主流で、買い切りを求める層のニーズに応えられていない",
      mvpFeatures: ["テキストからのカード自動生成", "反復学習アルゴリズム", "オフライン利用"],
      monetization: "買い切り（初回のみ課金）",
      difficulty: "medium",
      personalDevScore: 70,
      aiDevScore: 82,
      recommendation: "recommend",
    },
  ];

  function buildDevPrompt(idea: (typeof recommendedIdeas)[number]): string {
    return [
      `# ${idea.title} 開発プロンプト`,
      "",
      "あなたはNext.js + TypeScriptでアプリを開発するエンジニアです。以下の要件でMVPを実装してください。",
      "",
      "## 対象ユーザー",
      idea.targetUser,
      "",
      "## 解決する課題",
      idea.problem,
      "",
      "## MVP機能",
      ...idea.mvpFeatures.map((f) => `- ${f}`),
      "",
      "## 収益化案",
      idea.monetization,
    ].join("\n");
  }

  const recommendedIdeasWithPrompt = recommendedIdeas.map((idea) => ({ ...idea, devPrompt: buildDevPrompt(idea) }));

  const avoidIdeas = [
    {
      title: "総合型学習アプリ（すべての科目・年代をカバー）",
      reason: "評価件数20万件超の大手アプリが強く、個人開発での正面突破は難しい",
      alternative: "用途・対象ユーザーを1つに絞った特化アプリから始める",
    },
  ];

  const markdown = [
    "# Educationジャンル市場分析レポート（デモ）",
    "",
    "取得条件: storefront=jp / limit=10 / depth=standard（デモデータ）",
    "",
    "## 市場概要",
    "教育ジャンルでは、AI学習補助・資格学習・語学・子ども向け学習・習慣化系アプリが上位に多い（デモ）。",
    "",
    "## 上位アプリの共通点",
    "- 無料 + アプリ内課金で導入障壁を下げているアプリが多い",
    "- 評価件数が多いアプリほど機能が総合化している傾向",
    "",
    "## レビュー不満",
    "- 課金が高い / 広告が多い / 教材が多すぎて迷う / 継続できない",
    "",
    "## 狙える余白",
    "- 用途を1つに絞った特化アプリ（資格復習・親向けログ・買い切り暗記カード）",
    "",
    "## 避けるべき領域",
    "- 総合型・全年代対応の学習アプリ（大手アプリが強い）",
  ].join("\n");

  const analysis = await prisma.analysis.create({
    data: {
      analysisType: "genre_market",
      targetType: "genre",
      targetId: DEMO_GENRE_ID,
      inputHash: crypto.createHash("sha256").update("demo-genre-analysis").digest("hex"),
      promptVersion: "genre-analysis-v1",
      modelName: "demo-seed",
      scoreJson: JSON.stringify(scores),
      resultJson: JSON.stringify({
        marketOverview: "教育ジャンルでは、AI学習補助・資格学習・語学・子ども向け学習・習慣化系アプリが上位に多い（デモ）。",
        topAppPatterns: ["無料 + アプリ内課金が主流", "評価件数が多いアプリほど機能が総合化している"],
        pricingPattern: "無料 + アプリ内課金が主流",
        ratingPattern: "平均評価はおよそ4.3〜4.6",
        storePagePattern: "総合型アプリはスクリーンショット枚数が多く、機能訴求が中心",
        commonKeywords: ["資格", "暗記", "学習記録", "継続"],
        reviewComplaints: ["pricing_issue", "ads_issue", "ux_issue"],
        opportunityAreas: ["社会人向けの5分復習", "親向けの学習進捗メモ", "買い切り型の暗記カード生成"],
        avoidAreas: ["総合型・全年代対応の学習アプリ"],
        scores,
        recommendedIdeas: recommendedIdeasWithPrompt,
        avoidIdeas,
        markdown,
      }),
      resultMarkdown: markdown,
    },
  });

  await prisma.report.create({
    data: { analysisId: analysis.id, title: "Educationジャンル市場分析（デモ）", reportType: "markdown", content: markdown },
  });

  for (const idea of recommendedIdeasWithPrompt) {
    await prisma.appIdea.create({
      data: {
        analysisId: analysis.id,
        title: idea.title,
        targetUser: idea.targetUser,
        problem: idea.problem,
        solution: idea.solution,
        mvpFeatures: JSON.stringify(idea.mvpFeatures),
        monetization: idea.monetization,
        difficulty: idea.difficulty,
        personalDevScore: idea.personalDevScore,
        aiDevScore: idea.aiDevScore,
        recommendation: idea.recommendation,
        devPrompt: idea.devPrompt,
      },
    });
  }

  // サンプルレビュー（分類デモ用）
  const reviewSamples = [
    { rating: 1, body: "課金が高すぎます。もう少し安くしてほしいです。", author: "demo_user_1" },
    { rating: 2, body: "広告が多すぎて集中できません。", author: "demo_user_2" },
    { rating: 5, body: "とても使いやすく、続けやすいアプリで助かっています。", author: "demo_user_3" },
    { rating: 1, body: "アプリがすぐ落ちる。バグが多い。", author: "demo_user_4" },
    { rating: 2, body: "教材が多すぎて何をやればいいかわかりにくいです。", author: "demo_user_5" },
  ];

  for (const review of reviewSamples) {
    const categories: string[] = [];
    if (review.body.includes("課金")) categories.push("pricing_issue");
    if (review.body.includes("広告")) categories.push("ads_issue");
    if (review.body.includes("落ちる") || review.body.includes("バグ")) categories.push("bug");
    if (review.body.includes("わかりにくい")) categories.push("ux_issue");
    if (categories.length === 0) categories.push(review.rating >= 4 ? "positive_feature" : "unclear");

    await prisma.review.create({
      data: {
        appId: DEMO_APPS[4].id,
        sourceType: "csv",
        rating: review.rating,
        body: review.body,
        author: review.author,
        sentiment: review.rating >= 4 ? "positive" : review.rating <= 2 ? "negative" : "neutral",
        categories: JSON.stringify(categories),
      },
    });
  }

  console.log("デモデータの投入が完了しました。");
  console.log(`- ジャンル分析レポート analysisId: ${analysis.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
