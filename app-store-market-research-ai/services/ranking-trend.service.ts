import { prisma } from "@/lib/prisma";
import type { ChartType, RankingLimit } from "@/constants/chart-types";

/**
 * 同一条件（storefront/genre/chartType/limit）で複数回取得したランキングsnapshotを比較し、
 * ランキング推移・急上昇アプリを検出する。要件 17 Phase 5「ランキング推移グラフ」
 * 「急上昇アプリ検知」に対応する。
 */

export interface TrendQueryParams {
  storefront: string;
  genreId: string; // "all" も可
  chartType: ChartType;
  limit: RankingLimit;
}

export interface RankPoint {
  snapshotId: string;
  fetchedAt: string;
  rank: number | null;
}

export interface AppRankHistory {
  appId: string;
  appName: string;
  points: RankPoint[];
}

export interface RankMover {
  appId: string;
  appName: string;
  previousRank: number;
  currentRank: number;
  delta: number; // 正の値 = 順位が上がった（改善）
}

export interface NewEntry {
  appId: string;
  appName: string;
  rank: number;
}

export interface RankingTrendResult {
  snapshots: { id: string; fetchedAt: string }[];
  history: AppRankHistory[];
  risers: RankMover[];
  fallers: RankMover[];
  newEntries: NewEntry[];
}

export interface TopMover extends RankMover {
  storefront: string;
  genreId: string | null;
  chartType: string;
  limit: number;
}

function whereFromParams(params: TrendQueryParams) {
  return {
    storefrontId: params.storefront,
    genreId: params.genreId === "all" ? null : params.genreId,
    chartType: params.chartType,
    limit: params.limit,
  };
}

export class RankingTrendService {
  async buildTrend(params: TrendQueryParams, historyLimit = 10): Promise<RankingTrendResult> {
    const snapshots = await prisma.rankingSnapshot.findMany({
      where: whereFromParams(params),
      orderBy: { fetchedAt: "asc" },
      take: historyLimit,
      include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
    });

    const historyByApp = new Map<string, AppRankHistory>();

    for (const snapshot of snapshots) {
      const seenInSnapshot = new Set<string>();
      for (const entry of snapshot.entries) {
        seenInSnapshot.add(entry.appId);
        const existing = historyByApp.get(entry.appId);
        const point: RankPoint = { snapshotId: snapshot.id, fetchedAt: snapshot.fetchedAt.toISOString(), rank: entry.rank };
        if (existing) {
          existing.points.push(point);
        } else {
          historyByApp.set(entry.appId, { appId: entry.appId, appName: entry.app.name, points: [point] });
        }
      }
      // このsnapshotに登場しなかったアプリには null ポイントを積んで時系列の欠損を表現する
      for (const [appId, history] of historyByApp) {
        if (!seenInSnapshot.has(appId)) {
          history.points.push({ snapshotId: snapshot.id, fetchedAt: snapshot.fetchedAt.toISOString(), rank: null });
        }
      }
    }

    const { risers, fallers, newEntries } = this.computeMovers(snapshots);

    return {
      snapshots: snapshots.map((s) => ({ id: s.id, fetchedAt: s.fetchedAt.toISOString() })),
      history: Array.from(historyByApp.values()),
      risers,
      fallers,
      newEntries,
    };
  }

  private computeMovers(
    snapshots: Array<{ id: string; entries: Array<{ appId: string; rank: number; app: { name: string } }> }>,
  ): { risers: RankMover[]; fallers: RankMover[]; newEntries: NewEntry[] } {
    if (snapshots.length < 2) return { risers: [], fallers: [], newEntries: [] };

    const previous = snapshots[snapshots.length - 2];
    const current = snapshots[snapshots.length - 1];

    const previousRanks = new Map(previous.entries.map((e) => [e.appId, e.rank]));
    const movers: RankMover[] = [];
    const newEntries: NewEntry[] = [];

    for (const entry of current.entries) {
      const previousRank = previousRanks.get(entry.appId);
      if (previousRank === undefined) {
        newEntries.push({ appId: entry.appId, appName: entry.app.name, rank: entry.rank });
        continue;
      }
      const delta = previousRank - entry.rank;
      if (delta !== 0) {
        movers.push({ appId: entry.appId, appName: entry.app.name, previousRank, currentRank: entry.rank, delta });
      }
    }

    const risers = movers.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta);
    const fallers = movers.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta);

    return { risers, fallers, newEntries };
  }

  /**
   * 保存済みの全ての(storefront, genre, chartType, limit)の組み合わせのうち、
   * snapshotが2件以上あるものについて直近2件を比較し、急上昇アプリを横断的に検出する。
   */
  async findTopMovers(maxResults = 5): Promise<TopMover[]> {
    const groups = await prisma.rankingSnapshot.groupBy({
      by: ["storefrontId", "genreId", "chartType", "limit"],
      _count: { _all: true },
      having: { id: { _count: { gte: 2 } } },
    });

    const allRisers: TopMover[] = [];

    for (const group of groups) {
      const snapshots = await prisma.rankingSnapshot.findMany({
        where: {
          storefrontId: group.storefrontId,
          genreId: group.genreId,
          chartType: group.chartType,
          limit: group.limit,
        },
        orderBy: { fetchedAt: "desc" },
        take: 2,
        include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
      });
      if (snapshots.length < 2) continue;

      const [current, previous] = snapshots; // desc順なので[0]が最新
      const { risers } = this.computeMovers([previous, current]);

      for (const riser of risers) {
        allRisers.push({
          ...riser,
          storefront: group.storefrontId,
          genreId: group.genreId,
          chartType: group.chartType,
          limit: group.limit,
        });
      }
    }

    return allRisers.sort((a, b) => b.delta - a.delta).slice(0, maxResults);
  }
}

export const rankingTrendService = new RankingTrendService();
