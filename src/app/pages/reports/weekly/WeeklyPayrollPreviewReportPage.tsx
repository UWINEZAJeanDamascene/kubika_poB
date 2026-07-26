import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertCircle, Banknote, Receipt, Users, Wallet } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklyPayrollPreview } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { WeeklyReportScaffold, weeklyReportCardClass, type WeeklyMetric } from "./components/WeeklyReportScaffold";

const fmt = (n: number | null | undefined) => n === null || n === undefined ? "-" : (n < 0 ? "-" : "") + "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WeeklyPayrollPreviewReportPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useWeeklyPayrollPreview();
  useEffect(() => { if (error) toast.error(error.message || "Failed to load payroll preview"); }, [error]);
  const downloadPDF = async () => { setDownloading("pdf"); try { await weeklyReportsApi.downloadPayrollPreviewPDF(); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await weeklyReportsApi.downloadPayrollPreviewExcel(); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };
  const metrics: WeeklyMetric[] = data?.payrollInProgress ? [
    { label: "Employees", value: data.summary?.employeeCount, caption: "Included in run", icon: Users, tone: "violet" },
    { label: "Gross Pay", value: fmt(data.summary?.grossPay), caption: "Before deductions", icon: Banknote, tone: "blue" },
    { label: "Deductions", value: fmt(data.summary?.totalDeductions), caption: "PAYE, RSSB, other", icon: Receipt, tone: "rose" },
    { label: "Net Pay", value: fmt(data.summary?.netPay), caption: "Payable to employees", icon: Wallet, tone: "emerald" },
  ] : data ? [{ label: "Employees", value: data.employeeCount, caption: "Estimated population", icon: Users, tone: "violet" }, { label: "Estimated Gross", value: fmt(data.estimatedGrossPay || 0), caption: "No active payroll run", icon: Banknote, tone: "amber" }] : [];

  return (
    <WeeklyReportScaffold title="Payroll Preview" shortTitle="Payroll" subtitle="Expected gross pay, PAYE, RSSB contributions, deductions, and net pay." icon={Users} tone="violet" loading={isLoading} downloading={downloading} onBack={() => navigate(weeklyReportsApi.getListPath())} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (!data.payrollInProgress ? (
        <Card className={weeklyReportCardClass}><CardContent className="py-12 text-center"><AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" /><h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">No Payroll in Progress</h3><p className="mt-2 text-sm text-slate-500">{data.message}</p><p className="mt-4 text-sm text-slate-500">Estimated gross pay for {data.employeeCount} employees: {fmt(data.estimatedGrossPay || 0)}</p></CardContent></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card className={weeklyReportCardClass}><CardHeader><CardTitle className="text-base">Payroll Summary</CardTitle></CardHeader><CardContent><div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">{[["Gross Pay", fmt(data.summary?.grossPay)], ["PAYE", `-${fmt(data.summary?.paye)}`], ["RSSB Employee", `-${fmt(data.summary?.rssbEmployee)}`], ["RSSB Employer", fmt(data.summary?.rssbEmployer)], ["Total Deductions", `-${fmt(data.summary?.totalDeductions)}`], ["Net Pay", fmt(data.summary?.netPay)]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><span className="text-slate-500">{label}</span><span className="font-mono font-semibold">{value}</span></div>)}</div></CardContent></Card>
          <Card className={weeklyReportCardClass}><CardHeader><CardTitle className="text-base">Employee Details</CardTitle></CardHeader><CardContent><div className="max-h-[520px] space-y-2 overflow-y-auto">{data.employees?.map((employee) => <div key={employee.employeeId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50"><div><p className="font-medium">{employee.name}</p><p className="text-xs text-slate-500">{employee.employeeNumber} - {employee.department}</p></div><div className="text-right"><p className="font-mono">{fmt(employee.netPay)}</p><p className="text-xs text-slate-500">Gross: {fmt(employee.grossPay)}</p></div></div>)}</div></CardContent></Card>
        </div>
      ))}
    </WeeklyReportScaffold>
  );
}
