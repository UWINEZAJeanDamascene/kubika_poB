import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Minus, Receipt, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklySalesPerformance } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { WeeklyReportScaffold, weeklyReportCardClass, type WeeklyMetric } from "./components/WeeklyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : (n < 0 ? "-" : "") + "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const Change = ({ value }: { value: number }) => value > 0 ? <span className="inline-flex items-center gap-1 text-emerald-600"><TrendingUp className="h-4 w-4" />{pct(value)}</span> : value < 0 ? <span className="inline-flex items-center gap-1 text-rose-600"><TrendingDown className="h-4 w-4" />{pct(value)}</span> : <span className="inline-flex items-center gap-1 text-slate-500"><Minus className="h-4 w-4" />0%</span>;

export default function WeeklySalesPerformanceReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useWeeklySalesPerformance(weekStart);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load sales performance report"); }, [error]);
  const handleWeekChange = (value: string) => { setWeekStart(value); setSearchParams({ weekStart: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await weeklyReportsApi.downloadSalesPerformancePDF(weekStart); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await weeklyReportsApi.downloadSalesPerformanceExcel(weekStart); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: WeeklyMetric[] = data ? [
    { label: "This Week Sales", value: fmt(data.thisWeek.sales), caption: `${data.weekStart} to ${data.weekEnd}`, icon: TrendingUp, tone: "blue" },
    { label: "Invoices", value: data.thisWeek.invoices, caption: "Issued this week", icon: Receipt, tone: "slate" },
    { label: "Orders", value: data.thisWeek.orders, caption: "Sales orders", icon: ShoppingCart, tone: "emerald" },
    { label: "Sales Change", value: <Change value={data.changes.salesPercent} />, caption: "Compared to last week", icon: TrendingUp, tone: data.changes.salesPercent >= 0 ? "emerald" : "rose" },
  ] : [];

  return (
    <WeeklyReportScaffold title="Weekly Sales Performance" shortTitle="Sales" subtitle="Compare this week against last week by value, invoices, orders, and items sold." icon={TrendingUp} tone="blue" weekStart={weekStart} weekLabel={data ? `${data.weekStart} to ${data.weekEnd}` : undefined} onWeekChange={handleWeekChange} loading={isLoading} downloading={downloading} onBack={() => navigate(weeklyReportsApi.getListPath(weekStart))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { title: "This Week", rows: [["Sales", fmt(data.thisWeek.sales)], ["Invoices", data.thisWeek.invoices], ["Orders", data.thisWeek.orders], ["Items Sold", data.thisWeek.items]] },
            { title: "Last Week", rows: [["Sales", fmt(data.lastWeek.sales)], ["Invoices", data.lastWeek.invoices], ["Orders", data.lastWeek.orders], ["Items Sold", data.lastWeek.items]] },
            { title: "Change", rows: [["Sales", <Change value={data.changes.salesPercent} />], ["Invoices", <Change value={data.changes.invoicesPercent} />], ["Orders", <Change value={data.changes.ordersPercent} />], ["Items", <Change value={data.changes.itemsPercent} />]] },
          ].map((panel) => (
            <Card key={panel.title} className={weeklyReportCardClass}>
              <CardHeader><CardTitle className="text-base">{panel.title}</CardTitle></CardHeader>
              <CardContent><div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">{panel.rows.map(([label, value]) => <div key={String(label)} className="flex items-center justify-between gap-4 py-3"><span className="text-slate-500 dark:text-slate-400">{label}</span><span className="font-mono font-semibold">{value}</span></div>)}</div></CardContent>
            </Card>
          ))}
        </div>
      )}
    </WeeklyReportScaffold>
  );
}
