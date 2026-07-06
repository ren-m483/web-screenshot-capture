import { prisma } from "@/lib/prisma";
import { parseCsvToObjects } from "@/lib/csv";
import { getLlmProvider, extractJson } from "./llm.service";
import type { NormalizedReview, ReviewAnalysisResult, ReviewCategory, ReviewSourceType } from "@/types/review";

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB（要件 5.3: ファイルサイズ制限）

interface PublicReviewFeedEntry {
  "im:rating"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  author?: { name?: { label?: string } };
  updated?: { label?: string };
  [key: string]: unknown;
}

export interface ReviewProviderInfo {
  id: ReviewSourceType;
  label: string;
  available: boolean;
  note: string;
}

/**
 * レビュー本文をキーワードベースで分類する。
 * LLMキーが無くても最低限の分類ができるようにするためのルールベース実装。
 * カテゴリ定義は要件 4.3.4 に対応する。
 */
const CATEGORY_KEYWORDS: Record<Exclude<ReviewCategory, "unclear" | "positive_feature">, string[]> = {
  bug: ["バグ", "不具合", "落ちる", "クラッシュ", "動かない", "エラー"],
  ux_issue: ["使いにくい", "わかりにくい", "UI", "UX", "操作しづらい", "見づらい"],
  pricing_issue: ["高い", "課金", "有料", "値段", "料金"],
  ads_issue: ["広告", "CM", "宣伝"],
  performance_issue: ["重い", "遅い", "動作が遅い", "フリーズ", "読み込み"],
  request: ["要望", "希望", "追加して", "対応して", "してほしい", "あったらいい"],
  support_issue: ["サポート", "問い合わせ", "返信がない", "対応が遅い"],
  subscription_issue: ["サブスク", "解約", "定期購入", "自動更新"],
  login_issue: ["ログイン", "認証", "パスワード", "サインイン"],
  data_loss: ["消えた", "データが消失", "保存されない", "失われた"],
  competitor_mention: ["他のアプリ", "類似アプリ", "競合", "〇〇の方が"],
};

const POSITIVE_KEYWORDS = ["最高", "便利", "使いやすい", "助かる", "満足", "おすすめ", "感謝"];

export class ReviewProviderService {
  getAvailableReviewProviders(): ReviewProviderInfo[] {
    return [
      {
        id: "public_limited",
        label: "公開レビュー（取得可能な範囲）",
        available: true,
        note: "Appleの公開レビューフィードから取得可能な範囲のみ。大量取得は保証しない。",
      },
      {
        id: "own_app_official",
        label: "自分のアプリ（App Store Connect API）",
        available: false,
        note: "App Store Connect APIキーの設定が必要（MVPでは未実装、将来拡張）。",
      },
      {
        id: "external_provider",
        label: "外部レビューAPI連携",
        available: false,
        note: "将来拡張。競合アプリの大量レビュー取得は外部API連携を前提とする。",
      },
      { id: "csv", label: "CSVインポート", available: true, note: "手元にあるレビューデータをCSVで取り込める。" },
    ];
  }

