import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RankingEntryView } from "@/types/ranking";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const snapshot = await prisma.rankingSnapshot.findUnique({
    where: { id },
    include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "スナップショットが見つかりません" }, { status: 404 });
  }

  const entries: RankingEntryView[] = snapshot.entries.map((e) => ({
    rank: e.rank,
    appId: e.app.id,
    appName: e.app.name ?? e.appNameAtFetch,
    developerName: e.app.developerName ?? e.developerNameAtFetch,
    genreName: e.app.primaryGenreName,
    price: e.app.price,
    formattedPrice: e.app.formattedPrice,
    rating: e.app.averageUserRating,
    ratingCount: e.app.userRatingCount,
    iconUrl: e.app.artworkUrl100,
    appStoreUrl: e.app.trackViewUrl ?? `https://apps.apple.com/${snapshot.storefrontId}/app/id${e.app.id}`,
  }));

  return NextResponse.json({
    snapshotId: snapshot.id,
    storefront: snapshot.storefrontId,
    genreId: snapshot.genreId,
    chartType: snapshot.chartType,
    limit: snapshot.limit,
    fetchedAt: snapshot.fetchedAt.toISOString(),
    cached: true,
    entries,
  });
}
