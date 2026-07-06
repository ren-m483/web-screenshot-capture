"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Spinner } from "@/components/common/spinner";

interface TopMover {
  appId: string;
  appName: string;
  previousRank: number;
  currentRank: number;
  delta: number;
  storefront: string;
  genreId: string | null;
  chartType: string;
  limit: number;
}

interface DashboardData {
  recentSnapshots: { id: string; storefront: string; genreId: string | null; chartType: string; limit: number; fetchedAt: string }[];
  recentReports: { id: string; title: string; analysisType: string; createdAt: string }[];
  recommendedIdeas: { id: string; title: string; personalDevScore: number; aiDevScore: number }[];
  apiUsage: { provider: string; count: number }[];
  topMovers: TopMover[];
}

const STEPS = [
  { href: "/rankings", step: "1", title: "ランキングを取得", desc: "国・ジャンル・無料/有料・件数を指定してApple公式RSSから取得" },
  { href: "/analysis/genre", step: "2", title: "ジャンル分析", desc: "上位アプリの共通点・レビュー傾向・スコアを分析" },
  { href: "/diagnosis", step: "3", title: "アプリURL診断", desc: "任意のApp Store URLの強み・弱み・改善点を診断" },
];

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
        {STEPS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-black/10 dark:border-white/10 p-4 transition-colors hover:border-black/30 dark:hover:border-white/30 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-semibold">
                {s.step}
              </span>
              <span className="font-medium">{s.title}</span>
            </div>
            <div className="text-xs opacity-70 mt-2">{s.desc}</div>
          </Link>
        ))}
      </div>

      {loading && <Spinner />}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="最近取得したランキング">
            {data.recentSnapshots.length === 0 ? (
              <EmptyState message="まだランキングを取得していません" />
            ) : (
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
            )}
          </SectionCard>

          <SectionCard title="最近作成した分析レポート">
            {data.recentReports.length === 0 ? (
              <EmptyState message="まだレポートがありません" />
            ) : (
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
            )}
          </SectionCard>

          <SectionCard title="推奨アプリ案">
            {data.recommendedIdeas.length === 0 ? (
              <EmptyState message="まだアプリ案がありません" />
            ) : (
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
            )}
          </SectionCard>

          <SectionCard title="急上昇アプリ">
            {data.topMovers.length === 0 ? (
              <EmptyState message="同一条件で2回以上ランキングを取得すると、順位の変動がここに表示されます" />
            ) : (
              <ul className="text-sm flex flex-col gap-1">
                {data.topMovers.map((m) => (
                  <li key={`${m.appId}-${m.genreId}-${m.chartType}`} className="flex justify-between">
                    <span>{m.appName}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ▲{m.delta}（{m.previousRank}位→{m.currentRank}位）
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="API利用状況">
            {data.apiUsage.length === 0 ? (
              <EmptyState message="まだ利用実績がありません" />
            ) : (
              <ul className="text-sm flex flex-col gap-1">
                {data.apiUsage.map((u) => (
                  <li key={u.provider} className="flex justify-between">
                    <span>{u.provider}</span>
                    <span className="opacity-60">{u.count}回</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
