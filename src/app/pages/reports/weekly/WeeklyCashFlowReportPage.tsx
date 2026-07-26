import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklyCashFlow } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { WeeklyReportScaffold, weeklyReportCardClass, type WeeklyMetric } from "./components/WeeklyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : (n < 0 ? "-" : "") + "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WeeklyCashFlowReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useWeeklyCashFlow(weekStart);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load cash flow report"); }, [error]);
  const onWeekChange = (value: string) => { setWeekStart(value); setSearchParams({ weekStart: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await weeklyReportsApi.downloadCashFlowPDF(weekStart); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await weeklyReportsApi.downloadCashFlowExcel(weekStart); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: WeeklyMetric[] = data ? [
    { label: "Cash In", value: fmt(data.summary.weekTotalIn), caption: "Weekly inflows", icon: TrendingUp, tone: "emerald" },
    { label: "Cash Out", value: fmt(data.summary.weekTotalOut), caption: "Weekly outflows", icon: TrendingDown, tone: "rose" },
    { label: "Net Flow", value: fmt(data.summary.weekNetFlow), caption: "Net movement", icon: Wallet, tone: data.summary.weekNetFlow >= 0 ? "blue" : "orange" },
  ] : [];

  return (
    <WeeklyReportScaffold title="Weekly Cash Flow" shortTitle="Cash Flow" subtitle="Daily cash inflows, outflows, and net position across the selected week." icon={Wallet} tone="cyan" weekStart={weekStart} weekLabel={data ? `${data.weekStart} to ${data.weekEnd}` : undefined} onWeekChange={onWeekChange} loading={isLoading} downloading={downloading} onBack={() => navigate(weeklyReportsApi.getListPath(weekStart))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <Card className={weeklyReportCardClass}>
          <CardHeader><CardTitle className="text-base">Daily Cash Flow</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.summary.dailyFlow.map((day) => (
                <div key={day.date} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3"><div className="w-12 font-semibold text-slate-950 dark:text-white">{day.dayName}</div><div className="text-slate-500 dark:text-slate-400">{day.date}</div></div>
                  <div className="flex flex-wrap gap-4 text-sm"><span className="inline-flex items-center gap-1 text-emerald-600"><TrendingUp className="h-4 w-4" />{fmt(day.cashIn)}</span><span className="inline-flex items-center gap-1 text-rose-600"><TrendingDown className="h-4 w-4" />{fmt(day.cashOut)}</span><span className={`font-mono font-semibold ${day.netFlow >= 0 ? "text-blue-600" : "text-orange-600"}`}>{day.netFlow >= 0 ? "+" : ""}{fmt(day.netFlow)}</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </WeeklyReportScaffold>
  );
}
