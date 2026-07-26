import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { BookOpen, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { dailyReportsApi, type DailyJournalEntries } from "@/lib/api.dailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : `${n < 0 ? "-" : ""}RWF ` + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyJournalEntriesReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [data, setData] = useState<DailyJournalEntries | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await dailyReportsApi.getJournalEntries(date);
      if (response.success) setData(response.data);
    } catch {
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [date]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadJournalEntriesPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadJournalEntriesExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "Entries", value: data.summary.totalEntries, caption: "Journal entries posted", icon: FileText, tone: "cyan" },
    { label: "Debits", value: fmt(data.summary.totalDebits), caption: "Total debit side", icon: TrendingUp, tone: "blue" },
    { label: "Credits", value: fmt(data.summary.totalCredits), caption: "Total credit side", icon: TrendingDown, tone: "emerald" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily Journal Entries" shortTitle="Journal" subtitle="Every journal entry posted for the selected day with debit, credit, account, narration, and user details." icon={FileText} tone="cyan" date={date} onDateChange={onDateChange} loading={loading} downloading={downloading} onBack={() => navigate(dailyReportsApi.getListPath(date))} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && (
        <Card className={reportCardClass}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4 text-cyan-600" />Journal Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
              {data.entries?.map((entry: { entryNumber: string; description: string; postedBy: string; totalDebit: number; lines?: { accountCode: string; accountName: string; debit: number; credit: number }[] }, idx: number) => (
                <div key={`${entry.entryNumber}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><div className="flex items-center gap-2"><Badge variant="outline">{entry.entryNumber}</Badge><span className="font-medium text-slate-950 dark:text-white">{entry.description}</span></div><p className="mt-1 text-xs text-slate-500">Posted by {entry.postedBy}</p></div>
                    <span className="font-mono text-sm font-semibold">{fmt(entry.totalDebit)}</span>
                  </div>
                  <div className="mt-3 divide-y divide-dashed divide-slate-200 text-sm dark:divide-slate-800">
                    {entry.lines?.map((line, lineIdx) => (
                      <div key={`${line.accountCode}-${lineIdx}`} className="flex justify-between gap-4 py-2">
                        <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{line.accountCode} - {line.accountName}</span>
                        <div className="flex flex-shrink-0 gap-4">{line.debit > 0 && <span className="font-mono text-blue-600">{fmt(line.debit)}</span>}{line.credit > 0 && <span className="font-mono text-emerald-600">{fmt(line.credit)}</span>}</div>
                      </div>
                    ))}
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
