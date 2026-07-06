"use client";

import { useEffect, useState } from "react";
import { STOREFRONTS } from "@/constants/storefronts";

interface SettingsData {
  openaiApiKeyConfigured: boolean;
  anthropicApiKeyConfigured: boolean;
  geminiApiKeyConfigured: boolean;
  openaiApiKeyMasked: string;
  anthropicApiKeyMasked: string;
  geminiApiKeyMasked: string;
  llmProvider: string;
  defaultStorefront: string;
  defaultLang: string;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [llmProvider, setLlmProvider] = useState("");
  const [defaultStorefront, setDefaultStorefront] = useState("jp");
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json: SettingsData) => {
        setData(json);
        setLlmProvider(json.llmProvider);
        setDefaultStorefront(json.defaultStorefront);
      });
  };

  useEffect(load, []);

  const save = async () => {
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openaiApiKey, anthropicApiKey, geminiApiKey, llmProvider, defaultStorefront }),
    });
    const json = await res.json();
    setMessage(res.ok ? "保存しました" : json.error ?? "保存に失敗しました");
    setOpenaiApiKey("");
    setAnthropicApiKey("");
    setGeminiApiKey("");
    load();
  };

  const anyConfigured = data && (data.openaiApiKeyConfigured || data.anthropicApiKeyConfigured || data.geminiApiKeyConfigured);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">設定</h1>
        <p className="text-sm opacity-70">AI分析を利用するにはAPIキーを1つ以上設定してください。未設定でもルールベースの簡易分析は利用できます。</p>
      </div>

      {data && !anyConfigured && (
        <p className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded px-3 py-2">
          現在AI APIキーが未設定です。ジャンル分析・アプリ診断・レビュー分析はルールベースの簡易分析結果を表示します。
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 dark:border-white/10 p-4">
        <label className="flex flex-col text-sm gap-1">
          OpenAI APIキー {data?.openaiApiKeyConfigured && <span className="opacity-60">(設定済み: {data.openaiApiKeyMasked})</span>}
          <input
            type="password"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="sk-..."
            className="border rounded px-2 py-1 bg-transparent"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          Claude APIキー {data?.anthropicApiKeyConfigured && <span className="opacity-60">(設定済み: {data.anthropicApiKeyMasked})</span>}
          <input
            type="password"
            value={anthropicApiKey}
            onChange={(e) => setAnthropicApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="border rounded px-2 py-1 bg-transparent"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          Gemini APIキー {data?.geminiApiKeyConfigured && <span className="opacity-60">(設定済み: {data.geminiApiKeyMasked})</span>}
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="border rounded px-2 py-1 bg-transparent"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          使用モデル（優先プロバイダー）
          <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)} className="border rounded px-2 py-1 bg-transparent">
            <option value="">自動選択</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label className="flex flex-col text-sm gap-1">
          デフォルト国
          <select value={defaultStorefront} onChange={(e) => setDefaultStorefront(e.target.value)} className="border rounded px-2 py-1 bg-transparent">
            {STOREFRONTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <button onClick={save} className="self-start px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm">
          保存
        </button>
        {message && <p className="text-sm">{message}</p>}
      </div>

      <p className="text-xs opacity-60">
        APIキーはサーバー側のDBに暗号化して保存されます。ログには出力されません。App Store Connect API・外部レビューAPI連携は将来拡張です。
      </p>
    </div>
  );
}
