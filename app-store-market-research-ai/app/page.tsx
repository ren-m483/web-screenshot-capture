"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  recentSnapshots: { id: string; storefront: string; genreId: string | null; chartType: string; limit: number; fetchedAt: string }[];
  recentReports: { id: string; title: string; analysisType: string; createdAt: string }[];
  recommendedIdeas: { id: string; title: string; personalDevScore: number; aiDevScore: number }[];
  apiUsage: { provider: string; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <p className="text-sm opacity-70">
          App Storeの公開データをもとにした市場調査ツールです。ランキング取得 → ジャンル分析 → アプリ案生成 →
          開発プロンプト出力まで一連の流れで利用できます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/rankings" className="rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/5">
          <div className="font-medium">1. ランキングを取得</div>
          <div className="text-xs opacity-70 mt-1">国・ジャンル・無料/有料・件数を指定してApple公式RSSから取得</div>
        </Link>
        <Link href="/analysis/genre" className="rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/5">
          <div className="font-medium">2. ジャンル分析</div>
          <div className="text-xs opacity-70 mt-1">上位アプリの共通点・レビュー傾向・スコアを分析</div>
        </Link>
        <Link href="/diagnosis" className="rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/5">
          <div className="font-medium">3. アプリURL診断</div>
          <div className="text-xs opacity-70 mt-1">任意のApp Store URLの強み・弱み・改善点を診断</div>
        </Link>
      </div>

      {loading && <p className="text-sm opacity-60">読み込み中...</p>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">最近取得したランキング</h2>
            {data.recentSnapshots.length === 0 && <p className="text-sm opacity-60">まだありません</p>}
            <ul className="text-sm flex flex-col gap-1">
              {data.recentSnapshots.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>
                    {s.storefront} / {s.genreId ?? "all"} / {s.chartType} / Top{s.limit}
                  </span>
                  <span className="opacity-60">{new Date(s.fetchedAt).toLocaleString("ja-JP")}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">最近作成した分析レポート</h2>
            {data.recentReports.length === 0 && <p className="text-sm opacity-60">まだありません</p>}
            <ul className="text-sm flex flex-col gap-1">
              {data.recentReports.map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="underline hover:no-underline">
                    {r.title}
                  </Link>
                  <span className="opacity-60"> ({r.analysisType})</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">推奨アプリ案</h2>
            {data.recommendedIdeas.length === 0 && <p className="text-sm opacity-60">まだありません</p>}
            <ul className="text-sm flex flex-col gap-1">
              {data.recommendedIdeas.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.title}</span>
                  <span className="opacity-60">
                    個人開発{i.personalDevScore} / AI開発{i.aiDevScore}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">API利用状況</h2>
            {data.apiUsage.length === 0 && <p className="text-sm opacity-60">まだありません</p>}
            <ul className="text-sm flex flex-col gap-1">
              {data.apiUsage.map((u) => (
                <li key={u.provider} className="flex justify-between">
                  <span>{u.provider}</span>
                  <span className="opacity-60">{u.count}回</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
