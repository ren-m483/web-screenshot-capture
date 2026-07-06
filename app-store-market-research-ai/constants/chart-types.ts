export type ChartType = "free" | "paid" | "grossing";

export const CHART_TYPES: { id: ChartType; label: string; mvpSupported: boolean }[] = [
  { id: "free", label: "無料トップアプリ", mvpSupported: true },
  { id: "paid", label: "有料トップアプリ", mvpSupported: true },
  { id: "grossing", label: "売上トップアプリ（任意拡張）", mvpSupported: false },
];

export type RankingLimit = 10 | 25 | 50;

export const RANKING_LIMITS: RankingLimit[] = [10, 25, 50];

// https://itunes.apple.com/{storefront}/rss/{feed}/limit={n}/json 形式のfeed名にマッピングする
export const CHART_TYPE_TO_FEED: Record<ChartType, string> = {
  free: "topfreeapplications",
  paid: "toppaidapplications",
  grossing: "topgrossingapplications",
};
