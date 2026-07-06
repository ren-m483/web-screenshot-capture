import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { bulletList, h1, h2, table } from "@/lib/markdown";
import { findGenre, GENRE_COMPLEXITY_HINTS, DEFAULT_GENRE_COMPLEXITY } from "@/constants/apple-genres";
import type { ChartType, RankingLimit } from "@/constants/chart-types";
import { appleRssService } from "./apple-rss.service";
import { itunesLookupService } from "./itunes-lookup.service";
import { reviewProviderService } from "./review-provider.service";
import { scoringService, type AppStatInput } from "./scoring.service";
import { getLlmProvider, extractJson } from "./llm.service";
import { buildDevPrompt, buildFallbackIdeaSet } from "./idea-generation.service";
import type { AppIdeaOutput, AvoidIdeaOutput, GenreAnalysisResult } from "@/types/analysis";
import type { NormalizedApp } from "@/types/app";

const PROMPT_VERSION = "genre-analysis-v1";

export interface AnalyzeGenreParams {
  storefront: string;
  genreId: string;
  chartTypes: ChartType[];
  limit: RankingLimit;
  analysisDepth: "quick" | "standard" | "deep";
}

interface RawIdea {
  title: string;
  targetUser: string;
  problem: string;
  solution: string;
  marketReason: string;
  competitorWeakness: string;
  mvpFeatures: string[];
  monetization: string;
  difficulty: "low" | "medium" | "high";
}

function readPromptTemplate(fileName: string): string {
  try {
    return readFileSync(path.join(process.cwd(), "prompts", fileName), "utf-8");
  } catch {
    return "";
  }
}

function finalizeIdea(
  raw: RawIdea,
  scores: { personalDevFitScore: number; aiDevFitScore: number },
  recommendation: "recommend" | "niche" | "avoid",
): AppIdeaOutput {
  const idea: AppIdeaOutput = {
    ...raw,
    personalDevScore: scores.personalDevFitScore,
    aiDevScore: scores.aiDevFitScore,
    recommendation,
    devPrompt: "",
  };
  idea.devPrompt = buildDevPrompt(idea);
  return idea;
}

export class MarketAnalysisService {
  async buildGenreAnalysisInput(snapshotIds: string[]) {
    const snapshots = await prisma.rankingSnapshot.findMany({
      where: { id: { in: snapshotIds } },
      include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
    });
    return snapshots;
  }

