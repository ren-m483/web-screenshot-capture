export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  llmProvider: (process.env.LLM_PROVIDER || "") as "" | "openai" | "claude" | "gemini",
  defaultStorefront: process.env.DEFAULT_STOREFRONT || "jp",
  defaultLang: process.env.DEFAULT_LANG || "ja_jp",
  rankingCacheMinutes: Number(process.env.RANKING_CACHE_MINUTES ?? 60),
  lookupCacheMinutes: Number(process.env.LOOKUP_CACHE_MINUTES ?? 1440),
};

export function hasAnyLlmKey(): boolean {
  return Boolean(env.openaiApiKey || env.anthropicApiKey || env.geminiApiKey);
}
