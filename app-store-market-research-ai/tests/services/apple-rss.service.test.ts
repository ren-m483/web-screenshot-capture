import { describe, expect, it } from "vitest";
import { AppleRssService } from "@/services/apple-rss.service";

describe("AppleRssService", () => {
  const service = new AppleRssService();

  it("builds an RSS URL without genre segment when genreId is 'all'", () => {
    const url = service.buildRssUrl({ storefront: "jp", genreId: "all", chartType: "free", limit: 10 });
    expect(url).toBe("https://itunes.apple.com/jp/rss/topfreeapplications/limit=10/json");
  });

  it("builds an RSS URL with genre segment when genreId is specified", () => {
    const url = service.buildRssUrl({ storefront: "jp", genreId: "6017", chartType: "paid", limit: 25 });
    expect(url).toBe("https://itunes.apple.com/jp/rss/toppaidapplications/limit=25/genre=6017/json");
  });

  it("normalizes a realistic Apple RSS JSON payload into ranked entries", () => {
    const payload = {
      feed: {
        entry: [
          {
            id: { label: "https://apps.apple.com/jp/app/example/id1111111111", attributes: { "im:id": "1111111111" } },
            "im:name": { label: "Example App" },
            "im:artist": { label: "Example Inc." },
          },
          {
            id: { label: "https://apps.apple.com/jp/app/example2/id2222222222", attributes: { "im:id": "2222222222" } },
            "im:name": { label: "Example App 2" },
            "im:artist": { label: "Example Inc. 2" },
          },
        ],
      },
    };

    const entries = service.normalizeRssResponse(payload);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ rank: 1, appId: "1111111111", appName: "Example App", developerName: "Example Inc." });
    expect(entries[1]).toMatchObject({ rank: 2, appId: "2222222222", appName: "Example App 2" });
  });

  it("returns an empty array when the feed has no entries", () => {
    expect(service.normalizeRssResponse({ feed: {} })).toEqual([]);
    expect(service.normalizeRssResponse({})).toEqual([]);
  });
});
