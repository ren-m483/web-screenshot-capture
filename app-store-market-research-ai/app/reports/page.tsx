"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportListItem {
  id: string;
  analysisId: string;
  title: string;
  reportType: string;
  analysisType: string;
  targetId: string;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((json) => setReports(json.reports))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">レポート一覧</h1>
        <p className="text-sm opacity-70">過去に生成した分析レポートを再表示できます。</p>
      </div>

      {loading && <p className="text-sm opacity-60">読み込み中...</p>}

      <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th className="text-left p-2">タイトル</th>
              <th className="text-left p-2">種別</th>
              <th className="text-left p-2">analysisId</th>
              <th className="text-left p-2">作成日時</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t border-black/5 dark:border-white/5">
                <td className="p-2">{r.title}</td>
                <td className="p-2">{r.analysisType}</td>
                <td className="p-2 font-mono text-xs">{r.analysisId}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString("ja-JP")}</td>
                <td className="p-2">
                  <Link href={`/reports/${r.id}`} className="underline text-xs">
                    表示
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
