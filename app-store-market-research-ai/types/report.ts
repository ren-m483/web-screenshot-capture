export type ReportType = "markdown" | "json" | "csv";

export interface ReportView {
  id: string;
  analysisId: string;
  title: string;
  reportType: ReportType;
  content: string;
  createdAt: string;
}
