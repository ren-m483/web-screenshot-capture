import { NextResponse } from "next/server";
import { ideaGenerationService } from "@/services/idea-generation.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const analysisId = body?.analysisId as string | undefined;
  if (!analysisId) {
    return NextResponse.json({ error: "analysisId は必須です" }, { status: 400 });
  }

  try {
    const ideas = await ideaGenerationService.generateIdeas(analysisId);
    return NextResponse.json({ ideas });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "アプリ案生成に失敗しました" }, { status: 400 });
  }
}
