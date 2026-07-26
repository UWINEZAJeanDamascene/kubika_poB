import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { CreditCard, FileText, Truck, Wallet } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyAPActivity } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyAPActivityReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyAPActivity(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load AP activity"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadAPActivityPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadAPActivityExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "New Bills", value: data.summary.newBillsCount, caption: "Bills posted", icon: FileText, tone: "blue" },
    { label: "Bill Total", value: fmt(data.summary.newBillsTotal), caption: "New AP value", icon: Truck, tone: "rose" },
    { label: "Payments", value: fmt(data.summary.paymentsTotal), caption: "Paid today", icon: Wallet, tone: "amber" },
    { label: "Net Change", value: fmt(data.summary.netAPChange), caption: "Payables movement", icon: CreditCard, tone: data.summary.netAPChange >= 0 ? "blue" : "emerald" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily AP Activity" shortTitle="AP Activity" subtitle="New bills posted, supplier payments, debit notes, and net payables movement." icon={Truck} tone="rose" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-rose-600" />New Bills</CardTitle></CardHeader>
            <CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{data.newBills?.map((bill: { purchaseNumber: string; supplierName: string; status: string; total: number }, idx: number) => <div key={`${bill.purchaseNumber}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div className="min-w-0"><p className="font-medium">{bill.purchaseNumber}</p><p className="truncate text-xs text-slate-500">{bill.supplierName}</p></div><Badge variant="secondary">{bill.status}</Badge><span className="font-mono">{fmt(bill.total)}</span></div>)}</div></CardContent>
          </Card>
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-amber-600" />Payments Made</CardTitle></CardHeader>
            <CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{data.paymentsMade?.map((payment: { paymentNumber: string; supplierName: string; amount: number }, idx: number) => <div key={`${payment.paymentNumber}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div className="min-w-0"><p className="font-medium">{payment.paymentNumber}</p><p className="truncate text-xs text-slate-500">{payment.supplierName}</p></div><span className="font-mono text-rose-600">{fmt(payment.amount)}</span></div>)}</div></CardContent>
          </Card>
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-emerald-600" />Purchase Returns</CardTitle></CardHeader>
            <CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{data.purchaseReturns?.map((ret: { returnNumber: string; supplierName: string; total: number; reason?: string }, idx: number) => <div key={`${ret.returnNumber}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div className="min-w-0"><p className="font-medium">{ret.returnNumber}</p><p className="truncate text-xs text-slate-500">{ret.supplierName}{ret.reason ? ` - ${ret.reason}` : ""}</p></div><span className="font-mono text-emerald-600">{fmt(ret.total)}</span></div>)}</div></CardContent>
          </Card>
        </div>
      )}
    </DailyReportScaffold>
  );
}
