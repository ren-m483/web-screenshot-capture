import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { bulletList, h1, h2, table } from "@/lib/markdown";
import { GENRE_COMPLEXITY_HINTS, DEFAULT_GENRE_COMPLEXITY } from "@/constants/apple-genres";
import type { RankingLimit } from "@/constants/chart-types";
import { appleRssService } from "./apple-rss.service";
import { itunesLookupService } from "./itunes-lookup.service";
import { reviewProviderService } from "./review-provider.service";
import { scoringService } from "./scoring.service";
import { getLlmProvider, extractJson } from "./llm.service";
import type { AppDiagnosisResult } from "@/types/analysis";
import type { NormalizedApp } from "@/types/app";

const PROMPT_VERSION = "app-diagnosis-v1";

export interface DiagnoseAppUrlParams {
  appStoreUrl: string;
  storefront: string;
  compareLimit: RankingLimit;
  includeReviews: boolean;
  outputType: "summary" | "detailed";
}

function readPromptTemplate(fileName: string): string {
  try {
    return readFileSync(path.join(process.cwd(), "prompts", fileName), "utf-8");
  } catch {
    return "";
  }
}

function normalizeRatingCountScore(count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.log10(count + 1) / 6) * 100)));
}

export class AppDiagnosisService {
  async compareWithGenreTopApps(appId: string, genreId: string, storefront: string, limit: RankingLimit): Promise<NormalizedApp[]> {
    const snapshot = await appleRssService.fetchRanking({ storefront, genreId, chartType: "free", limit });
    const competitorIds = snapshot.entries.map((e) => e.appId).filter((id) => id !== appId);
    return itunesLookupService.lookupApps(competitorIds, storefront);
  }

