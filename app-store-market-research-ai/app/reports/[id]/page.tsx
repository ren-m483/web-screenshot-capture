"use client";

import { use, useEffect, useState } from "react";
import { MarkdownViewer } from "@/components/common/markdown-viewer";
import { ErrorBanner } from "@/components/common/error-banner";
import { Spinner } from "@/components/common/spinner";

interface ReportDetail {
  id: string;
  analysisId: string;
  title: string;
  reportType: string;
  content: string;
  createdAt: string;
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setReport(await res.json());
      });
  }, [id]);

  if (notFound) return <ErrorBanner message="レポートが見つかりませんでした。" />;
  if (!report) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{report.title}</h1>
        <p className="text-xs opacity-60">
          analysisId: {report.analysisId} / 作成日時: {new Date(report.createdAt).toLocaleString("ja-JP")}
        </p>
      </div>
      <MarkdownViewer content={report.content} title={report.title} />
    </div>
  );
}
