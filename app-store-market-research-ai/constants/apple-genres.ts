export interface GenreDef {
  id: string;
  name: string;
  type: "app" | "game";
}

// Apple公式のジャンルID体系（App Store Connect / RSS Feed Generatorで使用される値）
export const APPLE_GENRES: GenreDef[] = [
  { id: "all", name: "すべて", type: "app" },
  { id: "6000", name: "Business", type: "app" },
  { id: "6001", name: "Weather", type: "app" },
  { id: "6002", name: "Utilities", type: "app" },
  { id: "6003", name: "Travel", type: "app" },
  { id: "6004", name: "Sports", type: "app" },
  { id: "6005", name: "Social Networking", type: "app" },
  { id: "6006", name: "Reference", type: "app" },
  { id: "6007", name: "Productivity", type: "app" },
  { id: "6008", name: "Photo & Video", type: "app" },
  { id: "6009", name: "News", type: "app" },
  { id: "6010", name: "Navigation", type: "app" },
  { id: "6011", name: "Music", type: "app" },
  { id: "6012", name: "Lifestyle", type: "app" },
  { id: "6013", name: "Health & Fitness", type: "app" },
  { id: "6014", name: "Games", type: "game" },
  { id: "6015", name: "Finance", type: "app" },
  { id: "6016", name: "Entertainment", type: "app" },
  { id: "6017", name: "Education", type: "app" },
  { id: "6018", name: "Books", type: "app" },
  { id: "6020", name: "Medical", type: "app" },
  { id: "6022", name: "Catalogs", type: "app" },
  { id: "6023", name: "Food & Drink", type: "app" },
  { id: "6024", name: "Shopping", type: "app" },
  { id: "6026", name: "Developer Tools", type: "app" },
  { id: "6027", name: "Graphics & Design", type: "app" },
];

export function findGenre(id: string): GenreDef | undefined {
  return APPLE_GENRES.find((g) => g.id === id);
}

/**
 * ジャンルごとの開発複雑度の目安（個人開発向きスコア / AI開発向きスコアの
 * ヒューリスティックに使う）。0（実装が軽い）〜100（実装が重い）。
 */
export const GENRE_COMPLEXITY_HINTS: Record<string, { backendComplexity: number; nativeComplexity: number; crudFit: number; realtimeNeed: number }> = {
  "6000": { backendComplexity: 40, nativeComplexity: 20, crudFit: 70, realtimeNeed: 20 },
  "6001": { backendComplexity: 30, nativeComplexity: 20, crudFit: 60, realtimeNeed: 40 },
  "6002": { backendComplexity: 20, nativeComplexity: 40, crudFit: 50, realtimeNeed: 10 },
  "6003": { backendComplexity: 50, nativeComplexity: 40, crudFit: 60, realtimeNeed: 30 },
  "6004": { backendComplexity: 40, nativeComplexity: 30, crudFit: 60, realtimeNeed: 40 },
  "6005": { backendComplexity: 70, nativeComplexity: 40, crudFit: 60, realtimeNeed: 70 },
  "6006": { backendComplexity: 20, nativeComplexity: 20, crudFit: 80, realtimeNeed: 10 },
  "6007": { backendComplexity: 30, nativeComplexity: 30, crudFit: 80, realtimeNeed: 20 },
  "6008": { backendComplexity: 40, nativeComplexity: 60, crudFit: 50, realtimeNeed: 20 },
  "6009": { backendComplexity: 30, nativeComplexity: 20, crudFit: 70, realtimeNeed: 30 },
  "6010": { backendComplexity: 50, nativeComplexity: 70, crudFit: 40, realtimeNeed: 60 },
  "6011": { backendComplexity: 50, nativeComplexity: 50, crudFit: 40, realtimeNeed: 40 },
  "6012": { backendComplexity: 30, nativeComplexity: 20, crudFit: 70, realtimeNeed: 20 },
  "6013": { backendComplexity: 40, nativeComplexity: 50, crudFit: 60, realtimeNeed: 30 },
  "6014": { backendComplexity: 60, nativeComplexity: 80, crudFit: 20, realtimeNeed: 70 },
  "6015": { backendComplexity: 60, nativeComplexity: 30, crudFit: 60, realtimeNeed: 30 },
  "6016": { backendComplexity: 40, nativeComplexity: 40, crudFit: 50, realtimeNeed: 40 },
  "6017": { backendComplexity: 30, nativeComplexity: 20, crudFit: 70, realtimeNeed: 20 },
  "6018": { backendComplexity: 20, nativeComplexity: 20, crudFit: 70, realtimeNeed: 10 },
  "6020": { backendComplexity: 60, nativeComplexity: 40, crudFit: 60, realtimeNeed: 20 },
  "6022": { backendComplexity: 20, nativeComplexity: 10, crudFit: 80, realtimeNeed: 10 },
  "6023": { backendComplexity: 40, nativeComplexity: 30, crudFit: 60, realtimeNeed: 20 },
  "6024": { backendComplexity: 60, nativeComplexity: 30, crudFit: 60, realtimeNeed: 30 },
  "6026": { backendComplexity: 30, nativeComplexity: 20, crudFit: 70, realtimeNeed: 10 },
  "6027": { backendComplexity: 20, nativeComplexity: 30, crudFit: 60, realtimeNeed: 10 },
};

export const DEFAULT_GENRE_COMPLEXITY = {
  backendComplexity: 40,
  nativeComplexity: 30,
  crudFit: 60,
  realtimeNeed: 30,
};
