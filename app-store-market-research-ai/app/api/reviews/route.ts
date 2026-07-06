import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewProviderService } from "@/services/review-provider.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");
  if (!appId) {
    return NextResponse.json({ error: "appId は必須です" }, { status: 400 });
  }

  const reviews = await prisma.review.findMany({ where: { appId }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      sourceType: r.sourceType,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.author,
      sentiment: r.sentiment,
      categories: r.categories ? JSON.parse(r.categories) : [],
      reviewCreatedAt: r.reviewCreatedAt,
    })),
    providers: reviewProviderService.getAvailableReviewProviders(),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const appId = body?.appId as string | undefined;
  const storefront = (body?.storefront as string | undefined) || "jp";
  if (!appId) {
    return NextResponse.json({ error: "appId は必須です" }, { status: 400 });
  }

  const reviews = await reviewProviderService.fetchPublicReviews(appId, storefront);
  for (const review of reviews) {
    const exists = await prisma.review.findFirst({ where: { appId, body: review.body, author: review.author ?? undefined } });
    if (exists) continue;
    await prisma.app.upsert({ where: { id: appId }, update: {}, create: { id: appId, name: appId } });
    await prisma.review.create({
      data: {
        appId,
        sourceType: review.sourceType,
        territory: review.territory,
        lang: review.lang,
        rating: review.rating,
        title: review.title,
        body: review.body,
        author: review.author,
        reviewCreatedAt: review.reviewCreatedAt ? new Date(review.reviewCreatedAt) : null,
        sentiment: review.sentiment,
        categories: JSON.stringify(review.categories),
      },
    });
  }

  return NextResponse.json({ fetched: reviews.length });
}
