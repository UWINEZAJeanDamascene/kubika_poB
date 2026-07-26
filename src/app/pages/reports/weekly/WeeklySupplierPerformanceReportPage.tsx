import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Truck } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklySupplierPerformance } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { WeeklyReportScaffold, weeklyReportCardClass, type WeeklyMetric } from "./components/WeeklyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : (n < 0 ? "-" : "") + "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WeeklySupplierPerformanceReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useWeeklySupplierPerformance(weekStart);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load supplier performance report"); }, [error]);
  const onWeekChange = (value: string) => { setWeekStart(value); setSearchParams({ weekStart: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await weeklyReportsApi.downloadSupplierPerformancePDF(weekStart); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await weeklyReportsApi.downloadSupplierPerformanceExcel(weekStart); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };
  const metrics: WeeklyMetric[] = data ? [
    { label: "POs Raised", value: data.summary.totalPosRaised, caption: "New orders", icon: Truck, tone: "emerald" },
    { label: "Deliveries", value: data.summary.totalDeliveries, caption: "Received this week", icon: CheckCircle, tone: "blue" },
    { label: "Pending", value: data.summary.totalPending, caption: "Open supplier orders", icon: Clock, tone: "amber" },
    { label: "Overdue", value: data.summary.totalOverdue, caption: "Needs attention", icon: AlertTriangle, tone: "rose" },
  ] : [];

  return (
    <WeeklyReportScaffold title="Weekly Supplier Performance" shortTitle="Suppliers" subtitle="Purchase orders raised, deliveries received, pending orders, and overdue supplier activity." icon={Truck} tone="emerald" weekStart={weekStart} weekLabel={data ? `${data.weekStart} to ${data.weekEnd}` : undefined} onWeekChange={onWeekChange} loading={isLoading} downloading={downloading} onBack={() => navigate(weeklyReportsApi.getListPath(weekStart))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <Card className={weeklyReportCardClass}>
          <CardHeader><CardTitle className="text-base">Supplier Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {data.suppliers?.length ? data.suppliers.map((supplier) => (
                <div key={supplier.supplierId} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-950 dark:text-white">{supplier.supplierName}</h3>{supplier.overdueDeliveries?.count > 0 && <Badge variant="destructive">{supplier.overdueDeliveries.count} Overdue</Badge>}</div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                    <div><p className="text-xs text-slate-500">POs</p><p>{supplier.posRaised?.count || 0} ({fmt(supplier.posRaised?.value || 0)})</p></div>
                    <div><p className="text-xs text-slate-500">Delivered</p><p>{supplier.deliveriesReceived?.count || 0} ({fmt(supplier.deliveriesReceived?.value || 0)})</p></div>
                    <div><p className="text-xs text-slate-500">Pending</p><p>{supplier.pendingOrders?.count || 0}</p></div>
                    <div><p className="text-xs text-slate-500">Overdue</p><p>{supplier.overdueDeliveries?.count || 0}</p></div>
                  </div>
                </div>
              )) : <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">No supplier details available.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </WeeklyReportScaffold>
  );
}
