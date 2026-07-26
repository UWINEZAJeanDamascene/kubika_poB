import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, ArrowRightLeft, Printer, FileSpreadsheet, TrendingUp, TrendingDown, Download, Loader2 } from "lucide-react";
import { useSemiAnnualCashFlowSummary } from "@/lib/hooks/useMonthlyReports";
import { useSemiAnnualExports } from "@/lib/hooks/useSemiAnnualExports";
import { useNavigate } from "react-router";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function SemiAnnualCashFlowSummaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualCashFlowSummary(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports("cash-flow", startYear, startMonth, endYear, endMonth);
  const handlePrint = () => { window.print(); };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-96" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 md:p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-700">Error loading report: {error.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/reports/semi-annual')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!report) return null;

  const summary = report.summary || {};

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports/semi-annual')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Cash Flow Summary
              </h1>
              <p className="text-sm text-muted-foreground">{report.period}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={downloading === "pdf"}>
              {downloading === "pdf" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadExcel} disabled={downloading === "excel"}>
              {downloading === "excel" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">Semi-Annual Cash Flow Summary</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Beginning Cash Balance</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.beginningCash || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Net Cash Change</CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${(summary.netCashChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summary.netCashChange || 0) >= 0 ? '+' : ''}{formatCurrency(summary.netCashChange || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Ending Cash Balance</CardDescription>
              <CardTitle className="text-lg sm:text-xl">{formatCurrency(summary.endingCash || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Cash from Operations
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl text-green-600">
                {formatCurrency(summary.cashFromOperations || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Cash from Investing
              </CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${(summary.cashFromInvesting || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.cashFromInvesting || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs">Cash from Financing</CardDescription>
              <CardTitle className={`text-lg sm:text-xl ${(summary.cashFromFinancing || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.cashFromFinancing || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Waterfall Analysis */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Cash Flow Waterfall</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Sources and uses of cash over the period
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 sm:p-6 space-y-3">
              {report.waterfall?.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between py-2 border-b border-slate-100 last:border-0 ${
                  item.type === 'inflow' ? 'text-green-600' : item.type === 'net' ? 'font-bold' : ''
                }`}>
                  <span className="text-sm">{item.label}</span>
                  <span className="text-sm font-mono font-medium">
                    {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                  </span>
                </div>
              )) || (
                <div className="text-center text-muted-foreground py-4 text-sm">No waterfall data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Monthly Breakdown</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Cash flow by month and category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Month</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Operating</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Investing</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm border-b border-slate-200 text-slate-700">Financing</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm bg-emerald-50 border-b border-slate-200 text-emerald-700">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthly?.map((m, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-700">{m.monthName}</td>
                      <td className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-green-600">
                        {formatCurrency(m.operating)}
                      </td>
                      <td className={`text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono ${m.investing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(m.investing)}
                      </td>
                      <td className={`text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono ${m.financing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(m.financing)}
                      </td>
                      <td className={`text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-mono font-bold bg-emerald-50 ${m.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(m.net)}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted-foreground text-sm">No monthly data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Cash Flow Summary Report</p>
        </div>
      </div>
    </Layout>
  );
}
