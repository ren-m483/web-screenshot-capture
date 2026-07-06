export interface StorefrontDef {
  id: string;
  name: string;
  defaultLang: string;
}

// MVPでは日本を中心にしつつ、比較用に主要国も定義しておく
export const STOREFRONTS: StorefrontDef[] = [
  { id: "jp", name: "日本", defaultLang: "ja_jp" },
  { id: "us", name: "United States", defaultLang: "en_us" },
  { id: "gb", name: "United Kingdom", defaultLang: "en_gb" },
];

export const DEFAULT_STOREFRONT = "jp";

export function findStorefront(id: string): StorefrontDef {
  return STOREFRONTS.find((s) => s.id === id) ?? STOREFRONTS[0];
}
