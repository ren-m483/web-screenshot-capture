"use client";

import { useState } from "react";
import type { ReviewAnalysisResult } from "@/types/review";

interface ReviewItem {
  id: string;
  rating: number | null;
  title: string | null;
  body: string;
  sentiment: string | null;
  categories: string[];
}

export default function ReviewsPage() {
  const [appId, setAppId] = useState("");
  const [storefront, setStorefront] = useState("jp");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [analysis, setAnalysis] = useState<ReviewAnalysisResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReviews = async () => {
    if (!appId) return;
    const res = await fetch(`/api/reviews?appId=${encodeURIComponent(appId)}`);
    const json = await res.json();
    if (res.ok) setReviews(json.reviews);
  };

  const fetchPublicReviews = async () => {
    if (!appId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, storefront }),
      });
      const json = await res.json();
      setMessage(res.ok ? `${json.fetched}件のレビューを取得しました（取得可能な範囲）` : json.error);
      await loadReviews();
    } finally {
      setLoading(false);
    }
  };

  const uploadCsv = async () => {
    if (!appId || !csvFile) return;
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("appId", appId);
      const res = await fetch("/api/reviews/import-csv", { method: "POST", body: formData });
      const json = await res.json();
      setMessage(res.ok ? `${json.imported}件インポート、${json.skipped}件スキップしました` : json.error);
      await loadReviews();
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
      const json = await res.json();
      if (res.ok) setAnalysis(json.result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">レビュー分析</h1>
        <p className="text-sm opacity-70">
          取得可能な範囲の公開レビューまたはCSVインポートしたレビューを分析します。大量取得を保証するものではありません。
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-lg border border-black/10 dark:border-white/10 p-4">
        <label className="flex flex-col text-sm gap-1">
          対象アプリID (trackId)
          <input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="1234567890" className="border rounded px-2 py-1 bg-transparent" />
        </label>
        <label className="flex flex-col text-sm gap-1">
          国
          <input value={storefront} onChange={(e) => setStorefront(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-16" />
        </label>
        <button onClick={fetchPublicReviews} disabled={loading} className="px-3 py-2 rounded border border-black/20 dark:border-white/20 text-sm">
          公開レビューを取得
        </button>
        <button onClick={loadReviews} disabled={loading} className="px-3 py-2 rounded border border-black/20 dark:border-white/20 text-sm">
          保存済みレビューを表示
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-lg border border-black/10 dark:border-white/10 p-4">
        <label className="flex flex-col text-sm gap-1">
          レビューCSVアップロード
          <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </label>
        <button onClick={uploadCsv} disabled={loading || !csvFile} className="px-3 py-2 rounded border border-black/20 dark:border-white/20 text-sm">
          インポート
        </button>
        <button onClick={runAnalysis} disabled={loading || !appId} className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm">
          分析実行
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}

      {reviews.length > 0 && (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 max-h-96 overflow-y-auto flex flex-col gap-2">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-black/5 dark:border-white/5 pb-2">
              <div className="text-xs opacity-60 flex gap-2">
                <span>{r.rating}★</span>
                <span>{r.sentiment}</span>
                <span>{r.categories.join(", ")}</span>
              </div>
              <div className="text-sm">{r.title && <strong>{r.title}: </strong>}{r.body}</div>
            </div>
          ))}
        </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">高評価理由</h2>
            <p className="text-sm">{analysis.positiveSummary}</p>
          </section>
          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">低評価理由</h2>
            <p className="text-sm">{analysis.negativeSummary}</p>
          </section>
          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">不満上位</h2>
            <ul className="text-sm list-disc pl-4">
              {analysis.topComplaints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">新規アプリ案ヒント</h2>
            <ul className="text-sm list-disc pl-4">
              {analysis.mvpHints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
