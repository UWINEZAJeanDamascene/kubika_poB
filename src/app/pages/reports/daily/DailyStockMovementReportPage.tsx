import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeftRight, Boxes, Package, TrendingDown, TrendingUp } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyStockMovement } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyStockMovementReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyStockMovement(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load stock movement"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadStockMovementPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadStockMovementExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "Movements", value: data.summary.totalMovements, caption: "Total stock events", icon: ArrowLeftRight, tone: "violet" },
    { label: "Stock In", value: data.summary.stockInCount, caption: "Inbound events", icon: TrendingUp, tone: "emerald" },
    { label: "Stock Out", value: data.summary.stockOutCount, caption: "Outbound events", icon: TrendingDown, tone: "rose" },
    { label: "Net Value", value: fmt(data.summary.netMovement), caption: "Movement value", icon: Boxes, tone: data.summary.netMovement >= 0 ? "emerald" : "rose" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily Stock Movement" shortTitle="Stock" subtitle="Stock-in and stock-out transactions with warehouse, quantity, value, and running balance." icon={ArrowLeftRight} tone="violet" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <Card className={reportCardClass}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4 text-violet-600" />Movement Details</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {data.movements?.slice(0, 50).map((movement: { type: string; productName: string; warehouse: string; quantity: number; totalValue: number; runningBalance: number }, idx: number) => (
                <div key={`${movement.productName}-${idx}`} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant={movement.type.includes("in") ? "default" : "destructive"}>{movement.type}</Badge>
                    <span className="truncate font-medium">{movement.productName}</span>
                    <span className="text-slate-500 dark:text-slate-400">({movement.warehouse})</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>Qty: {movement.quantity}</span>
                    <span className="font-mono text-slate-950 dark:text-white">{fmt(movement.totalValue)}</span>
                    <span>Bal: {movement.runningBalance}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DailyReportScaffold>
  );
}
