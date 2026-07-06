"use client";

import { useState } from "react";
import Link from "next/link";
import { STOREFRONTS } from "@/constants/storefronts";
import { APPLE_GENRES } from "@/constants/apple-genres";
import { RANKING_LIMITS, type ChartType, type RankingLimit } from "@/constants/chart-types";
import type { RankingSnapshotView } from "@/types/ranking";
import { ErrorBanner } from "@/components/common/error-banner";
import { EmptyState } from "@/components/common/empty-state";

interface RankMover {
  appId: string;
  appName: string;
  previousRank: number;
  currentRank: number;
  delta: number;
}

interface RankingTrend {
  snapshots: { id: string; fetchedAt: string }[];
  risers: RankMover[];
  fallers: RankMover[];
  newEntries: { appId: string; appName: string; rank: number }[];
}

export default function RankingsPage() {
  const [storefront, setStorefront] = useState("jp");
  const [genreId, setGenreId] = useState("all");
  const [chartType, setChartType] = useState<ChartType>("free");
  const [limit, setLimit] = useState<RankingLimit>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RankingSnapshotView | null>(null);
  const [trend, setTrend] = useState<RankingTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const fetchRanking = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rankings/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storefront, genreId, chartType, limit, forceRefresh }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ランキング取得に失敗しました");
      setSnapshot(json);
      setTrend(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrend = async () => {
    setTrendLoading(true);
    try {
      const params = new URLSearchParams({ storefront, genreId, chartType, limit: String(limit) });
      const res = await fetch(`/api/rankings/trends?${params.toString()}`);
      if (res.ok) setTrend(await res.json());
    } finally {
      setTrendLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">ランキング取得</h1>
        <p className="text-sm opacity-70">Apple公式RSSから無料/有料トップアプリを取得します（HTMLスクレイピングは行いません）。</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-lg border border-black/10 dark:border-white/10 p-4">
        <label className="flex flex-col text-sm gap-1">
          国
          <select value={storefront} onChange={(e) => setStorefront(e.target.value)} className="border rounded px-2 py-1 bg-transparent">
            {STOREFRONTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm gap-1">
          ジャンル
          <select value={genreId} onChange={(e) => setGenreId(e.target.value)} className="border rounded px-2 py-1 bg-transparent">
            {APPLE_GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm gap-1">
          無料/有料
          <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)} className="border rounded px-2 py-1 bg-transparent">
            <option value="free">無料</option>
            <option value="paid">有料</option>
          </select>
        </label>

        <label className="flex flex-col text-sm gap-1">
          件数
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value) as RankingLimit)} className="border rounded px-2 py-1 bg-transparent">
            {RANKING_LIMITS.map((l) => (
              <option key={l} value={l}>
                Top{l}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => fetchRanking(false)}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm disabled:opacity-50"
        >
          {loading ? "取得中..." : "取得"}
        </button>
        <button
          onClick={() => fetchRanking(true)}
          disabled={loading}
          className="px-4 py-2 rounded border border-black/20 dark:border-white/20 text-sm disabled:opacity-50"
        >
          強制更新
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {snapshot && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs opacity-60">
              取得日時: {new Date(snapshot.fetchedAt).toLocaleString("ja-JP")} {snapshot.cached && "(キャッシュ)"}
            </p>
            <div className="flex gap-2">
              <a href={`/api/rankings/${snapshot.snapshotId}/csv`} className="text-xs px-3 py-1.5 rounded border border-black/20 dark:border-white/20">
                CSV出力
              </a>
              <button
                onClick={fetchTrend}
                disabled={trendLoading}
                className="text-xs px-3 py-1.5 rounded border border-black/20 dark:border-white/20 disabled:opacity-50"
              >
                {trendLoading ? "読込中..." : "順位推移を見る"}
              </button>
              <Link
                href={`/analysis/genre?storefront=${storefront}&genreId=${genreId}&limit=${limit}`}
                className="text-xs px-3 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black"
              >
                このジャンルを分析する
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr>
                  <th className="text-left p-2">順位</th>
                  <th className="text-left p-2">アプリ名</th>
                  <th className="text-left p-2">開発者</th>
                  <th className="text-left p-2">評価</th>
                  <th className="text-left p-2">評価件数</th>
                  <th className="text-left p-2">価格</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.map((entry) => (
                  <tr key={entry.appId} className="border-t border-black/5 dark:border-white/5">
                    <td className="p-2">{entry.rank}</td>
                    <td className="p-2">{entry.appName}</td>
                    <td className="p-2">{entry.developerName ?? "-"}</td>
                    <td className="p-2">{entry.rating ?? "-"}</td>
                    <td className="p-2">{entry.ratingCount ?? "-"}</td>
                    <td className="p-2">{entry.formattedPrice ?? "-"}</td>
                    <td className="p-2">
                      <Link href={`/diagnosis?url=${encodeURIComponent(entry.appStoreUrl ?? "")}`} className="underline text-xs">
                        診断
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {trend && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">順位推移（同一条件でのランキング比較）</h2>
              {trend.snapshots.length < 2 ? (
                <EmptyState message="同一条件でもう一度ランキングを取得（強制更新）すると、順位の変動を比較できます" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="text-xs font-medium opacity-70 mb-1">順位上昇</h3>
                    {trend.risers.length === 0 ? (
                      <p className="text-xs opacity-50">なし</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {trend.risers.map((m) => (
                          <li key={m.appId} className="flex justify-between">
                            <span>{m.appName}</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ▲{m.delta}（{m.previousRank}→{m.currentRank}位）
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-medium opacity-70 mb-1">順位下降</h3>
                    {trend.fallers.length === 0 ? (
                      <p className="text-xs opacity-50">なし</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {trend.fallers.map((m) => (
                          <li key={m.appId} className="flex justify-between">
                            <span>{m.appName}</span>
                            <span className="text-rose-600 dark:text-rose-400">
                              ▼{Math.abs(m.delta)}（{m.previousRank}→{m.currentRank}位）
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {trend.newEntries.length > 0 && (
                    <div className="md:col-span-2">
                      <h3 className="text-xs font-medium opacity-70 mb-1">新規ランクイン</h3>
                      <ul className="flex flex-col gap-1">
                        {trend.newEntries.map((e) => (
                          <li key={e.appId}>
                            {e.appName}（{e.rank}位）
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
