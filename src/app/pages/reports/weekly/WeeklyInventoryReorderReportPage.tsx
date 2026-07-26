import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklyInventoryReorder } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { WeeklyReportScaffold, weeklyReportCardClass, type WeeklyMetric } from "./components/WeeklyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : n.toLocaleString("en-RW");

export default function WeeklyInventoryReorderReportPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useWeeklyInventoryReorder();
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load inventory reorder report"); }, [error]);
  const downloadPDF = async () => { setDownloading("pdf"); try { await weeklyReportsApi.downloadInventoryReorderPDF(); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await weeklyReportsApi.downloadInventoryReorderExcel(); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };
  const metrics: WeeklyMetric[] = data ? [
    { label: "Products", value: data.summary.totalProducts, caption: "Need reorder action", icon: Package, tone: "amber" },
    { label: "Critical", value: data.summary.criticalCount, caption: "Out of stock", icon: AlertCircle, tone: "rose" },
    { label: "Warning", value: data.summary.warningCount, caption: "Below reorder point", icon: AlertTriangle, tone: "amber" },
  ] : [];

  const renderItems = (items: any[], critical: boolean) => (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.productId} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3"><Badge variant={critical ? "destructive" : "outline"}>{critical ? "Critical" : "Low"}</Badge><div><p className="font-medium text-slate-950 dark:text-white">{item.name}</p><p className="text-xs text-slate-500">SKU: {item.sku}</p></div></div>
          <div className="text-sm text-slate-500 lg:text-right"><p><span className="font-semibold text-rose-600">Stock: {fmt(item.currentStock)}</span> / Min: {fmt(item.reorderPoint)}</p><p>Suggested Order: {item.suggestedOrder} {item.unit}</p></div>
        </div>
      ))}
    </div>
  );

  return (
    <WeeklyReportScaffold title="Inventory Reorder Report" shortTitle="Reorder" subtitle="Products below reorder point that need procurement attention now." icon={AlertTriangle} tone="amber" loading={isLoading} downloading={downloading} onBack={() => navigate(weeklyReportsApi.getListPath())} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <div className="space-y-6">
          {data.critical.length > 0 && <Card className={weeklyReportCardClass}><CardHeader><CardTitle className="flex items-center gap-2 text-base text-rose-600"><AlertCircle className="h-4 w-4" />Critical - Out of Stock ({data.critical.length})</CardTitle></CardHeader><CardContent>{renderItems(data.critical, true)}</CardContent></Card>}
          {data.warning.length > 0 && <Card className={weeklyReportCardClass}><CardHeader><CardTitle className="flex items-center gap-2 text-base text-amber-600"><Package className="h-4 w-4" />Warning - Low Stock ({data.warning.length})</CardTitle></CardHeader><CardContent>{renderItems(data.warning, false)}</CardContent></Card>}
          {data.critical.length === 0 && data.warning.length === 0 && <Card className={weeklyReportCardClass}><CardContent className="py-12 text-center"><CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" /><h3 className="text-lg font-semibold text-emerald-700">All Stock Levels Normal</h3><p className="text-sm text-slate-500">No products currently need reordering.</p></CardContent></Card>}
        </div>
      )}
    </WeeklyReportScaffold>
  );
}
