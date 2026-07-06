import { NextResponse } from "next/server";
import { appDiagnosisService } from "@/services/app-diagnosis.service";
import { hasAnyLlmKey } from "@/lib/env";
import { RANKING_LIMITS } from "@/constants/chart-types";
import type { RankingLimit } from "@/constants/chart-types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { appStoreUrl, storefront, compareLimit, includeReviews, outputType } = body as {
    appStoreUrl?: string;
    storefront?: string;
    compareLimit?: RankingLimit;
    includeReviews?: boolean;
    outputType?: "summary" | "detailed";
  };

  if (!appStoreUrl) {
    return NextResponse.json({ error: "appStoreUrl は必須です" }, { status: 400 });
  }

  const limit = compareLimit && RANKING_LIMITS.includes(compareLimit) ? compareLimit : 10;

  try {
    const { analysisId, appId, result } = await appDiagnosisService.diagnoseAppUrl({
      appStoreUrl,
      storefront: storefront || "jp",
      compareLimit: limit,
      includeReviews: includeReviews ?? true,
      outputType: outputType ?? "summary",
    });

    return NextResponse.json({ analysisId, appId, scores: result.scores, summary: result.summary, markdown: result.markdown, usedLlm: hasAnyLlmKey(), result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "アプリ診断に失敗しました。App Store URLに /id1234567890 の形式が含まれているか確認してください。",
      },
      { status: 400 },
    );
  }
}
