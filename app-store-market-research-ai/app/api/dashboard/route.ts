import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [recentSnapshots, recentReports, recentIdeas, usageCounts] = await Promise.all([
    prisma.rankingSnapshot.findMany({ orderBy: { fetchedAt: "desc" }, take: 5 }),
    prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { analysis: true } }),
    prisma.appIdea.findMany({ where: { recommendation: "recommend" }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.apiUsageLog.groupBy({ by: ["provider"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    recentSnapshots: recentSnapshots.map((s) => ({
      id: s.id,
      storefront: s.storefrontId,
      genreId: s.genreId,
      chartType: s.chartType,
      limit: s.limit,
      fetchedAt: s.fetchedAt.toISOString(),
    })),
    recentReports: recentReports.map((r) => ({
      id: r.id,
      title: r.title,
      analysisType: r.analysis.analysisType,
      createdAt: r.createdAt.toISOString(),
    })),
    recommendedIdeas: recentIdeas.map((i) => ({ id: i.id, title: i.title, personalDevScore: i.personalDevScore, aiDevScore: i.aiDevScore })),
    apiUsage: usageCounts.map((u) => ({ provider: u.provider, count: u._count._all })),
  });
}
