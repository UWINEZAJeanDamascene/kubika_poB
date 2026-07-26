import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Clock, Receipt } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklyPayablesAging } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { WeeklyReportScaffold, weeklyReportCardClass, type WeeklyMetric } from "./components/WeeklyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : (n < 0 ? "-" : "") + "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const buckets = [
  { key: "0-7", label: "0-7 Days", tone: "emerald" as const },
  { key: "8-14", label: "8-14 Days", tone: "amber" as const },
  { key: "15-21", label: "15-21 Days", tone: "orange" as const },
  { key: "over21", label: "Over 21 Days", tone: "rose" as const },
];

export default function WeeklyPayablesAgingReportPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useWeeklyPayablesAging();
  useEffect(() => { if (error) toast.error(error.message || "Failed to load payables aging report"); }, [error]);
  const downloadPDF = async () => { setDownloading("pdf"); try { await weeklyReportsApi.downloadPayablesAgingPDF(); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await weeklyReportsApi.downloadPayablesAgingExcel(); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };
  const metrics: WeeklyMetric[] = data ? buckets.map((bucket) => ({ label: bucket.label, value: fmt(data.summary.bucketTotals[bucket.key as keyof typeof data.summary.bucketTotals]), caption: "Outstanding supplier bills", icon: Clock, tone: bucket.tone })) : [];

  return (
    <WeeklyReportScaffold title="Payables Aging" shortTitle="Payables" subtitle="Amounts owed to suppliers grouped by age bucket." icon={Receipt} tone="rose" loading={isLoading} downloading={downloading} onBack={() => navigate(weeklyReportsApi.getListPath())} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && <div className="space-y-6">{buckets.map((bucket) => { const bucketData = data.buckets[bucket.key as keyof typeof data.buckets]; return <Card key={bucket.key} className={weeklyReportCardClass}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">{bucket.label}</CardTitle><Badge variant="outline">{bucketData.purchases.length} bills</Badge></div><p className="text-sm text-slate-500">Total: {fmt(bucketData.total)}</p></CardHeader><CardContent>{bucketData.purchases.length ? <div className="space-y-2">{bucketData.purchases.map((purchase) => <div key={purchase.purchaseId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div><p className="font-medium">{purchase.purchaseNumber}</p><p className="text-xs text-slate-500">{purchase.supplierName}</p></div><div className="text-right"><p className="font-mono">{fmt(purchase.balance)}</p><p className="text-xs text-slate-500">{purchase.daysOverdue} days overdue</p></div></div>)}</div> : <p className="py-6 text-center text-sm text-slate-500">No bills in this bucket</p>}</CardContent></Card>; })}</div>}
    </WeeklyReportScaffold>
  );
}
