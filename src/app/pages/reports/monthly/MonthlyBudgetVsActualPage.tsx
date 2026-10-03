import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Download, Target, Printer, TrendingUp, TrendingDown } from "lucide-react";
import { useMonthlyBudgetVsActual } from "@/lib/hooks/useMonthlyReports";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amount);
};

export default function MonthlyBudgetVsActualPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || '2024');
  const month = parseInt(searchParams.get('month') || '1');

  const { data: report, isLoading, error } = useMonthlyBudgetVsActual(year, month);

  const handleDownloadPDF = async () => {
    try {
      await monthlyReportsApi.downloadBudgetVsActualPDF(year, month);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await monthlyReportsApi.downloadBudgetVsActualExcel(year, month);
      toast.success("Excel downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
          <Skeleton className="h-10 w-64 bg-slate-800" />
          <Card className="bg-slate-900 border-slate-700"><CardContent className="p-6"><Skeleton className="h-96 bg-slate-800" /></CardContent></Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-slate-950 min-h-screen">
          <Card className="border-red-700 bg-red-900/20">
            <CardContent className="p-6">
              <p className="text-red-300">Error: {error.message}</p>
              <Button variant="outline" className="mt-4 border-slate-600 text-slate-200 hover:bg-slate-800" onClick={() => navigate('/reports/monthly')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!report) return null;

  return (
    <Layout>
      <div className="monthly-report-detail p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/monthly')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-500" />
                <span className="hidden sm:inline">{report.reportName}</span>
                <span className="sm:hidden">Budget vs Actual</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">{report.period}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><Download className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Excel</span></Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Print</span></Button>
          </div>
        </div>

        {/* Summary - Revenue Only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700"><CardHeader className="pb-2"><CardDescription className="text-slate-400">Revenue Budget</CardDescription><CardTitle className="text-white">{formatCurrency(report.summary.totalBudget)}</CardTitle></CardHeader></Card>
          <Card className="bg-slate-900 border-slate-700"><CardHeader className="pb-2"><CardDescription className="text-slate-400">Revenue Actual</CardDescription><CardTitle className="text-white">{formatCurrency(report.summary.totalActual)}</CardTitle></CardHeader></Card>
          <Card className={report.summary.totalVariance >= 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}>
            <CardHeader className="pb-2"><CardDescription className={report.summary.totalVariance >= 0 ? 'text-green-300' : 'text-red-300'}>Revenue Variance</CardDescription>
              <CardTitle className={`flex items-center gap-2 ${report.summary.totalVariance >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                {report.summary.totalVariance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {formatCurrency(report.summary.totalVariance)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900 border-slate-700"><CardHeader className="pb-2"><CardDescription className="text-slate-400">Variance %</CardDescription><CardTitle className="text-white">{report.summary.variancePercent.toFixed(1)}%</CardTitle></CardHeader></Card>
        </div>

        {/* Revenue */}
        <Card className="bg-green-900/20 border-green-800">
          <CardHeader className="border-b border-green-800"><CardTitle className="text-green-300">Revenue</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div><div className="text-sm text-green-400">Budget</div><div className="font-bold text-green-100">{formatCurrency(report.revenue.budget)}</div></div>
              <div><div className="text-sm text-green-400">Actual</div><div className="font-bold text-green-100">{formatCurrency(report.revenue.actual)}</div></div>
              <div><div className="text-sm text-green-400">Variance</div><div className={`font-bold ${report.revenue.variance >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(report.revenue.variance)}</div></div>
              <div><div className="text-sm text-green-400">%</div><div className={`font-bold ${report.revenue.variancePercent >= 0 ? 'text-green-300' : 'text-red-300'}`}>{report.revenue.variancePercent.toFixed(1)}%</div></div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-700"><CardTitle className="text-white">Expenses</CardTitle></CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 -mx-3 sm:mx-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b border-slate-700"><th className="text-left py-2 text-slate-400">Category</th><th className="text-right text-slate-400">Budget</th><th className="text-right text-slate-400">Actual</th><th className="text-right text-slate-400">Variance</th><th className="text-right text-slate-400">%</th><th className="text-center text-slate-400">Status</th></tr></thead>
              <tbody>
                {report.expenses.map((exp, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 text-slate-200">{exp.category}</td>
                    <td className="text-right text-slate-200">{formatCurrency(exp.budget)}</td>
                    <td className="text-right text-slate-200">{formatCurrency(exp.actual)}</td>
                    <td className={`text-right font-medium ${exp.variance >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(exp.variance)}</td>
                    <td className={`text-right ${exp.variancePercent >= 0 ? 'text-green-300' : 'text-red-300'}`}>{exp.variancePercent.toFixed(1)}%</td>
                    <td className="text-center">
                      {exp.status === 'Not Started' && <span className="text-slate-400 text-xs">Not Started</span>}
                      {exp.status === 'On Track' && <span className="text-green-400 text-xs">On Track</span>}
                      {exp.status === 'Over Budget' && <span className="text-red-400 text-xs">Over Budget</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
