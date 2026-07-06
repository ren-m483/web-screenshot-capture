import { describe, expect, it } from "vitest";
import { ItunesLookupService } from "@/services/itunes-lookup.service";

describe("ItunesLookupService", () => {
  const service = new ItunesLookupService();

  it("extracts an app ID from a standard App Store URL", () => {
    expect(service.extractAppIdFromUrl("https://apps.apple.com/jp/app/example-app/id1234567890")).toBe("1234567890");
  });

  it("extracts an app ID from a URL without a locale segment", () => {
    expect(service.extractAppIdFromUrl("https://apps.apple.com/app/example-app/id1234567890")).toBe("1234567890");
  });

  it("throws a helpful error when the URL has no id segment", () => {
    expect(() => service.extractAppIdFromUrl("https://apps.apple.com/jp/app/example-app")).toThrow(/アプリID/);
  });

  it("normalizes a realistic iTunes Lookup API result", () => {
    const raw = {
      trackId: 1234567890,
      bundleId: "com.example.app",
      trackName: "Example App",
      artistName: "Example Inc.",
      sellerName: "Example Inc.",
      primaryGenreId: 6017,
      primaryGenreName: "Education",
      genreIds: ["6017"],
      genres: ["Education"],
      price: 0,
      formattedPrice: "無料",
      currency: "JPY",
      averageUserRating: 4.5,
      userRatingCount: 12000,
      version: "1.2.3",
      releaseDate: "2023-01-01T00:00:00Z",
      currentVersionReleaseDate: "2026-01-01T00:00:00Z",
      description: "Example description",
      screenshotUrls: ["https://example.com/1.png"],
      ipadScreenshotUrls: [],
      artworkUrl100: "https://example.com/icon.png",
      trackViewUrl: "https://apps.apple.com/jp/app/example-app/id1234567890",
      contentAdvisoryRating: "4+",
      supportedDevices: ["iPhone"],
    };

    const normalized = service.normalizeLookupResponse(raw);
    expect(normalized.appId).toBe("1234567890");
    expect(normalized.primaryGenreId).toBe("6017");
    expect(normalized.price).toBe(0);
    expect(normalized.averageUserRating).toBe(4.5);
    expect(normalized.screenshotUrls).toEqual(["https://example.com/1.png"]);
  });

  it("falls back to safe defaults when optional fields are missing", () => {
    const normalized = service.normalizeLookupResponse({ trackId: 42 });
    expect(normalized.name).toBe("Unknown");
    expect(normalized.price).toBeNull();
    expect(normalized.genreIds).toEqual([]);
  });
});
