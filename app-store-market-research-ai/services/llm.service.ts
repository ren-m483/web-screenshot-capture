import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export type LlmProviderName = "openai" | "claude" | "gemini";

interface LlmCompletionOptions {
  system?: string;
  maxTokens?: number;
}

interface LlmProvider {
  name: LlmProviderName;
  modelName: string;
  complete(prompt: string, options?: LlmCompletionOptions): Promise<string>;
}

async function logUsage(provider: string, endpoint: string, status: number, durationMs: number, errorMessage: string | null) {
  await prisma.apiUsageLog.create({ data: { provider, endpoint, status, durationMs, errorMessage } });
}

class OpenAiProvider implements LlmProvider {
  name: LlmProviderName = "openai";
  modelName = "gpt-4o-mini";

  constructor(private readonly apiKey: string) {}

  async complete(prompt: string, options?: LlmCompletionOptions): Promise<string> {
    const startedAt = Date.now();
    let status = 0;
    let errorMessage: string | null = null;
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: "system", content: options?.system ?? "You are a helpful market research assistant. Respond in Japanese with valid JSON only." },
            { role: "user", content: prompt },
          ],
          max_tokens: options?.maxTokens ?? 2000,
          response_format: { type: "json_object" },
        }),
      });
      status = res.status;
      if (!res.ok) throw new Error(`OpenAI API failed with status ${res.status}`);
      const json = await res.json();
      return json.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await logUsage("openai", "chat.completions", status, Date.now() - startedAt, errorMessage);
    }
  }
}

class ClaudeProvider implements LlmProvider {
  name: LlmProviderName = "claude";
  modelName = "claude-sonnet-5";

  constructor(private readonly apiKey: string) {}

  async complete(prompt: string, options?: LlmCompletionOptions): Promise<string> {
    const startedAt = Date.now();
    let status = 0;
    let errorMessage: string | null = null;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: options?.maxTokens ?? 2000,
          system: options?.system ?? "You are a helpful market research assistant. Respond in Japanese with valid JSON only.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      status = res.status;
      if (!res.ok) throw new Error(`Claude API failed with status ${res.status}`);
      const json = await res.json();
      return json.content?.[0]?.text ?? "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await logUsage("claude", "messages", status, Date.now() - startedAt, errorMessage);
    }
  }
}

class GeminiProvider implements LlmProvider {
  name: LlmProviderName = "gemini";
  modelName = "gemini-2.0-flash";

  constructor(private readonly apiKey: string) {}

  async complete(prompt: string, options?: LlmCompletionOptions): Promise<string> {
    const startedAt = Date.now();
    let status = 0;
    let errorMessage: string | null = null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${options?.system ?? ""}\n\n${prompt}` }] }],
            generationConfig: { maxOutputTokens: options?.maxTokens ?? 2000, responseMimeType: "application/json" },
          }),
        },
      );
      status = res.status;
      if (!res.ok) throw new Error(`Gemini API failed with status ${res.status}`);
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await logUsage("gemini", "generateContent", status, Date.now() - startedAt, errorMessage);
    }
  }
}

/**
 * ユーザーが設定したAPIキーに応じてLLMプロバイダーを選ぶ。
 * Settings画面（DB保存）を優先し、無ければ.envの値にフォールバックする。
 * どのキーも未設定の場合は null を返し、呼び出し側はテンプレートベースの
 * 簡易分析にフォールバックする（要件 18: APIキー未設定時の適切な案内）。
 */
export async function getLlmProvider(): Promise<LlmProvider | null> {
  const { getSetting } = await import("@/lib/settings");
  const [dbProvider, dbOpenai, dbClaude, dbGemini] = await Promise.all([
    getSetting("llm_provider"),
    getSetting("openai_api_key"),
    getSetting("anthropic_api_key"),
    getSetting("gemini_api_key"),
  ]);

  const openaiApiKey = dbOpenai || env.openaiApiKey;
  const anthropicApiKey = dbClaude || env.anthropicApiKey;
  const geminiApiKey = dbGemini || env.geminiApiKey;
  const preferred = (dbProvider as LlmProviderName | null) || env.llmProvider;

  if (preferred === "openai" && openaiApiKey) return new OpenAiProvider(openaiApiKey);
  if (preferred === "claude" && anthropicApiKey) return new ClaudeProvider(anthropicApiKey);
  if (preferred === "gemini" && geminiApiKey) return new GeminiProvider(geminiApiKey);

  if (anthropicApiKey) return new ClaudeProvider(anthropicApiKey);
  if (openaiApiKey) return new OpenAiProvider(openaiApiKey);
  if (geminiApiKey) return new GeminiProvider(geminiApiKey);
  return null;
}

export function extractJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export type { LlmProvider };
