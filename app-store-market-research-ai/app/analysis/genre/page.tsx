"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STOREFRONTS } from "@/constants/storefronts";
import { APPLE_GENRES } from "@/constants/apple-genres";
import { RANKING_LIMITS, type RankingLimit } from "@/constants/chart-types";
import { MarkdownViewer } from "@/components/common/markdown-viewer";
import { ScoreBar } from "@/components/common/score-bar";
import type { GenreAnalysisResult } from "@/types/analysis";

function GenreAnalysisForm() {
  const searchParams = useSearchParams();
  const [storefront, setStorefront] = useState(searchParams.get("storefront") ?? "jp");
  const [genreId, setGenreId] = useState(searchParams.get("genreId") ?? "6017");
  const [limit, setLimit] = useState<RankingLimit>((Number(searchParams.get("limit")) as RankingLimit) || 10);
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenreAnalysisResult | null>(null);
  const [usedLlm, setUsedLlm] = useState(true);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storefront, genreId, chartTypes: ["free", "paid"], limit, analysisDepth: depth }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "分析に失敗しました");
      setResult(json.result);
      setUsedLlm(json.usedLlm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">ジャンル分析</h1>
        <p className="text-sm opacity-70">上位アプリの共通点・価格傾向・レビュー不満・個人開発向きスコアを分析します。</p>
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
            {APPLE_GENRES.filter((g) => g.id !== "all").map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
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
        <label className="flex flex-col text-sm gap-1">
          分析深度
          <select value={depth} onChange={(e) => setDepth(e.target.value as typeof depth)} className="border rounded px-2 py-1 bg-transparent">
            <option value="quick">quick</option>
            <option value="standard">standard</option>
            <option value="deep">deep</option>
          </select>
        </label>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm disabled:opacity-50"
        >
          {loading ? "分析中..." : "分析実行"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!usedLlm && result && (
        <p className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded px-3 py-2">
          AI APIキーが未設定のため、ルールベースの簡易分析を表示しています。設定画面からAPIキーを登録するとより詳細な分析が生成されます。
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 rounded-lg border border-black/10 dark:border-white/10 p-4">
            <ScoreBar label="市場需要" value={result.scores.marketDemandScore} />
            <ScoreBar label="競合過密" value={result.scores.competitionScore} />
            <ScoreBar label="不満余地" value={result.scores.opportunityScore} />
            <ScoreBar label="個人開発向き" value={result.scores.personalDevFitScore} />
            <ScoreBar label="AI開発向き" value={result.scores.aiDevFitScore} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">市場概要</h2>
              <p className="text-sm">{result.marketOverview}</p>
            </section>
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">上位アプリの共通点</h2>
              <ul className="text-sm list-disc pl-4">
                {result.topAppPatterns.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">狙える余白</h2>
              <ul className="text-sm list-disc pl-4">
                {result.opportunityAreas.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">避けるべき領域</h2>
              <ul className="text-sm list-disc pl-4">
                {result.avoidAreas.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          </div>

          <section>
            <h2 className="font-medium mb-2">推奨アプリ案</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.recommendedIdeas.map((idea, i) => (
                <div key={i} className="rounded-lg border border-black/10 dark:border-white/10 p-4 flex flex-col gap-2">
                  <h3 className="font-medium text-sm">{idea.title}</h3>
                  <p className="text-xs opacity-70">{idea.problem}</p>
                  <p className="text-xs">個人開発 {idea.personalDevScore} / AI開発 {idea.aiDevScore}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-medium mb-2">作らない方がいいアプリ案</h2>
            <ul className="text-sm list-disc pl-4">
              {result.avoidIdeas.map((idea, i) => (
                <li key={i}>
                  <strong>{idea.title}</strong>: {idea.reason}（代替案: {idea.alternative}）
                </li>
              ))}
            </ul>
          </section>

          <MarkdownViewer content={result.markdown} title="ジャンル分析レポート（Markdown）" />
        </div>
      )}
    </div>
  );
}

export default function GenreAnalysisPage() {
  return (
    <Suspense>
      <GenreAnalysisForm />
    </Suspense>
  );
}
