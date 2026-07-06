import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as fetchRankingRoute } from "@/app/api/rankings/fetch/route";
import { GET as csvRoute } from "@/app/api/rankings/[id]/csv/route";

const RSS_PAYLOAD = {
  feed: {
    entry: [
      {
        id: { label: "https://apps.apple.com/jp/app/example/id3333333333", attributes: { "im:id": "3333333333" } },
        "im:name": { label: "Route Test App" },
        "im:artist": { label: "Route Test Inc." },
      },
    ],
  },
};

const LOOKUP_PAYLOAD = {
  resultCount: 1,
  results: [{ trackId: 3333333333, trackName: "Route Test App", artistName: "Route Test Inc.", price: 0, formattedPrice: "無料" }],
};

describe("POST /api/rankings/fetch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/rss/")) return new Response(JSON.stringify(RSS_PAYLOAD), { status: 200 });
        if (url.includes("/lookup")) return new Response(JSON.stringify(LOOKUP_PAYLOAD), { status: 200 });
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await prisma.rankingEntry.deleteMany({ where: { appId: "3333333333" } });
    await prisma.rankingSnapshot.deleteMany({ where: { genreId: null, storefrontId: "jp", chartType: "free", limit: 10 } });
    await prisma.appMetric.deleteMany({ where: { appId: "3333333333" } });
    await prisma.app.deleteMany({ where: { id: "3333333333" } });
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost/api/rankings/fetch", {
      method: "POST",
      body: JSON.stringify({ storefront: "jp" }),
    });
    const res = await fetchRankingRoute(req);
    expect(res.status).toBe(400);
  });

  it("fetches a ranking snapshot and exposes it via the CSV export route", async () => {
    const req = new Request("http://localhost/api/rankings/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storefront: "jp", genreId: "all", chartType: "free", limit: 10 }),
    });
    const res = await fetchRankingRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].appName).toBe("Route Test App");

    const csvRes = await csvRoute(new Request(`http://localhost/api/rankings/${json.snapshotId}/csv`), {
      params: Promise.resolve({ id: json.snapshotId }),
    });
    expect(csvRes.status).toBe(200);
    const csvText = await csvRes.text();
    expect(csvText).toContain("Route Test App");
  });
});
