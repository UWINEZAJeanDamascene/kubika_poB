import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Percent, Receipt, Scale, TrendingUp, Wallet } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyTaxCollected } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyTaxCollectedReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyTaxCollected(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load tax report"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadTaxCollectedPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadTaxCollectedExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "Net Output VAT", value: fmt(data.summary.totalOutputVAT), caption: "After credit notes", icon: Receipt, tone: "emerald" },
    { label: "Taxable Sales", value: fmt(data.summary.taxableSales), caption: "VAT base", icon: Scale, tone: "blue" },
    { label: "WHT Net", value: fmt(data.summary.netWithholdingTax), caption: "Collected less withheld", icon: Wallet, tone: data.summary.netWithholdingTax >= 0 ? "cyan" : "rose" },
    { label: "Invoices", value: data.summary.invoiceCount, caption: "Taxable documents", icon: TrendingUp, tone: "slate" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily Tax Collected" shortTitle="Tax" subtitle="Output VAT from sales and withholding tax breakdown for the selected date." icon={Receipt} tone="teal" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4 text-teal-600" />Tax Breakdown by Rate</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {data.taxBreakdown?.length ? data.taxBreakdown.map((tax: { taxCode: string; taxRate: number; taxableAmount: number; taxAmount: number }, idx: number) => (
                  <div key={`${tax.taxCode}-${idx}`} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3"><Badge variant="outline">{tax.taxCode}</Badge><span className="font-semibold text-slate-950 dark:text-white">{tax.taxRate}%</span></div>
                    <div className="flex flex-wrap gap-4 text-sm"><span className="text-slate-500 dark:text-slate-400">Taxable: <span className="font-mono text-slate-950 dark:text-white">{fmt(tax.taxableAmount)}</span></span><span className="font-mono font-semibold text-emerald-600">{fmt(tax.taxAmount)}</span></div>
                  </div>
                )) : <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">No VAT lines for this date.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-cyan-600" />Daily Tax Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                {[
                  ["Gross Output VAT", fmt(data.summary.grossOutputVAT)],
                  ["VAT Reversed", fmt(data.summary.outputVATReversed)],
                  ["Net Output VAT", fmt(data.summary.totalOutputVAT)],
                  ["Total Sales", fmt(data.summary.totalSales)],
                  ["Exempt Sales", fmt(data.summary.exemptSales)],
                  ["WHT Collected", fmt(data.summary.withholdingTaxCollected)],
                  ["WHT Withheld/Paid", fmt(data.summary.withholdingTaxPaid)],
                  ["Net WHT", fmt(data.summary.netWithholdingTax)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-mono font-semibold text-slate-950 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>

              {data.withholdingBreakdown?.length ? (
                <div className="mt-4 space-y-2">
                  {data.withholdingBreakdown.map((item, idx) => (
                    <div key={`${item.taxType}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-950 dark:text-white">{item.taxType}</span>
                        <span className="font-mono font-semibold">{fmt(item.amount)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.source} - {item.count} records</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </DailyReportScaffold>
  );
}
