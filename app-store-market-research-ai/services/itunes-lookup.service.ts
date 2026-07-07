import { prisma } from "@/lib/prisma";
import { isFresh } from "@/lib/cache";
import { env } from "@/lib/env";
import { itunesLookupQueue } from "@/lib/rate-limit";
import type { NormalizedApp } from "@/types/app";

const APP_STORE_URL_ID_PATTERN = /\/id(\d+)/i;

// iTunes Lookup APIはid=1,2,3のようにカンマ区切りで複数件を1リクエストにまとめられる。
// RANKING_LIMITSの最大値（Top50）が1バッチで収まるようにしている。
const LOOKUP_BATCH_SIZE = 50;

interface ItunesLookupResult {
  trackId: number | string;
  bundleId?: string;
  trackName?: string;
  artistName?: string;
  sellerName?: string;
  primaryGenreId?: number | string;
  primaryGenreName?: string;
  genreIds?: string[];
  genres?: string[];
  price?: number;
  formattedPrice?: string;
  currency?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  version?: string;
  releaseDate?: string;
  currentVersionReleaseDate?: string;
  description?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  artworkUrl100?: string;
  trackViewUrl?: string;
  contentAdvisoryRating?: string;
  supportedDevices?: string[];
  [key: string]: unknown;
}

/**
 * iTunes Search API / Lookup API を使ってアプリ詳細を取得するサービス。
 * App Store画面のスクレイピングは行わない（要件 2.2）。
 * Search APIは約20コール/分の制限があるためキューで直列化する（要件 2.1 / 5.2）。
 * 複数アプリをまとめて取得する場合は id=1,2,3 形式のバッチリクエストで
 * リクエスト回数自体を減らし、レート制限による待ち時間を最小化する。
 */
export class ItunesLookupService {
  extractAppIdFromUrl(url: string): string {
    const match = url.match(APP_STORE_URL_ID_PATTERN);
    if (!match) {
      throw new Error("App Store URLからアプリIDを取得できませんでした。URLに /id1234567890 の形式が含まれているか確認してください。");
    }
    return match[1];
  }

  normalizeLookupResponse(result: ItunesLookupResult): NormalizedApp {
    return {
      appId: String(result.trackId),
      bundleId: result.bundleId ?? null,
      name: result.trackName ?? "Unknown",
      developerName: result.artistName ?? null,
      sellerName: result.sellerName ?? null,
      primaryGenreId: result.primaryGenreId != null ? String(result.primaryGenreId) : null,
      primaryGenreName: result.primaryGenreName ?? null,
      genreIds: result.genreIds ?? [],
      genres: result.genres ?? [],
      price: typeof result.price === "number" ? result.price : null,
      formattedPrice: result.formattedPrice ?? null,
      currency: result.currency ?? null,
      averageUserRating: typeof result.averageUserRating === "number" ? result.averageUserRating : null,
      userRatingCount: typeof result.userRatingCount === "number" ? result.userRatingCount : null,
      version: result.version ?? null,
      releaseDate: result.releaseDate ?? null,
      currentVersionReleaseDate: result.currentVersionReleaseDate ?? null,
      description: result.description ?? null,
      screenshotUrls: result.screenshotUrls ?? [],
      ipadScreenshotUrls: result.ipadScreenshotUrls ?? [],
      artworkUrl100: result.artworkUrl100 ?? null,
      trackViewUrl: result.trackViewUrl ?? null,
      contentAdvisoryRating: result.contentAdvisoryRating ?? null,
      supportedDevices: result.supportedDevices ?? [],
      raw: result,
    };
  }

  private async callLookupApi(appId: string, storefront: string, lang?: string): Promise<ItunesLookupResult | null> {
    const results = await this.callLookupApiBatch([appId], storefront, lang);
    return results[0] ?? null;
  }

  /**
   * iTunes Lookup API は id パラメータにカンマ区切りで複数のtrackIdを渡すと
   * 1回のリクエストでまとめて返してくれる。個別に呼ぶとレート制限（約20コール/分）で
   * Top50の初回取得が最大150秒近くかかってしまうため、まとめて取得することで
   * リクエスト数そのものを減らす。
   */
  private async callLookupApiBatch(appIds: string[], storefront: string, lang?: string): Promise<ItunesLookupResult[]> {
    if (appIds.length === 0) return [];

    const searchParams = new URLSearchParams({
      id: appIds.join(","),
      country: storefront,
      entity: "software",
    });
    if (lang) searchParams.set("lang", lang);

    const url = `https://itunes.apple.com/lookup?${searchParams.toString()}`;
    const startedAt = Date.now();
    let status = 0;
    let errorMessage: string | null = null;

    try {
      const result = await itunesLookupQueue.run(async () => {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        status = res.status;
        if (!res.ok) {
          throw new Error(`iTunes Lookup API failed with status ${res.status}`);
        }
        return res.json();
      });

      return (result as { results?: ItunesLookupResult[] })?.results ?? [];
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await prisma.apiUsageLog.create({
        data: { provider: "lookup", endpoint: url, status, durationMs: Date.now() - startedAt, errorMessage },
      });
    }
  }

