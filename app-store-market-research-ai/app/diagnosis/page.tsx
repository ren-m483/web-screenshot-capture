"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STOREFRONTS } from "@/constants/storefronts";
import { RANKING_LIMITS, type RankingLimit } from "@/constants/chart-types";
import { MarkdownViewer } from "@/components/common/markdown-viewer";
import { ScoreBar } from "@/components/common/score-bar";
import type { AppDiagnosisResult } from "@/types/analysis";

function DiagnosisForm() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState(searchParams.get("url") ?? "");
  const [storefront, setStorefront] = useState("jp");
  const [compareLimit, setCompareLimit] = useState<RankingLimit>(10);
  const [includeReviews, setIncludeReviews] = useState(true);
  const [outputType, setOutputType] = useState<"summary" | "detailed">("detailed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppDiagnosisResult | null>(null);
  const [usedLlm, setUsedLlm] = useState(true);

  const runDiagnosis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/apps/diagnose-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appStoreUrl: url, storefront, compareLimit, includeReviews, outputType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "診断に失敗しました");
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
        <h1 className="text-xl font-semibold">アプリURL診断</h1>
        <p className="text-sm opacity-70">任意のApp Store URLを入力すると、強み・弱み・改善点・スコアを診断します。</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 dark:border-white/10 p-4">
        <label className="flex flex-col text-sm gap-1">
          App Store URL
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://apps.apple.com/jp/app/example/id1234567890"
            className="border rounded px-2 py-1 bg-transparent"
          />
        </label>
        <div className="flex flex-wrap gap-3 items-end">
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
            比較件数
            <select
              value={compareLimit}
              onChange={(e) => setCompareLimit(Number(e.target.value) as RankingLimit)}
              className="border rounded px-2 py-1 bg-transparent"
            >
              {RANKING_LIMITS.map((l) => (
                <option key={l} value={l}>
                  Top{l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeReviews} onChange={(e) => setIncludeReviews(e.target.checked)} />
            レビュー分析を含める
          </label>
          <label className="flex flex-col text-sm gap-1">
            出力形式
            <select value={outputType} onChange={(e) => setOutputType(e.target.value as typeof outputType)} className="border rounded px-2 py-1 bg-transparent">
              <option value="summary">summary</option>
              <option value="detailed">detailed</option>
            </select>
          </label>
          <button
            onClick={runDiagnosis}
            disabled={loading || !url}
            className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm disabled:opacity-50"
          >
            {loading ? "診断中..." : "診断実行"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!usedLlm && result && (
        <p className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded px-3 py-2">
          AI APIキーが未設定のため、ルールベースの簡易分析を表示しています。
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 rounded-lg border border-black/10 dark:border-white/10 p-4">
            <ScoreBar label="ストア" value={result.scores.appStoreScore} />
            <ScoreBar label="評価" value={result.scores.ratingScore} />
            <ScoreBar label="差別化" value={result.scores.differentiationScore} />
            <ScoreBar label="収益化" value={result.scores.monetizationScore} />
            <ScoreBar label="個人開発参考度" value={result.scores.personalDevReferenceScore} />
            <ScoreBar label="改善余地" value={result.scores.improvementPotentialScore} />
          </div>

          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">サマリー</h2>
            <p className="text-sm">{result.summary}</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">強み</h2>
              <ul className="text-sm list-disc pl-4">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">弱み</h2>
              <ul className="text-sm list-disc pl-4">
                {result.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">改善提案</h2>
              <ul className="text-sm list-disc pl-4">
                {result.improvementSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
              <h2 className="font-medium mb-2">個人開発者が学べる点</h2>
              <ul className="text-sm list-disc pl-4">
                {result.personalDevLessons.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          </div>

          <MarkdownViewer content={result.markdown} title="診断レポート（Markdown）" />
        </div>
      )}
    </div>
  );
}

export default function DiagnosisPage() {
  return (
    <Suspense>
      <DiagnosisForm />
    </Suspense>
  );
}
