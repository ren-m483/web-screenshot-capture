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
