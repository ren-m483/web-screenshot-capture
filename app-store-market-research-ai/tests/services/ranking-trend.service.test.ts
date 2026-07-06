import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { rankingTrendService } from "@/services/ranking-trend.service";
import crypto from "node:crypto";

const APP_A = "6000000001";
const APP_B = "6000000002";
const APP_C = "6000000003";
const GENRE_ID = "9999";

async function createSnapshot(order: string[], fetchedAt: Date) {
  const sourceUrlHash = crypto.createHash("sha256").update(`trend-test-${GENRE_ID}`).digest("hex");
  return prisma.rankingSnapshot.create({
    data: {
      storefrontId: "jp",
      genreId: GENRE_ID,
      chartType: "free",
      limit: 10,
      source: "test",
      sourceUrlHash,
      fetchedAt,
      entries: { create: order.map((appId, i) => ({ appId, rank: i + 1, appNameAtFetch: appId })) },
    },
  });
}

describe("RankingTrendService", () => {
  afterEach(async () => {
    await prisma.rankingEntry.deleteMany({ where: { appId: { in: [APP_A, APP_B, APP_C] } } });
    await prisma.rankingSnapshot.deleteMany({ where: { genreId: GENRE_ID } });
    await prisma.app.deleteMany({ where: { id: { in: [APP_A, APP_B, APP_C] } } });
  });

  it("returns no movers when there is only one snapshot", async () => {
    for (const id of [APP_A, APP_B, APP_C]) {
      await prisma.app.upsert({ where: { id }, update: {}, create: { id, name: id } });
    }
    await createSnapshot([APP_A, APP_B, APP_C], new Date());

    const trend = await rankingTrendService.buildTrend({ storefront: "jp", genreId: GENRE_ID, chartType: "free", limit: 10 });
    expect(trend.snapshots).toHaveLength(1);
    expect(trend.risers).toHaveLength(0);
    expect(trend.fallers).toHaveLength(0);
  });

  it("detects risers, fallers, and new entries between the two latest snapshots", async () => {
    for (const id of [APP_A, APP_B, APP_C]) {
      await prisma.app.upsert({ where: { id }, update: {}, create: { id, name: id } });
    }
    await createSnapshot([APP_A, APP_B, APP_C], new Date(Date.now() - 60_000));
    await createSnapshot([APP_C, APP_A], new Date());

    const trend = await rankingTrendService.buildTrend({ storefront: "jp", genreId: GENRE_ID, chartType: "free", limit: 10 });

    expect(trend.snapshots).toHaveLength(2);
    expect(trend.risers).toEqual([{ appId: APP_C, appName: APP_C, previousRank: 3, currentRank: 1, delta: 2 }]);
    expect(trend.fallers).toEqual([{ appId: APP_A, appName: APP_A, previousRank: 1, currentRank: 2, delta: -1 }]);
    // APP_B dropped out of the latest snapshot entirely, so it is neither a riser nor a new entry
    expect(trend.newEntries).toEqual([]);
  });

  it("surfaces the same movers via findTopMovers", async () => {
    for (const id of [APP_A, APP_B]) {
      await prisma.app.upsert({ where: { id }, update: {}, create: { id, name: id } });
    }
    await createSnapshot([APP_A, APP_B], new Date(Date.now() - 60_000));
    await createSnapshot([APP_B, APP_A], new Date());

    const movers = await rankingTrendService.findTopMovers(10);
    const match = movers.find((m) => m.appId === APP_B && m.genreId === GENRE_ID);
    expect(match).toMatchObject({ previousRank: 2, currentRank: 1, delta: 1 });
  });
});
