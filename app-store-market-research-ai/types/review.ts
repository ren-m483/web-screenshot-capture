export type ReviewCategory =
  | "positive_feature"
  | "bug"
  | "ux_issue"
  | "pricing_issue"
  | "ads_issue"
  | "performance_issue"
  | "request"
  | "support_issue"
  | "subscription_issue"
  | "login_issue"
  | "data_loss"
  | "competitor_mention"
  | "unclear";

export type ReviewSourceType = "own_app_official" | "public_limited" | "external_provider" | "csv";

export interface NormalizedReview {
  appId: string;
  sourceType: ReviewSourceType;
  territory: string | null;
  lang: string | null;
  rating: number | null;
  title: string | null;
  body: string;
  author: string | null;
  reviewCreatedAt: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  categories: ReviewCategory[];
}

export interface ReviewAnalysisResult {
  positiveSummary: string;
  negativeSummary: string;
  topComplaints: string[];
  requestedFeatures: string[];
  pricingSentiment: string;
  uxIssues: string[];
  opportunityAreas: string[];
  mvpHints: string[];
  categoryCounts: Record<ReviewCategory, number>;
}