  async lookupApp(appId: string, storefront: string, options?: { forceRefresh?: boolean; lang?: string }): Promise<NormalizedApp> {
    if (!options?.forceRefresh) {
      const cached = await prisma.app.findUnique({ where: { id: appId } });
      if (cached?.lastLookupAt && isFresh(cached.lastLookupAt, env.lookupCacheMinutes) && cached.rawLookupJson) {
        return this.normalizeLookupResponse(JSON.parse(cached.rawLookupJson));
      }
    }

    const result = await this.callLookupApi(appId, storefront, options?.lang);
    if (!result) {
      throw new Error(`アプリID ${appId} の情報が見つかりませんでした。`);
    }

    const normalized = this.normalizeLookupResponse(result);
    await this.persist(normalized);
    return normalized;
  }

  /**
   * 複数アプリの詳細をまとめて取得する。
   * キャッシュ済み（24時間以内にlookup済み）のアプリはネットワークアクセスをスキップし、
   * 未取得のアプリのみ id=1,2,3 形式でバッチリクエストする（要件 2.1 / 5.1 / 5.2）。
   * Top50を初回取得する場合でも、レート制限に触れるリクエスト回数を最小限に抑えられる。
   */
  async lookupApps(appIds: string[], storefront: string, options?: { forceRefresh?: boolean; lang?: string }): Promise<NormalizedApp[]> {
    const uniqueIds = Array.from(new Set(appIds));
    const results: NormalizedApp[] = [];
    const idsToFetch: string[] = [];

    if (!options?.forceRefresh) {
      for (const id of uniqueIds) {
        const cached = await prisma.app.findUnique({ where: { id } });
        if (cached?.lastLookupAt && isFresh(cached.lastLookupAt, env.lookupCacheMinutes) && cached.rawLookupJson) {
          results.push(this.normalizeLookupResponse(JSON.parse(cached.rawLookupJson)));
        } else {
          idsToFetch.push(id);
        }
      }
    } else {
      idsToFetch.push(...uniqueIds);
    }

    for (let i = 0; i < idsToFetch.length; i += LOOKUP_BATCH_SIZE) {
      const batch = idsToFetch.slice(i, i + LOOKUP_BATCH_SIZE);
      try {
        const batchResults = await this.callLookupApiBatch(batch, storefront, options?.lang);
        for (const raw of batchResults) {
          const normalized = this.normalizeLookupResponse(raw);
          await this.persist(normalized);
          results.push(normalized);
        }
      } catch {
        // バッチ全体が失敗した場合はスキップし、他のバッチの取得を継続する
      }
    }

    return results;
  }

  private async persist(app: NormalizedApp): Promise<void> {
    await prisma.app.upsert({
      where: { id: app.appId },
      update: {
        bundleId: app.bundleId,
        name: app.name,
        developerName: app.developerName,
        sellerName: app.sellerName,
        primaryGenreId: app.primaryGenreId,
        primaryGenreName: app.primaryGenreName,
        genreIds: JSON.stringify(app.genreIds),
        genres: JSON.stringify(app.genres),
        price: app.price,
        formattedPrice: app.formattedPrice,
        currency: app.currency,
        averageUserRating: app.averageUserRating,
        userRatingCount: app.userRatingCount,
        version: app.version,
        releaseDate: app.releaseDate ? new Date(app.releaseDate) : null,
        currentVersionReleaseDate: app.currentVersionReleaseDate ? new Date(app.currentVersionReleaseDate) : null,
        description: app.description,
        screenshotUrls: JSON.stringify(app.screenshotUrls),
        ipadScreenshotUrls: JSON.stringify(app.ipadScreenshotUrls),
        artworkUrl100: app.artworkUrl100,
        trackViewUrl: app.trackViewUrl,
        contentAdvisoryRating: app.contentAdvisoryRating,
        rawLookupJson: JSON.stringify(app.raw),
        lastLookupAt: new Date(),
      },
      create: {
        id: app.appId,
        bundleId: app.bundleId,
        name: app.name,
        developerName: app.developerName,
        sellerName: app.sellerName,
        primaryGenreId: app.primaryGenreId,
        primaryGenreName: app.primaryGenreName,
        genreIds: JSON.stringify(app.genreIds),
        genres: JSON.stringify(app.genres),
        price: app.price,
        formattedPrice: app.formattedPrice,
        currency: app.currency,
        averageUserRating: app.averageUserRating,
        userRatingCount: app.userRatingCount,
        version: app.version,
        releaseDate: app.releaseDate ? new Date(app.releaseDate) : null,
        currentVersionReleaseDate: app.currentVersionReleaseDate ? new Date(app.currentVersionReleaseDate) : null,
        description: app.description,
        screenshotUrls: JSON.stringify(app.screenshotUrls),
        ipadScreenshotUrls: JSON.stringify(app.ipadScreenshotUrls),
        artworkUrl100: app.artworkUrl100,
        trackViewUrl: app.trackViewUrl,
        contentAdvisoryRating: app.contentAdvisoryRating,
        rawLookupJson: JSON.stringify(app.raw),
        lastLookupAt: new Date(),
      },
    });

    await prisma.appMetric.create({
      data: {
        appId: app.appId,
        storefrontId: env.defaultStorefront,
        averageUserRating: app.averageUserRating,
        userRatingCount: app.userRatingCount,
        price: app.price,
        formattedPrice: app.formattedPrice,
        version: app.version,
      },
    });
  }
}

export const itunesLookupService = new ItunesLookupService();
