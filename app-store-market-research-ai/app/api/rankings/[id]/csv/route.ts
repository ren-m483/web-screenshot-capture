import { NextResponse } from "next/server";
import { reportExportService } from "@/services/report-export.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const csv = await reportExportService.exportCsv(id);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ranking-${id}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "スナップショットが見つかりません" }, { status: 404 });
  }
}
