import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItunesLookupService } from "@/services/itunes-lookup.service";
import { prisma } from "@/lib/prisma";

const LOOKUP_PAYLOAD = {
  resultCount: 1,
  results: [
    {
      trackId: 2222222222,
      trackName: "Second Example App",
      artistName: "Second Inc.",
      primaryGenreId: 6005,
      primaryGenreName: "Social Networking",
      price: 0,
      formattedPrice: "無料",
      averageUserRating: 4.1,
      userRatingCount: 800,
    },
  ],
};

describe("ItunesLookupService.lookupApp (with mocked network)", () => {
  const service = new ItunesLookupService();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(LOOKUP_PAYLOAD), { status: 200 })),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await prisma.appMetric.deleteMany({ where: { appId: "2222222222" } });
    await prisma.app.deleteMany({ where: { id: "2222222222" } });
  });

  it("looks up, normalizes, and persists app details", async () => {
    const app = await service.lookupApp("2222222222", "jp");

    expect(app.name).toBe("Second Example App");
    expect(app.primaryGenreId).toBe("6005");

    const saved = await prisma.app.findUnique({ where: { id: "2222222222" } });
    expect(saved?.name).toBe("Second Example App");
    expect(saved?.lastLookupAt).not.toBeNull();
  });

  it("uses the cache on the second call instead of calling fetch again", async () => {
    await service.lookupApp("2222222222", "jp");
    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockClear();

    const cached = await service.lookupApp("2222222222", "jp");

    expect(cached.name).toBe("Second Example App");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("bypasses the cache when forceRefresh is set", { timeout: 10_000 }, async () => {
    await service.lookupApp("2222222222", "jp");
    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockClear();

    await service.lookupApp("2222222222", "jp", { forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ItunesLookupService.lookupApps (batch lookup)", () => {
  const service = new ItunesLookupService();
  const BATCH_APP_IDS = ["3000000001", "3000000002", "3000000003"];
  const BATCH_PAYLOAD = {
    resultCount: 3,
    results: BATCH_APP_IDS.map((id, i) => ({
      trackId: Number(id),
      trackName: `Batch App ${i + 1}`,
      artistName: "Batch Inc.",
      price: 0,
      formattedPrice: "無料",
    })),
  };

  afterEach(async () => {
    vi.unstubAllGlobals();
    await prisma.appMetric.deleteMany({ where: { appId: { in: BATCH_APP_IDS } } });
    await prisma.app.deleteMany({ where: { id: { in: BATCH_APP_IDS } } });
  });

  it("fetches multiple uncached apps in a single request instead of one call per app", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(BATCH_PAYLOAD), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const apps = await service.lookupApps(BATCH_APP_IDS, "jp");

    expect(apps.map((a) => a.name).sort()).toEqual(["Batch App 1", "Batch App 2", "Batch App 3"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    for (const id of BATCH_APP_IDS) {
      expect(requestedUrl).toContain(id);
    }
  });
});