  async analyzeGenre(params: AnalyzeGenreParams): Promise<{ analysisId: string; result: GenreAnalysisResult }> {
    const genre = findGenre(params.genreId) ?? { id: params.genreId, name: params.genreId, type: "app" as const };

    const snapshotsByType: Partial<Record<ChartType, Awaited<ReturnType<typeof appleRssService.fetchRanking>>>> = {};
    for (const chartType of params.chartTypes) {
      snapshotsByType[chartType] = await appleRssService.fetchRanking({
        storefront: params.storefront,
        genreId: params.genreId,
        chartType,
        limit: params.limit,
      });
    }

    const allAppIds = Array.from(
      new Set(Object.values(snapshotsByType).flatMap((s) => s?.entries.map((e) => e.appId) ?? [])),
    );
    const apps = await itunesLookupService.lookupApps(allAppIds, params.storefront);

    const appStats: AppStatInput[] = apps.map((a) => ({
      developerName: a.developerName,
      price: a.price,
      averageUserRating: a.averageUserRating,
      userRatingCount: a.userRatingCount,
      currentVersionReleaseDate: a.currentVersionReleaseDate,
    }));

    const reviewSampleApps = apps.slice(0, params.analysisDepth === "quick" ? 2 : params.analysisDepth === "deep" ? 8 : 5);
    const categoryCounts: Record<string, number> = {};
    let totalReviews = 0;
    let negativeCount = 0;
    const excerpts: string[] = [];

    for (const app of reviewSampleApps) {
      const reviews = await reviewProviderService.fetchPublicReviews(app.appId, params.storefront);
      for (const review of reviews) {
        totalReviews++;
        if (review.sentiment === "negative") negativeCount++;
        for (const category of review.categories) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
        if (excerpts.length < 15 && review.body) excerpts.push(`(${review.rating}★) ${review.body.slice(0, 120)}`);
      }
    }

    const reviewStats = {
      totalReviews,
      negativeCount,
      pricingComplaintCount: categoryCounts["pricing_issue"] ?? 0,
      uxComplaintCount: categoryCounts["ux_issue"] ?? 0,
      requestCount: categoryCounts["request"] ?? 0,
      repeatedComplaintTopCount: Math.max(0, ...Object.values(categoryCounts)),
    };

    const complexity = GENRE_COMPLEXITY_HINTS[genre.id] ?? DEFAULT_GENRE_COMPLEXITY;
    const scores = {
      marketDemandScore: scoringService.calculateMarketDemandScore({ apps: appStats }),
      competitionScore: scoringService.calculateCompetitionScore({ apps: appStats }),
      opportunityScore: scoringService.calculateOpportunityScore(reviewStats),
      personalDevFitScore: scoringService.calculatePersonalDevFitScore(complexity),
      aiDevFitScore: scoringService.calculateAiDevFitScore(complexity),
    };

    const llmOutcome = await this.runLlmAnalysis(genre.name, snapshotsByType, apps, categoryCounts, excerpts, params);

    const overallRecommendation =
      scoringService.recommendationFromScores({
        marketDemandScore: scores.marketDemandScore,
        opportunityScore: scores.opportunityScore,
        personalDevFitScore: scores.personalDevFitScore,
        competitionScore: scores.competitionScore,
      }) === "avoid"
        ? "avoid"
        : "recommend";

    const recommendedIdeas =
      llmOutcome?.recommendedIdeas?.map((raw) => finalizeIdea(raw, scores, overallRecommendation === "avoid" ? "niche" : "recommend")) ??
      buildFallbackIdeaSet({
        genreName: genre.name,
        opportunityAreas: llmOutcome?.opportunityAreas ?? this.fallbackOpportunityAreas(categoryCounts),
        avoidAreas: llmOutcome?.avoidAreas ?? this.fallbackAvoidAreas(scores),
        personalDevFitScore: scores.personalDevFitScore,
        aiDevFitScore: scores.aiDevFitScore,
      }).recommendedIdeas;

    const avoidIdeas: AvoidIdeaOutput[] =
      llmOutcome?.avoidIdeasOutput ??
      buildFallbackIdeaSet({
        genreName: genre.name,
        opportunityAreas: llmOutcome?.opportunityAreas ?? this.fallbackOpportunityAreas(categoryCounts),
        avoidAreas: llmOutcome?.avoidAreas ?? this.fallbackAvoidAreas(scores),
        personalDevFitScore: scores.personalDevFitScore,
        aiDevFitScore: scores.aiDevFitScore,
      }).avoidIdeas;

    const result: GenreAnalysisResult = {
      marketOverview: llmOutcome?.marketOverview ?? this.fallbackMarketOverview(genre.name, appStats, scores),
      topAppPatterns: llmOutcome?.topAppPatterns ?? this.fallbackTopAppPatterns(appStats),
      pricingPattern: llmOutcome?.pricingPattern ?? this.fallbackPricingPattern(appStats),
      ratingPattern: llmOutcome?.ratingPattern ?? this.fallbackRatingPattern(appStats),
      storePagePattern: llmOutcome?.storePagePattern ?? "説明文・スクリーンショットの傾向はLLM未設定のため簡易分析のみ表示しています。",
      commonKeywords: llmOutcome?.commonKeywords ?? [],
      reviewComplaints: llmOutcome?.reviewComplaints ?? Object.keys(categoryCounts),
      opportunityAreas: llmOutcome?.opportunityAreas ?? this.fallbackOpportunityAreas(categoryCounts),
      avoidAreas: llmOutcome?.avoidAreas ?? this.fallbackAvoidAreas(scores),
      scores,
      recommendedIdeas,
      avoidIdeas,
      markdown: "",
    };

    result.markdown = this.buildMarkdown(genre.name, params, result, apps);

    const inputHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ params, appIds: allAppIds }))
      .digest("hex");

    const analysis = await prisma.analysis.create({
      data: {
        analysisType: "genre_market",
        targetType: "genre",
        targetId: genre.id,
        inputHash,
        promptVersion: PROMPT_VERSION,
        modelName: llmOutcome ? (llmOutcome.modelName ?? "llm") : "rule-based-fallback",
        scoreJson: JSON.stringify(scores),
        resultJson: JSON.stringify(result),
        resultMarkdown: result.markdown,
      },
    });

    await prisma.report.create({
      data: {
        analysisId: analysis.id,
        title: `${genre.name}ジャンル市場分析`,
        reportType: "markdown",
        content: result.markdown,
      },
    });

    for (const idea of recommendedIdeas) {
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

    return { analysisId: analysis.id, result };
  }

  private async runLlmAnalysis(
    genreName: string,
    snapshotsByType: Partial<Record<ChartType, Awaited<ReturnType<typeof appleRssService.fetchRanking>>>>,
    apps: NormalizedApp[],
    categoryCounts: Record<string, number>,
    excerpts: string[],
    params: AnalyzeGenreParams,
  ): Promise<
    | (Omit<Partial<GenreAnalysisResult>, "recommendedIdeas" | "avoidIdeas" | "scores" | "markdown"> & {
        recommendedIdeas?: RawIdea[];
        avoidIdeasOutput?: AvoidIdeaOutput[];
        modelName?: string;
      })
    | null
  > {
    const provider = await getLlmProvider();
    if (!provider) return null;

    const template = readPromptTemplate("genre-analysis.md");
    const prompt = template
      .replace("{{genreName}}", genreName)
      .replace("{{limit}}", String(params.limit))
      .replace("{{freeApps}}", JSON.stringify(snapshotsByType.free?.entries ?? []))
      .replace("{{paidApps}}", JSON.stringify(snapshotsByType.paid?.entries ?? []))
      .replace("{{reviewSummary}}", JSON.stringify({ categoryCounts, excerpts }));

    try {
      const text = await provider.complete(prompt);
      const parsed = extractJson<{
        marketOverview: string;
        topAppPatterns: string[];
        pricingPattern: string;
        ratingPattern: string;
        storePagePattern: string;
        commonKeywords: string[];
        reviewComplaints: string[];
        opportunityAreas: string[];
        avoidAreas: string[];
        recommendedIdeas: RawIdea[];
        avoidIdeas: AvoidIdeaOutput[];
      }>(text);
      if (!parsed) return null;
      return { ...parsed, avoidIdeasOutput: parsed.avoidIdeas, modelName: provider.modelName };
    } catch {
      return null;
    }
  }

  private fallbackMarketOverview(genreName: string, apps: AppStatInput[], scores: { marketDemandScore: number; competitionScore: number }): string {
    return `${genreName}ジャンルの上位${apps.length}アプリを機械的に集計した簡易分析です（LLM未設定のためテンプレート出力）。市場需要スコアは${scores.marketDemandScore}、競合過密スコアは${scores.competitionScore}でした。`;
  }

  private fallbackTopAppPatterns(apps: AppStatInput[]): string[] {
    const freeCount = apps.filter((a) => (a.price ?? 0) === 0).length;
    return [
      `無料アプリが${freeCount}/${apps.length}件を占めている`,
      `評価件数の中央値は${Math.round(
        [...apps.map((a) => a.userRatingCount ?? 0)].sort((a, b) => a - b)[Math.floor(apps.length / 2)] ?? 0,
      )}件`,
    ];
  }

  private fallbackPricingPattern(apps: AppStatInput[]): string {
    const freeCount = apps.filter((a) => (a.price ?? 0) === 0).length;
    return freeCount / Math.max(1, apps.length) > 0.7 ? "無料 + アプリ内課金が主流" : "有料アプリも一定数存在する";
  }

  private fallbackRatingPattern(apps: AppStatInput[]): string {
    const ratings = apps.map((a) => a.averageUserRating ?? 0).filter((r) => r > 0);
    const avg = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0;
    return `平均評価はおよそ${avg.toFixed(2)}`;
  }

  private fallbackOpportunityAreas(categoryCounts: Record<string, number>): string[] {
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return ["レビューデータが不足しているため、詳細な余地分析にはレビューCSVの追加取り込みを推奨"];
    return sorted.slice(0, 3).map(([category, count]) => `「${category}」に関する不満が${count}件あり、改善余地がある`);
  }

  private fallbackAvoidAreas(scores: { competitionScore: number }): string[] {
    return scores.competitionScore >= 70
      ? ["競合が強く評価件数も多いため、総合型・正面突破型のアプリは非推奨"]
      : ["特になし（競合過密度は中程度）"];
  }

  private buildMarkdown(
    genreName: string,
    params: AnalyzeGenreParams,
    result: GenreAnalysisResult,
    apps: NormalizedApp[],
  ): string {
    const parts: string[] = [];
    parts.push(h1(`${genreName}ジャンル市場分析レポート`));
    parts.push(`取得条件: storefront=${params.storefront} / limit=${params.limit} / depth=${params.analysisDepth}\n`);
    parts.push(h2("市場概要"));
    parts.push(result.marketOverview + "\n");
    parts.push(h2("上位アプリの共通点"));
    parts.push(bulletList(result.topAppPatterns));
    parts.push(h2("価格傾向"));
    parts.push(result.pricingPattern + "\n");
    parts.push(h2("評価傾向"));
    parts.push(result.ratingPattern + "\n");
    parts.push(h2("ストアページ傾向"));
    parts.push(result.storePagePattern + "\n");
    parts.push(h2("レビュー不満"));
    parts.push(bulletList(result.reviewComplaints));
    parts.push(h2("狙える余白"));
    parts.push(bulletList(result.opportunityAreas));
    parts.push(h2("避けるべき領域"));
    parts.push(bulletList(result.avoidAreas));
    parts.push(h2("スコア"));
    parts.push(
      table(
        ["市場需要", "競合過密", "不満余地", "個人開発向き", "AI開発向き"],
        [[result.scores.marketDemandScore, result.scores.competitionScore, result.scores.opportunityScore, result.scores.personalDevFitScore, result.scores.aiDevFitScore]],
      ),
    );
    parts.push(h2("上位アプリ一覧"));
    parts.push(
      table(
        ["アプリ名", "開発者", "評価", "評価件数", "価格"],
        apps
          .slice(0, params.limit)
          .map((a) => [a.name, a.developerName ?? "-", a.averageUserRating ?? "-", a.userRatingCount ?? "-", a.formattedPrice ?? "-"]),
      ),
    );
    parts.push(h2("推奨アプリ案"));
    for (const idea of result.recommendedIdeas) {
      parts.push(`### ${idea.title}\n`);
      parts.push(`- 対象ユーザー: ${idea.targetUser}`);
      parts.push(`- 課題: ${idea.problem}`);
      parts.push(`- 個人開発向きスコア: ${idea.personalDevScore} / AI開発向きスコア: ${idea.aiDevScore}\n`);
    }
    parts.push(h2("作らない方がいいアプリ案"));
    for (const idea of result.avoidIdeas) {
      parts.push(`- **${idea.title}**: ${idea.reason}（代替案: ${idea.alternative}）`);
    }

    return parts.join("\n");
  }
}

export const marketAnalysisService = new MarketAnalysisService();