  /**
   * Apple公式の公開カスタマーレビューフィード（RSS）から取得可能な範囲のレビューを取得する。
   * HTMLスクレイピングではなく、Apple提供のJSON RSSエンドポイントを利用する。
   */
  async fetchPublicReviews(appId: string, storefront: string, page = 1): Promise<NormalizedReview[]> {
    const url = `https://itunes.apple.com/${storefront}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`;
    const startedAt = Date.now();
    let status = 0;
    let errorMessage: string | null = null;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      status = res.status;
      if (!res.ok) return [];
      const json = await res.json();
      const entries = (json?.feed?.entry ?? []) as PublicReviewFeedEntry[];

      // 先頭エントリはフィード自体のメタ情報の場合があるため、rating を持つものだけを採用する
      return entries
        .filter((entry) => entry?.["im:rating"]?.label)
        .map((entry) => this.classify({
          appId,
          sourceType: "public_limited" as ReviewSourceType,
          territory: storefront,
          lang: null,
          rating: Number(entry["im:rating"]?.label ?? 0),
          title: entry.title?.label ?? null,
          body: entry.content?.label ?? "",
          author: entry.author?.name?.label ?? null,
          reviewCreatedAt: entry.updated?.label ?? null,
        }));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      return [];
    } finally {
      await prisma.apiUsageLog.create({
        data: { provider: "apple_rss", endpoint: url, status, durationMs: Date.now() - startedAt, errorMessage },
      });
    }
  }

  classify(input: Omit<NormalizedReview, "sentiment" | "categories">): NormalizedReview {
    const body = input.body ?? "";
    const categories: ReviewCategory[] = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ReviewCategory, string[]][]) {
      if (keywords.some((k) => body.includes(k))) categories.push(category);
    }

    const isPositive = POSITIVE_KEYWORDS.some((k) => body.includes(k)) || (input.rating ?? 0) >= 4;
    if (isPositive && categories.length === 0) categories.push("positive_feature");
    if (categories.length === 0) categories.push("unclear");

    const sentiment: NormalizedReview["sentiment"] =
      (input.rating ?? 0) >= 4 || isPositive ? "positive" : (input.rating ?? 0) <= 2 ? "negative" : "neutral";

    return { ...input, sentiment, categories };
  }

  async importReviewsFromCsv(
    fileContent: string,
    fileSizeBytes: number,
    appId: string,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    if (fileSizeBytes > MAX_CSV_SIZE_BYTES) {
      throw new Error(`CSVファイルサイズが上限（${MAX_CSV_SIZE_BYTES / (1024 * 1024)}MB）を超えています。`);
    }

    const rows = parseCsvToObjects(fileContent);
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    await prisma.app.upsert({ where: { id: appId }, update: {}, create: { id: appId, name: appId } });

    for (const [index, row] of rows.entries()) {
      if (!row.body || !row.rating) {
        skipped++;
        errors.push(`${index + 2}行目: rating または body が未入力のためスキップしました。`);
        continue;
      }

      const rating = Number(row.rating);
      if (Number.isNaN(rating)) {
        skipped++;
        errors.push(`${index + 2}行目: rating が数値ではありません。`);
        continue;
      }

      const normalized = this.classify({
        appId,
        sourceType: "csv",
        territory: row.country || null,
        lang: row.lang || null,
        rating,
        title: row.title || null,
        body: row.body,
        author: row.author || null,
        reviewCreatedAt: row.createdAt || null,
      });

      await prisma.review.create({
        data: {
          appId,
          sourceType: normalized.sourceType,
          territory: normalized.territory,
          lang: normalized.lang,
          rating: normalized.rating,
          title: normalized.title,
          body: normalized.body,
          author: normalized.author,
          reviewCreatedAt: normalized.reviewCreatedAt ? new Date(normalized.reviewCreatedAt) : null,
          sentiment: normalized.sentiment,
          categories: JSON.stringify(normalized.categories),
        },
      });
      imported++;
    }

    return { imported, skipped, errors };
  }

  /**
   * DBに保存済みのレビュー（CSVインポート分・公開フィード取得分）を集計・分析する。
   * レビュー本文が無い場合でも categoryCounts が全て0の結果を返し、
   * 呼び出し側で「評価点・評価件数ベースの簡易分析」に切り替えられるようにする。
   */
  async analyzeReviews(appId: string): Promise<ReviewAnalysisResult> {
    const reviews = await prisma.review.findMany({ where: { appId } });

    const categoryCounts: Record<string, number> = {};
    const positiveBodies: string[] = [];
    const negativeBodies: string[] = [];

    for (const review of reviews) {
      const categories: ReviewCategory[] = review.categories ? JSON.parse(review.categories) : [];
      for (const category of categories) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      if (review.sentiment === "positive") positiveBodies.push(review.body);
      if (review.sentiment === "negative") negativeBodies.push(review.body);
    }

    const fullCategoryCounts = Object.fromEntries(
      (
        [
          "positive_feature",
          "bug",
          "ux_issue",
          "pricing_issue",
          "ads_issue",
          "performance_issue",
          "request",
          "support_issue",
          "subscription_issue",
          "login_issue",
          "data_loss",
          "competitor_mention",
          "unclear",
        ] as ReviewCategory[]
      ).map((c) => [c, categoryCounts[c] ?? 0]),
    ) as Record<ReviewCategory, number>;

    const provider = await getLlmProvider();
    if (provider && reviews.length > 0) {
      try {
        const excerpts = reviews.slice(0, 30).map((r) => `(${r.rating ?? "-"}★) ${r.body.slice(0, 150)}`);
        const prompt = `以下はレビュー${reviews.length}件のカテゴリ集計と抜粋です。JSON形式で positiveSummary, negativeSummary, topComplaints, requestedFeatures, pricingSentiment, uxIssues, opportunityAreas, mvpHints を出力してください。\nカテゴリ集計: ${JSON.stringify(fullCategoryCounts)}\n抜粋: ${JSON.stringify(excerpts)}`;
        const text = await provider.complete(prompt, { system: "あなたはApp Storeレビュー分析の専門家です。日本語でJSONのみ返答してください。" });
        const parsed = extractJson<Omit<ReviewAnalysisResult, "categoryCounts">>(text);
        if (parsed) return { ...parsed, categoryCounts: fullCategoryCounts };
      } catch {
        // フォールバックへ
      }
    }

    const sortedComplaints = Object.entries(fullCategoryCounts)
      .filter(([category]) => category !== "positive_feature" && category !== "unclear")
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0);

    return {
      positiveSummary:
        positiveBodies.length > 0
          ? `高評価レビュー${positiveBodies.length}件が確認できました（LLM未設定のため簡易集計）。`
          : "高評価レビューは確認できませんでした。",
      negativeSummary:
        negativeBodies.length > 0
          ? `低評価レビュー${negativeBodies.length}件が確認できました（LLM未設定のため簡易集計）。`
          : "低評価レビューは確認できませんでした。",
      topComplaints: sortedComplaints.slice(0, 5).map(([category, count]) => `${category}（${count}件）`),
      requestedFeatures: fullCategoryCounts.request > 0 ? [`機能要望に関するレビューが${fullCategoryCounts.request}件あります`] : [],
      pricingSentiment: fullCategoryCounts.pricing_issue > 0 ? `価格・課金に関する不満が${fullCategoryCounts.pricing_issue}件あります` : "価格に関する目立った不満は見つかりませんでした",
      uxIssues: fullCategoryCounts.ux_issue > 0 ? [`UI/UXに関する不満が${fullCategoryCounts.ux_issue}件あります`] : [],
      opportunityAreas: sortedComplaints.slice(0, 3).map(([category]) => `「${category}」の改善は新規アプリの差別化ポイントになり得る`),
      mvpHints:
        reviews.length === 0
          ? ["レビューが無いため、評価点・評価件数・説明文からの分析を検討してください"]
          : sortedComplaints.slice(0, 3).map(([category]) => `「${category}」を解決する単機能アプリのMVPを検討`),
      categoryCounts: fullCategoryCounts,
    };
  }
}

export const reviewProviderService = new ReviewProviderService();
