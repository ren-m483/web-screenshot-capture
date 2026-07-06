import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");

  const ideas = await prisma.appIdea.findMany({
    where: analysisId ? { analysisId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ideas: ideas.map((i) => ({ ...i, mvpFeatures: JSON.parse(i.mvpFeatures) })),
  });
}
