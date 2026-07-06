import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isFresh } from "@/lib/cache";
import { env } from "@/lib/env";
import { CHART_TYPE_TO_FEED } from "@/constants/chart-types";
import { itunesLookupService } from "./itunes-lookup.service";
import type { App } from "@prisma/client";
import type { FetchRankingParams, NormalizedRankingEntry, RankingEntryView, RankingSnapshotView } from "@/types/ranking";

interface RssFeedEntry {
  id?: { label?: string; attributes?: { "im:id"?: string } };
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  [key: string]: unknown;
}

/**
 * Apple公式のRSS Feed（iTunes RSS Generator互換）からランキングを取得するサービス。
 * App Store画面のHTMLスクレイピングは行わず、公式RSSのみを利用する（要件 2.2）。
 */
export class AppleRssService {
  /**
   * https://rss.itunes.apple.com/ (Apple RSS Feed Generator) が生成するURLと同じ形式。
   * genreId が "all" の場合は genre セグメントを省略する。
   */
  buildRssUrl(params: FetchRankingParams): string {
    const feed = CHART_TYPE_TO_FEED[params.chartType];
    const genreSegment = params.genreId && params.genreId !== "all" ? `/genre=${params.genreId}` : "";
    return `https://itunes.apple.com/${params.storefront}/rss/${feed}/limit=${params.limit}${genreSegment}/json`;
  }

  private buildUrlHash(url: string): string {
    return crypto.createHash("sha256").update(url).digest("hex");
  }

  normalizeRssResponse(response: unknown): NormalizedRankingEntry[] {
    const feed = (response as { feed?: { entry?: RssFeedEntry[] } })?.feed;
    const entries = feed?.entry ?? [];

    return entries.map((entry, index) => {
      const appId = entry?.id?.attributes?.["im:id"] ?? String(entry?.id?.label ?? "");
      const appName = entry?.["im:name"]?.label ?? "Unknown";
      const developerName = entry?.["im:artist"]?.label ?? null;

      return {
        rank: index + 1,
        appId: String(appId),
        appName,
        developerName,
        raw: entry,
      };
    });
  }

  async fetchRanking(params: FetchRankingParams): Promise<RankingSnapshotView> {
    const url = this.buildRssUrl(params);
    const urlHash = this.buildUrlHash(url);

    if (!params.forceRefresh) {
      const cached = await this.findFreshSnapshot(params, urlHash);
      if (cached) return cached;
    }

    const startedAt = Date.now();
    let status = 0;
    let errorMessage: string | null = null;
    let entries: NormalizedRankingEntry[] = [];

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      status = res.status;
      if (!res.ok) {
        throw new Error(`Apple RSS request failed with status ${res.status}`);
      }
      const json = await res.json();
      entries = this.normalizeRssResponse(json);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await prisma.apiUsageLog.create({
        data: {
          provider: "apple_rss",
          endpoint: url,
          status,
          durationMs: Date.now() - startedAt,
          errorMessage,
        },
      });
    }

    const snapshot = await this.saveSnapshot(params, url, urlHash, entries);

    // 評価・価格などの詳細はLookup APIで補完する（キャッシュ済みなら再取得しない）
    await itunesLookupService.lookupApps(
      entries.map((e) => e.appId),
      params.storefront,
    );

    return (await this.findFreshSnapshot(params, urlHash)) ?? snapshot;
  }

  private async findFreshSnapshot(params: FetchRankingParams, urlHash: string): Promise<RankingSnapshotView | null> {
    const snapshot = await prisma.rankingSnapshot.findFirst({
      where: { sourceUrlHash: urlHash },
      orderBy: { fetchedAt: "desc" },
      include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
    });

    if (!snapshot || !isFresh(snapshot.fetchedAt, env.rankingCacheMinutes)) return null;

    return this.toView(snapshot, true);
  }

  private async saveSnapshot(
    params: FetchRankingParams,
    url: string,
    urlHash: string,
    entries: NormalizedRankingEntry[],
  ): Promise<RankingSnapshotView> {
    const fetchedAt = new Date();

    for (const entry of entries) {
      await prisma.app.upsert({
        where: { id: entry.appId },
        update: { name: entry.appName, developerName: entry.developerName ?? undefined },
        create: { id: entry.appId, name: entry.appName, developerName: entry.developerName ?? undefined },
      });
    }

    const snapshot = await prisma.rankingSnapshot.create({
      data: {
        storefrontId: params.storefront,
        genreId: params.genreId === "all" ? null : params.genreId,
        chartType: params.chartType,
        limit: params.limit,
        source: "apple_rss",
        sourceUrlHash: urlHash,
        fetchedAt,
        entries: {
          create: entries.map((entry) => ({
            appId: entry.appId,
            rank: entry.rank,
            appNameAtFetch: entry.appName,
            developerNameAtFetch: entry.developerName,
            rawEntryJson: JSON.stringify(entry.raw),
          })),
        },
      },
      include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
    });

    void url; // URLはハッシュ化してsourceUrlHashに保存済み。デバッグ用途以外では未使用。
    return this.toView(snapshot, false);
  }

  private toView(
    snapshot: {
      id: string;
      storefrontId: string;
      genreId: string | null;
      chartType: string;
      limit: number;
      fetchedAt: Date;
      entries: Array<{ rank: number; app: App; appNameAtFetch: string; developerNameAtFetch: string | null }>;
    },
    cached: boolean,
  ): RankingSnapshotView {
    const entries: RankingEntryView[] = snapshot.entries.map((e) => ({
      rank: e.rank,
      appId: e.app.id,
      appName: e.app.name ?? e.appNameAtFetch,
      developerName: e.app.developerName ?? e.developerNameAtFetch,
      genreName: e.app.primaryGenreName,
      price: e.app.price,
      formattedPrice: e.app.formattedPrice,
      rating: e.app.averageUserRating,
      ratingCount: e.app.userRatingCount,
      iconUrl: e.app.artworkUrl100,
      appStoreUrl: e.app.trackViewUrl ?? `https://apps.apple.com/${snapshot.storefrontId}/app/id${e.app.id}`,
    }));

    return {
      snapshotId: snapshot.id,
      storefront: snapshot.storefrontId,
      genreId: snapshot.genreId,
      chartType: snapshot.chartType as RankingSnapshotView["chartType"],
      limit: snapshot.limit,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      cached,
      entries,
    };
  }
}

export const appleRssService = new AppleRssService();
