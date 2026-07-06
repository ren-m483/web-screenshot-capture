export interface GenreScores {
  marketDemandScore: number;
  competitionScore: number;
  opportunityScore: number;
  personalDevFitScore: number;
  aiDevFitScore: number;
}

export interface AppIdeaOutput {
  title: string;
  targetUser: string;
  problem: string;
  solution: string;
  marketReason: string;
  competitorWeakness: string;
  mvpFeatures: string[];
  monetization: string;
  difficulty: "low" | "medium" | "high";
  personalDevScore: number;
  aiDevScore: number;
  recommendation: "recommend" | "niche" | "avoid";
  devPrompt: string;
}

export interface AvoidIdeaOutput {
  title: string;
  reason: string;
  alternative: string;
}

export interface GenreAnalysisResult {
  marketOverview: string;
  topAppPatterns: string[];
  pricingPattern: string;
  ratingPattern: string;
  storePagePattern: string;
  commonKeywords: string[];
  reviewComplaints: string[];
  opportunityAreas: string[];
  avoidAreas: string[];
  scores: GenreScores;
  recommendedIdeas: AppIdeaOutput[];
  avoidIdeas: AvoidIdeaOutput[];
  markdown: string;
}

export interface DiagnosisScores {
  appStoreScore: number;
  ratingScore: number;
  differentiationScore: number;
  monetizationScore: number;
  personalDevReferenceScore: number;
  improvementPotentialScore: number;
}

export interface AppDiagnosisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  storePageReview: string;
  competitorPosition: string;
  improvementSuggestions: string[];
  monetizationSuggestions: string[];
  personalDevLessons: string[];
  scores: DiagnosisScores;
  markdown: string;
}
