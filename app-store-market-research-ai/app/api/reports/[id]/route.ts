import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = await prisma.report.findUnique({ where: { id } });

  if (!report) {
    return NextResponse.json({ error: "レポートが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({
    id: report.id,
    analysisId: report.analysisId,
    title: report.title,
    reportType: report.reportType,
    content: report.content,
    createdAt: report.createdAt.toISOString(),
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.report.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ deleted: true });
}