  async diagnoseAppUrl(params: DiagnoseAppUrlParams): Promise<{ analysisId: string; appId: string; result: AppDiagnosisResult }> {
    const appId = itunesLookupService.extractAppIdFromUrl(params.appStoreUrl);
    const app = await itunesLookupService.lookupApp(appId, params.storefront);

    const genreId = app.primaryGenreId ?? "all";
    const competitors = genreId !== "all" ? await this.compareWithGenreTopApps(appId, genreId, params.storefront, params.compareLimit) : [];

    let reviewSummaryText = "レビュー分析は対象外に設定されています。";
    const categoryCounts: Record<string, number> = {};
    let negativeRatio = 0;

    if (params.includeReviews) {
      const reviews = await reviewProviderService.fetchPublicReviews(appId, params.storefront);
      for (const review of reviews) {
        for (const category of review.categories) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      }
      const negativeCount = reviews.filter((r) => r.sentiment === "negative").length;
      negativeRatio = reviews.length > 0 ? negativeCount / reviews.length : 0;
      reviewSummaryText =
        reviews.length > 0
          ? `取得できたレビュー${reviews.length}件中、ネガティブ${negativeCount}件。主なカテゴリ: ${Object.keys(categoryCounts).join(", ") || "なし"}`
          : "レビュー本文は取得できませんでした。評価点・評価件数をもとに簡易分析します。";
    }

    const complexity = GENRE_COMPLEXITY_HINTS[genreId] ?? DEFAULT_GENRE_COMPLEXITY;
    const personalDevReferenceScore = scoringService.calculatePersonalDevFitScore(complexity);

    const competitorRatingCounts = competitors.map((c) => c.userRatingCount ?? 0);
    const competitorMedian = competitorRatingCounts.length
      ? [...competitorRatingCounts].sort((a, b) => a - b)[Math.floor(competitorRatingCounts.length / 2)]
      : 0;

    const ratingScore = normalizeRatingCountScore(app.userRatingCount ?? 0);
    const appStoreScore = Math.round(
      ((app.description?.length ?? 0) > 200 ? 60 : 30) + ((app.screenshotUrls?.length ?? 0) >= 3 ? 40 : 15),
    );
    const differentiationScore = Math.max(
      0,
      Math.min(100, 50 + Math.round((((app.userRatingCount ?? 0) - competitorMedian) / Math.max(1, competitorMedian)) * 20)),
    );
    const monetizationScore = (app.price ?? 0) > 0 ? 55 : 65; // 無料+課金の方が個人開発では拡張しやすいという前提の目安値
    const improvementPotentialScore = Math.max(0, Math.min(100, Math.round(negativeRatio * 100) || 100 - ratingScore));

    const scores = {
      appStoreScore: Math.min(100, appStoreScore),
      ratingScore,
      differentiationScore,
      monetizationScore,
      personalDevReferenceScore,
      improvementPotentialScore,
    };

    const llmOutcome = await this.runLlmDiagnosis(app, competitors, reviewSummaryText, params);

    const result: AppDiagnosisResult = {
      summary: llmOutcome?.summary ?? this.fallbackSummary(app, scores),
      strengths: llmOutcome?.strengths ?? this.fallbackStrengths(app, scores),
      weaknesses: llmOutcome?.weaknesses ?? this.fallbackWeaknesses(app, scores),
      storePageReview: llmOutcome?.storePageReview ?? `スクリーンショット${app.screenshotUrls?.length ?? 0}枚、説明文${app.description?.length ?? 0}文字`,
      competitorPosition:
        llmOutcome?.competitorPosition ??
        `同ジャンル上位${competitors.length}件と比較した評価件数中央値は${competitorMedian}件`,
      improvementSuggestions: llmOutcome?.improvementSuggestions ?? this.fallbackImprovements(categoryCounts),
      monetizationSuggestions: llmOutcome?.monetizationSuggestions ?? ["買い切り版と定期購読版のA/Bを検討", "無料範囲と課金範囲の再設計を検討"],
      personalDevLessons:
        llmOutcome?.personalDevLessons ?? ["このアプリの機能を1/3程度に絞ったニッチ版から始めると個人開発でも着手しやすい"],
      scores,
      markdown: "",
    };

    result.markdown = this.buildMarkdown(app, params, result, competitors);

    const inputHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ appId, params }))
      .digest("hex");

    const analysis = await prisma.analysis.create({
      data: {
        analysisType: "app_diagnosis",
        targetType: "app",
        targetId: appId,
        inputHash,
        promptVersion: PROMPT_VERSION,
        modelName: llmOutcome ? (llmOutcome.modelName ?? "llm") : "rule-based-fallback",
        scoreJson: JSON.stringify(scores),
        resultJson: JSON.stringify(result),
        resultMarkdown: result.markdown,
      },
    });

    await prisma.report.create({
      data: { analysisId: analysis.id, title: `${app.name} 診断レポート`, reportType: "markdown", content: result.markdown },
    });

    return { analysisId: analysis.id, appId, result };
  }

  private async runLlmDiagnosis(
    app: NormalizedApp,
    competitors: NormalizedApp[],
    reviewSummary: string,
    params: DiagnoseAppUrlParams,
  ): Promise<(Partial<AppDiagnosisResult> & { modelName?: string }) | null> {
    const provider = await getLlmProvider();
    if (!provider) return null;

    const template = readPromptTemplate("app-diagnosis.md");
    const prompt = template
      .replace("{{targetApp}}", JSON.stringify(app))
      .replace("{{compareLimit}}", String(params.compareLimit))
      .replace("{{competitorApps}}", JSON.stringify(competitors))
      .replace("{{reviewSummary}}", reviewSummary);

    try {
      const text = await provider.complete(prompt);
      const parsed = extractJson<Omit<AppDiagnosisResult, "scores" | "markdown">>(text);
      if (!parsed) return null;
      return { ...parsed, modelName: provider.modelName };
    } catch {
      return null;
    }
  }

  private fallbackSummary(app: NormalizedApp, scores: AppDiagnosisResult["scores"]): string {
    return `${app.name}は評価${app.averageUserRating ?? "-"} / 評価件数${app.userRatingCount ?? 0}件のアプリです（LLM未設定のため簡易分析）。ストアページスコアは${scores.appStoreScore}点でした。`;
  }

  private fallbackStrengths(app: NormalizedApp, scores: AppDiagnosisResult["scores"]): string[] {
    const strengths: string[] = [];
    if ((app.userRatingCount ?? 0) > 1000) strengths.push("評価件数が多く、一定の実績がある");
    if ((app.averageUserRating ?? 0) >= 4.3) strengths.push("平均評価が高い");
    if (scores.appStoreScore >= 60) strengths.push("ストアページの情報量が充実している");
    return strengths.length > 0 ? strengths : ["特筆すべき強みは今回のデータからは検出されませんでした"];
  }

  private fallbackWeaknesses(app: NormalizedApp, scores: AppDiagnosisResult["scores"]): string[] {
    const weaknesses: string[] = [];
    if ((app.userRatingCount ?? 0) < 100) weaknesses.push("評価件数が少なく、実績が乏しい");
    if ((app.averageUserRating ?? 0) > 0 && app.averageUserRating! < 3.8) weaknesses.push("平均評価がやや低い");
    if (scores.appStoreScore < 40) weaknesses.push("ストアページの情報量が不足している（説明文・スクリーンショット）");
    return weaknesses.length > 0 ? weaknesses : ["特筆すべき弱みは今回のデータからは検出されませんでした"];
  }

  private fallbackImprovements(categoryCounts: Record<string, number>): string[] {
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return ["レビューデータが不足しているため、CSVインポートでの追加分析を推奨"];
    return sorted.slice(0, 3).map(([category, count]) => `「${category}」の不満（${count}件）への対応を検討`);
  }

  private buildMarkdown(
    app: NormalizedApp,
    params: DiagnoseAppUrlParams,
    result: AppDiagnosisResult,
    competitors: NormalizedApp[],
  ): string {
    const parts: string[] = [];
    parts.push(h1(`${app.name} 診断レポート`));
    parts.push(`App Store URL: ${params.appStoreUrl}\n`);
    parts.push(h2("サマリー"));
    parts.push(result.summary + "\n");
    parts.push(h2("基本情報"));
    parts.push(
      table(
        ["項目", "値"],
        [
          ["評価", String(app.averageUserRating ?? "-")],
          ["評価件数", String(app.userRatingCount ?? "-")],
          ["価格", app.formattedPrice ?? "-"],
          ["ジャンル", app.primaryGenreName ?? "-"],
          ["バージョン", app.version ?? "-"],
        ],
      ),
    );
    parts.push(h2("強み"));
    parts.push(bulletList(result.strengths));
    parts.push(h2("弱み"));
    parts.push(bulletList(result.weaknesses));
    parts.push(h2("ストアページ分析"));
    parts.push(result.storePageReview + "\n");
    parts.push(h2("競合との位置関係"));
    parts.push(result.competitorPosition + "\n");
    parts.push(h2("改善提案"));
    parts.push(bulletList(result.improvementSuggestions));
    parts.push(h2("収益化ヒント"));
    parts.push(bulletList(result.monetizationSuggestions));
    parts.push(h2("個人開発者が学べる点"));
    parts.push(bulletList(result.personalDevLessons));
    parts.push(h2("診断スコア"));
    parts.push(
      table(
        ["ストア", "評価", "差別化", "収益化", "個人開発参考度", "改善余地"],
        [
          [
            result.scores.appStoreScore,
            result.scores.ratingScore,
            result.scores.differentiationScore,
            result.scores.monetizationScore,
            result.scores.personalDevReferenceScore,
            result.scores.improvementPotentialScore,
          ],
        ],
      ),
    );
    if (params.outputType === "detailed") {
      parts.push(h2("同ジャンル上位アプリ比較"));
      parts.push(
        table(
          ["アプリ名", "評価", "評価件数", "価格"],
          competitors.map((c) => [c.name, c.averageUserRating ?? "-", c.userRatingCount ?? "-", c.formattedPrice ?? "-"]),
        ),
      );
    }
    return parts.join("\n");
  }
}

export const appDiagnosisService = new AppDiagnosisService();
