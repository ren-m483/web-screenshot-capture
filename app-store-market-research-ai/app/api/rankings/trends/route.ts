import { NextResponse } from "next/server";
import { rankingTrendService } from "@/services/ranking-trend.service";
import { RANKING_LIMITS } from "@/constants/chart-types";
import type { ChartType, RankingLimit } from "@/constants/chart-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storefront = searchParams.get("storefront");
  const genreId = searchParams.get("genreId") ?? "all";
  const chartType = searchParams.get("chartType") as ChartType | null;
  const limit = Number(searchParams.get("limit")) as RankingLimit;

  if (!storefront || !chartType || !RANKING_LIMITS.includes(limit)) {
    return NextResponse.json({ error: "storefront, chartType, limit(10/25/50) は必須です" }, { status: 400 });
  }

  const trend = await rankingTrendService.buildTrend({ storefront, genreId, chartType, limit });
  return NextResponse.json(trend);
}
