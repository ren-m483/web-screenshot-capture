import type { ChartType, RankingLimit } from "@/constants/chart-types";

export interface FetchRankingParams {
  storefront: string;
  genreId: string; // "all" もしくは Apple genre ID
  chartType: ChartType;
  limit: RankingLimit;
  forceRefresh?: boolean;
}

export interface NormalizedRankingEntry {
  rank: number;
  appId: string;
  appName: string;
  developerName: string | null;
  raw: unknown;
}

export interface RankingEntryView {
  rank: number;
  appId: string;
  appName: string;
  developerName: string | null;
  genreName: string | null;
  price: number | null;
  formattedPrice: string | null;
  rating: number | null;
  ratingCount: number | null;
  iconUrl: string | null;
  appStoreUrl: string | null;
}

export interface RankingSnapshotView {
  snapshotId: string;
  storefront: string;
  genreId: string | null;
  chartType: ChartType;
  limit: number;
  fetchedAt: string;
  cached: boolean;
  entries: RankingEntryView[];
}
