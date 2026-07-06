import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storefront = searchParams.get("storefront") ?? undefined;
  const genreId = searchParams.get("genreId") ?? undefined;
  const chartType = searchParams.get("chartType") ?? undefined;
  const limit = searchParams.get("limit");

  const snapshots = await prisma.rankingSnapshot.findMany({
    where: {
      storefrontId: storefront,
      genreId: genreId === "all" ? null : genreId || undefined,
      chartType: chartType || undefined,
      limit: limit ? Number(limit) : undefined,
    },
    orderBy: { fetchedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      id: s.id,
      storefront: s.storefrontId,
      genreId: s.genreId,
      chartType: s.chartType,
      limit: s.limit,
      fetchedAt: s.fetchedAt.toISOString(),
    })),
  });
}
