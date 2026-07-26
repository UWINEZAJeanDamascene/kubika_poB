import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { CreditCard, FileText, TrendingUp, Users, Wallet } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyARActivity } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyARActivityReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyARActivity(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load AR activity"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadARActivityPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadARActivityExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "New Invoices", value: data.summary.newInvoicesCount, caption: "Invoices issued", icon: FileText, tone: "blue" },
    { label: "Invoice Total", value: fmt(data.summary.newInvoicesTotal), caption: "New AR value", icon: TrendingUp, tone: "indigo" },
    { label: "Payments", value: fmt(data.summary.paymentsTotal), caption: "Received today", icon: Wallet, tone: "emerald" },
    { label: "Net Change", value: fmt(data.summary.netARChange), caption: "Receivables movement", icon: Users, tone: data.summary.netARChange >= 0 ? "blue" : "rose" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily AR Activity" shortTitle="AR Activity" subtitle="New invoices, customer payments, credit notes, and net receivables movement." icon={Users} tone="indigo" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-indigo-600" />New Invoices</CardTitle></CardHeader>
            <CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{data.newInvoices?.map((invoice: { invoiceNumber: string; clientName: string; status: string; total: number }, idx: number) => <div key={`${invoice.invoiceNumber}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div className="min-w-0"><p className="font-medium">{invoice.invoiceNumber}</p><p className="truncate text-xs text-slate-500">{invoice.clientName}</p></div><Badge variant={invoice.status === "paid" ? "default" : "secondary"}>{invoice.status}</Badge><span className="font-mono">{fmt(invoice.total)}</span></div>)}</div></CardContent>
          </Card>
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-emerald-600" />Payments Received</CardTitle></CardHeader>
            <CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{data.paymentsReceived?.map((payment: { receiptNumber: string; clientName: string; amount: number }, idx: number) => <div key={`${payment.receiptNumber}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div className="min-w-0"><p className="font-medium">{payment.receiptNumber}</p><p className="truncate text-xs text-slate-500">{payment.clientName}</p></div><span className="font-mono text-emerald-600">{fmt(payment.amount)}</span></div>)}</div></CardContent>
          </Card>
          <Card className={reportCardClass}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-rose-600" />Credit Notes</CardTitle></CardHeader>
            <CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{data.creditNotes?.map((note: { creditNoteNumber: string; clientName: string; total: number; reason?: string }, idx: number) => <div key={`${note.creditNoteNumber}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div className="min-w-0"><p className="font-medium">{note.creditNoteNumber}</p><p className="truncate text-xs text-slate-500">{note.clientName}{note.reason ? ` - ${note.reason}` : ""}</p></div><span className="font-mono text-rose-600">{fmt(note.total)}</span></div>)}</div></CardContent>
          </Card>
        </div>
      )}
    </DailyReportScaffold>
  );
}
