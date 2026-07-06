import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export class ReportExportService {
  async exportMarkdown(analysisId: string): Promise<string> {
    const analysis = await prisma.analysis.findUniqueOrThrow({ where: { id: analysisId } });
    return analysis.resultMarkdown;
  }

  async exportJson(analysisId: string): Promise<object> {
    const analysis = await prisma.analysis.findUniqueOrThrow({ where: { id: analysisId } });
    return {
      id: analysis.id,
      analysisType: analysis.analysisType,
      targetType: analysis.targetType,
      targetId: analysis.targetId,
      promptVersion: analysis.promptVersion,
      modelName: analysis.modelName,
      scores: analysis.scoreJson ? JSON.parse(analysis.scoreJson) : null,
      result: JSON.parse(analysis.resultJson),
      createdAt: analysis.createdAt,
    };
  }

  async exportCsv(snapshotId: string): Promise<string> {
    const snapshot = await prisma.rankingSnapshot.findUniqueOrThrow({
      where: { id: snapshotId },
      include: { entries: { include: { app: true }, orderBy: { rank: "asc" } } },
    });

    return toCsv(
      ["rank", "appId", "appName", "developerName", "genreName", "price", "formattedPrice", "rating", "ratingCount", "appStoreUrl"],
      snapshot.entries.map((e) => [
        e.rank,
        e.app.id,
        e.app.name,
        e.app.developerName ?? "",
        e.app.primaryGenreName ?? "",
        e.app.price ?? "",
        e.app.formattedPrice ?? "",
        e.app.averageUserRating ?? "",
        e.app.userRatingCount ?? "",
        e.app.trackViewUrl ?? `https://apps.apple.com/${snapshot.storefrontId}/app/id${e.app.id}`,
      ]),
    );
  }

  async saveReport(analysisId: string, title: string, reportType: "markdown" | "json" | "csv", content: string) {
    return prisma.report.create({ data: { analysisId, title, reportType, content } });
  }
}

export const reportExportService = new ReportExportService();
