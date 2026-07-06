import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppleRssService } from "@/services/apple-rss.service";
import { prisma } from "@/lib/prisma";

const RSS_PAYLOAD = {
  feed: {
    entry: [
      {
        id: { label: "https://apps.apple.com/jp/app/example/id1111111111", attributes: { "im:id": "1111111111" } },
        "im:name": { label: "Example App" },
        "im:artist": { label: "Example Inc." },
      },
    ],
  },
};

const LOOKUP_PAYLOAD = {
  resultCount: 1,
  results: [
    {
      trackId: 1111111111,
      trackName: "Example App",
      artistName: "Example Inc.",
      primaryGenreId: 6017,
      primaryGenreName: "Education",
      price: 0,
      formattedPrice: "無料",
      averageUserRating: 4.6,
      userRatingCount: 5000,
    },
  ],
};

describe("AppleRssService.fetchRanking (with mocked network)", () => {
  const service = new AppleRssService();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/rss/")) {
          return new Response(JSON.stringify(RSS_PAYLOAD), { status: 200 });
        }
        if (url.includes("/lookup")) {
          return new Response(JSON.stringify(LOOKUP_PAYLOAD), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await prisma.rankingEntry.deleteMany({ where: { appId: "1111111111" } });
    await prisma.rankingSnapshot.deleteMany({ where: { genreId: "6017" } });
    await prisma.appMetric.deleteMany({ where: { appId: "1111111111" } });
    await prisma.app.deleteMany({ where: { id: "1111111111" } });
  });

  it("fetches, persists, and enriches a ranking snapshot end-to-end", async () => {
    const snapshot = await service.fetchRanking({ storefront: "jp", genreId: "6017", chartType: "free", limit: 10 });

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.entries[0]).toMatchObject({
      appId: "1111111111",
      appName: "Example App",
      rating: 4.6,
      ratingCount: 5000,
      formattedPrice: "無料",
    });

    const savedSnapshot = await prisma.rankingSnapshot.findUnique({ where: { id: snapshot.snapshotId } });
    expect(savedSnapshot).not.toBeNull();

    const savedApp = await prisma.app.findUnique({ where: { id: "1111111111" } });
    expect(savedApp?.averageUserRating).toBe(4.6);
  });

  it("returns a cached snapshot on the second call without hitting the network again", async () => {
    const first = await service.fetchRanking({ storefront: "jp", genreId: "6017", chartType: "free", limit: 10 });
    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockClear();

    const second = await service.fetchRanking({ storefront: "jp", genreId: "6017", chartType: "free", limit: 10 });

    expect(second.snapshotId).toBe(first.snapshotId);
    expect(second.cached).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
