import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Banknote, Building2, CreditCard, TrendingDown, Wallet } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyCashPosition } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyCashPositionReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyCashPosition(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load cash position"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadCashPositionPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadCashPositionExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "Opening", value: fmt(data.summary.openingBalance), caption: "Opening cash balance", icon: Wallet, tone: "slate" },
    { label: "Receipts", value: fmt(data.summary.receipts), caption: "Cash in", icon: Banknote, tone: "emerald" },
    { label: "Payments", value: fmt(data.summary.payments), caption: "Cash out", icon: TrendingDown, tone: "rose" },
    { label: "Closing", value: fmt(data.summary.closingBalance), caption: "Closing balance", icon: CreditCard, tone: "blue" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily Cash Position" shortTitle="Cash" subtitle="Opening balance, receipts, payments, and closing balance by cash or bank account." icon={Wallet} tone="amber" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <Card className={reportCardClass}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-amber-600" />Account Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {data.accounts?.map((account: { accountType: string; accountName: string; bankName?: string; openingBalance: number; receipts: number; payments: number; closingBalance: number }, idx: number) => (
                <div key={`${account.accountName}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{account.accountType}</Badge>
                    <span className="font-medium text-slate-950 dark:text-white">{account.accountName}</span>
                    {account.bankName && <span className="text-sm text-slate-500 dark:text-slate-400">({account.bankName})</span>}
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                    <div><p className="text-xs text-slate-500">Opening</p><p className="font-mono">{fmt(account.openingBalance)}</p></div>
                    <div><p className="text-xs text-slate-500">Receipts</p><p className="font-mono text-emerald-600">{fmt(account.receipts)}</p></div>
                    <div><p className="text-xs text-slate-500">Payments</p><p className="font-mono text-rose-600">{fmt(account.payments)}</p></div>
                    <div><p className="text-xs text-slate-500">Closing</p><p className="font-mono font-semibold">{fmt(account.closingBalance)}</p></div>
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
