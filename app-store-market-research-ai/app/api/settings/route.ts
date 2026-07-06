import { NextResponse } from "next/server";
import { getAllSettingKeys, setSetting } from "@/lib/settings";
import { env } from "@/lib/env";

const MANAGED_KEYS = [
  "openai_api_key",
  "anthropic_api_key",
  "gemini_api_key",
  "llm_provider",
  "app_store_connect_key",
  "default_storefront",
  "default_lang",
];

function mask(value: string | null): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

export async function GET() {
  const stored = await getAllSettingKeys(MANAGED_KEYS);

  return NextResponse.json({
    openaiApiKeyConfigured: Boolean(stored.openai_api_key || env.openaiApiKey),
    anthropicApiKeyConfigured: Boolean(stored.anthropic_api_key || env.anthropicApiKey),
    geminiApiKeyConfigured: Boolean(stored.gemini_api_key || env.geminiApiKey),
    openaiApiKeyMasked: mask(stored.openai_api_key),
    anthropicApiKeyMasked: mask(stored.anthropic_api_key),
    geminiApiKeyMasked: mask(stored.gemini_api_key),
    llmProvider: stored.llm_provider || env.llmProvider || "",
    defaultStorefront: stored.default_storefront || env.defaultStorefront,
    defaultLang: stored.default_lang || env.defaultLang,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const updates: [string, string][] = [];
  if (typeof body.openaiApiKey === "string") updates.push(["openai_api_key", body.openaiApiKey]);
  if (typeof body.anthropicApiKey === "string") updates.push(["anthropic_api_key", body.anthropicApiKey]);
  if (typeof body.geminiApiKey === "string") updates.push(["gemini_api_key", body.geminiApiKey]);
  if (typeof body.llmProvider === "string") updates.push(["llm_provider", body.llmProvider]);
  if (typeof body.defaultStorefront === "string") updates.push(["default_storefront", body.defaultStorefront]);
  if (typeof body.defaultLang === "string") updates.push(["default_lang", body.defaultLang]);

  for (const [key, value] of updates) {
    await setSetting(key, value);
  }

  return NextResponse.json({ saved: updates.map(([key]) => key) });
}
