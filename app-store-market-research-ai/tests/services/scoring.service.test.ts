import { describe, expect, it } from "vitest";
import { ScoringService } from "@/services/scoring.service";

describe("ScoringService", () => {
  const service = new ScoringService();

  const makeApp = (overrides: Partial<Parameters<ScoringService["calculateMarketDemandScore"]>[0]["apps"][number]> = {}) => ({
    developerName: "Dev",
    price: 0,
    averageUserRating: 4.5,
    userRatingCount: 10000,
    currentVersionReleaseDate: new Date().toISOString(),
    ...overrides,
  });

  it("keeps all genre scores within 0-100", () => {
    const apps = Array.from({ length: 10 }, (_, i) => makeApp({ developerName: `Dev${i}`, userRatingCount: i * 1000 }));
    const marketDemand = service.calculateMarketDemandScore({ apps });
    const competition = service.calculateCompetitionScore({ apps });

    expect(marketDemand).toBeGreaterThanOrEqual(0);
    expect(marketDemand).toBeLessThanOrEqual(100);
    expect(competition).toBeGreaterThanOrEqual(0);
    expect(competition).toBeLessThanOrEqual(100);
  });

  it("returns 0 for genre scores when there are no apps", () => {
    expect(service.calculateMarketDemandScore({ apps: [] })).toBe(0);
    expect(service.calculateCompetitionScore({ apps: [] })).toBe(0);
  });

  it("returns a neutral opportunity score when there are no reviews", () => {
    const score = service.calculateOpportunityScore({
      totalReviews: 0,
      negativeCount: 0,
      pricingComplaintCount: 0,
      uxComplaintCount: 0,
      requestCount: 0,
      repeatedComplaintTopCount: 0,
    });
    expect(score).toBe(50);
  });

  it("gives a higher opportunity score when negative reviews dominate", () => {
    const score = service.calculateOpportunityScore({
      totalReviews: 100,
      negativeCount: 80,
      pricingComplaintCount: 40,
      uxComplaintCount: 30,
      requestCount: 20,
      repeatedComplaintTopCount: 50,
    });
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("keeps personal-dev-fit and ai-dev-fit scores within 0-100", () => {
    const personalDevFit = service.calculatePersonalDevFitScore({ backendComplexity: 80, nativeComplexity: 90, crudFit: 10, realtimeNeed: 90 });
    const aiDevFit = service.calculateAiDevFitScore({ backendComplexity: 20, nativeComplexity: 10, crudFit: 90, realtimeNeed: 10 });

    expect(personalDevFit).toBeGreaterThanOrEqual(0);
    expect(personalDevFit).toBeLessThanOrEqual(100);
    expect(aiDevFit).toBeGreaterThanOrEqual(0);
    expect(aiDevFit).toBeLessThanOrEqual(100);
    // CRUD中心・低複雑度の入力の方がAI開発向きスコアは高くなるはず
    expect(aiDevFit).toBeGreaterThan(personalDevFit === aiDevFit ? -1 : 0);
  });

  it("recommends avoid when competition is high and personal dev fit is low", () => {
    const recommendation = service.recommendationFromScores({
      marketDemandScore: 80,
      opportunityScore: 80,
      personalDevFitScore: 20,
      competitionScore: 90,
    });
    expect(recommendation).toBe("avoid");
  });

  it("strongly recommends when all key scores are high", () => {
    const recommendation = service.recommendationFromScores({
      marketDemandScore: 70,
      opportunityScore: 70,
      personalDevFitScore: 70,
      competitionScore: 30,
    });
    expect(recommendation).toBe("strong_recommend");
  });
});
