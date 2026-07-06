import { NextResponse } from "next/server";
import { marketAnalysisService } from "@/services/market-analysis.service";
import { hasAnyLlmKey } from "@/lib/env";
import type { ChartType, RankingLimit } from "@/constants/chart-types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { storefront, genreId, chartTypes, limit, analysisDepth } = body as {
    storefront?: string;
    genreId?: string;
    chartTypes?: ChartType[];
    limit?: RankingLimit;
    analysisDepth?: "quick" | "standard" | "deep";
  };

  if (!storefront || !genreId || !limit) {
    return NextResponse.json({ error: "storefront, genreId, limit は必須です" }, { status: 400 });
  }

  try {
    const { analysisId, result } = await marketAnalysisService.analyzeGenre({
      storefront,
      genreId,
      chartTypes: chartTypes && chartTypes.length > 0 ? chartTypes : ["free", "paid"],
      limit,
      analysisDepth: analysisDepth ?? "standard",
    });

    return NextResponse.json({
      analysisId,
      scores: result.scores,
      recommendedIdeas: result.recommendedIdeas,
      avoidIdeas: result.avoidIdeas,
      markdown: result.markdown,
      usedLlm: hasAnyLlmKey(),
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ジャンル分析に失敗しました" },
      { status: 502 },
    );
  }
}
