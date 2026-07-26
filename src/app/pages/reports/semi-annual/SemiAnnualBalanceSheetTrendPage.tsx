import { useSearchParams } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ArrowLeft, Scale, Printer, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useSemiAnnualBalanceSheetTrend } from "@/lib/hooks/useMonthlyReports";
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

export default function SemiAnnualBalanceSheetTrendPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startYear = parseInt(searchParams.get('startYear') || new Date().getFullYear().toString());
  const startMonth = parseInt(searchParams.get('startMonth') || '1');
  const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString());
  const endMonth = parseInt(searchParams.get('endMonth') || '6');

  const { data: report, isLoading, error } = useSemiAnnualBalanceSheetTrend(startYear, startMonth, endYear, endMonth);
  const { downloading, downloadPDF, downloadExcel } = useSemiAnnualExports(
    "balance-sheet-trend",
    startYear,
    startMonth,
    endYear,
    endMonth,
  );

  const handlePrint = () => {
    window.print();
  };

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

  const months = report.months || [];
  const summary = report.summary || { totalAssets: [], totalLiabilities: [], totalEquity: [], netWorth: [] };

  // Find the latest non-zero month index for summary cards
  const getLatestValue = (arr: number[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== 0) return arr[i];
    }
    return 0;
  };

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
                <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Balance Sheet Trend
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
          <h1 className="text-2xl font-bold text-center">Semi-Annual Balance Sheet Trend</h1>
          <p className="text-center text-muted-foreground">{report.period}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs text-emerald-700">Total Assets (Latest)</CardDescription>
              <CardTitle className="text-lg sm:text-xl text-emerald-800">
                {formatCurrency(getLatestValue(summary.totalAssets))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs text-slate-600">Total Liabilities (Latest)</CardDescription>
              <CardTitle className="text-lg sm:text-xl text-slate-800">
                {formatCurrency(getLatestValue(summary.totalLiabilities))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs text-slate-600">Total Equity (Latest)</CardDescription>
              <CardTitle className="text-lg sm:text-xl text-slate-800">
                {formatCurrency(getLatestValue(summary.totalEquity))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader className="py-3 px-4">
              <CardDescription className="text-xs text-emerald-700">Net Worth (Latest)</CardDescription>
              <CardTitle className="text-lg sm:text-xl text-emerald-800">
                {formatCurrency(getLatestValue(summary.netWorth))}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Trend Table */}
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardHeader className="bg-white py-3 px-3 sm:py-4 sm:px-6 border-b border-slate-200">
            <CardTitle className="text-base sm:text-lg text-slate-800">Six Month Trend Analysis</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Month-by-month balance sheet comparison
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 bg-white">
            <div className="overflow-x-auto bg-white">
              <table className="w-full min-w-[700px] border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm sticky left-0 bg-slate-100 min-w-[150px] border-b border-slate-200 text-slate-700">
                      Description
                    </th>
                    {months.map((m, idx) => (
                      <th key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-xs sm:text-sm min-w-[100px] border-b border-slate-200 text-slate-700 bg-slate-100">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 bg-emerald-50/50 font-bold">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 bg-emerald-50/50 text-emerald-800">TOTAL ASSETS</td>
                    {summary.totalAssets.map((val, idx) => (
                      <td key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-emerald-700">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 bg-slate-50 !text-slate-800 font-medium">Current Assets</td>
                    {months.map((_, idx) => (
                      <td key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-slate-700">
                        {formatCurrency(report.assetDetails?.[idx]?.filter(a => parseInt(a.code) >= 1000 && parseInt(a.code) < 1700).reduce((s, a) => s + a.balance, 0) || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 bg-slate-50 !text-slate-800 font-medium">Non-Current Assets</td>
                    {months.map((_, idx) => (
                      <td key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-slate-700">
                        {formatCurrency(report.assetDetails?.[idx]?.filter(a => parseInt(a.code) >= 1700 && parseInt(a.code) < 1900).reduce((s, a) => s + a.balance, 0) || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50 font-semibold">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 bg-slate-50 text-slate-700">TOTAL LIABILITIES</td>
                    {summary.totalLiabilities.map((val, idx) => (
                      <td key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-slate-600">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50 font-semibold">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 bg-slate-50 text-slate-700">TOTAL EQUITY</td>
                    {summary.totalEquity.map((val, idx) => (
                      <td key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-slate-600">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 bg-emerald-50/50 font-bold">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm sticky left-0 bg-emerald-50/50 text-emerald-800">NET WORTH</td>
                    {summary.netWorth.map((val, idx) => (
                      <td key={idx} className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-mono text-emerald-700">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground print:text-black mt-8 print:mt-4">
          <p>Report generated on {new Date(report.generatedAt).toLocaleString('en-RW')}</p>
          <p className="mt-1">Balance Sheet Trend Analysis</p>
        </div>
      </div>
    </Layout>
  );
}
