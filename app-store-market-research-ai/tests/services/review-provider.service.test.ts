import { describe, expect, it } from "vitest";
import { ReviewProviderService } from "@/services/review-provider.service";

describe("ReviewProviderService.classify", () => {
  const service = new ReviewProviderService();

  it("classifies a bug complaint as negative with the bug category", () => {
    const review = service.classify({
      appId: "1",
      sourceType: "csv",
      territory: null,
      lang: null,
      rating: 1,
      title: null,
      body: "アプリがすぐ落ちる。バグが多すぎる。",
      author: null,
      reviewCreatedAt: null,
    });
    expect(review.sentiment).toBe("negative");
    expect(review.categories).toContain("bug");
  });

  it("classifies a high rating with praise as positive_feature", () => {
    const review = service.classify({
      appId: "1",
      sourceType: "csv",
      territory: null,
      lang: null,
      rating: 5,
      title: null,
      body: "とても使いやすいアプリで助かっています",
      author: null,
      reviewCreatedAt: null,
    });
    expect(review.sentiment).toBe("positive");
    expect(review.categories).toContain("positive_feature");
  });

  it("falls back to unclear when nothing matches", () => {
    const review = service.classify({
      appId: "1",
      sourceType: "csv",
      territory: null,
      lang: null,
      rating: 3,
      title: null,
      body: "普通です",
      author: null,
      reviewCreatedAt: null,
    });
    expect(review.categories).toEqual(["unclear"]);
    expect(review.sentiment).toBe("neutral");
  });

  it("detects pricing complaints", () => {
    const review = service.classify({
      appId: "1",
      sourceType: "csv",
      territory: null,
      lang: null,
      rating: 2,
      title: null,
      body: "課金が高いです。もう少し安くしてほしい。",
      author: null,
      reviewCreatedAt: null,
    });
    expect(review.categories).toContain("pricing_issue");
  });
});
