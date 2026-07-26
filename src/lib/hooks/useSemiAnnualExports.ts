import { useState, useCallback } from "react";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

export type SemiAnnualReportId =
  | "profit-loss"
  | "balance-sheet-trend"
  | "cash-flow"
  | "stock-turnover"
  | "receivables-collection"
  | "payroll-hr"
  | "tax-obligations";

export function useSemiAnnualExports(
  reportId: SemiAnnualReportId,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
) {
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  const downloadPDF = useCallback(async () => {
    setDownloading("pdf");
    try {
      await monthlyReportsApi.downloadSemiAnnualReportPDF(
        reportId,
        startYear,
        startMonth,
        endYear,
        endMonth,
      );
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  }, [reportId, startYear, startMonth, endYear, endMonth]);

  const downloadExcel = useCallback(async () => {
    setDownloading("excel");
    try {
      await monthlyReportsApi.downloadSemiAnnualReportExcel(
        reportId,
        startYear,
        startMonth,
        endYear,
        endMonth,
      );
      toast.success("Excel downloaded successfully");
    } catch {
      toast.error("Failed to download Excel");
    } finally {
      setDownloading(null);
    }
  }, [reportId, startYear, startMonth, endYear, endMonth]);

  return { downloading, downloadPDF, downloadExcel };
}
