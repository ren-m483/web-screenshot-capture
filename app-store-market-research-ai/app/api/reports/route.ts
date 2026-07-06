import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const analysisType = searchParams.get("analysisType") ?? undefined;

  const reports = await prisma.report.findMany({
    where: analysisType ? { analysis: { analysisType } } : undefined,
    include: { analysis: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      analysisId: r.analysisId,
      title: r.title,
      reportType: r.reportType,
      analysisType: r.analysis.analysisType,
      targetId: r.analysis.targetId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
