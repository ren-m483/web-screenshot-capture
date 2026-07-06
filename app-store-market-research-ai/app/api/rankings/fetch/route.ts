import { NextResponse } from "next/server";
import { appleRssService } from "@/services/apple-rss.service";
import { RANKING_LIMITS } from "@/constants/chart-types";
import type { ChartType, RankingLimit } from "@/constants/chart-types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { storefront, genreId, chartType, limit, forceRefresh } = body as {
    storefront?: string;
    genreId?: string;
    chartType?: ChartType;
    limit?: RankingLimit;
    forceRefresh?: boolean;
  };

  if (!storefront || !chartType || !limit) {
    return NextResponse.json({ error: "storefront, chartType, limit は必須です" }, { status: 400 });
  }
  if (!RANKING_LIMITS.includes(limit)) {
    return NextResponse.json({ error: `limit は ${RANKING_LIMITS.join(" / ")} のいずれかである必要があります` }, { status: 400 });
  }

  try {
    const snapshot = await appleRssService.fetchRanking({
      storefront,
      genreId: genreId || "all",
      chartType,
      limit,
      forceRefresh: Boolean(forceRefresh),
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ランキング取得に失敗しました。時間を空けて再試行してください。" },
      { status: 502 },
    );
  }
}
