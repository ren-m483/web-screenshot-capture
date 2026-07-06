/**
 * 要件定義 4.6 / 10.6 のスコアリングロジック。
 * すべて0〜100にクランプしたヒューリスティックなスコアを返す。
 * AIの判断ではなく、取得済みデータから決定論的に計算できるようにしている。
 */

export interface AppStatInput {
  developerName: string | null;
  price: number | null;
  averageUserRating: number | null;
  userRatingCount: number | null;
  currentVersionReleaseDate: string | Date | null;
}

export interface GenreStats {
  apps: AppStatInput[];
}

export interface ReviewStats {
  totalReviews: number;
  negativeCount: number;
  pricingComplaintCount: number;
  uxComplaintCount: number;
  requestCount: number;
  repeatedComplaintTopCount: number; // 最頻出の不満カテゴリの件数
}

export interface GenreComplexityInput {
  backendComplexity: number; // 0-100 (高いほど難しい)
  nativeComplexity: number; // 0-100
  crudFit: number; // 0-100 (高いほどCRUD中心)
  realtimeNeed: number; // 0-100 (高いほどリアルタイム性が必要)
  legalRisk?: number; // 0-100
  operationLoad?: number; // 0-100
  supportLoad?: number; // 0-100
  dataModelClarity?: number; // 0-100
  testability?: number; // 0-100
  apiFit?: number; // 0-100
  uiComplexity?: number; // 0-100
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// log10スケールで 0(0件) 〜 100(100万件以上) に正規化する
function normalizeRatingCount(count: number): number {
  if (count <= 0) return 0;
  return clamp((Math.log10(count + 1) / 6) * 100);
}

function daysSince(date: string | Date | null): number | null {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return null;
  return (Date.now() - time) / (1000 * 60 * 60 * 24);
}

export class ScoringService {
  calculateMarketDemandScore(input: GenreStats): number {
    const { apps } = input;
    if (apps.length === 0) return 0;

    const ratingCounts = apps.map((a) => a.userRatingCount ?? 0);
    const rankingStrength = normalizeRatingCount(Math.max(...ratingCounts, 0));
    const ratingCountMedianScore = normalizeRatingCount(median(ratingCounts));

    const updatedRecently = apps.filter((a) => {
      const days = daysSince(a.currentVersionReleaseDate);
      return days !== null && days <= 180;
    }).length;
    const activeUpdateRatio = (updatedRecently / apps.length) * 100;

    const uniqueDevelopers = new Set(apps.map((a) => a.developerName ?? "unknown")).size;
    const appDiversity = (uniqueDevelopers / apps.length) * 100;

    const freeCount = apps.filter((a) => (a.price ?? 0) === 0).length;
    const freeRatio = (freeCount / apps.length) * 100;
    const freePaidBalance = 100 - Math.abs(freeRatio - 85); // 上位アプリは無料が多いのが健全という前提

    const score =
      rankingStrength * 0.25 +
      ratingCountMedianScore * 0.25 +
      activeUpdateRatio * 0.2 +
      appDiversity * 0.15 +
      clamp(freePaidBalance) * 0.15;

    return clamp(score);
  }

  calculateCompetitionScore(input: GenreStats): number {
    const { apps } = input;
    if (apps.length === 0) return 0;

    const ratingCounts = apps.map((a) => a.userRatingCount ?? 0).sort((a, b) => b - a);
    const topAppRatingCount = normalizeRatingCount(ratingCounts[0] ?? 0);

    const total = ratingCounts.reduce((sum, v) => sum + v, 0);
    const top20PercentCount = Math.max(1, Math.ceil(ratingCounts.length * 0.2));
    const topShare = total > 0 ? ratingCounts.slice(0, top20PercentCount).reduce((s, v) => s + v, 0) / total : 0;
    const brandStrength = clamp(topShare * 100);

    const releaseAges = apps.map((a) => daysSince(a.currentVersionReleaseDate)).filter((d): d is number => d !== null);
    const avgAge = releaseAges.length > 0 ? releaseAges.reduce((s, v) => s + v, 0) / releaseAges.length : 0;
    const longTermDominance = clamp((avgAge / (365 * 3)) * 100); // 3年以上運用継続で満点相当

    const score = topAppRatingCount * 0.35 + brandStrength * 0.35 + longTermDominance * 0.3;
    return clamp(score);
  }

  calculateOpportunityScore(input: ReviewStats): number {
    if (input.totalReviews === 0) return 50; // データ不足時は中立値

    const negativeReviewRatio = (input.negativeCount / input.totalReviews) * 100;
    const pricingComplaints = (input.pricingComplaintCount / input.totalReviews) * 100;
    const uxComplaints = (input.uxComplaintCount / input.totalReviews) * 100;
    const featureRequests = (input.requestCount / input.totalReviews) * 100;
    const repeatedComplaints = (input.repeatedComplaintTopCount / input.totalReviews) * 100;

    const score =
      negativeReviewRatio * 0.25 +
      repeatedComplaints * 0.25 +
      pricingComplaints * 0.2 +
      uxComplaints * 0.15 +
      featureRequests * 0.15;

    return clamp(score);
  }

  calculatePersonalDevFitScore(input: GenreComplexityInput): number {
    const mvpSmallness = input.crudFit; // CRUD中心ほど小さく作れる
    const backendComplexity = 100 - input.backendComplexity;
    const nativeComplexity = 100 - input.nativeComplexity;
    const operationLoad = 100 - (input.operationLoad ?? 40);
    const legalRisk = 100 - (input.legalRisk ?? 30);
    const supportLoad = 100 - (input.supportLoad ?? 40);

    const score =
      mvpSmallness * 0.25 + backendComplexity * 0.2 + nativeComplexity * 0.2 + operationLoad * 0.15 + legalRisk * 0.1 + supportLoad * 0.1;
    return clamp(score);
  }

  calculateAiDevFitScore(input: GenreComplexityInput): number {
    const crudFit = input.crudFit;
    const apiFit = input.apiFit ?? 60;
    const uiComplexity = 100 - (input.uiComplexity ?? 100 - input.crudFit);
    const realtimeNeed = 100 - input.realtimeNeed;
    const dataModelClarity = input.dataModelClarity ?? 65;
    const testability = input.testability ?? 65;

    const score = crudFit * 0.25 + apiFit * 0.2 + uiComplexity * 0.15 + realtimeNeed * 0.15 + dataModelClarity * 0.15 + testability * 0.1;
    return clamp(score);
  }

  recommendationFromScores(params: {
    marketDemandScore: number;
    opportunityScore: number;
    personalDevFitScore: number;
    competitionScore: number;
  }): "strong_recommend" | "recommend" | "niche_only" | "avoid" | "research_more" {
    const { marketDemandScore, opportunityScore, personalDevFitScore, competitionScore } = params;

    if (marketDemandScore === 0 && opportunityScore === 50 && personalDevFitScore === 0) {
      return "research_more";
    }
    if (marketDemandScore >= 60 && opportunityScore >= 60 && personalDevFitScore >= 60) {
      return "strong_recommend";
    }
    if (competitionScore >= 75 && (personalDevFitScore < 50 || marketDemandScore < 40)) {
      return "avoid";
    }
    if (marketDemandScore >= 40 && personalDevFitScore >= 50) {
      return "recommend";
    }
    if (personalDevFitScore >= 50) {
      return "niche_only";
    }
    return "avoid";
  }
}

export const scoringService = new ScoringService();
