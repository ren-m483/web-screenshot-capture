import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewProviderService } from "@/services/review-provider.service";
import { hasAnyLlmKey } from "@/lib/env";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const appId = body?.appId as string | undefined;
  if (!appId) {
    return NextResponse.json({ error: "appId は必須です" }, { status: 400 });
  }

  const result = await reviewProviderService.analyzeReviews(appId);

  const analysis = await prisma.analysis.create({
    data: {
      analysisType: "review",
      targetType: "app",
      targetId: appId,
      inputHash: crypto.createHash("sha256").update(JSON.stringify({ appId, at: Date.now() })).digest("hex"),
      promptVersion: "review-analysis-v1",
      modelName: hasAnyLlmKey() ? "llm" : "rule-based-fallback",
      scoreJson: null,
      resultJson: JSON.stringify(result),
      resultMarkdown: `# レビュー分析\n\n${JSON.stringify(result, null, 2)}`,
    },
  });

  return NextResponse.json({ analysisId: analysis.id, result, usedLlm: hasAnyLlmKey() });
}
