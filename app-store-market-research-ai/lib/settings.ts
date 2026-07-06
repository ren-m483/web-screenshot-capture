import { prisma } from "@/lib/prisma";
import { encryptValue, decryptValue } from "@/lib/crypto";

const SECRET_KEYS = new Set(["openai_api_key", "anthropic_api_key", "gemini_api_key", "app_store_connect_key"]);

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return null;
  return row.encrypted ? decryptValue(row.value) : row.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const encrypted = SECRET_KEYS.has(key);
  const storedValue = value === "" ? "" : encrypted ? encryptValue(value) : value;
  await prisma.setting.upsert({
    where: { key },
    update: { value: storedValue, encrypted },
    create: { key, value: storedValue, encrypted },
  });
}

export async function getAllSettingKeys(keys: string[]): Promise<Record<string, string | null>> {
  const entries = await Promise.all(keys.map(async (key) => [key, await getSetting(key)] as const));
  return Object.fromEntries(entries);
}
