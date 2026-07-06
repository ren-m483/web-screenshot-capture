"use client";

import { useState } from "react";
import { MarkdownViewer } from "@/components/common/markdown-viewer";

interface IdeaItem {
  id: string;
  title: string;
  targetUser: string;
  problem: string;
  solution: string;
  mvpFeatures: string[];
  monetization: string;
  difficulty: string;
  personalDevScore: number;
  aiDevScore: number;
  recommendation: string;
  devPrompt: string;
}

export default function IdeasPage() {
  const [analysisId, setAnalysisId] = useState("");
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IdeaItem | null>(null);

  const generate = async () => {
    if (!analysisId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "アプリ案生成に失敗しました");
      setIdeas(json.ideas.map((i: IdeaItem, index: number) => ({ ...i, id: i.id ?? String(index) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">アプリ案ジェネレーター</h1>
        <p className="text-sm opacity-70">
          ジャンル分析の結果（analysisId）から、推奨アプリ案・作らない方がいいアプリ案・開発プロンプトを生成します。
          ジャンル分析ページの分析結果はダッシュボードやレポート一覧からもanalysisIdを確認できます。
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-lg border border-black/10 dark:border-white/10 p-4">
        <label className="flex flex-col text-sm gap-1">
          analysisId
          <input value={analysisId} onChange={(e) => setAnalysisId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-80" />
        </label>
        <button onClick={generate} disabled={loading || !analysisId} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm">
          {loading ? "生成中..." : "アプリ案を生成"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ideas.map((idea, i) => (
          <button
            key={i}
            onClick={() => setSelected(idea)}
            className="text-left rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="text-xs uppercase opacity-60">{idea.recommendation}</div>
            <div className="font-medium text-sm">{idea.title}</div>
            <div className="text-xs opacity-70 mt-1">{idea.problem}</div>
            <div className="text-xs mt-2">
              個人開発 {idea.personalDevScore} / AI開発 {idea.aiDevScore} / 難易度 {idea.difficulty}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-col gap-3">
          <section className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="font-medium mb-2">{selected.title}</h2>
            <ul className="text-sm flex flex-col gap-1">
              <li>
                <strong>対象ユーザー:</strong> {selected.targetUser}
              </li>
              <li>
                <strong>課題:</strong> {selected.problem}
              </li>
              <li>
                <strong>解決策:</strong> {selected.solution}
              </li>
              <li>
                <strong>MVP機能:</strong> {selected.mvpFeatures.join(", ")}
              </li>
              <li>
                <strong>収益化:</strong> {selected.monetization}
              </li>
            </ul>
          </section>
          <MarkdownViewer content={selected.devPrompt} title="Claude Code / Codex向け開発プロンプト" />
        </div>
      )}
    </div>
  );
}
