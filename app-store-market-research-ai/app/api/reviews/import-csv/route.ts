import { NextResponse } from "next/server";
import { reviewProviderService } from "@/services/review-provider.service";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "multipart/form-data で file, appId を送信してください" }, { status: 400 });
  }

  const file = formData.get("file");
  const appId = formData.get("appId");

  if (!(file instanceof File) || typeof appId !== "string" || !appId) {
    return NextResponse.json({ error: "file と appId は必須です" }, { status: 400 });
  }

  try {
    const content = await file.text();
    const result = await reviewProviderService.importReviewsFromCsv(content, file.size, appId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSVインポートに失敗しました" }, { status: 400 });
  }
}
