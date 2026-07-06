import { prisma } from "@/lib/prisma";
import { isFresh } from "@/lib/cache";
import { env } from "@/lib/env";
import { itunesLookupQueue } from "@/lib/rate-limit";
import type { NormalizedApp } from "@/types/app";

const APP_STORE_URL_ID_PATTERN = /\/id(\d+)/i;

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
    const searchParams = new URLSearchParams({
      id: appId,
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

      const results = (result as { results?: ItunesLookupResult[] })?.results ?? [];
      return results[0] ?? null;
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

  async lookupApps(appIds: string[], storefront: string, options?: { forceRefresh?: boolean; lang?: string }): Promise<NormalizedApp[]> {
    const uniqueIds = Array.from(new Set(appIds));
    const results: NormalizedApp[] = [];
    for (const id of uniqueIds) {
      try {
        results.push(await this.lookupApp(id, storefront, options));
      } catch {
        // 個別アプリの取得失敗はスキップし、他のアプリの取得を継続する
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
