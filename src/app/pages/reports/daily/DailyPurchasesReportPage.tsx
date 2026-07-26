import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ClipboardList, Download, Package, ShoppingBag, Truck } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyPurchasesSummary } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyPurchasesReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyPurchasesSummary(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load purchases report"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadPurchasesPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadPurchasesExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "Purchases", value: fmt(data.summary.totalPurchases), caption: "Total purchase value", icon: ShoppingBag, tone: "emerald" },
    { label: "Orders", value: data.summary.totalOrders, caption: "Purchase orders", icon: ClipboardList, tone: "blue" },
    { label: "GRNs", value: data.summary.totalGRNs, caption: "Goods received", icon: Truck, tone: "amber" },
    { label: "Items", value: data.summary.totalItemsReceived, caption: "Units received", icon: Package, tone: "violet" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily Purchases Summary" shortTitle="Purchases" subtitle="Goods received, supplier orders, purchase value, and top suppliers for the selected date." icon={Package} tone="emerald" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <Card className={reportCardClass}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4 text-emerald-600" />Top Suppliers</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {data.topSuppliers?.length ? data.topSuppliers.map((supplier: { name: string; orders: number; amount: number }, idx: number) => (
                <div key={supplier.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="min-w-0"><div className="flex items-center gap-2"><Badge variant="outline">#{idx + 1}</Badge><span className="truncate font-medium">{supplier.name}</span></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{supplier.orders} orders</p></div>
                  <span className="font-mono font-semibold">{fmt(supplier.amount)}</span>
                </div>
              )) : <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 md:col-span-2">No supplier activity for this date.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </DailyReportScaffold>
  );
}
